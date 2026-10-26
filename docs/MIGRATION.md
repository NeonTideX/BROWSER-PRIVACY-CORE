# V1 migration guide

## V1 numbering and 6.x migration

V1 (`1.0.0`) is the maintained release line after the previously published 6.0.0 version. The lower number is intentional. Users must manually install one V1 profile and disable every old script, because userscript managers generally will not offer a numeric downgrade as an update. V1 uses a new name/namespace and a version-independent diagnostic marker: `window[Symbol.for('BrowserPrivacyCore')]`.

The 6.x diagnostic marker remains a guard alias, so old and new cores do not stack in the same document. The first active core wins until reload. V1 starts a new storage key, `__browser_privacy_core_seed_v1`, and a new block-based pixel mask. Existing seed entries are not deleted; old and V1 exported fingerprints should not be expected to match. Within V1, reload, crop, and lossless export consistency remain covered by tests.

This release also adds reversible module-installation transactions, separates frame lifecycle code, shares fallback seeds with frames installed by the same runtime, and includes all community documents in release source packages.

## Current upgrade procedure

1. Disable or remove all legacy V5.x/6.x scripts and previous copies.
2. Manually install exactly one V1 script from `dist/`.
3. Reload affected pages. Restart active calls or offline audio tasks before comparing behavior.
4. Check the diagnostic object and test sites you rely on.

Legacy seed keys are not migrated. V1 uses `__browser_privacy_core_seed_v1`. Disabling V1 and reloading returns browser APIs to their normal state unless another extension or script also patches them.
