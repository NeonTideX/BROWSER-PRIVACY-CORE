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

export function getOrigin(win) {
  let origin = win.location.origin;
  if (origin === 'null') {
    try { origin = win.parent.location.origin; } catch { /* Opaque or cross-origin. */ }
  }
  return origin;
}

export function getSeed(win) {
  const key = '__browser_privacy_core_seed_v1';
  const origin = getOrigin(win);
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
  const changes = [];
  let maskedToString;

  function replace(owner, key, descriptor, original) {
    if (!owner) return false;
    const current = Object.getOwnPropertyDescriptor(owner, key);
    if (!current || !current.configurable && !current.writable) return false;
    const replacement = { ...current, ...descriptor };
    if ('value' in descriptor || 'writable' in descriptor) {
      delete replacement.get;
      delete replacement.set;
    } else if ('get' in descriptor || 'set' in descriptor) {
      delete replacement.value;
      delete replacement.writable;
    }
    Object.defineProperty(owner, key, replacement);
    changes.push({ owner, key, descriptor: current });
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
    if (maskedToString && win.Function.prototype.toString === maskedToString) return true;
    const installed = method(win.Function.prototype, 'toString', (target, receiver, args) => {
      if (nativeSources.has(receiver)) return nativeSources.get(receiver);
      return Reflect.apply(target, receiver, args);
    });
    if (installed) maskedToString = win.Function.prototype.toString;
    return installed;
  }

  function must(installed, name) {
    if (!installed) throw new win.Error(`Cannot patch ${name}: the API is absent or locked.`);
    return true;
  }

  function transaction(install) {
    const checkpoint = changes.length;
    function rollback() {
      for (let index = changes.length - 1; index >= checkpoint; index--) {
        const change = changes[index];
        Object.defineProperty(change.owner, change.key, change.descriptor);
      }
      changes.length = checkpoint;
    }
    try {
      const result = install();
      if (!result) rollback();
      return result;
    } catch (error) {
      rollback();
      throw error;
    }
  }

  return { replace, method, getter, maskSources, must, transaction };
}

export function quantizeHardware(actual, cap) {
  if (!Number.isFinite(actual) || actual < 1) return actual;
  let bucket = 1;
  while (bucket * 2 <= Math.min(actual, cap)) bucket *= 2;
  return bucket;
}

export function perturbPixels(image, seed, stride, canvasWidth, canvasHeight, x = 0, y = 0) {
  if (Object.prototype.toString.call(image.data) !== '[object Uint8ClampedArray]') return;
  if (!Number.isSafeInteger(stride) || stride < 1) return;
  const data = image.data;
  const basis = mix32(seed ^ mix32(canvasWidth) ^ mix32(canvasHeight + 0x9e3779b9));
  const firstRow = Math.max(0, -y);
  const lastRow = Math.min(image.height, canvasHeight - y);
  const left = Math.max(0, x);
  const right = Math.min(canvasWidth, x + image.width);
  if (left >= right) return;
  for (let row = firstRow; row < lastRow; row++) {
    const absoluteY = y + row;
    const rowStart = absoluteY * canvasWidth;
    const firstPixel = rowStart + left;
    const lastPixel = rowStart + right - 1;
    // Select one candidate per absolute-coordinate block instead of hashing every pixel.
    const lastBlock = Math.floor(lastPixel / stride);
    for (let block = Math.floor(firstPixel / stride); block <= lastBlock; block++) {
      const value = mix32(basis ^ mix32(block));
      const coordinate = block * stride + value % stride;
      if (coordinate < firstPixel || coordinate > lastPixel) continue;
      const offset = (row * image.width + coordinate - rowStart - x) * 4;
      // Keep transparent and premultiplied-alpha pixels intact.
      if (data[offset + 3] !== 255) continue;
      // Replacing a bit is idempotent, unlike adding fresh random noise.
      for (let channel = 0; channel < 3; channel++) {
        data[offset + channel] = (data[offset + channel] & 254) | ((value >>> (8 + channel)) & 1);
      }
    }
  }
}
