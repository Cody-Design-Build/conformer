# Document ID proposal

October 28, 2026 · Proposed, not yet implemented

## Use UUIDv7

Use the standard UUIDv7 format for new documents. It combines a millisecond timestamp with space for randomness; it requires no central registration. Use a standard implementation backed by a cryptographically secure random source. The standard also allows counters within the layout, so the selected implementation's behavior must be checked rather than assuming every library uses identical generation rules. [RFC 9562, section 5.7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7)

Store the full lowercase, hyphenated value as a quoted string. For example, this synthetic value demonstrates the shape:

```yaml
id: "019a0000-0000-7000-8000-000000000001"
```

People use readable names; Conformer and agents use the ID. No initials, usernames, device registration, shared counter, or type prefix are needed. The timestamp is not proof of the document's business date or a reliable ordering of events on different machines.

## Practical uniqueness

Correct independent generation makes accidental collisions negligible for this document system, not mathematically impossible. A local scan detects a generated ID already present; duplicate checking after sync catches copied identities and conflicts as well. A duplicate already used by documents or links must not be silently reassigned.

An ID generator does not solve concurrent edits or stop two people independently creating different documents about the same job. Those are separate issues.

## Permanent identity

- Create a new document: allocate an ID once.
- Edit, rename, move, archive, or reclassify: retain it.
- Sync or restore the same document: retain it.
- Make a distinct copy: allocate a new ID through a future explicit copy operation.
- Find by ID: scan metadata and resolve the current path; fail on missing/ambiguous results.
- Link: store the target ID and derive ordinary clickable navigation, as specified in [the first-version plan](SPECIFICATION.md).

New ID generation does not rekey older documents. Legacy-ID adoption can be designed later. The old CLI is optional reference material and no longer blocks selecting a standard.

Before building, confirm this recommendation and choose a runtime with a suitable UUIDv7 implementation. Verify secure randomness, same-millisecond generation, clock-change behavior, and process independence. Full IDs are canonical; abbreviation and alternate encodings are deferred.
