# Migration from V5.x

## Input provenance

The project was reconstructed from these three user-supplied files. The originals remain outside the new repository. Hashes identify the exact inputs; they are not a claim about authorship or upstream licensing.

| Input | SHA-256 |
| --- | --- |
| Browser Privacy Core V5.5 Stable.js | `6c3350e2298ee4926b91a85c203b41920f76efc0ef885ddfaca02194e4b5bd7e` |
| Browser Privacy Core V5.6 Balanced Hardened.js | `a55a091c9d06de89c4d5db5b6482d601cbbb6d0f31d6d7895cba2fee178819ba` |
| Browser Privacy Core V5.7 Balanced Hardened.js | `845aec6ae7fc2eae63a1606be82f90cdac2ac5501617ce146f25a29032096b38` |

The project is released under the user's requested `GPL-3.0-or-later` terms. Preserve any applicable third-party attribution and rights when redistributing source material you did not author.

## Intentional changes

| V5.x behavior | V6 decision |
| --- | --- |
| Different seeds for data URLs, blobs, and image reads | One coordinate-based mask for supported lossless surfaces |
| V5.5 direct reads add noise repeatedly through layered exports | Captured native reads and idempotent bit replacement |
| V5.5/V5.6 OffscreenCanvas export can modify the source | Copy first; never modify the original during export |
| Broad export work without uniform resource limits | Explicit per-profile limits and native fallback |
| Random GPU models and unrelated hardware pools | Generic GPU labels and downward hardware caps |
| ICE event filtering without complete native-policy coverage | Native WebRTC in Stable; enforced relay-only policy in Hardened |
| V5.7 SDP line deletion | No SDP rewriting |
| Fake permissions, batteries, plugins, and MIME arrays | Native models; explicit battery restriction only in Hardened |
| Fake preauthorization media identifiers | Native list in Stable; filter unlabeled native devices in Hardened |
| Forced `navigator.webdriver` value | Preserve native automation state |
| User-agent-derived storage fallback | Random document fallback when storage is denied |
| Partial iframe navigator synchronization | Full same-origin core installation with guards and documented timing limits |
| Repeated, separately maintained scripts | Shared modules, two reproducible artifacts, tests, and CI |

V6 Stable is inspired by V5.5's compatibility goal, not a byte-for-byte feature superset. V6 Hardened is the strictest bundled policy, not a claim that it covers every browser fingerprint surface.

## Upgrade procedure

1. Disable or remove all three legacy scripts and any previous V6 profile.
2. Install exactly one V6 script from `dist/`.
3. Reload affected pages. Restart active calls or offline audio tasks before comparing behavior.
4. Check the diagnostic object and test sites you rely on.

Legacy seed keys are not migrated. V6 uses a new origin/session storage key. Disabling V6 and reloading returns browser APIs to their normal state unless another extension or script also patches them.
