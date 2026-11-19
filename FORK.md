# RAVE fork declaration

RAVE is an independent fork of [Nuclear](https://github.com/nukeop/nuclear), created from Nuclear's source code and continued under the GNU Affero General Public License v3.0 only.

## Relationship to upstream

- **Upstream project:** Nuclear
- **Upstream repository:** `https://github.com/nukeop/nuclear.git`
- **Fork name:** RAVE
- **Application identifier:** `com.raveplayer.Rave`
- **License:** AGPL-3.0-only
- **Compatibility:** Nuclear plugin SDK and internal workspace package names are retained where changing them would break plugins or create unnecessary divergence.

RAVE is not an official Nuclear distribution and is not endorsed by the Nuclear maintainers. Bugs introduced by RAVE modifications should be reported to RAVE rather than Nuclear.

## Scope of divergence

RAVE develops its own source selection, diagnostics, queue intelligence, listening history behavior, personalization, collaborative sessions, artist discography handling, desktop integrations, branding, packaging, and startup performance. The in-app changelog is the detailed record of RAVE-specific behavior.

## Synchronizing Nuclear changes

Nuclear should remain configured as the `upstream` Git remote. Upstream changes are reviewed before integration; RAVE-specific behavior must not be silently replaced during synchronization.
