# Testing

## Fast checks

```sh
npm run build
npm run check
```

The fast suite verifies deterministic hashing, seed/storage behavior, bounded/idempotent pixels, crop consistency, transparency, cross-realm typed arrays, hardware caps, WebRTC dictionary semantics, patch descriptors/receiver checks, standalone metadata, checksums, and synchronized generated output. It uses only Node built-ins.

V1 additionally checks transaction rollback and nesting, preservation of earlier successful modules, descriptor-kind conversion, sparse density bounds, clipped/narrow crops, and invalid strides. Browser regressions lock canvas/RTC methods to verify rollback, compare frame exports with storage denied, and cover the legacy 6.x guard.

Run `npm run benchmark` to compare the old per-pixel scan with V1 block selection. It measures a 1920x1080 opaque RGBA mask, reports median timings after warmup, and excludes canvas snapshots, encoding, and GPU transfer. It is a diagnostic benchmark, not a timing-sensitive test or end-to-end speed guarantee.

## Real browsers

```sh
npm ci --ignore-scripts
npx playwright install chromium firefox
npm run test:browser
```

The browser suite starts its own local HTTP server on an ephemeral port, creates isolated temporary browser contexts, and closes them after testing. It does not load external websites. A deliberately cross-origin local PNG tests canvas taint behavior. Peer connections use no external ICE servers, so the suite does not test a real TURN provider or end-to-end media calling.

Test Firefox with this environment variable:

```sh
BROWSER_ENGINE=firefox npm run test:browser
```

PowerShell:

```powershell
$env:BROWSER_ENGINE = 'firefox'
npm run test:browser
Remove-Item Env:BROWSER_ENGINE
```

Use a locally installed Chromium-based browser instead of downloading one:

```powershell
$env:BROWSER_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:browser
Remove-Item Env:BROWSER_EXECUTABLE_PATH
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `BROWSER_ENGINE` | `chromium` (default) or `firefox` |
| `BROWSER_EXECUTABLE_PATH` | Explicit compatible browser executable |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright-managed browser binary directory |
| `PLAYWRIGHT_MODULE_PATH` | Absolute Playwright package directory for an existing external installation |

Browser checks cover both profiles, repeatable PNGs, blob/data URL equality, direct-read policy, crop/negative extents, invalid arguments, source preservation, OffscreenCanvas context selection, generic WebGL reporting, native API identity, same-origin frames and navigation, audio promise/event consistency, high-entropy hints, device filtering, relay reconfiguration/subclassing, duplicate profiles, reload stability, denied storage, and absent optional APIs. Unsupported optional interfaces are reported as skipped rather than counted as tested.

The GitHub workflow runs core checks on Linux/Windows with Node.js 22/24. Linux Chromium/Firefox checks use the official Playwright container with browser/system dependencies already installed. The image version must match the pinned npm dependency; a build test enforces that match. See the [official container documentation](https://playwright.dev/docs/docker). A workflow definition is not evidence of a successful hosted run; inspect the actual Actions results after publishing.

## Manual manager and site matrix

Direct page injection cannot verify manager-specific CSP, extension permissions, or injection timing. Before publishing, install a built script through a real manager and record the actual versions and results for:

| Scenario | Expected |
| --- | --- |
| Violentmonkey, one profile, ordinary HTTPS page | Diagnostic marker present after reload |
| Site with a strict CSP | Either verified page-realm execution or an explicitly documented manager restriction |
| Same-origin, cross-origin, `srcdoc`, nested and sandboxed frames | Record coverage separately; no assumptions about first-script timing |
| Photo editor and transparent/wide-gamut exports | No source mutation; accept documented export differences or add exclusions |
| Audio/video playback and microphone permissions | Native playback/capture methods; normal permissions |
| Video call with TURN | Hardened uses relay; verify with the site's diagnostics |
| Peer-to-peer feature without TURN | Stable works normally; Hardened may fail to connect |
| Device selection before/after permission | Hardened hides empty labels; native authorized objects remain usable |
| Disable or switch profile, then reload | Correct profile or normal browser behavior restored |

## Regression evidence

Record completed local runs in `VALIDATION.md`, including date, operating system, Node/browser versions, check counts, skips, and known untested areas. Do not claim userscript-manager or website compatibility based solely on headless browser tests.
