// SPDX-License-Identifier: GPL-3.0-or-later

export function hash32(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

export function mix32(value) {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function getSeed(win) {
  const key = '__browser_privacy_core_seed_v6';
  let origin = win.location.origin;
  if (origin === 'null') {
    try { origin = win.parent.location.origin; } catch { /* Opaque or cross-origin. */ }
  }
  let stored;
  try { stored = win.sessionStorage.getItem(key); } catch { /* Storage can be denied. */ }
  if (!/^[a-f0-9]{32}$/.test(stored ?? '')) {
    const words = new win.Uint32Array(4);
    try {
      win.crypto.getRandomValues(words);
    } catch {
      // Last resort only; never derive the fallback from identifying device data.
      for (let index = 0; index < words.length; index++) {
        words[index] = Math.floor(win.Math.random() * 0x100000000);
      }
    }
    stored = Array.from(words, word => word.toString(16).padStart(8, '0')).join('');
    try { win.sessionStorage.setItem(key, stored); } catch { /* Per-document fallback. */ }
  }
  return hash32(`${stored}|${origin}`);
}

export function createPatcher(win) {
  const nativeSources = new WeakMap();
  const originalToString = win.Function.prototype.toString;
  let sourceMaskInstalled = false;

  function replace(owner, key, descriptor, original) {
    if (!owner) return false;
    const current = Object.getOwnPropertyDescriptor(owner, key);
    if (!current || !current.configurable && !current.writable) return false;
    Object.defineProperty(owner, key, { ...current, ...descriptor });
    if (original && typeof (descriptor.value ?? descriptor.get) === 'function') {
      nativeSources.set(descriptor.value ?? descriptor.get,
        Reflect.apply(originalToString, original, []));
    }
    return true;
  }

  function method(owner, key, apply) {
    const descriptor = owner && Object.getOwnPropertyDescriptor(owner, key);
    if (typeof descriptor?.value !== 'function') return false;
    const original = descriptor.value;
    const proxy = new win.Proxy(original, { apply });
    return replace(owner, key, { value: proxy }, original);
  }

  function getter(owner, key, transform) {
    const descriptor = owner && Object.getOwnPropertyDescriptor(owner, key);
    if (typeof descriptor?.get !== 'function') return false;
    const original = descriptor.get;
    return replace(owner, key, {
      get: new win.Proxy(original, {
        apply(target, receiver, args) {
          return transform(Reflect.apply(target, receiver, args), receiver);
        },
      }),
    }, original);
  }

  function maskSources() {
    if (sourceMaskInstalled) return;
    sourceMaskInstalled = method(win.Function.prototype, 'toString', (target, receiver, args) => {
      if (nativeSources.has(receiver)) return nativeSources.get(receiver);
      return Reflect.apply(target, receiver, args);
    });
  }

  return { replace, method, getter, maskSources };
}

export function quantizeHardware(actual, cap) {
  if (!Number.isFinite(actual) || actual < 1) return actual;
  let bucket = 1;
  while (bucket * 2 <= Math.min(actual, cap)) bucket *= 2;
  return bucket;
}

export function perturbPixels(image, seed, stride, canvasWidth, canvasHeight, x = 0, y = 0) {
  if (Object.prototype.toString.call(image.data) !== '[object Uint8ClampedArray]') return;
  const data = image.data;
  const basis = mix32(seed ^ mix32(canvasWidth) ^ mix32(canvasHeight + 0x9e3779b9));
  for (let row = 0; row < image.height; row++) {
    const absoluteY = y + row;
    if (absoluteY < 0 || absoluteY >= canvasHeight) continue;
    for (let column = 0; column < image.width; column++) {
      const absoluteX = x + column;
      if (absoluteX < 0 || absoluteX >= canvasWidth) continue;
      const offset = (row * image.width + column) * 4;
      // Keep transparent and premultiplied-alpha pixels intact.
      if (data[offset + 3] !== 255) continue;
      const coordinate = absoluteY * canvasWidth + absoluteX;
      const value = mix32(basis ^ mix32(coordinate));
      if (value % stride !== 0) continue;
      // Replacing a bit is idempotent, unlike adding fresh random noise.
      for (let channel = 0; channel < 3; channel++) {
        data[offset + channel] = (data[offset + channel] & 254) | ((value >>> (8 + channel)) & 1);
      }
    }
  }
}
