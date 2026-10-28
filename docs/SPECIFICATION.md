# Conformer first-version specification

Draft 0.6 · October 28, 2026 · Scope agreed; planning only

## One job

Give documents an identity and check their metadata. The files are the system; Conformer is a small local tool that helps keep them consistent.

Everything is a document, but not everything is Markdown. Start by managing Markdown metadata. Spreadsheets, PDFs, CSV, HTML, images, and other files coexist normally, without registration or sidecars.

Files remain authoritative and usable without Conformer. No server, database, account, network connection, or Obsidian plugin is required. Sync is external.

## Workspace

Point each invocation at one folder, independently of the current working directory:

```text
conformer --workspace /path/to/documents check
```

Scan Markdown within that folder recursively, with exclusions in one local `.conformer/workspace.json` configuration file. Exclude Conformer's own configuration; do not follow symlinks or scan outside the root. Documents can live anywhere within scope. No prescribed folder hierarchy.

## Metadata and types

One built-in type, `document`, requires only:

```yaml
---
document_type: document
id: "TNLC00K7Q2"
---
```

The ID is a synthetic example, not one to reuse. No required title, date, status, body structure, or sidecar.

Custom types are simple workspace configuration entries listing additional required fields. They inherit the ID and type requirements. Start with presence checks for those fields; richer field constraints and CLI editing of definitions can come later. No bundled business schemas or schema-version system is needed to start. Extra metadata is allowed and preserved.

## Identity and finding

Use the selected uppercase Base36 Unix-seconds timestamp plus four securely random Base36 characters: ten characters currently. See [the ID design](IDENTITY.md) for exact generation rules.

IDs remain unchanged when a file is edited, moved, or renamed. New independent documents get new IDs. Creation checks for existing IDs and retries a colliding candidate. After sync, report established duplicates without automatically changing either file.

`find <id>` scans metadata and returns the current path, including after a manual move. Missing or duplicate matches produce an error. No persistent index is required.

## Small command surface

These are proposed spellings, not installed software:

| Command | Purpose |
|---|---|
| `init` | Create the workspace configuration without reorganizing files. |
| `new <path>` | Create a document with valid metadata and a fresh ID; optionally select a configured type and supply its required fields. |
| `check` | Report malformed YAML, missing required fields, unknown types, invalid IDs, and duplicate IDs. |
| `find <id>` | Return the unique matching document's current path. |

Provide readable output and a JSON option for agents. Creation must stay inside the workspace and never overwrite an existing destination. Checking and finding do not modify files. Validation errors identify the file and problem.

## Links and other deferred work

Use ordinary file links. The first version does not store relationships, generate navigation sections, repair links, or provide move/rename workflows. Manual moves may require ordinary link edits.

Metadata updates, CLI type-definition editing, richer field rules, non-Markdown metadata, folder policies, copy/delete workflows, and a job type can be added when needed. These are not prerequisites.

Surface is an authorized code reference. Reuse small suitable helpers if useful; do not inherit its database, cloud sync, or application lifecycle. See [the reference review](CDB-REFERENCE-REVIEW.md).

## Acceptance checks

- Create a generic document and a configured custom type with their required fields.
- Detect malformed YAML, missing fields, unknown types, invalid IDs, and duplicates without changing files.
- Find a document after a manual rename or move.
- Retry an injected new-ID collision and report duplicate IDs after combining offline files.
- Reject existing destinations and paths outside the workspace.
- Operate offline; leave other formats and document bodies untouched.

The scope and ID format are agreed. Implementation language remains an implementation choice, not a reason to expand this specification. Start building only when David directs it. No production migration is authorized.
