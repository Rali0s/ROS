# Contributing

Thanks for helping make OSA Midnight Oil more useful, safer, and easier to trust.

## Public Repo Hygiene

Before opening a pull request:

- Do not commit `.env*`, `.osae`, vault exports, private notes, keys, certificates, tokens, or local machine paths.
- Use placeholders for examples. Prefer `example.com`, `localhost`, or descriptive host labels instead of real infrastructure.
- Keep security tooling defensive and clearly scoped to authorized systems.
- Keep generated build output out of commits unless a maintainer explicitly asks for it.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

Desktop development uses Tauri:

```bash
npm run desktop:dev
```

## Pull Requests

- Explain the user-facing change and any security/privacy impact.
- Include screenshots for visible UI changes.
- Note which checks you ran.
- Keep changes focused; unrelated refactors make review harder.

## Safety Boundary

This project is local-first workspace software. Contributions that add telemetry, cloud dependency for core use, credential collection, offensive automation, or hidden network behavior need explicit maintainer discussion before implementation.
