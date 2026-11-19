# Contributing to RAVE

RAVE welcomes focused bug reports, reproducible performance findings, documentation improvements, and pull requests that support the project's direction.

## Before contributing

- Search existing issues before opening a new one.
- Explain the user-visible problem and the expected behavior.
- Keep changes focused and preserve compatibility with Nuclear plugins where practical.
- Do not remove Nuclear copyright, license, or provenance notices.
- Do not submit credentials, copyrighted media, proprietary provider keys, or generated build artifacts.

## Development checks

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Run the smallest relevant package test while developing. Add integration coverage for user-facing behavior and add an entry to `packages/player/changelog.json` for a feature, fix, or improvement.

## Relationship with Nuclear

RAVE is an independent fork. Changes intended specifically for Nuclear should be proposed to the [upstream project](https://github.com/nukeop/nuclear) under its contribution rules. Changes submitted to RAVE are reviewed by the RAVE maintainers and are not automatically forwarded upstream.
