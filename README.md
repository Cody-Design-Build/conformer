# Conformer

Everything is a document.

Conformer is a local CLI for giving Markdown documents permanent IDs, finding them after moves, and checking their metadata. Files remain authoritative and usable without a hosted service.

**Status: first version implemented. No production document migration is authorized.**

## Requirements and setup

- Node.js 22 or newer

```bash
npm install
npm run build
```

Run the built CLI directly:

```bash
node dist/src/cli.js --workspace /path/to/documents init
```

For a local `conformer` command, run `npm link` from this repository after building.

## Usage

Every non-excluded `.md` file under the workspace is managed. Other formats coexist unchanged.

```bash
conformer --workspace /path/to/documents init
conformer --workspace /path/to/documents new notes/example.md
conformer --workspace /path/to/documents check
conformer --workspace /path/to/documents find TNLC00K7Q2
```

The ID above is synthetic. Do not reuse it for a new document.

Custom document types live in `.conformer/workspace.json`:

```json
{
  "version": 1,
  "exclude": [".git/**", "reference/**"],
  "types": {
    "job": {
      "required": ["job_name"]
    }
  }
}
```

Create a configured type by supplying its required fields:

```bash
conformer --workspace /path/to/documents new jobs/example.md \
  --type job \
  --field job_name="Synthetic Project"
```

Add `--json` before the command for deterministic machine-readable results:

```bash
conformer --workspace /path/to/documents --json check
```

Checking and finding are read-only. Creation refuses existing files, excluded paths, paths outside the workspace, symlink paths, and workspaces whose managed documents do not already validate.

## Design and development

- [First-version specification](docs/SPECIFICATION.md)
- [ID design](docs/IDENTITY.md)
- [Built-in document type](docs/types/document.md)

```bash
npm test
```

The only built-in type is `document`. Business-specific types and folder conventions remain workspace configuration. Links remain ordinary file links; relationship automation and move workflows are deferred.

GitHub: [Cody-Design-Build/conformer](https://github.com/Cody-Design-Build/conformer)
