import { lstat, mkdir, open, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import {
  FIELD_NAME,
  RESERVED_FIELDS,
  TYPE_NAME,
  type WorkspaceConfig,
  initWorkspace,
  isExcluded,
  loadConfig,
} from "./config.js";
import { generateUniqueId, isValidId } from "./identity.js";
import { scanWorkspace, type ScanResult } from "./scanner.js";
import {
  ConformerFailure,
  type Diagnostic,
  isNodeError,
  makeDiagnostic,
} from "./types.js";

export interface NewOptions {
  destination: string;
  documentType: string;
  fields: ReadonlyMap<string, string>;
}

function scanIncompleteDiagnostics(scan: ScanResult): Diagnostic[] {
  return [
    makeDiagnostic("scan_incomplete", "Workspace contains invalid or unreadable managed documents"),
    ...scan.diagnostics,
  ];
}

function validateNewMetadata(options: NewOptions, config: WorkspaceConfig): void {
  if (!TYPE_NAME.test(options.documentType)) {
    throw new ConformerFailure(makeDiagnostic("unknown_type", `Unknown document type: ${options.documentType}`, { field: "document_type" }));
  }
  const definition = options.documentType === "document" ? undefined : config.types[options.documentType];
  if (options.documentType !== "document" && definition === undefined) {
    throw new ConformerFailure(makeDiagnostic("unknown_type", `Unknown document type: ${options.documentType}`, { field: "document_type" }));
  }
  for (const [field] of options.fields) {
    if (!FIELD_NAME.test(field) || RESERVED_FIELDS[field] === true) {
      throw new ConformerFailure(makeDiagnostic("invalid_field_name", `Invalid metadata field: ${field}`, { field }));
    }
  }
  for (const field of definition?.required ?? []) {
    const value = options.fields.get(field);
    if (value === undefined || value.trim().length === 0) {
      throw new ConformerFailure(makeDiagnostic("missing_field", `Missing required field: ${field}`, { field }));
    }
  }
}

async function destinationPath(
  workspace: string,
  destination: string,
  config: WorkspaceConfig,
): Promise<{ absolute: string; relative: string }> {
  const absolute = path.resolve(workspace, destination);
  const relativeNative = path.relative(workspace, absolute);
  if (relativeNative === "" || relativeNative === ".." || relativeNative.startsWith(`..${path.sep}`) || path.isAbsolute(relativeNative)) {
    throw new ConformerFailure(makeDiagnostic("path_outside_workspace", "Destination must be inside the workspace"));
  }
  const relative = relativeNative.split(path.sep).join("/");
  if (path.extname(relative).toLowerCase() !== ".md") {
    throw new ConformerFailure(makeDiagnostic("invalid_destination", "Destination must have a .md extension", { path: relative }));
  }
  if (isExcluded(relative, config)) {
    throw new ConformerFailure(makeDiagnostic("excluded_destination", "Destination is excluded from the managed workspace", { path: relative }));
  }

  const parentSegments = relativeNative.split(path.sep).slice(0, -1);
  let current = workspace;
  for (const segment of parentSegments) {
    current = path.join(current, segment);
    let details;
    try {
      details = await lstat(current);
    } catch {
      throw new ConformerFailure(makeDiagnostic("invalid_destination", "Destination parent must already exist", { path: relative }));
    }
    if (details.isSymbolicLink() || !details.isDirectory()) {
      throw new ConformerFailure(makeDiagnostic("unsafe_destination", "Destination path cannot contain symlinks or non-directories", { path: relative }));
    }
  }

  try {
    await lstat(absolute);
    throw new ConformerFailure(makeDiagnostic("destination_exists", "Destination already exists", { path: relative }));
  } catch (error) {
    if (error instanceof ConformerFailure) throw error;
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw new ConformerFailure(makeDiagnostic("invalid_destination", "Unable to inspect destination", { path: relative }));
    }
  }
  return { absolute, relative };
}

async function acquireWriterLock(workspace: string): Promise<() => Promise<void>> {
  const lockPath = path.join(workspace, ".conformer", "write.lock");
  try {
    await mkdir(lockPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      throw new ConformerFailure(makeDiagnostic("workspace_busy", "Workspace writer lock exists; verify no writer is active before removing .conformer/write.lock", { path: ".conformer/write.lock" }));
    }
    throw new ConformerFailure(makeDiagnostic("workspace_lock_failed", "Unable to acquire workspace writer lock", { path: ".conformer/write.lock" }));
  }
  return async () => {
    try {
      await rmdir(lockPath);
    } catch {
      throw new ConformerFailure(makeDiagnostic("workspace_lock_failed", "Unable to release workspace writer lock", { path: ".conformer/write.lock" }));
    }
  };
}

function renderDocument(documentType: string, id: string, fields: ReadonlyMap<string, string>): string {
  const lines = [
    "---",
    `document_type: ${JSON.stringify(documentType)}`,
    `id: ${JSON.stringify(id)}`,
  ];
  for (const field of [...fields.keys()].sort((left, right) => left.localeCompare(right))) {
    const value = fields.get(field);
    if (value === undefined) throw new Error(`Missing value for metadata field: ${field}`);
    lines.push(`${field}: ${JSON.stringify(value)}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}\n`;
}

export async function checkWorkspace(workspace: string): Promise<ScanResult> {
  const config = await loadConfig(workspace);
  return scanWorkspace(workspace, config);
}

export async function findDocument(workspace: string, id: string): Promise<{ id: string; path: string }> {
  if (!isValidId(id)) {
    throw new ConformerFailure(makeDiagnostic("invalid_id", "ID must use canonical uppercase Conformer format", { field: "id" }));
  }
  const config = await loadConfig(workspace);
  const scan = await scanWorkspace(workspace, config);
  if (scan.diagnostics.length > 0) throw new ConformerFailure(scanIncompleteDiagnostics(scan));
  const matches = scan.documents.filter((document) => document.id === id);
  if (matches.length === 0) throw new ConformerFailure(makeDiagnostic("id_not_found", `Document ID not found: ${id}`, { field: "id" }));
  if (matches.length > 1) throw new ConformerFailure(makeDiagnostic("duplicate_id", `Document ID is ambiguous: ${id}`, { field: "id" }));
  const match = matches[0];
  if (match === undefined) throw new Error("Unreachable empty match");
  return { id, path: match.path };
}

export async function createDocument(
  workspace: string,
  options: NewOptions,
): Promise<{ path: string; id: string; documentType: string }> {
  const config = await loadConfig(workspace);
  validateNewMetadata(options, config);
  const destination = await destinationPath(workspace, options.destination, config);
  const release = await acquireWriterLock(workspace);
  let operationFailed = false;
  try {
    const scan = await scanWorkspace(workspace, config);
    if (scan.diagnostics.length > 0) throw new ConformerFailure(scanIncompleteDiagnostics(scan));
    const existingIds = new Set(scan.documents.flatMap((document) => document.id === undefined ? [] : [document.id]));
    let id: string;
    try {
      id = generateUniqueId(existingIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to allocate a document ID";
      throw new ConformerFailure(makeDiagnostic("id_allocation_failed", message));
    }

    let handle;
    try {
      handle = await open(destination.absolute, "wx", 0o644);
    } catch (error) {
      if (isNodeError(error) && error.code === "EEXIST") {
        throw new ConformerFailure(makeDiagnostic("destination_exists", "Destination already exists", { path: destination.relative }));
      }
      throw new ConformerFailure(makeDiagnostic("document_write_failed", "Unable to create destination", { path: destination.relative }));
    }
    try {
      await handle.writeFile(renderDocument(options.documentType, id, options.fields), "utf8");
      await handle.sync();
      await handle.close();
    } catch {
      await handle.close().catch(() => undefined);
      await unlink(destination.absolute).catch(() => undefined);
      throw new ConformerFailure(makeDiagnostic("document_write_failed", "Unable to write destination", { path: destination.relative }));
    }
    return { path: destination.relative, id, documentType: options.documentType };
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await release();
    } catch (error) {
      if (!operationFailed) throw error;
    }
  }
}

export { initWorkspace };
