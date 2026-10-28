# Document identity design

Planning draft, October 28, 2026. The ID format is open pending review; no production IDs are changed.

## What the available references establish

The archived contact helper at `CDB Team/Archive/Legacy CDB Operations/.agents/skills/cdb-contacts/scripts/contacts.py` generates IDs by scanning the existing numeric suffixes and adding one. It requires the `C-####` convention and checks duplicate IDs among contacts. The archived job helper takes an explicit `--id` from the caller. These helpers are an older generation, not proven to be the CLI David wants to reference.

Inspection of frontmatter ID lines in the locally readable `CDB Team/System Testing/CDB-OS` Markdown copy found 168 nonempty six-character uppercase alphanumeric IDs and 31 nonempty twelve-character lowercase alphanumeric IDs, with no duplicates among those observed IDs. Fourteen other documents had empty ID fields. This was a format inventory, not full YAML validation or an inference about the generator. The reconciliation handoff explains that imported records can retain Surface IDs.

The test copy intentionally excludes CLI source. The six-character generator has not been located. A filename/source search across locally represented Dropbox content and a Dropbox filename search found the older helpers; the GitHub connector still returned 404 for `Cody-Design-Build/CDB-OS`. Source code, actual alphabet, randomness, collision checks, and lookup behavior of the intended version remain unverified.

## Proposed identity contract

1. Allocate an opaque ID when a document becomes managed. Type, name, date, address, and path are separate properties.
2. Preserve it through content edits, rename, move, archive, and validated type changes.
3. Use one namespace across managed types in a workspace. Cross-workspace references are deferred; a future qualified reference can pair workspace identity with document identity.
4. Generate new IDs independently on offline devices and check for local collisions. Later synchronization still requires duplicate detection.
5. Do not use a shared incrementing counter for canonical identity. Human-readable job/order numbers can exist separately.
6. Store the full ID as text. Define case handling explicitly and reject ambiguous interpretation; do not silently re-case imported IDs.
7. Preserve existing IDs when adopting documents, after uniqueness checks. Choosing a new generation format does not require rekeying legacy documents.
8. A revision or content hash identifies a state, not the enduring document. Identical bytes do not prove identical identity.
9. CLI copy-as-new allocates a fresh ID. Ordinary replicated copies preserve identity. Duplicate-ID conflicts must not be resolved automatically by rekeying one file: it might be a divergent edit of the same document.
10. Resolve by ID through a rebuildable index. If missing or ambiguous, fail clearly. Abbreviated lookup, if later added, is a convenience and must never change the stored ID.

## Format choices to compare

| Choice | Benefit | Concern |
|---|---|---|
| Short random ID resembling the observed six-character format | Compact and familiar | Exact alphabet and collision behavior are unverified; space may be too small for long-term independent generation. |
| Longer random ID with a readable alphabet | Simple offline allocation with more collision headroom | Longer to read/type; length, alphabet, and case rules need selection. |
| Standard UUID format | Established identity format and large identifier space | Visually long; ordinary users may prefer display names or separate short numbers. |
| Sequential/type-coded identifier | Familiar document numbering | Coordination needed offline; changing type or combining workspaces becomes awkward. Prefer as an optional business number. |

Provisional preference: an opaque random ID with more space than the observed six-character convention, no business-type prefix, and a readable display convention. Do not select a length or promise collision guarantees until the old generator and expected document volume have been reviewed.

## Remaining review questions

- Where is the intended CLI entry point and exact source revision?
- Does the six-character scheme exclude ambiguous characters, use cryptographic randomness, and check the whole workspace?
- Are IDs used in filenames, Markdown links, metadata references, or all three?
- What happens when files are copied, a collision is found, or a target is renamed outside the CLI?
- Are short IDs primarily for humans to type, or mainly for agents and internal references?
- How are deleted IDs reserved and restored without accidental identity reuse?

Generation and lookup tests will be designed after these decisions; this document does not implement an ID generator.
