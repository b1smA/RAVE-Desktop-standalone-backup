---
description: Current limitations in RAVE 1.50.0
---

# Known limitations

These limitations apply to RAVE 1.50.0 unless a later release note states otherwise.

## Distribution and updates

- Public binaries are produced by the RAVE GitHub Actions release workflow and may be unavailable while the first cross-platform build is still running.
- Automatic updates are intentionally disconnected from the Nuclear update service. Updates remain manual until RAVE owns a signed release and update channel.
- Release-candidate builds may be unsigned. Operating systems can show an unknown-publisher warning.

## Providers and playback

- Search completeness, artwork, biographies, lyrics, release dates, explicit markers, and audio availability depend on installed providers.
- A metadata provider does not necessarily provide full audio. At least one compatible streaming provider is required.
- Smart Source can only compare candidates returned by installed providers. Network restrictions or provider changes can temporarily make tracks unavailable.
- Release classification uses track counts and durations when providers expose album details. With incomplete metadata, RAVE must retain the provider's classification.
- Loudness analysis requires a fetchable audio source and can skip tracks whose streams cannot be analyzed.

## Local-network features

- Remote control, collaborative sessions, and device synchronization require devices to share a reachable local network.
- Firewalls, guest Wi-Fi isolation, virtual private networks, and sandboxed packages can block discovery or connections.
- Local synchronization is explicit and does not provide continuous cloud synchronization.

## Platform behavior

- Audio-output selection depends on support in the operating system web engine and may expose only the system default device.
- System media integration, global shortcuts, window effects, and mini-player behavior can vary by desktop environment.
- Sandboxed Linux packages can restrict external playback helpers, file-system access, and local-network services.

{% hint style="info" %}
When reporting a problem, include the RAVE version, operating system, installed provider versions, and a diagnostic report from the application logs or source inspector.
{% endhint %}
