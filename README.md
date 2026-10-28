# Conformer

Everything is a document.

Conformer is a planned local CLI for giving documents permanent IDs, finding them, and checking their metadata. Files remain authoritative and usable without a hosted service.

**Status: minimal scope agreed; planning only. No CLI has been built.**

Start with the [small first-version specification](docs/SPECIFICATION.md) and [ID design](docs/IDENTITY.md). The selected ID format is a compact Base36 timestamp plus four random characters: 10 characters at present, generated locally and usable offline.

The only built-in type is `document`. Additional types are simple workspace definitions listing required fields. Markdown is the first managed format; spreadsheets, PDFs, CSV, HTML, and other files remain ordinary documents alongside it.

Links remain ordinary file links. Link automation and document move workflows are deferred.

The earlier broad specification is preserved in Git history at commit `60396a3`. The type worksheets and CDB review are reference material, not prerequisites for the first version.

Intended GitHub home: `Ductape-Build/conformer`. Remote creation/publication remain pending authenticated repository-creation access.
