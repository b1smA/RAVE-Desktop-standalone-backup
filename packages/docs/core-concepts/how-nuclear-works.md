---
description: The provider architecture behind RAVE playback
---

# How RAVE works

RAVE is a multi-source music player built as a fork of Nuclear. The application handles the interface, playback engine, queue, playlists, favorites, and local personalization. Plugins provide searchable catalogs, playable streams, lyrics, discovery, and dashboard content.

## The plugin model

RAVE includes a curated provider set and supports additional compatible plugins from the store. Plugins register **providers** that give RAVE specific capabilities:

- A **metadata provider** lets you search for artists, albums, and tracks, and browse their details
- A **streaming provider** finds and delivers the actual audio when you play a track
- A **dashboard provider** populates the home screen with top tracks, new releases, and recommendations
- A **discovery provider** generates track recommendations based on what you're listening to
- A **playlists provider** lets you import playlists from external services by URL

Some plugins register a single provider type. Others register several at once, giving you metadata and streaming from the same source.

You can install as many plugins as you want. When multiple plugins offer the same type of provider, you pick which one is active in the **Sources** view.

Some providers can all be active at the same time. For example playlist providers don't interfere with each other and simply let you import playlists from multiple sources.

## How playback works

When you add a track to the queue and press play, two providers work together:

1. The active **metadata provider** supplied the track information (title, artist, album, artwork) when you searched for it
2. The active **streaming provider** takes that information and finds an audio stream to play

The player handles everything from there: buffering, seeking, volume, and moving through the queue.

{% hint style="info" %}
Some metadata providers are paired with a specific streaming provider. When you select one of these, RAVE prioritizes the matching streaming provider because its metadata and audio identifiers cannot always be mixed with other sources.
{% endhint %}

## What the player manages

While plugins handle content, the player itself owns:

- **The queue**: your current listening session. Add tracks, reorder them, shuffle, repeat. The queue persists across restarts.
- **Favorites**: save tracks, albums, and artists to your favorites.
- **Playlists**: create and manage playlists. Import and export them as JSON files, or from other services via plugins.
- **Settings**: audio configuration, appearance, key shortcuts, update preferences.
- **Themes**: adjust RAVE's appearance without affecting functionality.
- **Plugins**: install, update, and manage compatible providers that expand RAVE.
