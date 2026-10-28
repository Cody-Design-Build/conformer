# Conformer system and CLI specification

Draft 0.3 · October 28, 2026 · Owner: David Cody

**Status: planning, not approved for implementation.** Confirmed requirements below come from David's direction. The remaining design is a proposal to review. Example commands, keys, and layouts are illustrative; they do not describe existing software.

## 1. Purpose and guiding principle

**Everything is a document.** Business information lives in a locally complete collection of ordinary files that people and agents can understand and use. Conformer supplies deterministic operations for identity, metadata, relationships, and document lifecycle without becoming the sole way to access the information.

Documents may be Markdown, XLSX, CSV, PDF, HTML, images, or other useful formats. Each format retains its native purpose. Conformer must not force calculations, signed evidence, or drawings into Markdown.

The first customer is Cody Design Build. The engine is generic; the first workspace's document types are defined together, one at a time. Building a hosted platform, universal document editor, or plugin marketplace is outside the initial scope.

## 2. Confirmed requirements

| ID | Requirement |
|---|---|
| R01 | Local documents are authoritative. No hosted database, MCP connection, or cloud API is required for core operation. |
| R02 | File synchronization is external. Dropbox or another transport can deliver files; Conformer does not require a particular provider. |
| R03 | Documents remain browsable from Obsidian and ordinary file tools. Native applications may be needed to edit or calculate particular formats. |
| R04 | A CLI invocation can select a workspace independently of the shell's current working directory or the CLI installation directory. |
| R05 | A workspace defines its document types and metadata rules in readable configuration. JSON is the proposed format, not yet a final choice. |
| R06 | Documents can live anywhere within the configured scope unless an explicit type or workspace rule restricts their location. |
| R07 | Durable document identity uses a stable ID and type, independent of path and filename. |
| R08 | Conformer detects missing, invalid, inconsistent, or drifting metadata and reports actionable diagnostics. |
| R09 | Agents use deterministic CLI operations for structured metadata and managed lifecycle changes rather than constructing or rewriting YAML directly. |
| R10 | The CLI supports defining new document types and creating, updating, finding, moving, renaming, and deleting managed documents, with relationship handling. |
| R11 | The system remains useful offline; synchronization can occur later. |
| R12 | Review CDB-OS as a reference without automatically adopting its schema, folders, conventions, or implementation. |
| R13 | Complete and agree on the specification before starting the build. |
| R14 | Ship one minimal built-in type, `document`, requiring a document type and stable ID. Define business types through the CLI rather than bundling a business schema library. |
| R15 | Define `job` as the first custom workspace type: the job master document, with general information and links to separate budgets and other documents. |

## 3. System boundary

The authoritative workspace contains documents, type definitions, templates, and any approved metadata companions. Removing Conformer must leave those files usable. Any ID index, search cache, generated view, or later database must be rebuildable from the authoritative collection.

Core operation requires no daemon, server, account, LLM, network connection, or Obsidian plugin. A future UI may call the same operations but may not introduce competing writable facts.

The CLI manages structure and documented relationships. It does not execute payments, verify the truth of a business assertion, recalculate spreadsheets by merely reading their cached values, or infer that all other devices are synchronized.

Human editing remains possible. Conformer cannot prohibit invalid edits made by other applications; it detects them and refuses unsafe dependent operations. Schema conformance, business accuracy, and synchronization state are separate claims.

## 4. Workspace selection and configuration

**Proposed initial model:** one explicitly selected root directory per invocation. No running workspace service is needed. Optional local aliases map names to roots; aliases are convenience settings, not part of the portable business data.

```text
conformer --workspace /absolute/path/to/workspace check
conformer --workspace cdb document list --type job --json
```

Selection rules:

- An explicit path or registered alias selects the root.
- Without an explicit selection, optional discovery may locate a workspace configuration in the current directory or its ancestors. It must fail clearly if none exists; never silently select an unrelated default.
- Document paths supplied to a selected workspace resolve relative to that root, not the caller's working directory. Absolute input-file arguments may be used for external command payloads; they do not authorize writes outside the root.
- Each result identifies the resolved workspace. Mutations cannot cross its boundary through `..`, symlinks, or ambiguous path resolution.
- Proposed v1: exclude nested workspace roots from the parent scan, and do not follow symlinks. Cross-workspace references and multi-root workspaces are deferred.

Proposed portable layout:

```text
<workspace>/
  .conformer/
    workspace.json
    types/
      <type>.json
    templates/
  <ordinary documents in their chosen folders>
```

Configuration defines a format version, workspace ID, type-definition location, include/exclude rules, and optional folder policies. Machine-specific aliases, caches, and transient locks stay outside the synchronized collection. Recoverable operations may need portable receipts or tombstones; their exact storage is an open design choice.

**Configuration precedence proposal:** explicit command options select the workspace; workspace configuration supplies its rules; type definitions supply per-type defaults and restrictions. A command cannot silently override a mandatory type rule. Configuration never executes shell commands or downloads schemas during ordinary use.

## 5. Managed documents and formats

A workspace can contain both managed documents and ordinary supporting files. Scanning does not automatically assign IDs to every photograph or PDF. Configuration specifies which files require metadata; unclassified files remain visible in inventory rather than disappearing from results. David identified extensive sidecar files as a clutter concern. Metadata should be introduced only where identity, validation, or a workflow requires it; document-first does not mean a metadata companion for every file.

| Format | Proposed responsibility |
|---|---|
| Markdown | Read and patch YAML frontmatter; preserve body content during metadata changes. |
| XLSX | Track identity, type, references, and optional declared workbook structure. Preserve formulas and native content. Calculation requires an explicitly supported engine. |
| CSV | Track identity and optional column rules. Dialect, encoding, null handling, and row-ID rules require a type decision. |
| PDF, images, Office documents | Track identity and links without rewriting original document bytes. |
| HTML | Preserve usable HTML. Treat metadata separately unless an explicit embedded convention is selected; scanning does not execute scripts. |
| Other formats | Preserve and inventory; clearly report the level of validation actually supported. |

**Open decision D01:** metadata for formats without frontmatter. Neighboring sidecars remain an option, but are no longer the recommended default. Review these choices by document type:

| Choice | Appropriate use | Tradeoff |
|---|---|---|
| Ordinary file linked from an existing managed document | Supporting photos, plans, confirmations, and attachments that need no independent workflow | No new metadata file. A path link alone does not provide stable identity after an external move. |
| Native embedded metadata | A format with a portable, inspectable convention that survives its normal editors | Keeps identity with the file; requires format-specific verification and must not modify issued evidence. |
| Workspace metadata catalog under `.conformer/` | Independently managed non-Markdown files needing IDs and typed fields | Keeps working folders clean, but separates metadata from payloads and requires rename/copy/conflict handling. |
| Neighboring sidecar | A type whose portability as a payload-plus-metadata pair justifies an extra file | Visible clutter and the risk of separating the pair. |

**Proposed starting approach:** supporting files remain ordinary files; existing managed documents link to them. Decide metadata for an independently managed workbook, PDF, or other format when defining that type. Do not create empty Markdown wrappers merely to hide the same one-companion-per-file overhead.

If a workspace catalog is selected, it is authoritative metadata stored as ordinary files, not a disposable index. Its contents must be included in backups and exports. Catalog layout (one JSON file, grouped files, or per-ID entries), external-move detection, and reconciliation remain open. A content hash can help locate candidates but cannot replace identity: editing changes bytes, and distinct documents may have identical bytes. Ambiguous matches require resolution rather than automatic reassignment.

If sidecars are selected, define naming, payload association, orphan detection, collisions, and paired move/restore behavior. Copying a payload without its sidecar must be reported, not guessed into a new identity. Do not impose metadata fields inside a binary format without an adapter contract.

## 6. Type definitions and schema evolution

Conformer ships one built-in [document type](types/document.md). Its only required metadata is a type and ID. The proposed YAML spelling is `document_type` and `id`, matching the inspected legacy convention; exact key spelling remains subject to review. No title, date, status, job relationship, body heading, or folder is required by the generic type.

Business types such as [job](types/job.md) are created as ordinary workspace definitions through the CLI. They share the identity rules but supply their own fields and workflows. This does not require a general schema-inheritance system. Installation must not preload jobs, contacts, tasks, budgets, or procurement types.

Each type definition should describe:

- Type key, description, version, supported formats, and metadata carrier.
- Required and optional fields, scalar/list/object types, allowed values, and explicit defaults.
- Missing versus empty versus null semantics; unknown-field policy.
- Reference fields, permitted target types, cardinality, and whether archived targets are allowed.
- Creation template and optional filename, default-folder, and required-location rules.
- Any declared body or table structure and supported deterministic edits to it.
- Issued/immutable behavior where appropriate.

The generic document requires only `document_type` and `id`. Schema versions still need an explicit resolution and migration contract, but a per-document `schema_version` is no longer proposed as a universally required third field. Whether versions are pinned in workspace configuration or carried by types/documents remains open. Importing existing IDs must not silently regenerate them.

Use JSON Schema for ordinary value constraints if selected after review, with a small documented companion definition for references, templates, and filing policies. Do not invent a general programming language for rules. Workspace schemas are local, versioned data; loading them must not execute code.

Creating a type generates a draft definition. It must validate before use. Changing an active definition requires an impact report on existing documents and an explicit version/migration decision. A schema change alone never rewrites documents or marks them upgraded.

Normalization handles syntax and approved representation changes. It must not invent missing business facts, silently coerce an identifier into a number, resolve competing identities, or erase unfamiliar fields. Migration is separate from normalization and filing changes.

## 7. Identity, discovery, and relationships

IDs are unique within the workspace across managed types. New IDs should be safe to allocate independently on offline devices; avoid a shared next-number counter as the identity source. Human document numbers can be separate fields. Exact ID format is undecided.

See [the identity design notes](IDENTITY.md) for observed legacy schemes and proposed lifecycle rules. A document becoming a job keeps its ID; its type is not encoded into its identity. Updating content also preserves identity. A revision/hash identifies a content state, not the document itself. Copying to create a distinct document allocates a new ID through an explicit operation; a replicated copy of the same document retains its ID.

An index maps IDs to current paths and types. It is disposable. Duplicate IDs are a blocking ambiguity for ID-based operations; never choose the newest file or first match silently. Archived documents retain their IDs. Deletion and restoration must define whether an ID remains reserved.

Structured relationships store IDs. Display names, relative links, and Obsidian wikilinks are navigation. They must not become a second editable relationship list.

The CLI can find a document by ID, list incoming/outgoing relationships, and report unresolved links. Moving a document preserves its ID. Repair of supported relative links must account for both incoming links and outgoing links whose relative base changed.

**Open decision D02:** native link conventions for Obsidian and other readers. Standard Markdown relative links provide a baseline; wikilinks may also be supported. An ID alone does not make a clickable native Obsidian link. Define supported syntax, aliases, anchors, embeds, and ambiguous duplicate filenames before promising automatic repair.

The CLI must distinguish a complete workspace reference check from partial coverage. Links embedded in PDFs or unsupported workbook formulas cannot be claimed repaired. Referenced row/item IDs in schedules or spreadsheets need a separately approved convention; one identified row does not imply one file.

## 8. Proposed command surface

Command names are a design sketch. All mutation commands should support a non-writing preview; broad changes use a plan tied to observed document and configuration versions.

| Command family | Purpose |
|---|---|
| `workspace init / inspect / list` | Explicit setup and scope discovery; initialization never restructures existing documents. |
| `type list / show / create / check` | Discover type contracts and create/validate draft definitions. |
| `document list / show / locate` | Find by ID, type, metadata, or current path. |
| `document create` | Validate inputs, allocate identity, apply declared defaults/template, and create without overwriting. |
| `document adopt` | Enroll an existing file without guessing its business type or rewriting its content. |
| `document update` | Apply typed field changes; distinguish setting null, removing a field, and leaving it unchanged. |
| `document retype / copy` | Proposed explicit operations: validate a new type while keeping identity, or create a distinct copy with a fresh ID. Do not treat a type change as an unchecked field edit. |
| `document rename / move` | Preserve identity; plan supported link and companion-file changes. |
| `document delete / restore` | Preview references; use recoverable removal by default. Permanent purge is deferred. |
| `links check / incoming / outgoing` | Inspect relationships and supported navigation links. |
| `check` | Non-mutating document, relationship, schema, and folder diagnostics. |
| `normalize` | Preview and apply narrowly defined representation repairs. |
| `migrate` | Plan a specific schema-version transition; no automatic migration on read. |
| `plan apply / inspect` | Apply or inspect a reviewed multi-file operation, with stale-input checks. |
| `index rebuild` | Reconstruct optional local discovery state from files. |

Typed JSON input through a file or stdin is proposed for reliable agent use. Avoid requiring shell-escaped YAML fragments. Provide text output for humans and a versioned JSON output contract for agents, plus stable diagnostic codes and documented exit statuses.

Example intended workflow:

```text
conformer --workspace cdb type show job --json
conformer --workspace cdb document create --type job --input /tmp/job-input.json --dry-run
conformer --workspace cdb document create --type job --input /tmp/job-input.json
conformer --workspace cdb document update <id> --input /tmp/patch.json --expect <revision>
conformer --workspace cdb check --json
```

Creation writes a complete valid document or leaves no completed document. A retry after an uncertain result must not create duplicates; define a creation request ID or equivalent recovery contract before implementation. IDs and timestamps are explicit operation outputs; deterministic workflows do not mean every new document receives identical bytes.

Document bodies may be edited with ordinary tools. Conformer updates must preserve them unless a dedicated content operation explicitly targets them. Formula edits and native spreadsheet editing remain outside generic metadata patching.

## 9. Validation and diagnostics

Validation covers configuration validity, metadata parsing, field constraints, uniqueness, typed references, supported links, and configured location policies. Body/table validation is opt-in per type and limited to declared supported structures.

Every diagnostic should provide a stable code, severity, relative path, document ID when known, field or line when available, explanation, and a deterministic suggested action when one exists. Separate errors from warnings and distinguish incomplete scans from clean scans.

Malformed managed files, unknown types, inaccessible files, conflict copies, and missing payloads remain visible. They must not silently drop out of inventory or summaries. Duplicate YAML keys and unsupported constructs must produce explicit diagnostics rather than ambiguous interpretation.

Scoped checks report their coverage. Workspace integrity claims require scanning all relevant managed documents. A mutation checks its affected dependencies against current files; deleting a target can invalidate otherwise unchanged documents.

Proposed behavior: unrelated existing errors do not prohibit every possible repair, but an operation cannot claim workspace validity or proceed through ambiguity in its own affected relationships. Define the exact blocking rules with the first type.

## 10. Writes, conflicts, and recovery

Single-file operations compare an expected revision/content hash, coordinate cooperating local CLI writers, preserve untouched content, avoid overwriting destinations, and verify the resulting file. Revision guards also cover applicable schema and workspace configuration.

These measures do not establish a global lock against editors, file sync, or offline devices. The implementation must document the remaining race window instead of calling a read-check-write sequence a universal compare-and-swap.

For moves, sidecar pairs, and link repairs, calculate the complete supported change set before writing. Multi-file work needs recoverable steps, before-state information, and an operation receipt. An interrupted operation must report exactly what changed and how to resume or reverse it without overwriting later edits. It is not an atomic multi-device transaction.

Deletion defaults to a recoverable action, checks incoming references, preserves evidence according to type policy, and does not silently cascade. Archive, delete, and business closure are different operations. Restore checks ID/path collisions and references before writing.

Plans are invalidated if inputs, relevant dependencies, or configuration change. Mutation results distinguish successful, no-op, rejected, partial, and recovery-required outcomes. Do not blindly retry an uncertain batch.

## 11. Offline operation and synchronization

Offline discovery, validation, creation, and editing must work against available local files. Results describe local state; they do not assert that another device has uploaded all changes.

Sync is not a dependency of core commands. Optional future status integrations cannot redefine a successfully synced collection as valid or conflict-free. Local locks must not be mistaken for distributed locks.

After synchronization, check for duplicate identities, divergent metadata, missing references, and interrupted companion-file operations. Preserve competing copies until reconciled. No last-writer-wins resolution of money, identities, or relationships.

At least one designated machine needs a fully materialized copy. Offline placeholders and unavailable content must be reported. Backups remain separate from synchronization, and recovery must include configuration, documents, companion metadata, and any required deletion records.

## 12. Obsidian and ordinary applications

An Obsidian vault may coincide with a workspace, but Conformer does not require it. Documents should remain useful through normal browsing and native format handling without a custom plugin. A private URI scheme or special frontmatter renderer must not be necessary to understand them.

Metadata updates should preserve compatible YAML syntax, body bytes, and user comments where feasible; unsupported round-tripping must fail rather than silently damage content. The exact supported YAML subset and formatting guarantees are an implementation decision to test.

An optional watch command, Obsidian integration, or notification UI may surface diagnostics later. The first version can run checks on demand and after CLI operations. Continuous alerts require a running process; they cannot be promised by an inactive CLI.

## 13. Initial scope and deferred work

**Proposed first build, after specification approval:** explicit workspace selection; local type definitions; Markdown metadata read/write; declared handling for managed non-Markdown files; discovery and ID checks; create/update/check; guarded move/rename; supported link handling; recoverable delete/restore; human and JSON output. Implement in small slices, starting with one approved type and synthetic fixtures.

Deferred unless a concrete requirement changes the scope: sync engine, hosted service, MCP server, mandatory Obsidian plugin, multi-root federation, SQL query language, arbitrary executable rules, automatic financial calculations, general rich-text editing, distributed transactions, and production migration.

Language, packaging, executable name availability, supported operating systems, schema library, and parser choices remain undecided. Prefer easy installation and ordinary maintenance over speculative extensibility.

## 14. Document type planning

Use [the worksheet](DOCUMENT-TYPE-WORKSHEET.md) for each type. Decide the business unit before its fields or file format. A document can contain several identified items; a task need not be a file and a budget need not be Markdown.

The first two steps are selected. The remainder is a proposed review sequence, not a bundled type library:

0. Built-in document: only type and ID; settle identity generation and lifecycle first.
1. Custom job master: general job information, context, references, and location freedom. Budgets, estimates, orders, and evidence remain separate documents; no automatic folder or document packet is implied.
2. Person and organization: separate or combined type decisions, affiliation references, sensitive-field boundaries.
3. Task or task list: natural editing unit, ownership, dates, and cross-job discovery.
4. Budget/estimate: workbook authority, metadata, formulas, and accepted snapshots.
5. Selection schedule and supplier order: item IDs, quantities, commitments, and many-to-many references.
6. Receipts, returns, invoices, credits, payments: distinct events, evidence, corrections, and allocations.
7. General reference, plans, specifications, and issued evidence.

No statuses, required business fields, folder hierarchy, or imported legacy schema are approved by this list.

## 15. Acceptance scenarios for the later build

| Scenario | Required outcome |
|---|---|
| Same command from two unrelated working directories | Explicit workspace selects the same documents and rules. |
| Initialize an empty workspace | Only the generic document type is available; no business folders or domain types are automatically created. |
| Create a generic document | Only type and ID are required; ordinary body content and location remain flexible. |
| Define job through the CLI and retype a generic document | The new definition applies without engine changes; identity stays unchanged and target fields are validated. |
| Move a job file to another allowed folder | ID and structured references remain valid; supported navigation is repaired or diagnosed. |
| Create two documents offline on separate devices | Identity allocation does not depend on a shared counter; later collisions are still checked. |
| Manual malformed YAML or duplicate ID | Check reports the affected file; ID-based mutation never guesses a target. |
| Unknown type or malformed unclassified document | Inventory and scan coverage reveal the condition; no false clean result. |
| Stale edit or changed schema after preview | Mutation is rejected or requires replanning; no silent overwrite. |
| Metadata-only update | Markdown body and binary payload remain unchanged. |
| Sidecar or link update interrupted, if supported | Partial state is diagnosable and recoverable without losing later edits. |
| Delete a referenced document | Report affected references and enforce selected policy; restoration retains identity. |
| New type or schema version | Existing documents remain untouched until an explicit operation; impact is reported. |
| Remove all optional caches | Identity and relationship discovery rebuild from documents and configuration. |
| Network unavailable | Core commands work locally and report unavailable content without pretending global freshness. |
| Open workspace without Conformer | Humans can read documents and understand the declared conventions. |

## 16. Decision register and next steps

| Decision | Current status |
|---|---|
| Local documents are authoritative; CLI is generic and workspace-scoped | Confirmed |
| Build starts after specification is settled | Confirmed |
| Metadata carrier for non-Markdown formats | Open by type; avoid extensive sidecars, which David identified as a clutter concern |
| Built-in document type | Confirmed minimal type and ID; exact YAML key spelling proposed as `document_type` and `id` |
| First business document type | Job master selected; workspace-defined through the CLI, with separate budgets and other documents |
| Common metadata keys and ID format | Open |
| Link syntax and Obsidian behavior | Open; test ordinary Markdown and wikilinks |
| JSON configuration and schema version convention | Proposed |
| Default unrestricted placement versus optional enforced folder rules | Confirmed capability; concrete policy open |
| Minimum operating systems and packaging | Open |
| Scope of CSV/XLSX content validation in the first build | Open |
| On-demand checks versus continuous alerts | On-demand proposed initially |
| Issued-document protection, delete/restore receipt format | Open |
| CDB-OS source review | Pending access to the actual CLI checkout/repository |

Next: review the intended CDB-OS ID generator when accessible; settle the generic document's identity and version-resolution contract; define the job master type through its worksheet; resolve non-Markdown metadata when a type needs it; settle the write/link/recovery contract with examples; agree on v1 scope and implementation language. David then explicitly starts the build.

Production adoption is a separate later decision. Begin with synthetic fixtures, then an isolated copy with preserved IDs and before-state backups. No production refresh, reclassification, restructuring, or migration follows merely from finishing this spec.
