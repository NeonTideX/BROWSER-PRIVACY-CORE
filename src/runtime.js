// SPDX-License-Identifier: GPL-3.0-or-later
import { createPatcher, getOrigin, getSeed } from './core.js';
import { installFrames } from './frames.js';
import { installCanvas } from './modules/canvas.js';
import { installNavigator, installBattery, installClientHints, installMediaDevices } from './modules/navigator.js';
import { installWebGL } from './modules/webgl.js';
import { installWebRTC } from './modules/webrtc.js';
import { installAudio } from './modules/audio.js';

export function installPrivacyCore(root, config, version) {
  const marker = Symbol.for('BrowserPrivacyCore');
  // The alias also stops an enabled 6.x script from stacking on top of V1.
  const legacyMarker = Symbol.for('BrowserPrivacyCore.v6');
  const seeds = new Map();
  const installers = [
    ['canvas', installCanvas], ['webgl', installWebGL], ['navigator', installNavigator],
    ['battery', installBattery], ['clientHints', installClientHints],
    ['mediaDevices', installMediaDevices], ['webrtc', installWebRTC],
    ['offlineAudio', installAudio], ['frames', installFrames],
  ];
  function install(win) {
    try {
      // WindowProxy identity survives navigation; only the document's marker is a valid guard.
      if (win[marker] || win[legacyMarker]) return;
      // Reading document performs the same-origin check before any patches are attempted.
      const document = win.document;
      if (!document) return;
      const modules = {};
      const status = Object.freeze({ version, profile: config.id, modules });
      Object.defineProperty(win, marker, { value: status });
      try { Object.defineProperty(win, legacyMarker, { value: status }); } catch { /* Legacy collision. */ }
      const origin = getOrigin(win);
      if (!seeds.has(origin)) seeds.set(origin, getSeed(win));
      const seed = seeds.get(origin);
      const patcher = createPatcher(win);
      for (const [name, installer] of installers) {
        try {
          modules[name] = patcher.transaction(() => installer(win, config, seed, patcher, install))
            ? 'enabled' : 'inactive';
        } catch {
          // Optional/locked-down APIs must not prevent the other modules from starting.
          modules[name] = 'unavailable';
        }
      }
      try {
        modules.nativeSources = patcher.maskSources() ? 'enabled' : 'unavailable';
      } catch { modules.nativeSources = 'unavailable'; }
      Object.freeze(modules);
    } catch { /* Restricted, discarded, or inaccessible realm. */ }
  }
  install(root);
}
