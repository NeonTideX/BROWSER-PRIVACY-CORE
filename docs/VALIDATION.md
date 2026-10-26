# V1 validation

## V1 - 2026-10-26

Environment: Windows x64, Node.js 26.8.1, npm 12.2.0, Playwright 1.64.1. This run used existing isolated browser binaries without downloading new browsers.

| Check | Result |
| --- | --- |
| `npm run check` | Passed: synchronized artifacts and 17 unit/build tests |
| Edge 155.0.4283.62 | Passed: 104 real-browser checks |
| Chromium 151.0.7922.34 | Passed: 104 real-browser checks |
| Firefox 153.0 | Passed: 102 real-browser checks, with two absent Client Hints probes explicitly skipped |
| `npm run release` | Passed: V1 scripts, checksums, license, and complete source including community documents |

New browser checks cover locked canvas/RTC rollback, continued operation of unrelated modules, shared fallback seeds in storage-denied frames, the legacy 6.x guard, and native out-of-bounds canvas padding. Unit checks cover sparse density bounds, clipped/narrow crops, inactive/nested transactions, and reinstalling cosmetic source masking after rollback.

`npm run benchmark` measured the masking phase for an opaque 1920x1080 RGBA surface: median of nine runs after three warmups. The previous per-pixel scan took 20.225 ms (Stable) and 20.181 ms (Hardened); V1 took 0.052 ms and 0.362 ms respectively on this machine. This excludes canvas copying, codecs, and GPU transfer and is not an end-to-end speed claim or CI threshold.

Hosted runs use the [CI workflow](https://github.com/NeonTideX/browser-privacy-core/actions/workflows/ci.yml). The local results do not establish userscript-manager injection, arbitrary website compatibility, Safari/mobile support, or real TURN connectivity. Use the manual matrix in [TESTING.md](TESTING.md).
