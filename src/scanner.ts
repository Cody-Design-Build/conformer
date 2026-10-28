import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { WorkspaceConfig } from "./config.js";
import { isExcluded } from "./config.js";
import { isValidId } from "./identity.js";
import { parseMetadata, validateMetadata } from "./markdown.js";
import {
  type Diagnostic,
  type ManagedDocument,
  makeDiagnostic,
  sortDiagnostics,
} from "./types.js";

export interface ScanResult {
  filesScanned: number;
  documentsValid: number;
  documents: ManagedDocument[];
  diagnostics: Diagnostic[];
}


export async function scanWorkspace(workspace: string, config: WorkspaceConfig): Promise<ScanResult> {
  const candidates: string[] = [];
  const diagnostics: Diagnostic[] = [];

  async function walk(directory: string, relativeDirectory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      diagnostics.push(makeDiagnostic("scan_failed", "Unable to read directory", { path: relativeDirectory || "." }));
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativeNative = relativeDirectory === "" ? entry.name : path.join(relativeDirectory, entry.name);
      const relativePosix = relativeNative.split(path.sep).join("/");
      if (entry.isSymbolicLink() || isExcluded(relativePosix, config)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, relativeNative);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
        candidates.push(relativePosix);
      }
    }
  }

  await walk(workspace, "");
  candidates.sort((left, right) => left.localeCompare(right));

  const documents: ManagedDocument[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const relativePath of candidates) {
    let source: string;
    try {
      const bytes = await readFile(path.join(workspace, ...relativePath.split("/")));
      source = decoder.decode(bytes);
    } catch {
      diagnostics.push(makeDiagnostic("document_unreadable", "Document is not readable UTF-8", { path: relativePath }));
      continue;
    }

    const parsed = parseMetadata(source, relativePath);
    diagnostics.push(...parsed.diagnostics);
    if (parsed.metadata === undefined) continue;
    diagnostics.push(...validateMetadata(parsed.metadata, config, relativePath));
    const document: ManagedDocument = { path: relativePath, metadata: parsed.metadata };
    if (isValidId(parsed.metadata.id)) document.id = parsed.metadata.id;
    documents.push(document);
  }

  const pathsById = new Map<string, string[]>();
  for (const document of documents) {
    if (document.id === undefined) continue;
    const paths = pathsById.get(document.id);
    if (paths === undefined) pathsById.set(document.id, [document.path]);
    else paths.push(document.path);
  }
  for (const [id, paths] of pathsById) {
    if (paths.length < 2) continue;
    for (const duplicatePath of paths) {
      diagnostics.push(makeDiagnostic("duplicate_id", `Duplicate document ID: ${id}`, { path: duplicatePath, field: "id" }));
    }
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const invalidPaths = new Set(sortedDiagnostics.flatMap((diagnostic) => diagnostic.path === undefined ? [] : [diagnostic.path]));
  return {
    filesScanned: candidates.length,
    documentsValid: documents.filter((document) => !invalidPaths.has(document.path)).length,
    documents,
    diagnostics: sortedDiagnostics,
  };
}
