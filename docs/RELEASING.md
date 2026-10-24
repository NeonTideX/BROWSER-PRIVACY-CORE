# Publishing and releases

## Repository checkout

The public repository is [NeonTideX/browser-privacy-core](https://github.com/NeonTideX/browser-privacy-core), with `main` as its default branch. Use a Git checkout for the release commands below:

```sh
git clone https://github.com/NeonTideX/browser-privacy-core.git
cd browser-privacy-core
```

A source-only folder without `.git` can run the build and tests, but needs a fresh checkout before Git commands or pushes are available. GitHub Desktop can also clone this repository.

## Before each release

1. Update `package.json` and the root package entry in `package-lock.json`, update the changelog, and keep both profiles on the same version.
2. Run `npm run build`, `npm run check`, and `npm run test:browser` with installed browsers.
3. Complete the manual userscript-manager and site checks in `TESTING.md`.
4. Run `npm run release`. It verifies that outputs match source and prepares `release/vVERSION/` with both scripts, checksums, the license, and a complete `source/` tree.
5. Commit source and `dist/`. After pushing, check CI before tagging.

For this release:

```sh
git tag -a v6.0.0 -m "Browser Privacy Core 6.0.0"
git push origin v6.0.0
```

The tag workflow verifies the package/tag version match, runs the Chromium suite, and uploads a release artifact containing scripts and source. It does not create a public GitHub Release automatically. Download the artifact, review it, and attach it to a GitHub Release along with both installable script files and `SHA256SUMS`. GitHub also offers source archives for the tag.

Do not publish only the generated files while withholding corresponding source and build instructions. Keep the GPL license and notices with the source and release assets.

## Update links

Generated metadata includes the real `@homepageURL`, `@supportURL`, `@downloadURL`, and `@updateURL` for this repository. Download and update checks use each profile's standalone raw file on `main`. Userscript managers control when updates are checked and installed. If a fork should distribute its own updates, change all four URLs in `scripts/build.mjs`, regenerate both scripts, and test the manager's installation/update behavior.

## Supply chain

Userscripts have no `@require`, remote imports, or runtime network dependency. Development uses one pinned direct Playwright dependency. Review dependency updates, the lockfile, and GitHub Action changes before accepting automated updates. `npm ci --ignore-scripts` disables package lifecycle scripts; Playwright browser installation is a separate explicit step.
