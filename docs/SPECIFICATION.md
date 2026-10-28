# Conformer first-version specification

Version 1.0 · October 28, 2026 · Implementation authorized

## One job

Give documents an identity and check their metadata. The files are the system; Conformer is a small local CLI that helps keep them consistent.

Everything is a document, but not everything is Markdown. The first version manages Markdown metadata. Spreadsheets, PDFs, CSV, HTML, images, and other files coexist normally, without registration or sidecars.

Files remain authoritative and usable without Conformer. No server, database, account, network connection, or Obsidian plugin is required. Sync is external.

## Workspace and managed files

Every invocation names one existing workspace directory, independently of the current working directory:

```text
conformer --workspace /path/to/documents check
```

Conformer resolves the workspace root once, scans it recursively, and never scans outside it. Every regular file whose extension is `.md`, compared case-insensitively, is a managed document unless excluded. Managed documents must have valid Conformer metadata; exclusions are the explicit way to keep ordinary Markdown outside Conformer.

Do not follow file or directory symlinks. Always exclude `.conformer/**`. Apply the same scan scope to `new`, `check`, and `find`; an ID outside that scope does not participate in validation or lookup. `new` rejects a destination that is excluded.

Workspace configuration lives at `.conformer/workspace.json`:

```json
{
  "version": 1,
  "exclude": [".git/**"],
  "types": {
    "job": {
      "required": ["job_name"]
    }
  }
}
```

Paths and exclusion patterns are relative to the workspace root and use `/` separators. Patterns use Minimatch syntax with dotfiles enabled and negation and comments disabled. The built-in `.conformer/**` exclusion cannot be removed.

`version` must be `1`. `exclude` is an array of unique nonempty strings. `types` is an object. Custom type names match `[a-z][a-z0-9_-]*`; field names match `[A-Za-z_][A-Za-z0-9_-]*`. A custom type contains only a `required` array of unique field names. It cannot redefine `document` or require the reserved `document_type` and `id` fields. Unknown configuration keys and malformed configuration are errors.

`init` requires an existing directory. It creates `.conformer/workspace.json` with version 1, the default `.git/**` exclusion, and no custom types. It may create `.conformer`, but refuses symlinks and never replaces an existing configuration file.

## Markdown metadata

Metadata is a YAML frontmatter mapping. An optional UTF-8 byte-order mark may precede the opening delimiter; otherwise `---` must be the first line. A later line containing only `---` closes the frontmatter. Both LF and CRLF input are accepted.

Use safe YAML parsing. The root must be a mapping. Duplicate keys, aliases, merge keys, custom tags, multiple YAML documents, and malformed YAML are errors. Field names are case-sensitive strings. Extra metadata is allowed.

A required field must exist and must not be `null`. A string value must contain at least one non-whitespace character. Boolean `false`, numeric zero, and empty collections satisfy presence; richer field constraints are deferred.

The built-in type is `document`:

```yaml
---
document_type: document
id: "TNLC00K7Q2"
---
```

The ID is a synthetic example, not one to reuse. `document` requires no title, date, status, body structure, or sidecar. Custom types inherit the `document_type` and `id` requirements and add their configured required fields.

Checking and finding are read-only. They never normalize frontmatter, rewrite line endings, or modify document bodies.

## Identity and finding

Use an uppercase Base36 Unix-seconds timestamp plus four securely random Base36 characters. The timestamp is at least six characters and grows rather than wrapping. See [the ID design](IDENTITY.md) for generation and validation rules.

IDs remain unchanged when a file is edited, moved, renamed, archived, or has its type changed. New independent documents get new IDs. After external sync, report duplicate IDs without automatically changing either file.

`find <id>` scans metadata and returns the unique current path. It fails when the ID is invalid, missing, or duplicated. It also fails with a scan-incomplete error if any in-scope document cannot be read or validated, because uniqueness then cannot be established.

## Creation and write safety

`new` requires valid configuration and a complete, error-free scan. It holds an exclusive workspace writer lock while checking IDs and creating the file; another writer fails with a workspace-busy error. An abandoned lock is reported explicitly and is never silently broken.

Generate an ID, compare it with all in-scope IDs, and retry with fresh secure randomness after a collision. Stop with an explicit error after 32 failed candidates. Secure-random failure is an error.

The destination must:

- be a `.md` path inside the resolved workspace;
- be inside the managed scan scope;
- have an existing real-directory parent;
- have no symlink in any path component; and
- not already exist, including as a dangling symlink.

Creation uses an atomic create-if-absent operation and never overwrites. A failed write removes only the incomplete file created by that invocation. `new` writes frontmatter and an empty body; it does not create parent directories or templates.

## Command surface

Global options precede the command:

```text
conformer --workspace <directory> [--json] <command>
```

| Command | Purpose |
|---|---|
| `init` | Create workspace configuration without reorganizing files. |
| `new <path> [--type <name>] [--field <name>=<value>]...` | Create a managed document. The default type is `document`; field values are strings. |
| `check` | Report configuration, scan, YAML, required-field, type, ID, and duplicate-ID errors. |
| `find <id>` | Return the unique matching document's current path. |

`--field` may supply required or additional metadata, but cannot set `document_type` or `id`. Repeated field names are usage errors. Missing fields required by the selected type are errors.

Human output goes to standard output for successful results and standard error for errors. `--json` writes exactly one JSON value to standard output and reserves standard error for unexpected runtime failures. Paths in results and diagnostics are workspace-relative POSIX paths.

JSON success has this common envelope:

```json
{
  "ok": true,
  "command": "find",
  "workspace": "/absolute/workspace",
  "result": {}
}
```

JSON failure has this common envelope:

```json
{
  "ok": false,
  "command": "check",
  "workspace": "/absolute/workspace",
  "diagnostics": [
    {
      "code": "missing_field",
      "path": "notes/example.md",
      "field": "id",
      "message": "Missing required field: id"
    }
  ]
}
```

Diagnostic arrays are sorted by path, code, field, then message. Omit `path` and `field` when they do not apply. Exit status is 0 for success, 1 for operational or validation failure, and 2 for command-line usage errors. `check` exits 1 when it reports any diagnostic.

Command results contain:

- `init`: `configPath`;
- `new`: `path`, `id`, and `documentType`;
- `check`: `filesScanned`, `documentsValid`, and `diagnostics`;
- `find`: `id` and `path`.

## Links and deferred work

Use ordinary file links. The first version does not store relationships, generate navigation sections, repair links, or provide move/rename workflows. Manual moves may require ordinary link edits.

Metadata updates, CLI type-definition editing, richer field rules, non-Markdown metadata, folder policies, copy/delete workflows, templates, and business-specific types remain deferred.

Surface is an authorized code reference. Reuse small suitable helpers if useful; do not inherit its database, cloud sync, or application lifecycle. See [the reference review](CDB-REFERENCE-REVIEW.md).

## Acceptance checks

- Initialize a workspace without replacing existing configuration.
- Create a generic document and a configured custom type with their required fields.
- Detect malformed YAML, duplicate keys, missing or blank fields, unknown types, invalid IDs, and duplicate IDs without changing files.
- Honor exclusions consistently across creation, checking, lookup, and duplicate detection.
- Find a document after a manual rename or move.
- Retry an injected new-ID collision and report duplicate IDs after combining offline files.
- Reject existing destinations, non-Markdown destinations, excluded destinations, symlink paths, and paths outside the workspace.
- Serialize concurrent writers and use atomic create-if-absent behavior.
- Produce deterministic human and JSON results with the documented exit statuses.
- Operate offline; leave other formats and document bodies untouched.

The first-version scope, ID format, and behavioral contract are agreed. Implementation is authorized. No production document migration is authorized.
