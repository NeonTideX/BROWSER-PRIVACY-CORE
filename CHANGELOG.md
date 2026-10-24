# Changelog

## 6.0.0 — 2026-10-24

### Added

- Shared modular core with separate Stable and Hardened userscript builds.
- Reproducible build and tracked SHA-256 checksums.
- Core regression tests and real-browser tests for both profiles.
- Local diagnostic page, installation guide, threat model, and migration notes.
- GitHub CI, release-artifact workflow, and contribution/issue templates.
- GPL-3.0-or-later license notices and complete source distribution.

### Changed

- Canvas masking uses deterministic, idempotent coordinate-based RGB bit replacement.
- Canvas and OffscreenCanvas exports operate on copies and respect resource limits.
- Hardened adds 2D readback protection and native relay-only WebRTC policy.
- Hardware reporting uses downward caps; GPU reporting avoids random device identities.
- Hardened Client Hints responses retain only native low-entropy fields.
- Same-origin frames receive the shared installer with per-document guards.

### Removed

- Fabricated plugin/MIME arrays, permission statuses, battery instances, and media identifiers.
- `navigator.webdriver` spoofing, SDP rewriting, and incomplete ICE listener filtering.
- Device-derived seed fallback and no-op permission wrappers.

V5.5, V5.6, and V5.7 are source inputs, not previous releases of this repository.
