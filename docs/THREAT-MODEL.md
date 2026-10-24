# Threat model and limits

## Intended use

Reduce information exposed by selected browser APIs to ordinary page scripts while retaining as much normal browser behavior as the selected policy allows. This project does not claim anonymity, undetectability, complete fingerprint resistance, or protection from an actively hostile page that deliberately bypasses JavaScript patches.

## Boundaries

- Network requests still expose the connection's public IP, TLS and HTTP characteristics, and request headers. The script is not a VPN, proxy, or network filter.
- WebRTC relay policy applies only to peer connections created through patched constructors in covered realms. Preexisting objects, cached native constructors, unpatched workers, early scripts, and clean realms can bypass it. Stable has no WebRTC IP protection.
- Same-origin frames can be patched after creation or synchronous access. Cross-origin frames need their own manager injection. Sandboxed opaque origins, `srcdoc`, CSP, and manager timing introduce gaps. Workers, shared workers, and service workers are not patched.
- Direct WebGL `readPixels`, WebGPU, font enumeration, screen size, timezone, language, user agent strings, media queries, timing, network APIs, storage, account identifiers, and behavioral signals are outside the protection set.
- High-entropy Client Hints filtering affects the JavaScript response only. It does not modify browser request headers or low-entropy platform information.
- Device enumeration filtering uses native device labels as the authorization signal. Devices with empty labels are hidden even if another permission path exists. Authorized native devices and identifiers remain available for legitimate device selection.
- Disabling battery access changes the observable API shape. This is deliberate restriction, not a convincing emulation of a different browser.
- Generic GPU strings, hardware caps, deterministic noise, native-source formatting, and the diagnostic marker are observable and can make a browser more unusual. Stronger restrictions do not automatically imply a lower fingerprint uniqueness score.

## Canvas coverage

Stable protects HTML canvas `toDataURL`/`toBlob` and main-realm OffscreenCanvas `convertToBlob`; direct 2D readback remains original. Hardened additionally protects 2D `getImageData`, including cropping, negative extents, and native coordinate conversion. Only ordinary `Uint8ClampedArray` image data with fully opaque pixels is perturbed. Transparent and semitransparent pixels and float formats remain native.

The implementation uses native copies, which can introduce color-space conversion. Cross-interface equality is tested on lossless opaque sRGB PNG surfaces, not promised for wide gamut, HDR, JPEG, WebP, alpha-heavy content, antialiasing at edges, or all hardware paths. WebGL exports may also depend on drawing-buffer preservation.

Stable skips export snapshots above 4,194,304 pixels. Hardened skips export snapshots or individual readback results above 8,388,608 pixels. A small Hardened crop from a larger source can still be protected. Unsupported, tainted, detached, zero-size, or allocation-failed surfaces use the original native path. This compatibility fallback means an attacker can deliberately choose an uncovered surface. Selection is sparse, so a small or specially constructed image may not change at all.

Source pixels remain unchanged by export hooks. Deterministic bit replacement prevents cumulative noise drift, but it is not encryption. A determined attacker who knows the mask design, controls pixel content, or compares native and patched realms can infer or bypass it. There is no attempt to stop screenshotting or analysis of a page's visible output.

## Audio and compatibility

Hardened modifies offline-rendered samples, including data that may later be played, exported, or analyzed. It is unsuitable for bit-exact audio production. Real-time `AudioContext`, microphone capture, media tracks, and playback element methods are not replaced. That preserves their implementation, not an absolute promise that every site's media experience remains unchanged: device filtering and relay-only WebRTC can still affect site behavior.

## Trust assumptions

The page controls its own scripts and can inspect storage, overwrite configurable patches, retain native references, create new realms, or interfere with diagnostics. `sessionStorage` is not secret; the 32-bit derived seed is not collision-resistant. The diagnostic marker is informational and can be spoofed before installation. Userscript managers, browser extensions, browser updates, and other privacy tools are trusted only to the extent that the user trusts them.

For stronger guarantees, use browser-enforced privacy controls and a deliberately configured browser profile. This project is one optional layer with explicit coverage limits.
