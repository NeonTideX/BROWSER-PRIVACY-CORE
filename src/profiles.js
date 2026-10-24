// SPDX-License-Identifier: GPL-3.0-or-later

export const profiles = Object.freeze({
  stable: Object.freeze({
    id: 'stable',
    name: 'Stable',
    canvasReadback: false,
    canvasStride: 3072,
    maxCanvasPixels: 4_194_304,
    webgl: 'mask',
    hardwareCap: 8,
    memoryCap: 8,
    offlineAudio: false,
    battery: false,
    clientHints: false,
    mediaDevices: false,
    webrtc: 'native',
  }),
  hardened: Object.freeze({
    id: 'hardened',
    name: 'Hardened',
    canvasReadback: true,
    canvasStride: 128,
    maxCanvasPixels: 8_388_608,
    webgl: 'block-debug',
    hardwareCap: 4,
    memoryCap: 4,
    offlineAudio: true,
    battery: true,
    clientHints: true,
    mediaDevices: true,
    webrtc: 'relay',
  }),
});
