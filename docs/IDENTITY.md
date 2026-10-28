# Compact document IDs

October 28, 2026 · Implemented first-version ID format

## Verified Surface reference

The source David supplied implements the same time-plus-random pattern with different parameters: **seven lowercase Crockford Base32 characters of Unix seconds plus five random characters**, totaling **12**. See [`surface_id()`](https://github.com/Cody-Design-Build/Surface/blob/ed9c427b5a821a24c37e81857b97f8edebc12197/supabase/migrations/0001_types_engine.sql#L5-L24) and [the reuse review](CDB-REFERENCE-REVIEW.md). David selected Conformer's shorter Base36 format below. Surface remains a code reference; its 12-character format is not adopted.

## Format

Use Unix time in whole seconds, encoded in uppercase Base36, followed by four independent uniformly random Base36 characters. Base36 uses `0–9` and `A–Z`. This is a small Conformer format, not a claim to implement a named universal ID standard. Base conversion is an existing primitive; for example, [JavaScript supports radix 36 directly](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString).

```text
TNLC00K7Q2
^^^^^^ time in seconds
      ^^^^ random suffix
```

`TNLC00` encodes Unix seconds at October 28, 2026, 00:00 UTC. `K7Q2` is an illustrative suffix. Do not reuse this example as a newly generated ID.

- Timestamp: nonnegative Unix seconds, minimum six characters with leading zero padding. Keep all digits if it grows beyond six; never truncate, wrap, or reset the epoch.
- Suffix: exactly four characters from the same 36-character alphabet, chosen using the runtime's cryptographically secure random facility with unbiased selection.
- Storage: the full uppercase string, quoted in YAML. The last four characters are always the suffix; the preceding characters are the timestamp.
- Length: ten characters currently; eleven when the timestamp eventually needs another digit. This avoids a rollover/reuse scheme solely to maintain fixed length.
- No network, shared sequence, username, or registered machine identifier.
- Clock changes may repeat a timestamp; fresh randomness still applies. The timestamp is not proof of a business date or reliable ordering between devices.

## Validation

A valid stored ID contains only uppercase `0–9` and `A–Z`. The last four characters are the suffix; the preceding timestamp has at least six characters. A six-character timestamp may contain leading zeroes. A longer timestamp must not begin with zero, because generation uses the shortest Base36 representation once six characters are insufficient.

Decode the timestamp as an unsigned integer without truncation. Timestamp zero and future timestamps are valid; the timestamp is allocation context, not an asserted document date. Lowercase input, separators, non-ASCII lookalikes, short timestamps, and noncanonical extra leading zeroes are invalid and are never normalized by read-only commands.

## Collision behavior

Different encoded timestamp values cannot produce identical full IDs. Within the same timestamp value, four Base36 characters provide 36^4 = 1,679,616 suffixes. For two independently and uniformly generated suffixes in that second, the collision probability is 1 in 1,679,616. More creations within a second increase the risk; this is a deliberate fit for the low document creation rate David described, not a high-throughput distributed allocation guarantee.

Before completing a local creation, check existing IDs. If the new candidate already exists, retry with fresh randomness; stop with an explicit error after a bounded number of attempts. Do not silently overwrite a file. Coordinating local writers and preventing destination overwrite remain part of the write contract.

Offline devices cannot check one another's pending work. After sync, `check` reports duplicate IDs and ID-based operations refuse ambiguous targets. Never automatically change an established duplicate's ID: it could be two versions of the same document. Secure-random failures are errors, not permission to fall back to a weak generator.

## Permanent identity

- New document: allocate once.
- Edit, rename, move, archive, or change type: retain the ID.
- Sync or restore the same document: retain the ID.
- Copy as a distinct document: allocate a new ID through a later explicit copy operation.
- Find: scan metadata and resolve the current path; fail on missing or ambiguous results.
- Links remain ordinary file links. Automated relationships and link repair are deferred; see [the first-version plan](SPECIFICATION.md).

An ID does not prevent two people creating different documents about the same job, or resolve simultaneous edits. No production IDs are rewritten by this planning decision. Legacy adoption can be designed later, and the old CLI is no longer a prerequisite.

## Implementation checks

Verify encoding/decoding and leading zeros, timestamp growth without truncation, same-second creation, injected local collisions, independent-process creation, clock rollback, secure-random failure, and duplicate detection after combining offline copies. Keep these tests focused on the ID and write contracts; do not build a separate ID service.
