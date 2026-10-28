import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));

interface JsonEnvelope {
  ok: boolean;
  command: string;
  workspace: string;
  result?: Record<string, unknown>;
  diagnostics?: Array<{ code: string; path?: string; field?: string; message: string }>;
}

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
  json?: JsonEnvelope;
}

function runCli(workspace: string, command: string[], json = true): CliResult {
  const args = [CLI, "--workspace", workspace, ...(json ? ["--json"] : []), ...command];
  const processResult = spawnSync(process.execPath, args, { encoding: "utf8" });
  const result: CliResult = {
    status: processResult.status,
    stdout: processResult.stdout,
    stderr: processResult.stderr,
  };
  if (json && processResult.stdout.trim().length > 0) {
    result.json = JSON.parse(processResult.stdout) as JsonEnvelope;
  }
  return result;
}

async function workspace(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "conformer-test-"));
}

async function initialize(root: string): Promise<void> {
  const result = runCli(root, ["init"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json?.ok, true);
}

async function setConfig(root: string, config: unknown): Promise<void> {
  await writeFile(path.join(root, ".conformer", "workspace.json"), `${JSON.stringify(config, null, 2)}\n`);
}

function diagnosticCodes(result: CliResult): string[] {
  return result.json?.diagnostics?.map((diagnostic) => diagnostic.code) ?? [];
}

test("initialization never replaces existing configuration", async () => {
  const root = await workspace();
  await initialize(root);
  const configPath = path.join(root, ".conformer", "workspace.json");
  const original = await readFile(configPath, "utf8");
  const repeated = runCli(root, ["init"]);
  assert.equal(repeated.status, 1);
  assert.deepEqual(diagnosticCodes(repeated), ["config_exists"]);
  assert.equal(await readFile(configPath, "utf8"), original);
});

test("initializes, creates, checks, and finds a document after a move", async () => {
  const root = await workspace();
  await writeFile(path.join(root, "ordinary.pdf"), "not managed");
  await initialize(root);

  const created = runCli(root, ["new", "note.md"]);
  assert.equal(created.status, 0, created.stderr);
  const id = created.json?.result?.id;
  assert.equal(typeof id, "string");
  const original = await readFile(path.join(root, "note.md"), "utf8");
  assert.match(original, /^---\ndocument_type: "document"\nid: "[0-9A-Z]{10}"\n---\n\n$/);

  await mkdir(path.join(root, "moved"));
  await rename(path.join(root, "note.md"), path.join(root, "moved", "renamed.md"));
  const found = runCli(root, ["find", String(id)]);
  assert.equal(found.status, 0, found.stderr);
  assert.equal(found.json?.result?.path, "moved/renamed.md");

  const checked = runCli(root, ["check"]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.deepEqual(checked.json?.result, { filesScanned: 1, documentsValid: 1, diagnostics: [] });
  assert.equal(await readFile(path.join(root, "moved", "renamed.md"), "utf8"), original);
  assert.equal(await readFile(path.join(root, "ordinary.pdf"), "utf8"), "not managed");
});

test("creates configured custom types and rejects missing required fields", async () => {
  const root = await workspace();
  await initialize(root);
  await setConfig(root, {
    version: 1,
    exclude: [".git/**"],
    types: { job: { required: ["job_name"] } },
  });

  const missing = runCli(root, ["new", "job.md", "--type", "job"]);
  assert.equal(missing.status, 1);
  assert.deepEqual(diagnosticCodes(missing), ["missing_field"]);

  const created = runCli(root, ["new", "job.md", "--type", "job", "--field", "job_name=Synthetic Project"]);
  assert.equal(created.status, 0, created.stderr);
  assert.match(await readFile(path.join(root, "job.md"), "utf8"), /job_name: "Synthetic Project"/);
});

test("accepts BOM and CRLF but rejects aliases and unclosed frontmatter", async () => {
  const root = await workspace();
  await initialize(root);
  await writeFile(path.join(root, "valid.MD"), "\uFEFF---\r\ndocument_type: document\r\nid: \"000001AAAA\"\r\n---\r\nbody\r\n");
  assert.equal(runCli(root, ["check"]).status, 0);

  await writeFile(path.join(root, "alias.md"), "---\ndocument_type: &type document\nid: \"000002AAAA\"\ncopy: *type\n---\n");
  await writeFile(path.join(root, "unclosed.md"), "---\ndocument_type: document\nid: \"000003AAAA\"\n");
  const checked = runCli(root, ["check"]);
  assert.equal(checked.status, 1);
  assert.equal(diagnosticCodes(checked).includes("invalid_yaml_feature"), true);
  assert.equal(diagnosticCodes(checked).includes("malformed_yaml"), true);
});

test("reports metadata failures and duplicates without modifying documents", async () => {
  const root = await workspace();
  await initialize(root);
  await setConfig(root, {
    version: 1,
    exclude: [".git/**"],
    types: { job: { required: ["job_name"] } },
  });
  const fixtures: Record<string, string> = {
    "blank.md": "---\ndocument_type: job\nid: \"000001AAAA\"\njob_name: \"   \"\n---\nbody\n",
    "duplicate-key.md": "---\ndocument_type: document\nid: \"000002AAAA\"\nid: \"000003AAAA\"\n---\n",
    "duplicate-one.md": "---\ndocument_type: document\nid: \"000004AAAA\"\n---\n",
    "duplicate-two.md": "---\ndocument_type: document\nid: \"000004AAAA\"\n---\n",
    "invalid-id.md": "---\ndocument_type: document\nid: lowercase\n---\n",
    "malformed.md": "---\nkey: [\n---\n",
    "missing.md": "---\ndocument_type: document\n---\n",
    "unknown.md": "---\ndocument_type: mystery\nid: \"000005AAAA\"\n---\n",
  };
  for (const [name, source] of Object.entries(fixtures)) await writeFile(path.join(root, name), source);

  const checked = runCli(root, ["check"]);
  assert.equal(checked.status, 1);
  const codes = new Set(diagnosticCodes(checked));
  for (const expected of ["blank_field", "malformed_yaml", "duplicate_id", "invalid_id", "missing_field", "unknown_type"]) {
    assert.equal(codes.has(expected), true, `missing diagnostic ${expected}`);
  }
  for (const [name, source] of Object.entries(fixtures)) {
    assert.equal(await readFile(path.join(root, name), "utf8"), source);
  }
});

test("uses one exclusion scope for checking, finding, and creation", async () => {
  const root = await workspace();
  await initialize(root);
  await setConfig(root, { version: 1, exclude: [".git/**", "ignored/**"], types: {} });
  await mkdir(path.join(root, "ignored"));
  await writeFile(path.join(root, "ignored", "bad.md"), "not frontmatter");

  const checked = runCli(root, ["check"]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.json?.result?.filesScanned, 0);
  const excludedNew = runCli(root, ["new", "ignored/new.md"]);
  assert.equal(excludedNew.status, 1);
  assert.deepEqual(diagnosticCodes(excludedNew), ["excluded_destination"]);
  const missing = runCli(root, ["find", "000001AAAA"]);
  assert.equal(missing.status, 1);
  assert.deepEqual(diagnosticCodes(missing), ["id_not_found"]);
});

test("refuses lookup and creation when the managed scan is incomplete", async () => {
  const root = await workspace();
  await initialize(root);
  await writeFile(path.join(root, "valid.md"), "---\ndocument_type: document\nid: \"000001AAAA\"\n---\n");
  await writeFile(path.join(root, "broken.md"), "not frontmatter");

  const found = runCli(root, ["find", "000001AAAA"]);
  assert.equal(found.status, 1);
  assert.equal(diagnosticCodes(found).includes("scan_incomplete"), true);
  const created = runCli(root, ["new", "new.md"]);
  assert.equal(created.status, 1);
  assert.equal(diagnosticCodes(created).includes("scan_incomplete"), true);
});

test("rejects unsafe destinations, existing files, and active writer locks", async () => {
  const root = await workspace();
  await initialize(root);
  await writeFile(path.join(root, "existing.md"), "leave me");

  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "../outside.md"])), ["path_outside_workspace"]);
  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "note.txt"])), ["invalid_destination"]);
  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "existing.md"])), ["destination_exists"]);
  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "missing/note.md"])), ["invalid_destination"]);

  const external = await workspace();
  await symlink(external, path.join(root, "linked"), "dir");
  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "linked/note.md"])), ["unsafe_destination"]);

  await mkdir(path.join(root, ".conformer", "write.lock"));
  assert.deepEqual(diagnosticCodes(runCli(root, ["new", "locked.md"])), ["workspace_busy"]);
  assert.equal(await readFile(path.join(root, "existing.md"), "utf8"), "leave me");
});

test("returns exit status 2 for usage failures and deterministic JSON diagnostics", async () => {
  const root = await workspace();
  await initialize(root);
  const usage = runCli(root, ["new"]);
  assert.equal(usage.status, 2);
  assert.deepEqual(diagnosticCodes(usage), ["usage"]);

  await writeFile(path.join(root, "z.md"), "invalid");
  await writeFile(path.join(root, "a.md"), "invalid");
  const checked = runCli(root, ["check"]);
  assert.equal(checked.status, 1);
  assert.deepEqual(checked.json?.diagnostics?.map((diagnostic) => diagnostic.path), ["a.md", "z.md"]);
  assert.equal(checked.stderr, "");
});
