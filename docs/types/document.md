# Built-in document type

October 28, 2026 · Implemented first-version contract

Conformer ships one generic type that supplies identity without imposing a business model:

```yaml
---
document_type: document
id: "<generated-id>"
---
```

The placeholder is explanatory. Actual IDs follow the selected [identity design](../IDENTITY.md).

Only these two fields are required. No required title, date, status, owner, folder, body structure, or schema-version field. Additional metadata is allowed and preserved.

Creation allocates an ID and writes valid metadata. Checking reports malformed YAML, invalid or duplicate IDs, missing fields, and unknown document types without changing files. Renaming, moving, and editing retain the ID.

Additional types can be defined in workspace configuration by listing required fields. Richer field constraints, metadata update commands, and CLI editing of definitions are deferred.

Markdown is the first managed metadata format. Other document formats coexist without registration or automatic sidecars. See [the first-version specification](../SPECIFICATION.md).
