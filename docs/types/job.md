# Custom job master document

Planning draft, October 28, 2026. First custom workspace type selected by David; not built into Conformer and not yet a complete schema.

A job master document identifies a job and holds general context about it. It is the natural starting point for understanding the job and navigating related documents. It does not contain the independent budgets, estimates, orders, or financial ledgers for that job.

## Agreed boundary

- One job master has its own stable document ID and `job` type.
- General job information and narrative can live here.
- Budgets and other independently useful documents remain separate and refer to the job's ID where a structured relationship is needed.
- Job identity does not depend on its filename or folder.
- Creating a job does not inherently create a folder hierarchy, budget, task list, or payment register.
- The type is defined through the same workspace configuration mechanism available for any other custom type.

## Fields to decide together

| Candidate | Question |
|---|---|
| Job name | Filename/heading only, or an explicit metadata field for queries? |
| Address | Required for construction jobs, optional for internal jobs, or different types? |
| Status | Is it needed initially, and what are the actual states? |
| Client and other people | Which relationships need IDs, roles, or only narrative links? |
| Scope and context | Which information belongs in the body rather than frontmatter? |
| Dates | Which dates are useful enough to structure? |
| Related documents | Which links are stored relationships and which are generated navigation? |
| Financial summaries | Omit by default; any later summary needs a named source and derivation rule. |

No candidate field is required or approved by appearing here. Complete the [type worksheet](../DOCUMENT-TYPE-WORKSHEET.md) after the generic identity contract is settled. Start with the smallest job master that answers the team's real questions.
