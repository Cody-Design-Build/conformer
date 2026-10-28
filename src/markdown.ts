import {
  isMap,
  isScalar,
  parseDocument,
  visit,
  type Document,
  type Node,
} from "yaml";
import type { WorkspaceConfig } from "./config.js";
import { isValidId } from "./identity.js";
import { type Diagnostic, isRecord, makeDiagnostic } from "./types.js";

export interface ParsedMetadata {
  metadata?: Record<string, unknown>;
  diagnostics: Diagnostic[];
}

function frontmatterSource(source: string): string | undefined {
  const text = source.startsWith("\uFEFF") ? source.slice(1) : source;
  const opening = text.startsWith("---\n") ? 4 : text.startsWith("---\r\n") ? 5 : -1;
  if (opening < 0) return undefined;

  let lineStart = opening;
  while (lineStart <= text.length) {
    const newline = text.indexOf("\n", lineStart);
    const lineEnd = newline < 0 ? text.length : newline;
    const line = text.slice(lineStart, lineEnd).replace(/\r$/, "");
    if (line === "---") return text.slice(opening, lineStart);
    if (newline < 0) break;
    lineStart = newline + 1;
  }
  return undefined;
}

function forbiddenYamlFeature(document: Document<Node, true>): string | undefined {
  let forbidden: string | undefined;
  visit(document, {
    Alias() {
      forbidden ??= "YAML aliases are not allowed";
    },
    Node(_key, node) {
      if (node.tag !== undefined && !node.tag.startsWith("tag:yaml.org,2002:")) {
        forbidden ??= "Custom YAML tags are not allowed";
      }
    },
    Pair(_key, pair) {
      if (isScalar(pair.key) && pair.key.value === "<<") {
        forbidden ??= "YAML merge keys are not allowed";
      }
    },
  });
  return forbidden;
}

export function parseMetadata(source: string, relativePath: string): ParsedMetadata {
  const text = source.startsWith("\uFEFF") ? source.slice(1) : source;
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return { diagnostics: [makeDiagnostic("missing_frontmatter", "Document must begin with YAML frontmatter", { path: relativePath })] };
  }
  const yamlSource = frontmatterSource(source);
  if (yamlSource === undefined) {
    return { diagnostics: [makeDiagnostic("malformed_yaml", "YAML frontmatter is not closed", { path: relativePath })] };
  }
  const document = parseDocument(yamlSource, {
    merge: false,
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
    version: "1.2",
  });
  const parseMessages = [...document.errors, ...document.warnings];
  if (parseMessages.length > 0) {
    return {
      diagnostics: parseMessages.map((error) => makeDiagnostic("malformed_yaml", error.message, { path: relativePath })),
    };
  }
  if (!isMap(document.contents)) {
    return { diagnostics: [makeDiagnostic("invalid_frontmatter", "Frontmatter root must be a mapping", { path: relativePath })] };
  }

  const forbidden = forbiddenYamlFeature(document as Document<Node, true>);
  if (forbidden !== undefined) {
    return { diagnostics: [makeDiagnostic("invalid_yaml_feature", forbidden, { path: relativePath })] };
  }
  for (const pair of document.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
      return { diagnostics: [makeDiagnostic("invalid_field_name", "Frontmatter field names must be strings", { path: relativePath })] };
    }
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 }) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read YAML frontmatter";
    return { diagnostics: [makeDiagnostic("malformed_yaml", message, { path: relativePath })] };
  }
  if (!isRecord(value)) {
    return { diagnostics: [makeDiagnostic("invalid_frontmatter", "Frontmatter root must be a mapping", { path: relativePath })] };
  }
  return { metadata: value, diagnostics: [] };
}

function requiredFieldDiagnostic(
  metadata: Record<string, unknown>,
  field: string,
  relativePath: string,
): Diagnostic | undefined {
  if (!Object.hasOwn(metadata, field) || metadata[field] === null || metadata[field] === undefined) {
    return makeDiagnostic("missing_field", `Missing required field: ${field}`, { path: relativePath, field });
  }
  const value = metadata[field];
  if (typeof value === "string" && value.trim().length === 0) {
    return makeDiagnostic("blank_field", `Required field is blank: ${field}`, { path: relativePath, field });
  }
  return undefined;
}

export function validateMetadata(
  metadata: Record<string, unknown>,
  config: WorkspaceConfig,
  relativePath: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const typePresence = requiredFieldDiagnostic(metadata, "document_type", relativePath);
  if (typePresence !== undefined) diagnostics.push(typePresence);
  const idPresence = requiredFieldDiagnostic(metadata, "id", relativePath);
  if (idPresence !== undefined) diagnostics.push(idPresence);

  const documentType = metadata.document_type;
  if (typePresence === undefined && typeof documentType !== "string") {
    diagnostics.push(makeDiagnostic("invalid_field_type", "document_type must be a string", { path: relativePath, field: "document_type" }));
  } else if (typeof documentType === "string" && documentType !== "document" && config.types[documentType] === undefined) {
    diagnostics.push(makeDiagnostic("unknown_type", `Unknown document type: ${documentType}`, { path: relativePath, field: "document_type" }));
  }

  const id = metadata.id;
  if (idPresence === undefined && !isValidId(id)) {
    diagnostics.push(makeDiagnostic("invalid_id", "id must use canonical uppercase Conformer format", { path: relativePath, field: "id" }));
  }

  if (typeof documentType === "string") {
    const definition = config.types[documentType];
    if (definition !== undefined) {
      for (const field of definition.required) {
        const diagnostic = requiredFieldDiagnostic(metadata, field, relativePath);
        if (diagnostic !== undefined) diagnostics.push(diagnostic);
      }
    }
  }
  return diagnostics;
}
