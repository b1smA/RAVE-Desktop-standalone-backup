---
description: Build or install the RAVE desktop application
---

# Installation

RAVE 1.50.0 is distributed through its own source tree and release channel. Do not install upstream Nuclear packages expecting them to contain RAVE features.

{% hint style="warning" %}
Download RAVE binaries only from the official `b1smA/RAVE-Desktop` releases page. Builds from other locations are not maintained by this project.
{% endhint %}

## Build from source

Install Node.js 22 or newer, pnpm, the stable Rust toolchain, and the platform prerequisites required by Tauri. From the repository root, run:

```bash
pnpm install
pnpm --filter @nuclearplayer/player build
```

Development mode is available with:

```bash
pnpm dev
```

## Package formats

{% tabs %}

{% tab title="Windows" %}
The release pipeline produces a per-user installer. Administrative privileges are not required for the normal installation mode.
{% endtab %}

{% tab title="macOS" %}
The release pipeline supports Intel and Apple silicon disk images. Release-candidate builds may be unsigned, in which case the operating system can require explicit approval before the first launch.
{% endtab %}

{% tab title="Linux" %}
The release configuration supports portable images and common distribution package formats. Sandboxed packages can restrict local-network discovery, external tools, file access, and audio-device selection.
{% endtab %}

{% endtabs %}

## Updating

RAVE does not use Nuclear's update channel. Until a RAVE-owned signed update service is published, install updates manually from the same trusted channel used for the original build.

Application data uses the RAVE identifier `com.raveplayer.Rave`, so it remains separate from an existing Nuclear installation.
