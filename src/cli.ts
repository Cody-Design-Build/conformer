#!/usr/bin/env node

import path from "node:path";
import {
  checkWorkspace,
  createDocument,
  findDocument,
  initWorkspace,
  type NewOptions,
} from "./commands.js";
import { resolveWorkspace } from "./config.js";
import {
  ConformerFailure,
  type Diagnostic,
  makeDiagnostic,
  usageFailure,
} from "./types.js";

type CommandName = "init" | "new" | "check" | "find";

interface Invocation {
  workspaceInput: string;
  json: boolean;
  command: CommandName;
  destination?: string;
  documentType?: string;
  fields?: ReadonlyMap<string, string>;
  id?: string;
}

function parseInvocation(args: string[]): Invocation {
  let workspaceInput: string | undefined;
  let json = false;
  let index = 0;
  while (index < args.length && args[index]?.startsWith("--")) {
    const option = args[index];
    if (option === "--workspace") {
      if (workspaceInput !== undefined) throw usageFailure("--workspace may be supplied only once");
      workspaceInput = args[index + 1];
      if (workspaceInput === undefined) throw usageFailure("--workspace requires a directory");
      index += 2;
    } else if (option === "--json") {
      if (json) throw usageFailure("--json may be supplied only once");
      json = true;
      index += 1;
    } else {
      throw usageFailure(`Unknown global option: ${option}`);
    }
  }
  if (workspaceInput === undefined) throw usageFailure("--workspace <directory> is required");

  const command = args[index] as CommandName | undefined;
  if (command !== "init" && command !== "new" && command !== "check" && command !== "find") {
    throw usageFailure(command === undefined ? "A command is required" : `Unknown command: ${command}`);
  }
  index += 1;

  if (command === "init" || command === "check") {
    if (index !== args.length) throw usageFailure(`${command} does not accept arguments`);
    return { workspaceInput, json, command };
  }
  if (command === "find") {
    const id = args[index];
    if (id === undefined || index + 1 !== args.length) throw usageFailure("find requires exactly one ID");
    return { workspaceInput, json, command, id };
  }

  const destination = args[index];
  if (destination === undefined) throw usageFailure("new requires a destination path");
  index += 1;
  let documentType = "document";
  let typeSupplied = false;
  const fields = new Map<string, string>();
  while (index < args.length) {
    const option = args[index];
    if (option === "--type") {
      if (typeSupplied) throw usageFailure("--type may be supplied only once");
      const value = args[index + 1];
      if (value === undefined) throw usageFailure("--type requires a name");
      documentType = value;
      typeSupplied = true;
      index += 2;
    } else if (option === "--field") {
      const assignment = args[index + 1];
      if (assignment === undefined) throw usageFailure("--field requires name=value");
      const separator = assignment.indexOf("=");
      if (separator < 1) throw usageFailure("--field requires name=value");
      const name = assignment.slice(0, separator);
      const value = assignment.slice(separator + 1);
      if (fields.has(name)) throw usageFailure(`Metadata field supplied more than once: ${name}`);
      fields.set(name, value);
      index += 2;
    } else {
      throw usageFailure(`Unknown new option: ${String(option)}`);
    }
  }
  return { workspaceInput, json, command, destination, documentType, fields };
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.path === undefined ? "" : `${diagnostic.path}: `;
  const field = diagnostic.field === undefined ? "" : ` (${diagnostic.field})`;
  return `${location}[${diagnostic.code}]${field} ${diagnostic.message}`;
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function run(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  let invocation: Invocation | undefined;
  let command = "unknown";
  let json = rawArgs.includes("--json");
  let workspace = path.resolve(".");

  try {
    invocation = parseInvocation(rawArgs);
    command = invocation.command;
    json = invocation.json;
    workspace = path.resolve(invocation.workspaceInput);
    workspace = await resolveWorkspace(invocation.workspaceInput);

    let result: Record<string, unknown>;
    if (invocation.command === "init") {
      result = await initWorkspace(workspace);
    } else if (invocation.command === "check") {
      const scan = await checkWorkspace(workspace);
      if (scan.diagnostics.length > 0) throw new ConformerFailure(scan.diagnostics);
      result = {
        filesScanned: scan.filesScanned,
        documentsValid: scan.documentsValid,
        diagnostics: [],
      };
    } else if (invocation.command === "find") {
      if (invocation.id === undefined) throw new Error("Missing parsed find ID");
      result = await findDocument(workspace, invocation.id);
    } else {
      if (invocation.destination === undefined || invocation.documentType === undefined || invocation.fields === undefined) {
        throw new Error("Missing parsed new options");
      }
      const options: NewOptions = {
        destination: invocation.destination,
        documentType: invocation.documentType,
        fields: invocation.fields,
      };
      result = await createDocument(workspace, options);
    }

    if (json) {
      writeJson({ ok: true, command, workspace, result });
    } else if (invocation.command === "init") {
      process.stdout.write(`Initialized ${String(result.configPath)}\n`);
    } else if (invocation.command === "new") {
      process.stdout.write(`Created ${String(result.path)} (${String(result.id)})\n`);
    } else if (invocation.command === "find") {
      process.stdout.write(`${String(result.path)}\n`);
    } else {
      process.stdout.write(`Checked ${String(result.filesScanned)} files; ${String(result.documentsValid)} valid\n`);
    }
  } catch (error) {
    if (error instanceof ConformerFailure) {
      if (json) {
        writeJson({ ok: false, command, workspace, diagnostics: error.diagnostics });
      } else {
        for (const diagnostic of error.diagnostics) process.stderr.write(`${formatDiagnostic(diagnostic)}\n`);
      }
      process.exitCode = error.exitCode;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unexpected Conformer failure: ${message}\n`);
    process.exitCode = 1;
  }
}

await run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = makeDiagnostic("unexpected_failure", message);
  process.stderr.write(`${formatDiagnostic(diagnostic)}\n`);
  process.exitCode = 1;
});
