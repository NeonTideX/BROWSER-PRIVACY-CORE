# Installation and troubleshooting

## Manager setup

Install exactly one script from `dist/`, disable older versions, and reload every tab where you want the new version to apply. Removing or disabling a script does not restore already-patched document prototypes; reload the page. Do not combine this project with other fingerprint-spoofing scripts without testing the interaction.

The metadata uses `@grant none`, `@inject-into page`, and `@run-at document-start`. Violentmonkey documents the required page realm and timing behavior in its [metadata reference](https://violentmonkey.github.io/api/metadata-block/). Some browsers require developer mode or a separate permission to run userscripts. Check your manager's own instructions.

The script intentionally requests page injection instead of silently falling back to an isolated content-script realm. An isolated realm can appear to run while leaving page-visible browser APIs unchanged. CSP and extension restrictions can prevent execution. Internal browser pages, extension pages, privileged documents, and file URLs are not matched.

Tampermonkey and other managers may handle page injection differently. They are compatibility targets, not verified manager integrations. Do not infer support from a passing Playwright test: those tests inject directly into a browser page and do not install a manager extension.

## Pick a profile

- Use Stable for a compatibility-first setup. WebRTC and offline audio remain native.
- Use Hardened where strict signal reduction is more useful than compatibility. WebRTC requires a site-provided TURN relay; no relay service is included.
- Add sensitive or incompatible sites to the manager's exclusion list. Excluding a top-level site does not automatically exclude every third-party frame URL; review your manager's matching rules.

Do not install both profiles as a way to increase protection. The guard keeps the first active profile for that document. Disable the unwanted profile and reload to switch.

## Diagnose

Run `window[Symbol.for('BrowserPrivacyCore.v6')]` in the page console. Select the relevant frame in developer tools when checking a frame.

| Symptom | Check |
| --- | --- |
| Diagnostic object is undefined | URL matching, manager enabled state, page injection, CSP, extension permissions, and reload |
| Unexpected profile | Disable duplicate versions, then reload |
| A module reports `inactive` | It is disabled by the profile or not exposed by this browser |
| A module reports `unavailable` | Another extension may have locked the prototype, or the browser differs; report a minimal reproduction |
| Calls stop connecting | Try Stable or exclude the site; Hardened forces relay-only WebRTC |
| Image exports differ | Protected exports intentionally change selected opaque RGB bits; use an exclusion for exact-pixel workflows |
| Device list is empty | Hardened hides devices with empty labels; grant the site's normal media permission or use Stable |
| Fingerprinting score rises | Hook detection and uncommon combinations can increase uniqueness; the score is not a privacy guarantee |

No script sends telemetry or silently reports failures to a server. Module failures are isolated, and some unsupported surfaces fall back to native behavior to avoid breaking the page.

## Reset session values

The storage key is `__browser_privacy_core_seed_v6`. Removing that key from the current origin's session storage and reloading generates a new seed. Closing a tab normally ends the session, but browser session restoration and duplicated tabs can preserve or copy session storage. A seed reset changes selected exported pixel values; it does not reset cookies, accounts, or browser storage elsewhere.
