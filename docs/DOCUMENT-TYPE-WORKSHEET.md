# Document type design worksheet

Copy this worksheet when we begin defining a type. All business rules are open until explicitly decided. This is a design aid, not a runtime schema.

| Question | Decision |
|---|---|
| Type name and business purpose | To decide |
| Natural unit: document, grouped schedule, workbook, or supporting file | To decide |
| Preferred format and supported alternatives | To decide |
| Does this file need independent identity, or is an ordinary supporting link sufficient? | To decide |
| Metadata carrier and schema version | To decide |
| Metadata clutter, portability when copied, and behavior after an external move | To decide |
| Stable identity and human-readable numbering | To decide |
| Required fields, optional fields, and permitted extensions | To decide |
| Missing, blank, null, and default semantics | To decide |
| Structured references and permitted target types | To decide |
| Identified rows/items within the document, if needed | To decide |
| Authoritative content versus derived summaries | To decide |
| Minimum useful body/template | To decide |
| Location unrestricted, preferred, or enforced | To decide |
| Filename convention and duplicate display names | To decide |
| Normal edits and permitted lifecycle transitions | To decide |
| Issued snapshots, corrections, and protected content | To decide |
| Archive, delete, restore, and incoming-reference rules | To decide |
| Human workflows in ordinary applications | To decide |
| Agent workflows through Conformer | To decide |
| Sensitive information and workspace access assumptions | To decide |
| Validation errors versus warnings | To decide |
| Existing CDB documents to compare, without importing automatically | To decide |

Before approving the type, supply:

1. A minimal valid synthetic document and a realistic complete example.
2. Invalid examples with expected diagnostics and repair choices.
3. A create/update/move/rename/delete/restore walkthrough.
4. A manual edit, a concurrent edit, and an offline reconciliation example.
5. Required queries and how humans answer them without a special application.
6. Any format-specific adapter or calculation requirement.
7. Version-transition and preservation rules for existing documents.

Approval record: decision, reason, date, remaining limitations, and whether this type is ready for implementation. Approval of one type does not approve a production migration.
