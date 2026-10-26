// SPDX-License-Identifier: GPL-3.0-or-later
import { performance } from 'node:perf_hooks';
import { mix32, perturbPixels } from '../src/core.js';

// Previous published algorithm, retained here only as a performance baseline.
function scanEveryPixel(image, seed, stride, width, height) {
  const basis = mix32(seed ^ mix32(width) ^ mix32(height + 0x9e3779b9));
  for (let pixel = 0; pixel < width * height; pixel++) {
    const offset = pixel * 4;
    if (image.data[offset + 3] !== 255) continue;
    const value = mix32(basis ^ mix32(pixel));
    if (value % stride) continue;
    for (let channel = 0; channel < 3; channel++) {
      image.data[offset + channel] = (image.data[offset + channel] & 254) | ((value >>> (8 + channel)) & 1);
    }
  }
}

function measure(operation) {
  for (let warmup = 0; warmup < 3; warmup++) operation();
  const samples = [];
  for (let sample = 0; sample < 9; sample++) {
    const start = performance.now();
    operation();
    samples.push(performance.now() - start);
  }
  return samples.sort((a, b) => a - b)[4];
}

console.log('Opaque 1920x1080 RGBA pixels; median of 9 runs after 3 warmups.');
console.log('Measures masking only; canvas cloning, codecs, and GPU transfers are excluded.');
for (const [profile, stride] of [['Stable', 3072], ['Hardened', 128]]) {
  const image = { width: 1920, height: 1080, data: new Uint8ClampedArray(1920 * 1080 * 4).fill(255) };
  const previous = measure(() => scanEveryPixel(image, 42, stride, image.width, image.height));
  const current = measure(() => perturbPixels(image, 42, stride, image.width, image.height));
  console.log(`${profile}: previous=${previous.toFixed(3)} ms; V1=${current.toFixed(3)} ms; ratio=${(previous / current).toFixed(1)}x`);
}
