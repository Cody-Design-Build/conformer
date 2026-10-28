import { lstat, mkdir, open, readFile, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Minimatch } from "minimatch";
import {
  ConformerFailure,
  type Diagnostic,
  isNodeError,
  isRecord,
  makeDiagnostic,
} from "./types.js";

const CONFIG_RELATIVE_PATH = ".conformer/workspace.json";
const TYPE_NAME = /^[a-z][a-z0-9_-]*$/;
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const RESERVED_FIELDS: Record<string, true> = { document_type: true, id: true };
const CONFIG_KEYS: Record<string, true> = { version: true, exclude: true, types: true };
const TYPE_KEYS: Record<string, true> = { required: true };

export interface TypeDefinition {
  required: string[];
}

export interface WorkspaceConfig {
  version: 1;
  exclude: string[];
  types: Record<string, TypeDefinition>;
  matchers: Minimatch[];
}


export async function resolveWorkspace(input: string): Promise<string> {
  const requested = path.resolve(input);
  let resolved: string;
  try {
    resolved = await realpath(requested);
    const details = await stat(resolved);
    if (!details.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new ConformerFailure(
      makeDiagnostic("invalid_workspace", `Workspace is not an existing directory: ${requested}`),
    );
  }
  return resolved;
}

function validatePattern(pattern: unknown, index: number, diagnostics: Diagnostic[]): string | undefined {
  if (typeof pattern !== "string" || pattern.length === 0) {
    diagnostics.push(makeDiagnostic("invalid_config", `exclude[${index}] must be a nonempty string`, { path: CONFIG_RELATIVE_PATH }));
    return undefined;
  }
  if (pattern.includes("\\") || path.posix.isAbsolute(pattern) || pattern.split("/").includes("..")) {
    diagnostics.push(makeDiagnostic("invalid_config", `Exclusion pattern must be a workspace-relative POSIX pattern: ${pattern}`, { path: CONFIG_RELATIVE_PATH }));
    return undefined;
  }
  return pattern;
}

function parseConfig(value: unknown): WorkspaceConfig {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(value)) {
    throw new ConformerFailure(makeDiagnostic("invalid_config", "Workspace configuration must be a JSON object", { path: CONFIG_RELATIVE_PATH }));
  }

  for (const key of Object.keys(value)) {
    if (CONFIG_KEYS[key] !== true) diagnostics.push(makeDiagnostic("invalid_config", `Unknown configuration key: ${key}`, { path: CONFIG_RELATIVE_PATH, field: key }));
  }
  if (value.version !== 1) diagnostics.push(makeDiagnostic("invalid_config", "Configuration version must be 1", { path: CONFIG_RELATIVE_PATH, field: "version" }));

  const exclude: string[] = [];
  if (!Array.isArray(value.exclude)) {
    diagnostics.push(makeDiagnostic("invalid_config", "exclude must be an array", { path: CONFIG_RELATIVE_PATH, field: "exclude" }));
  } else {
    const seen = new Set<string>();
    value.exclude.forEach((candidate, index) => {
      const pattern = validatePattern(candidate, index, diagnostics);
      if (pattern === undefined) return;
      if (seen.has(pattern)) {
        diagnostics.push(makeDiagnostic("invalid_config", `Duplicate exclusion pattern: ${pattern}`, { path: CONFIG_RELATIVE_PATH, field: "exclude" }));
        return;
      }
      seen.add(pattern);
      exclude.push(pattern);
    });
  }

  const types: Record<string, TypeDefinition> = Object.create(null) as Record<string, TypeDefinition>;
  if (!isRecord(value.types)) {
    diagnostics.push(makeDiagnostic("invalid_config", "types must be an object", { path: CONFIG_RELATIVE_PATH, field: "types" }));
  } else {
    for (const [typeName, candidate] of Object.entries(value.types)) {
      if (!TYPE_NAME.test(typeName) || typeName === "document") {
        diagnostics.push(makeDiagnostic("invalid_config", `Invalid custom type name: ${typeName}`, { path: CONFIG_RELATIVE_PATH, field: typeName }));
        continue;
      }
      if (!isRecord(candidate)) {
        diagnostics.push(makeDiagnostic("invalid_config", `Type ${typeName} must be an object`, { path: CONFIG_RELATIVE_PATH, field: typeName }));
        continue;
      }
      for (const key of Object.keys(candidate)) {
        if (TYPE_KEYS[key] !== true) diagnostics.push(makeDiagnostic("invalid_config", `Unknown key for type ${typeName}: ${key}`, { path: CONFIG_RELATIVE_PATH, field: key }));
      }
      const required: string[] = [];
      if (!Array.isArray(candidate.required)) {
        diagnostics.push(makeDiagnostic("invalid_config", `Type ${typeName}.required must be an array`, { path: CONFIG_RELATIVE_PATH, field: typeName }));
      } else {
        const seen = new Set<string>();
        for (const field of candidate.required) {
          if (typeof field !== "string" || !FIELD_NAME.test(field) || RESERVED_FIELDS[field] === true) {
            diagnostics.push(makeDiagnostic("invalid_config", `Invalid required field for type ${typeName}: ${String(field)}`, { path: CONFIG_RELATIVE_PATH, field: typeName }));
          } else if (seen.has(field)) {
            diagnostics.push(makeDiagnostic("invalid_config", `Duplicate required field for type ${typeName}: ${field}`, { path: CONFIG_RELATIVE_PATH, field: typeName }));
          } else {
            seen.add(field);
            required.push(field);
          }
        }
      }
      types[typeName] = { required };
    }
  }

  if (diagnostics.length > 0) throw new ConformerFailure(diagnostics);
  const matchers = exclude.map((pattern) => new Minimatch(pattern, { dot: true, nonegate: true, nocomment: true }));
  return { version: 1, exclude, types, matchers };
}

export async function loadConfig(workspace: string): Promise<WorkspaceConfig> {
  const configPath = path.join(workspace, ".conformer", "workspace.json");
  let source: string;
  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    const message = isNodeError(error) && error.code === "ENOENT"
      ? "Workspace is not initialized"
      : "Unable to read workspace configuration";
    throw new ConformerFailure(makeDiagnostic("config_unavailable", message, { path: CONFIG_RELATIVE_PATH }));
  }

  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new ConformerFailure(makeDiagnostic("invalid_config", "Workspace configuration is not valid JSON", { path: CONFIG_RELATIVE_PATH }));
  }
  return parseConfig(value);
}

export function isExcluded(relativePath: string, config: WorkspaceConfig): boolean {
  const normalized = relativePath.split(path.sep).join("/").replace(/^\.\//, "");
  if (normalized === ".conformer" || normalized.startsWith(".conformer/")) return true;
  return config.matchers.some((matcher) => matcher.match(normalized));
}

export async function initWorkspace(workspace: string): Promise<{ configPath: string }> {
  const configDirectory = path.join(workspace, ".conformer");
  try {
    const details = await lstat(configDirectory);
    if (details.isSymbolicLink() || !details.isDirectory()) {
      throw new ConformerFailure(makeDiagnostic("unsafe_config_path", ".conformer must be a real directory", { path: ".conformer" }));
    }
  } catch (error) {
    if (error instanceof ConformerFailure) throw error;
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw new ConformerFailure(makeDiagnostic("config_unavailable", "Unable to inspect .conformer", { path: ".conformer" }));
    }
    await mkdir(configDirectory);
  }

  const absoluteConfigPath = path.join(configDirectory, "workspace.json");
  let handle;
  try {
    handle = await open(absoluteConfigPath, "wx", 0o644);
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      throw new ConformerFailure(makeDiagnostic("config_exists", "Workspace configuration already exists", { path: CONFIG_RELATIVE_PATH }));
    }
    throw new ConformerFailure(makeDiagnostic("config_write_failed", "Unable to create workspace configuration", { path: CONFIG_RELATIVE_PATH }));
  }

  try {
    const initial = { version: 1, exclude: [".git/**"], types: {} };
    await handle.writeFile(`${JSON.stringify(initial, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(absoluteConfigPath).catch(() => undefined);
    throw new ConformerFailure(makeDiagnostic("config_write_failed", "Unable to write workspace configuration", { path: CONFIG_RELATIVE_PATH }));
  }
  await handle.close();
  return { configPath: CONFIG_RELATIVE_PATH };
}

export { CONFIG_RELATIVE_PATH, FIELD_NAME, RESERVED_FIELDS, TYPE_NAME };
