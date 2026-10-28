# CDB reference review

October 28, 2026. Read-only source inspection; no legacy scripts were executed or copied into Conformer.

## Available references and limits

The intended current reference is [Cody-Design-Build/CDB-OS](https://github.com/Cody-Design-Build/CDB-OS). The connected GitHub account returned 404 for that repository during this review. This does not establish that the repository is missing; access is unresolved.

The local `CDB Team/System Testing/CDB-OS` copy is a document comparison snapshot. Its README explicitly says that `.agents`, sync scripts, Git metadata, and app settings were excluded. It cannot serve as the full CLI source review.

Older helpers are available under `CDB Team/Archive/Legacy CDB Operations/`:

- `.agents/lib/cdb_markdown.py`
- `.agents/skills/cdb-jobs/scripts/jobs.py`
- `.agents/skills/cdb-tasks/scripts/tasks.py`
- `.agents/skills/cdb-contacts/scripts/contacts.py`

These historical files are the basis for the observations below. They are not claimed to be the current CDB-OS implementation. Paths are relative to the shared team folder; no business records or personal details are reproduced here.

A subsequent broader local search and GitHub retry did not locate the intended six-character ID generator. The document copy uses a different ID convention from the archived sequential-contact helper. See [document identity design](IDENTITY.md) for the observed shapes and the distinction between source evidence and unverified generation behavior.

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

## Current CDB-OS review still required

Once the actual repository or checkout is accessible, inspect its README, applicable agent instructions, CLI entry point, type definitions, write helpers, link resolution, tests, and packaging. Record the exact commit reviewed. Compare findings with this historical review rather than assuming continuity.

Do not run old normalization commands against the current business folders. Review whether code is worth reusing only after its behavior, dependencies, licensing, and fit with the new specification are understood.
