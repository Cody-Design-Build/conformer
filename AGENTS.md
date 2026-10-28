# Conformer engineering instructions

Read `docs/SPECIFICATION.md` before changes. Version 1.0 is the authoritative first-version contract. Keep the implementation small and do not restore features deferred there.

- Files are authoritative; do not add a database, server, account, network dependency, or application lifecycle.
- The guiding principle is "everything is a document," not "everything is Markdown."
- Business document types and folder conventions belong to workspace configuration, not hardcoded engine rules.
- Checking and finding are read-only. Preserve document bodies and never normalize files as a side effect.
- Use safe YAML parsing, deterministic diagnostics, atomic creation, and explicit failures rather than repair guesses.
- CDB-OS and Surface are references to evaluate, not specifications to inherit.
- Use synthetic examples and fixtures. Do not copy business records, financial details, credentials, or the old source tree into this repository.
- No production document migration is authorized.
- Keep `docs/SPECIFICATION.md`, `docs/IDENTITY.md`, README usage, and behavioral tests synchronized with contract changes.
