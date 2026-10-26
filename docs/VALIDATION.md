# Validation records

## V1 - 2026-10-26

Environment: Windows x64, Node.js 26.8.1, npm 12.2.0, Playwright 1.64.1. This run used existing isolated browser binaries without downloading new browsers.

| Check | Result |
| --- | --- |
| `npm run check` | Passed: synchronized artifacts and 16 unit/build tests |
| Edge 155.0.4283.62 | Passed: 104 real-browser checks |
| Chromium 151.0.7922.34 | Passed: 104 real-browser checks |
| Firefox 153.0 | Passed: 102 real-browser checks, with two absent Client Hints probes explicitly skipped |
| `npm run release` | Passed: V1 scripts, checksums, license, and complete source including community documents |

New browser checks cover locked canvas/RTC rollback, continued operation of unrelated modules, shared fallback seeds in storage-denied frames, the legacy 6.x guard, and native out-of-bounds canvas padding. Unit checks cover sparse density bounds, clipped/narrow crops, inactive/nested transactions, and reinstalling cosmetic source masking after rollback.

`npm run benchmark` measured the masking phase for an opaque 1920x1080 RGBA surface: median of nine runs after three warmups. The previous per-pixel scan took 20.225 ms (Stable) and 20.181 ms (Hardened); V1 took 0.052 ms and 0.362 ms respectively on this machine. This excludes canvas copying, codecs, and GPU transfer and is not an end-to-end speed claim or CI threshold.

Hosted runs use the [CI workflow](https://github.com/NeonTideX/browser-privacy-core/actions/workflows/ci.yml). The local results do not establish userscript-manager injection, arbitrary website compatibility, Safari/mobile support, or real TURN connectivity. Use the manual matrix in [TESTING.md](TESTING.md).

## Historical 6.0.0 local validation

Date: 2026-10-24. Environment: Windows x64, Node.js 26.8.1, npm 12.2.0, Playwright 1.62.1.

### Completed checks

| Check | Result |
| --- | --- |
| `npm run check` | Passed: reproducible artifacts and 10 unit/build tests |
| Edge 155.0.4283.62 | Passed: 93 real-browser checks across both profiles and diagnostics |
| Chromium 151.0.7922.34 | Passed: 93 real-browser checks across both profiles and diagnostics |
| Firefox 153.0 | Passed: 91 real-browser checks; two Client Hints probes skipped because the API is absent |
| `npm run release` | Passed: scripts, checksums, license, and corresponding source prepared |
| Local Markdown links | Resolved successfully |
| GitHub YAML | Five files parsed successfully with duplicate-key checks |
| Package and lockfile versions | Matched |
| English project content | No Chinese text found in project content |
| V5.x input hashes | Matched the supplied source files |

The browser suite injects the actual generated userscripts into isolated real-browser contexts. It verifies observable results, native error behavior, source preservation, readback/export policy, iframe navigation, WebRTC reconfiguration, offline audio bounds and event consistency, and the interactive diagnostic page. Optional missing APIs are explicitly logged as skipped.

### Not established by these results

- The historical local results above do not establish hosted GitHub Actions results; use the current workflow runs linked below.
- Real Violentmonkey/Tampermonkey installation, CSP behavior, and first-script timing.
- Safari/WebKit, mobile browsers, or every browser release.
- End-to-end calls through a real TURN service or compatibility with arbitrary websites.
- Anonymity, undetectability, or a particular fingerprint uniqueness score.

Use the manual matrix in [TESTING.md](TESTING.md) for manager and site checks. The scripts' final hashes are recorded in [`dist/SHA256SUMS`](../dist/SHA256SUMS).

## Historical release preparation - 2026-10-25

The development-only Playwright dependency was upgraded to 1.64.1 in reviewed [pull request #1](https://github.com/NeonTideX/browser-privacy-core/pull/1). Its GitHub CI passed all four OS/Node combinations and the Chromium and Firefox jobs before merge.

Local checks after the merge passed all 10 unit/build tests and 93 real-browser checks with Microsoft Edge 155.0.4283.62 on Windows, using Node.js 26.8.1 and Playwright 1.64.1. Both Stable and Hardened passed. Release preparation also passed. This run reused the existing Edge installation and downloaded no browser binaries.

Current hosted results are available in the [CI workflow](https://github.com/NeonTideX/browser-privacy-core/actions/workflows/ci.yml). Userscript-manager installation, arbitrary site compatibility, and real TURN connectivity remain manual checks; this maintenance pass does not establish those results.
