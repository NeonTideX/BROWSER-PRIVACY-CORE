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

- Run hosted browser checks in a matching preinstalled Playwright container.

[Unreleased]: https://github.com/NeonTideX/browser-privacy-core/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NeonTideX/browser-privacy-core/releases/tag/v1.0.0
