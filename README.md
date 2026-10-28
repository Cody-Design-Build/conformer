# Conformer

Everything is a document.

Conformer is a planned local CLI for defining document types, validating metadata and relationships, and managing documents through predictable operations. Markdown, spreadsheets, CSV, PDFs, HTML, images, and other useful formats remain ordinary files. Workspaces contain their own rules; indexes and interfaces are replaceable.

**Status: specification and planning only. No application has been implemented.**

- [System and CLI specification](docs/SPECIFICATION.md)
- [Document type design worksheet](docs/DOCUMENT-TYPE-WORKSHEET.md)
- [Built-in document type](docs/types/document.md)
- [First custom type: job master](docs/types/job.md)
- [Document identity design](docs/IDENTITY.md)
- [CDB reference review](docs/CDB-REFERENCE-REVIEW.md)

The first use case is Cody Design Build's own documents. Conformer ships only a generic `document` type requiring a type and ID. Business types and filing conventions belong to workspace configuration and are created through the CLI. The first custom type to define is the job master; budgets and other job documents remain separate.

Intended GitHub home: `Ductape-Build/conformer`. Remote creation and publication are pending authenticated repository-creation access.
