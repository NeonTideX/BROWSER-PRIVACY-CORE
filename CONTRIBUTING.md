# Contributing

Keep source, tests, comments, documentation, and issue discussions in English. Contributions are licensed under GPL-3.0-or-later.

1. Use Node.js 22 or newer and run `npm ci --ignore-scripts`.
2. Modify the shared source instead of generated files.
3. Add regression coverage for observable bugs. Prefer native browser behavior checks over assertions that merely repeat the implementation.
4. Run `npm run build`, `npm run check`, and the browser tests described in `docs/TESTING.md`.
5. Include regenerated scripts/checksums and update the changelog or relevant documentation.

Preserve native receiver checks, exceptions, callbacks, permission behavior, and object brands where the policy permits. Do not claim undetectability, anonymity, or universal fingerprint protection. Document any new compatibility cost and uncovered path. Avoid new runtime dependencies and network activity in userscripts.

Pull requests should explain the concrete behavior change, affected profile, validation performed, and remaining limitations. Do not include browser profiles, cookies, tokens, browsing history, `node_modules`, or downloaded browser binaries.
