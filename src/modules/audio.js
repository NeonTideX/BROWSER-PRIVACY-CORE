// SPDX-License-Identifier: GPL-3.0-or-later
import { mix32 } from '../core.js';

export function installAudio(win, config, seed, patcher) {
  if (!config.offlineAudio) return false;
  const Original = win.OfflineAudioContext || win.webkitOfflineAudioContext;
  if (!Original) return false;
  const processed = new WeakSet();
  const nativeGetChannelData = win.AudioBuffer.prototype.getChannelData;
  function protect(buffer) {
    if (!buffer || processed.has(buffer)) return buffer;
    processed.add(buffer);
    const basis = mix32(seed ^ buffer.length ^ buffer.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = Reflect.apply(nativeGetChannelData, buffer, [channel]);
      for (let index = 0; index < data.length; index += 64) {
        const value = mix32(basis ^ index ^ mix32(channel));
        // Keep silence silent; never add audible-level dither to output pipelines.
        if (data[index] !== 0 && Number.isFinite(data[index])) {
          data[index] = Math.fround(data[index] + ((value & 1) ? 1 : -1) * 1e-7);
        }
      }
    }
    return buffer;
  }
  patcher.must(patcher.method(Original.prototype, 'startRendering', (target, receiver, args) =>
    Reflect.apply(target, receiver, args).then(protect)), 'OfflineAudioContext.startRendering');
  const proxy = new win.Proxy(Original, {
    construct(target, args, newTarget) {
      const context = Reflect.construct(target, args, newTarget);
      // Install before page listeners so the completion event sees the same buffer as the promise.
      context.addEventListener('complete', event => protect(event.renderedBuffer), { capture: true });
      return context;
    },
  });
  for (const key of ['OfflineAudioContext', 'webkitOfflineAudioContext']) {
    if (win[key] === Original) patcher.must(patcher.replace(win, key, { value: proxy }, Original), key);
  }
  patcher.replace(Original.prototype, 'constructor', { value: proxy }, Original);
  return true;
}
