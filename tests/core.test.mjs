// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { hash32, mix32, getSeed, perturbPixels, quantizeHardware, createPatcher } from '../src/core.js';
import { forceRelay } from '../src/modules/webrtc.js';
import { profiles } from '../src/profiles.js';

function image(width = 256, height = 128) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
}

test('hashes are deterministic unsigned values', () => {
  assert.equal(hash32('hello'), 0x4f9f2cab);
  assert.equal(mix32(1234), mix32(1234));
  assert.notEqual(mix32(1234), mix32(1235));
});

test('pixel protection is bounded, repeatable, idempotent and seed-dependent', () => {
  const first = image();
  perturbPixels(first, 42, 128, first.width, first.height);
  assert.ok(first.data.some(value => value !== 255));
  assert.ok(first.data.every(value => value === 254 || value === 255));
  const repeated = first.data.slice();
  perturbPixels(first, 42, 128, first.width, first.height);
  assert.deepEqual(first.data, repeated);
  const second = image();
  perturbPixels(second, 43, 128, second.width, second.height);
  assert.notDeepEqual(second.data, first.data);
  for (let index = 3; index < first.data.length; index += 4) assert.equal(first.data[index], 255);
});

test('crop and full-surface pixels agree at absolute coordinates', () => {
  const full = image();
  const crop = image(80, 70);
  perturbPixels(full, 10, 32, 256, 128);
  perturbPixels(crop, 10, 32, 256, 128, 50, 20);
  for (let row = 0; row < crop.height; row++) {
    const start = ((row + 20) * full.width + 50) * 4;
    assert.deepEqual(crop.data.slice(row * 320, (row + 1) * 320), full.data.slice(start, start + 320));
  }
});

test('transparent pixels, floating data and out-of-bounds pixels remain intact', () => {
  const transparent = image(100, 100);
  for (let index = 3; index < transparent.data.length; index += 4) transparent.data[index] = 128;
  const original = transparent.data.slice();
  perturbPixels(transparent, 1, 1, 100, 100);
  assert.deepEqual(transparent.data, original);
  const floats = { width: 1, height: 1, data: new Float32Array([0.5, 0.5, 0.5, 1]) };
  perturbPixels(floats, 1, 1, 1, 1);
  assert.equal(floats.data[0], 0.5);
  const outside = image(1, 1);
  perturbPixels(outside, 1, 1, 2, 2, -1, -1);
  assert.deepEqual([...outside.data], [255, 255, 255, 255]);
});

test('pixels from another realm are supported', () => {
  const other = vm.runInNewContext('({ width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4).fill(255) })');
  perturbPixels(other, 42, 1, 64, 64);
  assert.ok(other.data.some(value => value === 254));
});

test('hardware caps never invent more capacity and preserve fractional device memory', () => {
  assert.deepEqual([1, 2, 3, 6, 8, 12, 128].map(value => quantizeHardware(value, 8)), [1, 2, 2, 4, 8, 8, 8]);
  assert.equal(quantizeHardware(0.5, 4), 0.5);
  assert.equal(quantizeHardware(undefined, 4), undefined);
  assert.equal(profiles.hardened.hardwareCap, 4);
  assert.ok(Object.isFrozen(profiles.stable));
});

test('seed uses session storage and exact origin, with random fallback on denied storage', () => {
  const store = new Map();
  const win = {
    location: { origin: 'https://one.example' }, Uint32Array, Math,
    crypto: { getRandomValues: words => words.fill(123) },
    sessionStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
  };
  const first = getSeed(win);
  assert.equal(getSeed(win), first);
  win.location.origin = 'https://two.example';
  assert.notEqual(getSeed(win), first);
  Object.defineProperty(win, 'sessionStorage', { get() { throw Error('Denied'); } });
  assert.equal(typeof getSeed(win), 'number');
});

test('relay policy preserves dictionary inheritance, getter receivers and native invalid inputs', () => {
  const parent = { iceServers: [{ urls: 'turn:example.org' }] };
  const configuration = Object.create(parent);
  Object.defineProperty(configuration, 'bundlePolicy', { get() { assert.equal(this, configuration); return 'balanced'; } });
  const result = forceRelay(configuration);
  assert.equal(result.iceTransportPolicy, 'relay');
  assert.equal(result.iceServers, parent.iceServers);
  assert.equal(result.bundlePolicy, 'balanced');
  assert.equal(configuration.iceTransportPolicy, undefined);
  assert.equal(forceRelay(12), 12);
  assert.equal(forceRelay(null).iceTransportPolicy, 'relay');
});

test('patcher preserves descriptors, method identity metadata, receiver validation and toString errors', () => {
  const context = vm.createContext({});
  const win = vm.runInContext('({ Function, Proxy })', context);
  const owner = vm.runInContext('({ method(a) { if (this !== owner) throw new TypeError("receiver"); return a + 1; } })', context);
  context.owner = owner;
  const original = owner.method;
  const before = Object.getOwnPropertyDescriptor(owner, 'method');
  const patcher = createPatcher(win);
  patcher.method(owner, 'method', (target, receiver, args) => Reflect.apply(target, receiver, args) * 2);
  patcher.maskSources();
  assert.equal(owner.method(3), 8);
  assert.equal(owner.method.name, original.name);
  assert.equal(owner.method.length, original.length);
  assert.equal(Object.getOwnPropertyDescriptor(owner, 'method').enumerable, before.enumerable);
  assert.equal(win.Function.prototype.toString.call(owner.method), win.Function.prototype.toString.call(original));
  assert.throws(() => owner.method.call(null), /receiver/);
  assert.throws(() => win.Function.prototype.toString.call({}), /Function.prototype.toString/);
  const locked = Object.freeze({ method() {} });
  assert.equal(patcher.method(locked, 'method', () => 1), false);
});

test('failed modules roll back their descriptors without undoing successful earlier modules', () => {
  const win = vm.runInNewContext('({ Function, Proxy, Error })');
  const patcher = createPatcher(win);
  const owner = { earlier() { return 1; }, later() { return 2; } };
  patcher.transaction(() => patcher.method(owner, 'earlier', () => 7));
  const before = Object.getOwnPropertyDescriptors(owner);
  assert.throws(() => patcher.transaction(() => {
    patcher.method(owner, 'later', () => 8);
    patcher.must(false, 'locked API');
  }), /locked API/);
  assert.deepEqual(Object.getOwnPropertyDescriptors(owner), before);
  assert.equal(owner.earlier(), 7);
  assert.equal(owner.later(), 2);
});

test('inactive and nested transactions restore the complete original descriptor', () => {
  const win = vm.runInNewContext('({ Function, Proxy, Error })');
  const patcher = createPatcher(win);
  const owner = {};
  Object.defineProperty(owner, 'value', { get() { return 3; }, configurable: true, enumerable: false });
  const original = Object.getOwnPropertyDescriptor(owner, 'value');
  assert.equal(patcher.transaction(() => {
    patcher.replace(owner, 'value', { value: 10, writable: true });
    assert.equal(owner.value, 10);
    return false;
  }), false);
  assert.deepEqual(Object.getOwnPropertyDescriptor(owner, 'value'), original);
  assert.throws(() => patcher.transaction(() => {
    patcher.getter(owner, 'value', () => 4);
    patcher.transaction(() => patcher.getter(owner, 'value', () => 5));
    throw new Error('outer failure');
  }), /outer failure/);
  assert.deepEqual(Object.getOwnPropertyDescriptor(owner, 'value'), original);
});

test('sparse blocks stay within their density bound across seeds and both profiles', () => {
  for (const seed of [0, 1, 42, 1000, 0xffffffff]) {
    for (const stride of [128, 3072]) {
      const target = image(257, 135);
      perturbPixels(target, seed, stride, target.width, target.height);
      const blocks = new Set();
      for (let pixel = 0; pixel < target.width * target.height; pixel++) {
        const rgb = target.data.subarray(pixel * 4, pixel * 4 + 3);
        if (rgb.every(value => value === 255)) continue;
        const block = Math.floor(pixel / stride);
        assert.ok(!blocks.has(block), 'At most one changed pixel per block');
        blocks.add(block);
      }
      assert.ok(blocks.size > 0);
      assert.ok(blocks.size <= Math.ceil(target.width * target.height / stride));
    }
  }
});

test('clipped, narrow and offset crops match a full surface across block boundaries', () => {
  for (const stride of [1, 7, 128, 3072]) {
    const full = image(97, 83);
    perturbPixels(full, 80, stride, 97, 83);
    for (const [x, y, width, height] of [[-5, -8, 30, 20], [93, 80, 20, 30], [10, 2, 1, 80], [0, 0, 97, 83]]) {
      const crop = image(width, height);
      perturbPixels(crop, 80, stride, 97, 83, x, y);
      for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        const inside = x + column >= 0 && x + column < 97 && y + row >= 0 && y + row < 83;
        const expected = inside ? full.data.slice(((y + row) * 97 + x + column) * 4, ((y + row) * 97 + x + column) * 4 + 4) : new Uint8ClampedArray(4).fill(255);
        assert.deepEqual(crop.data.slice((row * width + column) * 4, (row * width + column) * 4 + 4), expected);
      }
    }
  }
});

test('invalid strides cannot hang or mutate pixels', () => {
  for (const stride of [0, -1, NaN, Infinity, 0.5]) {
    const target = image(8, 8);
    perturbPixels(target, 1, stride, 8, 8);
    assert.ok(target.data.every(value => value === 255));
  }
});

test('source masking is idempotent and can be reinstalled after a transaction rollback', () => {
  const win = vm.runInNewContext('({ Function, Proxy, Error })');
  const patcher = createPatcher(win);
  const original = win.Function.prototype.toString;
  assert.throws(() => patcher.transaction(() => {
    assert.equal(patcher.maskSources(), true);
    throw new Error('abort mask');
  }), /abort mask/);
  assert.equal(win.Function.prototype.toString, original);
  assert.equal(patcher.maskSources(), true);
  const installed = win.Function.prototype.toString;
  assert.equal(patcher.maskSources(), true);
  assert.equal(win.Function.prototype.toString, installed);
});
