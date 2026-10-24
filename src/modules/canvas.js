// SPDX-License-Identifier: GPL-3.0-or-later
import { perturbPixels } from '../core.js';

export function installCanvas(win, config, seed, patcher) {
  const canvasProto = win.HTMLCanvasElement?.prototype;
  const contextProto = win.CanvasRenderingContext2D?.prototype;
  if (!canvasProto || !contextProto) return false;
  const nativeGetImageData = contextProto.getImageData;
  const nativePutImageData = contextProto.putImageData;
  const nativeDrawImage = contextProto.drawImage;
  const nativeGetContext = canvasProto.getContext;
  const offscreenProto = win.OffscreenCanvas?.prototype;
  const offscreenGetContext = offscreenProto?.getContext;
  let offscreenContextProto = win.OffscreenCanvasRenderingContext2D?.prototype;
  if (offscreenProto && !offscreenContextProto) {
    try {
      offscreenContextProto = Object.getPrototypeOf(new win.OffscreenCanvas(1, 1).getContext('2d'));
    } catch { /* Some engines expose the surface without a 2D context. */ }
  }
  const offscreenRead = offscreenContextProto?.getImageData;
  const offscreenWrite = offscreenContextProto?.putImageData;
  const offscreenDraw = offscreenContextProto?.drawImage;

  function snapshot(source, offscreen) {
    const width = source.width;
    const height = source.height;
    if (!width || !height || width * height > config.maxCanvasPixels) return null;
    // Never call getContext on the source: that can permanently select its context type.
    const copy = offscreen ? new win.OffscreenCanvas(width, height) : win.document.createElement('canvas');
    if (!offscreen) { copy.width = width; copy.height = height; }
    const context = Reflect.apply(offscreen ? offscreenGetContext : nativeGetContext, copy,
      ['2d', { willReadFrequently: true }]);
    if (!context) return null;
    const read = offscreen ? offscreenRead : nativeGetImageData;
    const write = offscreen ? offscreenWrite : nativePutImageData;
    const draw = offscreen ? offscreenDraw : nativeDrawImage;
    Reflect.apply(draw, context, [source, 0, 0]);
    // Captured reads avoid layering protection on temporary surfaces.
    const image = Reflect.apply(read, context, [0, 0, width, height]);
    perturbPixels(image, seed, config.canvasStride, width, height);
    Reflect.apply(write, context, [image, 0, 0]);
    return copy;
  }

  for (const key of ['toDataURL', 'toBlob']) {
    patcher.method(canvasProto, key, (target, receiver, args) => {
      let copy;
      try { copy = snapshot(receiver, false); } catch { /* Native call preserves taint and receiver errors. */ }
      // Keep callbacks, coercion, and native exceptions outside the fallback catch.
      return Reflect.apply(target, copy ?? receiver, args);
    });
  }

  if (offscreenProto) {
    patcher.method(offscreenProto, 'convertToBlob', (target, receiver, args) => {
      let copy;
      try { copy = snapshot(receiver, true); } catch { /* Unsupported or detached surface. */ }
      return Reflect.apply(target, copy ?? receiver, args);
    });
  }

  if (config.canvasReadback) {
    for (const proto of new Set([contextProto, offscreenContextProto])) {
      patcher.method(proto, 'getImageData', (target, receiver, args) => {
        const coordinates = [];
        const adjusted = [...args];
        if (args.length >= 4) {
          for (let index = 0; index < 4; index++) {
            adjusted[index] = { valueOf() {
              const number = +args[index];
              coordinates[index] = Math.trunc(number);
              return number;
            } };
          }
        }
        // Native checks the receiver and converts each original argument exactly once.
        const image = Reflect.apply(target, receiver, adjusted);
        if (coordinates.length === 4 && image.width * image.height <= config.maxCanvasPixels) {
          const x = coordinates[0] + Math.min(0, coordinates[2]);
          const y = coordinates[1] + Math.min(0, coordinates[3]);
          perturbPixels(image, seed, config.canvasStride,
            receiver.canvas.width, receiver.canvas.height, x, y);
        }
        return image;
      });
    }
  }
  return true;
}
