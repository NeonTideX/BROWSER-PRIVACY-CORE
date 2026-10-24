# Browser Privacy Core

Two browser privacy userscripts, one shared core. A clean successor to Browser Privacy Core V5.5, V5.6, and V5.7.

**Stable** favors everyday compatibility. **Hardened** trades more compatibility for stronger restrictions on selected fingerprinting surfaces. Both run locally, make no telemetry requests, and ship as readable, standalone JavaScript with no runtime dependencies.

## Install

1. Use a userscript manager that supports execution in the page's JavaScript realm. Violentmonkey is the primary target; Tampermonkey is a compatibility target that needs manual verification.
2. Install one profile from the public repository:
   - [Install Stable](https://raw.githubusercontent.com/NeonTideX/browser-privacy-core/main/dist/browser-privacy-core.stable.user.js) — recommended for everyday use.
   - [Install Hardened](https://raw.githubusercontent.com/NeonTideX/browser-privacy-core/main/dist/browser-privacy-core.hardened.user.js) — stricter restrictions, with the tradeoffs below.
3. Confirm installation in your manager, disable all V5.x versions and other copies, then reload open tabs.

Install **one profile at a time**. The first profile installed in a document wins. You do not need Node.js or a build step to use either script. If opening a local file does not launch your manager, create a new script in its editor and paste the complete file. On GitHub, open the script's **Raw** view.

The scripts request `document-start`, page injection, and HTTP/HTTPS pages, including frames. Execution timing and page-realm injection depend on the manager, browser, CSP, and extension permissions. Check the [installation guide](docs/INSTALLATION.md) when a script appears inactive.

## Choose a profile

| Surface | Stable | Hardened |
| --- | --- | --- |
| Canvas PNG/data URL/blob export | Sparse, deterministic RGB bit replacement | Denser, deterministic RGB bit replacement |
| Direct 2D `getImageData` | Native | Protected, with native coordinate conversion |
| Main-realm OffscreenCanvas blob export | Protected using a temporary copy | Protected using a temporary copy |
| WebGL GPU strings | Generic `WebGL` strings | Debug extension hidden; strings also masked |
| Reported CPU threads | Rounded down to powers of two, capped at 8 | Rounded down to powers of two, capped at 4 |
| Reported device memory | Capped at 8 GB when available | Capped at 4 GB when available |
| WebRTC | Native behavior | Relay-only at construction and reconfiguration |
| Offline audio buffers | Native | Sparse deterministic perturbation of nonzero samples |
| High-entropy Client Hints results | Native | Only native `brands`, `mobile`, and `platform` retained |
| Battery API | Native | Existing `getBattery` method disabled |
| Media device enumeration | Native | Only devices with nonempty permission-authorized labels retained |
| Permissions, plugins, MIME types, `webdriver` | Native | Native |

**Hardened can prevent calls and peer-to-peer features from connecting when a site does not supply a working TURN relay.** It can also affect image editors, offline audio exports, battery-aware sites, hardware adaptation, and device pickers. Start with Stable; use your manager's per-site exclusions when needed. Neither profile changes `getUserMedia`, media tracks, `HTMLMediaElement`, or the real-time `AudioContext` implementation. Hardened does change offline-rendered audio, which a site may subsequently play or export.

## What this can and cannot do

These scripts reduce selected JavaScript-visible signals. They do **not** provide anonymity, erase a fingerprint, hide your HTTP IP address, or guarantee a lower uniqueness score. Generic values and JavaScript hooks can themselves be detected. Test representative sites before broad use.

Canvas protection keeps the source unchanged and uses the same coordinate-based mask across supported reads and lossless exports. It modifies selected fully opaque 8-bit RGB pixels by at most one per channel; alpha, transparent pixels, and unsupported pixel formats stay native. Stable skips export snapshots over 4,194,304 pixels; Hardened skips exports or individual readback results over 8,388,608 pixels. Very small, transparent, oversized, color-managed, lossy, or unsupported surfaces may reveal original information. Direct WebGL `readPixels`, workers, service workers, WebGPU, fonts, network headers, and many other fingerprinting surfaces are outside this project's coverage.

The seed is random and stored in origin-scoped `sessionStorage`. It is stable across reloads in the same tab, not a persistent cross-site identity. Storage-denied contexts use a fresh document seed. Same-origin frames receive the full core where accessible; cross-origin frames require the manager to execute the script in those frames. A userscript cannot guarantee that it beats every page script or every frame's first instruction. See [threat model and limitations](docs/THREAT-MODEL.md).

## Verify an installation

In a page's developer console:

```js
window[Symbol.for('BrowserPrivacyCore.v6')]
```

The frozen diagnostic object reports the version, selected profile, and module status. It contains no seed. `enabled` means the module started, `inactive` means disabled by the profile or absent in the browser, and `unavailable` means installation encountered an error. It is a diagnostic aid, not proof that every surface is covered.

For a local diagnostic page:

```sh
npm run demo
```

Open the printed localhost URL after installing a profile. The page performs only local browser API probes; its WebRTC probe uses no STUN or TURN servers.

## Develop

Node.js 22 or newer is required. Source and build tools use ordinary ECMAScript modules: no TypeScript transpiler, runtime loader, or bundler dependency is needed.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npx playwright install chromium
npm run test:browser
```

`npm run check` works without installing dependencies because the build and unit tests use Node built-ins. Playwright is the only direct development dependency and is pinned in `package-lock.json`. CI additionally runs the browser suite on Firefox. Real userscript-manager injection remains a manual test; see [testing](docs/TESTING.md).

```text
src/                    Shared core and profile configuration
src/modules/            Canvas, WebGL, navigator, audio, and WebRTC patches
scripts/                Reproducible build, browser tests, demo, release preparation
tests/                  Unit and generated-artifact regression tests
dist/                   Two installable userscripts and SHA-256 checksums
docs/                   Installation, architecture, migration, testing, and release notes
.github/workflows/      CI and version-tag artifact preparation
```

Edit `src/`, then rebuild. Commit `dist/` together with source changes; CI rejects stale artifacts. Configure profiles in [`src/profiles.js`](src/profiles.js). The build emits the metadata block and embeds one frozen profile in each script. Installation and automatic update URLs point to the public repository's `main` branch; see [publishing](docs/RELEASING.md).

## License and provenance

Licensed under **GNU GPL version 3 or any later version**, SPDX identifier **`GPL-3.0-or-later`**. See [`LICENSE`](LICENSE). The license text is the unmodified GNU GPL v3; the “or later” choice is specified by this notice, package metadata, and source headers.

The design consolidates three user-supplied V5.x scripts. [Migration notes](docs/MIGRATION.md) record the source hashes and explain intentional replacements. This repository includes the complete corresponding source and build instructions. Distribute that source and the GPL notices with modified releases. Playwright is a development-only dependency under its own license; it is not embedded in the userscripts.
