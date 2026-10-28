# Built-in document type

Planning draft, October 28, 2026. This is a specification, not an implemented runtime schema.

## Selected purpose

Conformer ships one generic document type. It supplies identity and a type declaration without imposing a business model. Jobs, contacts, budgets, and other domain types are defined later through the CLI and stored in workspace configuration.

Only two metadata fields are required. Proposed spelling:

```yaml
---
document_type: document
id: "<generated-id>"
---
```

`<generated-id>` is an explanatory placeholder, not an allowed literal ID or a selected ID format. See [identity design](../IDENTITY.md).

There is no required title, status, date, owner, folder, or body structure. A human-readable heading may be created by a template without becoming mandatory metadata. The filename can supply a display label; it is not identity.

## Proposed behavior

- Creation allocates an ID and writes the two required fields.
- Metadata must parse unambiguously. The type must resolve to a known definition and the ID must be a nonempty string unique within the workspace.
- A metadata-only change preserves body content.
- Renaming, moving, and editing preserve the ID.
- Retyping to a custom type preserves the ID but validates the target definition; missing required values must be supplied explicitly.
- Copying as a distinct document allocates a new ID. Synchronization and backup preserve the existing ID.
- Unknown metadata is preserved. Proposed validation policy: flag undeclared fields for review rather than silently treating them as validated or deleting them. Exact extension policy remains open.
- No per-document schema-version field is required by this minimal type yet. Version resolution still must be settled before implementation.

The Markdown example demonstrates the simplest metadata carrier. Using the generic type for another format must follow its approved metadata mechanism; it does not authorize automatic sidecar creation.

## Decisions still needed

A Base36 timestamp plus four random characters is the selected ID format; see the identity design. Remaining decisions include exact key spelling; schema-version resolution; extension-field policy; deletion/restore identity reservation; optional display-label convention. No business statuses or folder rules are needed to settle this type.
