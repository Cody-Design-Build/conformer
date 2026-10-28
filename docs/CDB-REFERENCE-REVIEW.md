# CDB reference review

October 28, 2026. Read-only source inspection; no legacy scripts were executed or copied into Conformer.

## Surface source found and reuse authorized

David identified [Cody-Design-Build/Surface](https://github.com/Cody-Design-Build/Surface) and authorized borrowing suitable CLI code. Reviewed source commit: `ed9c427b5a821a24c37e81857b97f8edebc12197`. This resolves the search for a concrete time-based ID implementation. It does not authorize starting the Conformer build or copying Surface's entire architecture.

### Verified ID generator

[`surface_id()`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/supabase/migrations/0001_types_engine.sql#L5-L24) creates **seven Base32 timestamp characters plus five random characters**, for **12 characters total**. The timestamp is Unix seconds. The lowercase Crockford alphabet is `0123456789abcdefghjkmnpqrstvwxyz`; it omits `i`, `l`, `o`, and `u`. The five-character suffix has 32^5 = 33,554,432 possibilities per timestamp value.

The function is SQL and uses PostgreSQL `random()`. No replacement definition was found in the later migrations inspected through 0009. Surface's local runtime applies those migrations to its embedded database. This source verifies the pattern; it does not prove live deployment state or runtime collision rates.

Conformer can implement the encoding directly in its CLI, using the runtime's secure random source and local duplicate checks. No database is required for that algorithm. The existing 12-character format and Conformer's selected 10-character Base36 format differ. David chose the shorter format; adapt the encoding parameters and randomness source accordingly.

### Reuse plan

| Source | Useful piece | Adaptation for Conformer |
|---|---|---|
| [`cli/src/links.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/src/links.ts) | Functions separating stored IDs from displayed names; headings, labels, embeds, and code-span handling | This module has no imports and is a strong extraction candidate. Its ID extractor accepts lowercase alphanumerics; adapt if Conformer uses uppercase. Its stored `[[id:…]]` links are rendered through Surface, so do not claim native Obsidian resolves them by ID. Preserve the files-only authority model. |
| [`cli/src/markdown.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/src/markdown.ts) | YAML parser integration, filename sanitation, path/link-label helpers | Extract small helpers. Replace database record types. Its canonicalization trims/reformats body whitespace, which must not become Conformer's metadata-only write behavior. |
| [`cli/src/normalize.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/src/normalize.ts) | Typed value validation, normalization notices, and resolver interface | Revisit when adding custom types. Avoid importing phone-specific behavior or automatic business-value coercions into the minimal generic document. |
| [`cli/src/config.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/src/config.ts) | Workspace discovery and known-root patterns | Honor Conformer's explicit root selection. Keep cloud/session configuration out. Review write safety before reusing JSON persistence helpers. |
| [`cli/test/links.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/test/links.ts) | Scenarios for rename, aliases, headings, unresolved links, attachments, and code blocks | Adapt fixtures into filesystem tests. The existing test harness starts Surface's local database and is not a drop-in Conformer test suite. |
| [`cli/src/main.ts`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/cli/src/main.ts) | Selected argument/output conventions | Write a small command entry point; do not import the database, server, installer, sync, and app command graph. |

The CLI is TypeScript. Reusing these helpers favors TypeScript as an implementation candidate, but runtime/packaging remain to be chosen. Keep original provenance for adapted code. No source was installed, executed, or copied into application code during this review, and the tests were read rather than run.

The key architectural difference is explicit: Surface stores authoritative records in a database and renders Markdown checkouts. Conformer keeps its authoritative state in documents. Reuse pure transformations and test scenarios while replacing storage-dependent behavior.

## Historical references and limits

An earlier attempted reference was [Cody-Design-Build/CDB-OS](https://github.com/Cody-Design-Build/CDB-OS). The connected GitHub account returned 404 for that repository during this review. This does not establish that the repository is missing; access is unresolved.

The local `CDB Team/System Testing/CDB-OS` copy is a document comparison snapshot. Its README explicitly says that `.agents`, sync scripts, Git metadata, and app settings were excluded. It cannot serve as the full CLI source review.

Older helpers are available under `CDB Team/Archive/Legacy CDB Operations/`:

- `.agents/lib/cdb_markdown.py`
- `.agents/skills/cdb-jobs/scripts/jobs.py`
- `.agents/skills/cdb-tasks/scripts/tasks.py`
- `.agents/skills/cdb-contacts/scripts/contacts.py`

These historical files are the basis for the observations below. They are not claimed to be the current CDB-OS implementation. Paths are relative to the shared team folder; no business records or personal details are reproduced here.

A subsequent broader local search and GitHub retry did not locate the intended six-character ID generator. The document copy uses a different ID convention from the archived sequential-contact helper. Those observations concern the CDB-OS document snapshot, not the separate Surface generator verified below.

## Useful patterns and changes to make

| Observed behavior | Conformer design implication |
|---|---|
| Shared Markdown helper plus separate create/validate/normalize commands | Retain one shared validation and write contract across all commands. |
| Helpers calculate their root from the script's own location | Replace with explicit workspace selection, independent of installation and current directory. |
| Type names, field lists, folder names, and body sections live in Python constants | Move business rules into portable workspace definitions. |
| Parser rejects duplicate fields | Preserve explicit duplicate-key diagnostics. |
| Parser only accepts a narrow flat scalar/list convention; rejects indentation, blank frontmatter lines, and nested metadata | Choose and document YAML support deliberately; do not treat this parser as general YAML support. |
| Parser/rendering reconstructs line endings and trims body whitespace | Require preservation tests for metadata-only edits; do not inherit incidental body rewrites. |
| `write_if_changed` re-reads, compares prior content, uses a temporary file and replacement, then verifies the result | Reuse the intent of stale-write detection and verification; inspect races and durability before making stronger guarantees. |
| Job-wide normalization also creates folders and moves legacy layouts | Separate representation normalization, schema migration, and filing operations. A metadata repair must not unexpectedly reorganize the workspace. |
| Contact creation scans existing numeric IDs and increments the maximum | Use offline-safe identity allocation; retain human numbering separately if wanted. |
| Task discovery skips documents whose parsing fails | Inventory malformed managed files and report incomplete scans; do not silently hide errors. |
| Historical task rules require Todo/Done sections and reject checkboxes | Decide task structure afresh; do not inherit these business conventions. |
| Some create operations write directly and validate afterward | Design prevalidation, collision handling, interrupted creation, and retry behavior before implementation. |

The old helper's read-compare-replace sequence does not exclude external edits between the comparison and replacement, nor does it create distributed transactions. Keep the useful pattern without overstating its guarantee.

## Optional further CDB-OS review

If further CDB-OS review becomes useful, inspect its README, applicable agent instructions, CLI entry point, type definitions, write helpers, link resolution, tests, and packaging. Record the exact commit reviewed. Compare findings with this historical review rather than assuming continuity.

Do not run old normalization commands against the current business folders. Review whether code is worth reusing only after its behavior, dependencies, licensing, and fit with the new specification are understood.
