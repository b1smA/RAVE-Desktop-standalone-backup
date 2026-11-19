import type { Track } from '@nuclearplayer/model';

export const trackIdentity = (track: Track): string =>
  [
    track.source.provider,
    track.source.id,
    track.title,
    track.artists.map((artist) => artist.name).join(','),
  ]
    .join(':')
    .trim()
    .toLocaleLowerCase();

export const trackContentIdentity = (track: Track): string =>
  [track.title, track.artists.map((artist) => artist.name).join(',')]
    .join(':')
    .trim()
    .toLocaleLowerCase();
