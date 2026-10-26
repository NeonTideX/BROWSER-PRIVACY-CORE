# Changelog

## [Unreleased]

Changes after the latest published version will be recorded here.

## [1.0.0] - 2026-10-26

### Version line

- Introduce the V1 release line, intentionally resetting numbering from 6.0.0 to 1.0.0.
- Give both userscripts V1 names and a new namespace. Existing 6.x users must reinstall manually.
- Use a version-independent diagnostic marker with a legacy guard to prevent mixed-version stacking.

### Performance and reliability

- Replace per-pixel hashing with sparse deterministic block selection while retaining crop alignment, idempotence, alpha preservation, and bounded RGB changes.
- Add per-module patch transactions, reverse-order descriptor rollback, and explicit failures for locked required APIs.
- Separate frame installation, deduplicate mutation batches, and share origin fallback seeds across frames installed by one runtime.
- Retain native audio buffer readers and return Client Hints objects in the target realm.
- Add masking benchmarks and regression coverage for sparse masks, locked APIs, fallback frame seeds, and legacy compatibility.
- Include support and community-conduct documents in complete release source packages.

## [6.0.0] - 2026-10-25

### Repository maintenance

- Complete community guidance, support links, release metadata, and tagged distribution.
- Upgrade the development-only Playwright dependency to 1.64.1 through reviewed pull request #1.

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

[Unreleased]: https://github.com/NeonTideX/browser-privacy-core/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NeonTideX/browser-privacy-core/releases/tag/v1.0.0
[6.0.0]: https://github.com/NeonTideX/browser-privacy-core/releases/tag/v6.0.0
