// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { root } from './build.mjs';

const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const playwright = process.env.PLAYWRIGHT_MODULE_PATH
  ? await import(pathToFileURL(join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href)
  : await import('playwright');
const { chromium, firefox } = playwright;
// Opaque RGBA PNG with valid chunk checksums, accepted by strict image decoders.
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==', 'base64');
const server = createServer(async (request, response) => {
  if (request.url === '/pixel.png') {
    response.writeHead(200, { 'Content-Type': 'image/png' });
    response.end(pixel);
  } else if (request.url === '/diagnostics') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(join(root, 'docs/diagnostics.html')));
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html lang="en"><title>Browser Privacy Core Test</title><body>Test fixture</body></html>');
  }
});
await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const engine = process.env.BROWSER_ENGINE === 'firefox' ? firefox : chromium;
let browser;
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}

try {
  browser = await engine.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
  });
  console.log(`Browser: ${browser.version()}`);
  for (const profile of ['stable', 'hardened']) {
    const script = await readFile(join(root, 'dist', `browser-privacy-core.${profile}.user.js`), 'utf8');
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(() => {
      window.__native = {
        read: CanvasRenderingContext2D.prototype.getImageData,
        url: HTMLCanvasElement.prototype.toDataURL,
        audio: window.AudioContext,
        offline: window.OfflineAudioContext,
        offlineStart: window.OfflineAudioContext?.prototype.startRendering,
        media: window.HTMLMediaElement,
        streams: window.MediaStream,
        gum: navigator.mediaDevices?.getUserMedia,
        permissions: navigator.permissions?.query,
        plugins: navigator.plugins,
        mimes: navigator.mimeTypes,
        webdriver: navigator.webdriver,
        rtc: window.RTCPeerConnection,
        cores: navigator.hardwareConcurrency,
        offscreenRead: window.OffscreenCanvas
          ? Object.getPrototypeOf(new OffscreenCanvas(1, 1).getContext('2d')).getImageData : undefined,
      };
    });
    await page.addScriptTag({ content: script });
    const result = await page.evaluate(async ({ profile, version }) => {
      const status = window[Symbol.for('BrowserPrivacyCore')];
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 128);
      const rawBefore = __native.read.call(ctx, 0, 0, 256, 128).data;
      const url = canvas.toDataURL();
      const repeated = url === canvas.toDataURL();
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      async function decode(blob) {
        const bitmap = await createImageBitmap(blob);
        const target = document.createElement('canvas');
        target.width = bitmap.width; target.height = bitmap.height;
        const context = target.getContext('2d');
        context.drawImage(bitmap, 0, 0); bitmap.close();
        return __native.read.call(context, 0, 0, target.width, target.height).data;
      }
      const urlPixels = await decode(await (await fetch(url)).blob());
      const blobPixels = await decode(blob);
      const readPixels = ctx.getImageData(0, 0, 256, 128).data;
      const rawAfter = __native.read.call(ctx, 0, 0, 256, 128).data;
      const equal = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
      let invalidReceiver = false;
      try { ctx.getImageData.call({}, 0, 0, 1, 1); } catch (error) { invalidReceiver = error instanceof TypeError; }
      let invalidCallback = false;
      try { canvas.toBlob(1); } catch (error) { invalidCallback = error instanceof TypeError; }
      let invalidSize = false;
      try { ctx.getImageData(0, 0, 0, 1); } catch (error) { invalidSize = error.name === 'IndexSizeError'; }
      const cropped = ctx.getImageData(40, 30, 100, 70).data;
      const negative = ctx.getImageData(140, 100, -100, -70).data;
      const outside = ctx.getImageData(-10, -5, 300, 150).data;
      let paddingCorrect = true;
      for (let row = 0; row < 150; row++) for (let column = 0; column < 300; column++) {
        const x = column - 10; const y = row - 5;
        for (let channel = 0; channel < 4; channel++) {
          const expected = x >= 0 && x < 256 && y >= 0 && y < 128 ? readPixels[(y * 256 + x) * 4 + channel] : 0;
          if (outside[(row * 300 + column) * 4 + channel] !== expected) paddingCorrect = false;
        }
      }
      let coordinateConversions = 0;
      const coerced = ctx.getImageData({ valueOf() { coordinateConversions++; return 0; } }, '0', 256, 128).data;
      let coordinateRange = false;
      try { ctx.getImageData(0x100000000, 0, 256, 128); } catch (error) {
        try { __native.read.call(ctx, 0x100000000, 0, 256, 128); }
        catch (nativeError) { coordinateRange = error.name === nativeError.name; }
      }
      let cropMatches = true;
      for (let row = 0; row < 70; row++) {
        for (let index = 0; index < 400; index++) {
          if (cropped[row * 400 + index] !== readPixels[((row + 30) * 256 + 40) * 4 + index]) cropMatches = false;
        }
      }
      const beforeMarker = status;
      const changed = urlPixels.some((value, index) => value !== rawBefore[index]);
      const bounded = urlPixels.every((value, index) => Math.abs(value - rawBefore[index]) <= 1);
      return {
        status, repeated, changed, bounded,
        exportsAgree: equal(urlPixels, blobPixels),
        sourceUnchanged: equal(rawBefore, rawAfter),
        readbackCorrect: equal(readPixels, profile === 'hardened' ? urlPixels : rawBefore),
        cropMatches, paddingCorrect, negativeMatches: equal(cropped, negative),
        coordinateCoercion: equal(coerced, readPixels) && coordinateConversions === 1,
        coordinateRange,
        invalidReceiver, invalidCallback, invalidSize,
        empty: document.createElement('canvas').toDataURL().startsWith('data:image/png'),
        nativeSource: /\[native code\]/.test(canvas.toDataURL.toString()),
        apiIntegrity: __native.audio === window.AudioContext && __native.media === window.HTMLMediaElement &&
          __native.streams === window.MediaStream && __native.gum === navigator.mediaDevices?.getUserMedia &&
          __native.permissions === navigator.permissions?.query && __native.plugins === navigator.plugins &&
          __native.mimes === navigator.mimeTypes && __native.webdriver === navigator.webdriver,
        hardware: navigator.hardwareConcurrency <= __native.cores,
        rtcUntouched: __native.rtc === window.RTCPeerConnection,
        markerFrozen: Object.isFrozen(beforeMarker) && Object.isFrozen(beforeMarker.modules),
        versionCorrect: status.version === version && window[Symbol.for('BrowserPrivacyCore.v6')] === status,
      };
    }, { profile, version });
    for (const key of ['repeated', 'changed', 'bounded', 'exportsAgree', 'sourceUnchanged', 'readbackCorrect',
      'cropMatches', 'paddingCorrect', 'negativeMatches', 'coordinateCoercion', 'coordinateRange', 'invalidReceiver', 'invalidCallback', 'invalidSize',
      'empty', 'nativeSource', 'apiIntegrity', 'hardware', 'markerFrozen', 'versionCorrect']) {
      check(result[key], `${profile}: ${key}`);
    }
    check(result.status.profile === profile, `${profile}: profile installed`);
    check(result.rtcUntouched === (profile === 'stable'), `${profile}: RTC policy selection`);
    for (const [name, status] of Object.entries(result.status.modules)) {
      check(status !== 'unavailable', `${profile}: ${name} must initialize without an exception`);
    }

    const more = await page.evaluate(async ({ profile, origin }) => {
      const equal = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
      let offscreen = null;
      if (window.OffscreenCanvas) {
        const surface = new OffscreenCanvas(256, 128);
        const context = surface.getContext('2d');
        context.fillStyle = '#fff'; context.fillRect(0, 0, 256, 128);
        const before = __native.offscreenRead.call(context, 0, 0, 256, 128).data;
        const first = new Uint8Array(await (await surface.convertToBlob()).arrayBuffer());
        const second = new Uint8Array(await (await surface.convertToBlob()).arrayBuffer());
        const after = __native.offscreenRead.call(context, 0, 0, 256, 128).data;
        const bitmap = await createImageBitmap(new Blob([first], { type: 'image/png' }));
        const decoded = document.createElement('canvas'); decoded.width = 256; decoded.height = 128;
        const decodedContext = decoded.getContext('2d'); decodedContext.drawImage(bitmap, 0, 0); bitmap.close();
        const exportedPixels = __native.read.call(decodedContext, 0, 0, 256, 128).data;
        const directRead = context.getImageData(0, 0, 256, 128).data;
        const expectedWebGL = Boolean(new OffscreenCanvas(2, 2).getContext('webgl'));
        const unbound = new OffscreenCanvas(2, 2);
        await unbound.convertToBlob();
        offscreen = equal(first, second) && equal(before, after) && Boolean(unbound.getContext('webgl')) === expectedWebGL &&
          !equal(exportedPixels, before) && exportedPixels.every((value, index) => Math.abs(value - before[index]) <= 1) &&
          equal(directRead, profile === 'hardened' ? exportedPixels : before);
      }
      const frame = document.createElement('iframe');
      document.body.append(frame);
      const frameStatus = frame.contentWindow[Symbol.for('BrowserPrivacyCore')];
      const frameCanvas = frame.contentDocument.createElement('canvas');
      frameCanvas.width = 256; frameCanvas.height = 128;
      const frameContext = frameCanvas.getContext('2d');
      frameContext.fillStyle = '#fff'; frameContext.fillRect(0, 0, 256, 128);
      const localCanvas = document.createElement('canvas');
      localCanvas.width = 256; localCanvas.height = 128;
      const localContext = localCanvas.getContext('2d');
      localContext.fillStyle = '#fff'; localContext.fillRect(0, 0, 256, 128);
      const framesAgree = frameCanvas.toDataURL() === localCanvas.toDataURL();
      // WindowProxy identity persists, but the old document's installation must not.
      const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
      frame.src = `${origin}/navigated-frame`;
      await loaded;
      const frameAfterNavigation = frame.contentWindow[Symbol.for('BrowserPrivacyCore')]?.profile === profile;
      const container = document.createElement('div');
      container.innerHTML = '<section><iframe></iframe></section>';
      document.body.append(container);
      await new Promise(resolve => setTimeout(resolve, 0));
      const nestedFrames = container.querySelector('iframe').contentWindow[Symbol.for('BrowserPrivacyCore')]?.profile === profile;
      const url = localCanvas.toDataURL();
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl');
      let webgl = null;
      if (gl) {
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        const extensions = gl.getSupportedExtensions();
        let coercions = 0;
        const parameter = { valueOf() { coercions++; return 0x9246; } };
        const objectResult = extension ? gl.getParameter(parameter) : null;
        const stringResult = extension ? gl.getParameter('37446') : null;
        webgl = profile === 'hardened'
          ? extension === null && !extensions.includes('WEBGL_debug_renderer_info')
          : !extension || gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) === 'WebGL' &&
            objectResult === 'WebGL' && stringResult === 'WebGL' && coercions === 1;
      }
      const image = new Image();
      image.src = `${origin.replace('127.0.0.1', 'localhost')}/pixel.png`;
      await image.decode();
      const tainted = document.createElement('canvas');
      tainted.getContext('2d').drawImage(image, 0, 0);
      let taint = false;
      try { tainted.toDataURL(); } catch (error) { taint = error.name === 'SecurityError'; }
      const audio = new OfflineAudioContext(1, 4096, 44100);
      const oscillator = audio.createOscillator(); oscillator.connect(audio.destination); oscillator.start();
      let eventBuffer;
      const completed = new Promise(resolve => audio.oncomplete = event => { eventBuffer = event.renderedBuffer; resolve(); });
      const buffer = await audio.startRendering();
      const promiseSamples = buffer.getChannelData(0).slice();
      await completed;
      const audioConsistent = eventBuffer === buffer && equal(promiseSamples, eventBuffer.getChannelData(0));
      const baselineAudio = new __native.offline(1, 4096, 44100);
      const baselineOscillator = baselineAudio.createOscillator();
      baselineOscillator.connect(baselineAudio.destination); baselineOscillator.start();
      const nativeBuffer = await Reflect.apply(__native.offlineStart, baselineAudio, []);
      const nativeSamples = nativeBuffer.getChannelData(0);
      const audioPolicy = profile === 'hardened' ? !equal(nativeSamples, promiseSamples) : equal(nativeSamples, promiseSamples);
      const audioBounded = promiseSamples.every((value, index) => Math.abs(value - nativeSamples[index]) <= 2e-7);
      let hints = null;
      if (navigator.userAgentData) {
        const values = await navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList']);
        hints = profile !== 'hardened' || Object.keys(values).every(key => ['brands', 'mobile', 'platform'].includes(key));
      }
      let rtc = null;
      let rtcDetails = null;
      if (window.RTCPeerConnection) {
        class ChildConnection extends RTCPeerConnection {}
        const pc = new ChildConnection({ iceTransportPolicy: 'all' });
        const initial = pc.getConfiguration().iceTransportPolicy;
        pc.setConfiguration({ iceTransportPolicy: 'all' });
        const reconfigured = pc.getConfiguration().iceTransportPolicy;
        pc.createDataChannel('test');
        const candidates = [];
        pc.addEventListener('icecandidate', event => {
          // Firefox can emit an empty candidate object as the end-of-candidates marker.
          if (event.candidate?.candidate) candidates.push(event.candidate.type);
        });
        await pc.setLocalDescription(await pc.createOffer());
        await new Promise(resolve => {
          if (pc.iceGatheringState === 'complete') return resolve();
          const timer = setTimeout(resolve, 3000);
          pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); }
          });
        });
        rtcDetails = { initial, reconfigured, candidates, subclass: pc instanceof ChildConnection,
          hasNonRelaySDP: / typ (host|srflx) /i.test(pc.localDescription.sdp) };
        rtc = pc instanceof ChildConnection && (profile === 'hardened'
          ? initial === 'relay' && reconfigured === 'relay' && candidates.every(type => type === 'relay') &&
            !/ typ (host|srflx) /i.test(pc.localDescription.sdp)
          : initial === 'all' && reconfigured === 'all');
        pc.close();
      }
      const devices = navigator.mediaDevices ? await navigator.mediaDevices.enumerateDevices() : null;
      return { offscreen, frames: frameStatus?.profile === profile && framesAgree, frameAfterNavigation, nestedFrames, webgl, taint,
        audioConsistent, audioPolicy, audioBounded, hints, rtc, rtcDetails, url,
        media: profile !== 'hardened' || !devices || devices.every(device => device.label !== ''),
        battery: profile !== 'hardened' || !('getBattery' in navigator) || navigator.getBattery === undefined,
      };
    }, { profile, origin });
    for (const key of ['offscreen', 'webgl', 'hints', 'rtc']) {
      if (more[key] === null) console.log(`${profile}: ${key} unavailable in this browser (skipped)`);
      else check(more[key], `${profile}: ${key}${key === 'rtc' ? ` ${JSON.stringify(more.rtcDetails)}` : ''}`);
    }
    for (const key of ['frames', 'frameAfterNavigation', 'nestedFrames', 'taint', 'audioConsistent', 'audioPolicy', 'audioBounded', 'media', 'battery']) check(more[key], `${profile}: ${key}`);
    // A second profile must not stack wrappers or silently switch the running profile.
    const otherScript = await readFile(join(root, 'dist', `browser-privacy-core.${profile === 'stable' ? 'hardened' : 'stable'}.user.js`), 'utf8');
    await page.addScriptTag({ content: otherScript });
    check(await page.evaluate(profile => window[Symbol.for('BrowserPrivacyCore')].profile === profile, profile), `${profile}: duplicate install guard`);
    await context.addInitScript({ content: script });
    await page.reload();
    const afterReload = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 256, 128);
      return canvas.toDataURL();
    });
    check(afterReload === more.url, `${profile}: same-origin reload stability at document-start`);
    check(errors.length === 0, `${profile}: no uncaught page errors: ${errors.join('; ')}`);
    await context.close();
    console.log(`${profile}: passed`);
  }
  // Restricted storage and absent optional interfaces must not break initialization.
  const restricted = await browser.newContext();
  await restricted.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
    for (const key of ['OffscreenCanvas', 'WebGLRenderingContext', 'WebGL2RenderingContext', 'OfflineAudioContext', 'webkitOfflineAudioContext', 'RTCPeerConnection']) {
      try { Object.defineProperty(window, key, { value: undefined, configurable: true }); } catch { /* Engine-specific binding. */ }
    }
  });
  const restrictedPage = await restricted.newPage();
  await restrictedPage.goto(origin);
  await restrictedPage.addScriptTag({ content: await readFile(join(root, 'dist/browser-privacy-core.hardened.user.js'), 'utf8') });
  check(await restrictedPage.evaluate(() => window[Symbol.for('BrowserPrivacyCore')]?.modules.canvas === 'enabled'), 'restricted storage and missing APIs');
  check(await restrictedPage.evaluate(() => {
    const frame = document.createElement('iframe'); document.body.append(frame);
    function exportWhite(document) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 256, 128);
      return canvas.toDataURL();
    }
    return exportWhite(document) === exportWhite(frame.contentDocument);
  }), 'storage-denied same-origin frames share the runtime seed');
  await restricted.close();

  const locked = await browser.newContext();
  const lockedPage = await locked.newPage();
  await lockedPage.goto(origin);
  await lockedPage.evaluate(() => {
    window.__locked = { url: HTMLCanvasElement.prototype.toDataURL, rtc: window.RTCPeerConnection,
      rtcConstructor: window.RTCPeerConnection?.prototype.constructor };
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', { configurable: false, writable: false });
    if (window.RTCPeerConnection) Object.defineProperty(RTCPeerConnection.prototype, 'setConfiguration', { configurable: false, writable: false });
  });
  await lockedPage.addScriptTag({ content: await readFile(join(root, 'dist/browser-privacy-core.hardened.user.js'), 'utf8') });
  const rollback = await lockedPage.evaluate(() => ({
    canvas: window[Symbol.for('BrowserPrivacyCore')].modules.canvas === 'unavailable' && HTMLCanvasElement.prototype.toDataURL === __locked.url,
    rtc: !__locked.rtc || window[Symbol.for('BrowserPrivacyCore')].modules.webrtc === 'unavailable' &&
      window.RTCPeerConnection === __locked.rtc && RTCPeerConnection.prototype.constructor === __locked.rtcConstructor,
    independent: window[Symbol.for('BrowserPrivacyCore')].modules.navigator === 'enabled',
  }));
  check(rollback.canvas, 'locked canvas API rolls back earlier export patches');
  check(rollback.rtc, 'locked RTC reconfiguration rolls back constructor patches');
  check(rollback.independent, 'unrelated modules continue after rollback');
  await locked.close();

  const legacy = await browser.newContext();
  const legacyPage = await legacy.newPage();
  await legacyPage.goto(origin);
  await legacyPage.evaluate(() => {
    window.__legacyURL = HTMLCanvasElement.prototype.toDataURL;
    Object.defineProperty(window, Symbol.for('BrowserPrivacyCore.v6'), { value: { version: '6.0.0' } });
  });
  await legacyPage.addScriptTag({ content: await readFile(join(root, 'dist/browser-privacy-core.hardened.user.js'), 'utf8') });
  check(await legacyPage.evaluate(() => !window[Symbol.for('BrowserPrivacyCore')] &&
    HTMLCanvasElement.prototype.toDataURL === __legacyURL), 'legacy 6.x installation prevents mixed-version stacking');
  await legacy.close();
  const diagnosticContext = await browser.newContext();
  await diagnosticContext.addInitScript({ content: await readFile(join(root, 'dist/browser-privacy-core.hardened.user.js'), 'utf8') });
  const diagnosticPage = await diagnosticContext.newPage();
  await diagnosticPage.goto(`${origin}/diagnostics`);
  await diagnosticPage.getByRole('button', { name: 'Run local probes' }).click();
  await diagnosticPage.waitForFunction(() => document.getElementById('results').textContent.includes('webRTCPolicy'));
  const diagnosticResults = JSON.parse(await diagnosticPage.locator('#results').innerText());
  check(diagnosticResults.canvasRepeatable && diagnosticResults.webRTCPolicy === 'relay' && !diagnosticResults.error,
    'diagnostic page runs its interactive local probes');
  check((await diagnosticPage.locator('#status').innerText()).includes('HARDENED'), 'diagnostic page identifies installed profile');
  await diagnosticContext.close();
  console.log(`Passed ${checks} real-browser checks.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
