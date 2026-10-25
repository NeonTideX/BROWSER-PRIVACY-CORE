# Local validation record

Date: 2026-10-24. Environment: Windows x64, Node.js 26.8.1, npm 12.2.0, Playwright 1.62.1.

## Completed checks

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

## Not established by these results

- The historical local results above do not establish hosted GitHub Actions results; use the current workflow runs linked below.
- Real Violentmonkey/Tampermonkey installation, CSP behavior, and first-script timing.
- Safari/WebKit, mobile browsers, or every browser release.
- End-to-end calls through a real TURN service or compatibility with arbitrary websites.
- Anonymity, undetectability, or a particular fingerprint uniqueness score.

Use the manual matrix in [TESTING.md](TESTING.md) for manager and site checks. The scripts' final hashes are recorded in [`dist/SHA256SUMS`](../dist/SHA256SUMS).

## Release preparation - 2026-10-25

The development-only Playwright dependency was upgraded to 1.64.1 in reviewed [pull request #1](https://github.com/NeonTideX/browser-privacy-core/pull/1). Its GitHub CI passed all four OS/Node combinations and the Chromium and Firefox jobs before merge.

Local checks after the merge passed all 10 unit/build tests and 93 real-browser checks with Microsoft Edge 155.0.4283.62 on Windows, using Node.js 26.8.1 and Playwright 1.64.1. Both Stable and Hardened passed. Release preparation also passed. This run reused the existing Edge installation and downloaded no browser binaries.

Current hosted results are available in the [CI workflow](https://github.com/NeonTideX/browser-privacy-core/actions/workflows/ci.yml). Userscript-manager installation, arbitrary site compatibility, and real TURN connectivity remain manual checks; this maintenance pass does not establish those results.
