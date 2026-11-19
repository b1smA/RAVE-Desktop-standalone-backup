<p align="center">
  <picture>
    <source alt="RAVE Music Player" srcset="packages/docs/.gitbook/assets/readme-banner.png">
    <img alt="RAVE Music Player" srcset="packages/docs/.gitbook/assets/readme-banner.png">
  </picture>
</p>

# RAVE

RAVE is an independent, open-source fork of [Nuclear](https://github.com/nukeop/nuclear). It preserves Nuclear's plugin-compatible desktop foundation while developing a separate listening experience focused on source intelligence, personalization, reliable playback, and local collaborative sessions.

RAVE is not affiliated with or endorsed by the Nuclear maintainers. Nuclear remains the upstream project and retains copyright in the original work. See [FORK.md](FORK.md) and [NOTICE.md](NOTICE.md) for provenance and attribution.

## What makes RAVE different

- Smart Source ranks alternative streams by availability, duration match, quality, response time, reliability, and user preferences.
- Source diagnostics explain why a candidate was selected and let listeners reject live, remixed, shortened, or low-quality versions.
- RAVE Sessions provides pairing-protected local listening rooms, guest permissions, queue voting, QR invitations, and an activity history.
- Smart Queue, Replay, Mix, Listen Later, recommendation filters, sleep timers, private tags, and a local taste profile personalize playback without requiring a cloud account.
- Artist discographies separate singles, EPs, albums, compilations, and live releases while grouping duplicate provider variants.
- Multi-provider search, backup streams, playback recovery, resumable downloads, bulk track actions, and selectable audio outputs improve desktop reliability.
- RAVE has its own application identity, icons, default theme, package identifiers, release notes, and update path.

The internal `@nuclearplayer/*` package names and Nuclear plugin API names are intentionally retained for upstream plugin compatibility. They do not indicate that RAVE is an official Nuclear release.

## Status and downloads

RAVE **1.50.0** is the first independent public release of the fork. Official binaries are published through the RAVE repository; Nuclear binaries do not contain RAVE features. Review the [known limitations](packages/docs/user-manual/known-limitations.md) before installation or distribution.

## Screenshots

<p align="center">
  <img src="packages/docs/.gitbook/assets/dashboard-main.png" alt="RAVE dashboard" width="100%">
</p>

## Development

RAVE is a pnpm monorepo managed with Turborepo. The desktop application uses Tauri, Rust, React, and TypeScript.

### Prerequisites

- Node.js 22 or newer
- pnpm 9 or newer
- Stable Rust toolchain
- Platform-specific [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting started

```bash
pnpm install
pnpm dev
```

### Useful commands

```bash
pnpm dev
pnpm dev:remote
pnpm build
pnpm test
pnpm lint
pnpm type-check
pnpm storybook
```

## Plugins

RAVE remains compatible with Nuclear's provider architecture and the [`@nuclearplayer/plugin-sdk`](https://www.npmjs.com/package/@nuclearplayer/plugin-sdk). Plugins can provide metadata, streaming sources, playlists, discovery, lyrics, and dashboard content.

## Upstream synchronization

The recommended Git remote layout is:

```text
origin    your RAVE repository
upstream  https://github.com/nukeop/nuclear.git
```

Upstream changes should be reviewed and merged deliberately because RAVE modifies startup, playback, recommendations, queues, artist pages, packaging, and branding.

## Contributing

RAVE accepts focused bug fixes and improvements. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Preserve Nuclear attribution and document user-facing changes in `packages/player/changelog.json`.

## License

RAVE is distributed under the [GNU Affero General Public License v3.0 only](LICENSE), the same license as its Nuclear upstream. Source code for distributed builds and modifications must remain available under the license terms.
