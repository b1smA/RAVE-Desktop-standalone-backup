---
description: RAVE music player documentation for users and contributors
---

# RAVE Documentation

RAVE is an independent open-source fork of Nuclear. It keeps compatibility with Nuclear plugins while adding source-aware playback, local personalization, collaborative sessions, a redesigned interface, and its own release path.

{% hint style="info" %}
RAVE is not an official Nuclear distribution and is not endorsed by the Nuclear maintainers. Compatibility identifiers such as the `@nuclearplayer/*` package scope are retained intentionally.
{% endhint %}

## Start here

- [Getting started](user-manual/getting-started.md) explains the first launch and playback setup.
- [Installation](user-manual/installation.md) lists supported source-build and package formats.
- [RAVE features](user-manual/rave-features.md) summarizes the functionality that distinguishes the fork.
- [Known limitations](user-manual/known-limitations.md) records current release constraints and provider-dependent behavior.

## Current release

The desktop application version is **1.50.0**. Source and binary releases are distributed through the RAVE-owned repository and remain independent from Nuclear's release channel.

## Architecture

RAVE is a pnpm monorepo. The desktop application uses Tauri, Rust, React, TypeScript, Tailwind CSS, TanStack Router, TanStack Query, Zustand, and Vitest.

Internal packages retain their Nuclear-compatible names so existing plugins do not need to be rewritten.

## Development commands

Run these commands from the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm type-check
```

See the repository-level `FORK.md`, `NOTICE.md`, and `CONTRIBUTING.md` files for provenance, attribution, and contribution rules.
