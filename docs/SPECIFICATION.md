# Conformer first-version specification

Draft 0.4 · October 28, 2026 · Planning only

## Purpose

Everything is a document. Start with a small local tool that creates document IDs, finds documents, checks metadata, and maintains links. Build additional capabilities when a real workflow needs them.

Files are authoritative. Core operation needs no server, database, account, agent integration, or network connection. File synchronization remains external. The earlier broad design is preserved in Git history; it is not the first-version checklist. Reviewing the old CLI is optional reference work, not a blocker.

## One workspace and one built-in type

Each invocation explicitly selects a root folder, independent of the current working directory:

```text
conformer --workspace /path/to/documents check
```

Scan managed Markdown recursively within that folder. A small `.conformer/workspace.json` identifies the workspace and scan exclusions. Do not scan outside the root or follow symlinks. Files can live anywhere in the scope; the first version does not enforce a folder hierarchy.

The one built-in type requires only:

```yaml
---
document_type: document
id: "019a0000-0000-7000-8000-000000000001"
---
```

The ID above is a synthetic format example, not one to reuse. No required title, date, status, body structure, or sidecar. Use the filename as the display label initially.

Spreadsheets, PDFs, CSV, HTML, images, and other formats coexist as ordinary files. Independent metadata management for those formats is deferred; they are not converted into Markdown or automatically given sidecars. Agents can use their normal format-aware tools.

## Identity

**Recommendation for review: UUIDv7**, generated with a standard implementation using secure randomness. Its time component fits the requested time-based design and independent generation works offline. See [the ID proposal](IDENTITY.md).

- Generate once when creating a document.
- Preserve the full ID when editing, moving, renaming, or later changing type.
- A new independent document gets a new ID. Synchronizing the same document retains its ID.
- Check for locally existing IDs before creating a file; report duplicate IDs after synchronization.
- Never silently choose between two files with the same ID or automatically rekey one: it could be a conflict copy of the same document.
- The ID is not the filename, document number, revision, or content hash.

No arbitrary offline ID scheme promises mathematical impossibility of collision. The goal is negligible generation risk plus explicit duplicate detection. IDs also do not prevent two people from creating separate documents for the same real-world job.

## Find and link

Start with direct filesystem scans; no persistent index is required. `find <id>` returns the current path. A missing ID or duplicate match is an error.

**Proposed minimal link convention:** an optional `links` metadata list stores full target IDs. `link <source-id> <target-id>` adds the relationship and maintains a clearly marked generated block of ordinary relative Markdown links in the source document. Labels come from target filenames. The IDs are authoritative; the generated links are navigation for Obsidian and other Markdown readers.

A CLI move/rename preserves identity and refreshes affected generated links, including outgoing relative links when their source moves. An external move leaves the ID discoverable, but path links can be stale until checked and refreshed. Do not claim that embedding an ID makes ordinary Markdown links automatically follow moves.

Free-form body links remain ordinary Markdown. The first version does not promise automatic repair of every inline link, embed, or external application's references. Exact generated-block markers are to be settled during implementation planning.

## Small command surface

These are proposed commands, not installed software:

| Command | Purpose |
|---|---|
| `init` | Create workspace configuration without reorganizing documents. |
| `new <path>` | Create a generic document with a fresh ID; never overwrite a destination. |
| `find <id>` | Resolve a full ID to its current path. |
| `check` | Report malformed metadata, missing/duplicate IDs, unresolved ID links, and stale generated navigation. |
| `link <source-id> <target-id>` | Store the target ID and generate a normal clickable link. |
| `refresh-links` | Regenerate managed navigation from ID relationships. |
| `move <id> <new-path>` | Move or rename and update affected generated navigation. |

Provide readable output and a JSON option for agents. Writes should have a preview option, check the versions they read, preserve unrelated body content, and verify saved results. If a move or link refresh changes multiple files and is interrupted, report the actual partial result and a recoverable next step. Do not claim atomic multi-device updates.

## Checks that prove the foundation

1. Create documents on two offline devices, then combine the files and validate IDs.
2. Create several documents in the same millisecond and verify distinct generated IDs.
3. Find a document after a manual rename or move.
4. Move a linked document through the CLI and verify the generated links still work.
5. Detect a copied/conflicted duplicate ID without changing either file.
6. Detect malformed YAML and unresolved target IDs without hiding those documents.
7. Confirm a metadata update preserves narrative content and a stale write is rejected where detectable.
8. Operate without internet access and open the documents without Conformer.

## Later increments

Add custom type creation and typed metadata updates next; define the job master as the first business example. Then consider non-Markdown metadata, richer queries, folder policies, copy-as-new, and recoverable deletion. None requires a bundled business schema library.

A job master holds general job information and links to separate budgets and other documents. It does not become the budget itself.

Next decision: accept or adjust the ID and minimal linking proposals. Then settle implementation language and explicitly start the first build. This document does not authorize production migration.
