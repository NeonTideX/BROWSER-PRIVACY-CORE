// SPDX-License-Identifier: GPL-3.0-or-later
import { createPatcher, getSeed } from './core.js';
import { installCanvas } from './modules/canvas.js';
import { installNavigator, installBattery, installClientHints, installMediaDevices } from './modules/navigator.js';
import { installWebGL } from './modules/webgl.js';
import { installWebRTC } from './modules/webrtc.js';
import { installAudio } from './modules/audio.js';

export function installPrivacyCore(root, config, version) {
  const marker = Symbol.for('BrowserPrivacyCore.v6');
  function install(win) {
    try {
      // WindowProxy identity survives navigation; only the document's marker is a valid guard.
      if (win[marker]) return;
      // Reading document performs the same-origin check before any patches are attempted.
      const document = win.document;
      if (!document) return;
      const modules = {};
      const status = Object.freeze({ version, profile: config.id, modules });
      Object.defineProperty(win, marker, { value: status, configurable: false });
      const seed = getSeed(win);
      const patcher = createPatcher(win);
      for (const [name, installer] of Object.entries({
        canvas: installCanvas,
        webgl: installWebGL,
        navigator: installNavigator,
        battery: installBattery,
        clientHints: installClientHints,
        mediaDevices: installMediaDevices,
        webrtc: installWebRTC,
        offlineAudio: installAudio,
      })) {
        try {
          modules[name] = installer(win, config, seed, patcher) ? 'enabled' : 'inactive';
        } catch {
          // Optional/locked-down APIs must not prevent the other modules from starting.
          modules[name] = 'unavailable';
        }
      }
      try { patcher.maskSources(); } catch { /* Cosmetic best effort. */ }

      function visit(frame) {
        try { if (frame.contentWindow) install(frame.contentWindow); } catch { /* Cross-origin frame. */ }
      }
      function scan(node) {
        if (node.nodeType !== 1 && node.nodeType !== 9) return;
        if (node.localName === 'iframe') visit(node);
        node.querySelectorAll?.('iframe').forEach(visit);
      }
      try {
        // Also cover synchronous access to an about:blank frame before the observer runs.
        const proto = win.HTMLIFrameElement?.prototype;
        patcher.getter(proto, 'contentWindow', child => { if (child) install(child); return child; });
        patcher.getter(proto, 'contentDocument', child => {
          if (child?.defaultView) install(child.defaultView);
          return child;
        });
        const observer = new win.MutationObserver(records => {
          for (const record of records) for (const node of record.addedNodes) scan(node);
        });
        // Observe Document itself, including document-start before an html element exists.
        observer.observe(document, { childList: true, subtree: true });
        document.addEventListener('load', event => {
          if (event.target?.localName === 'iframe') visit(event.target);
        }, true);
        scan(document);
        modules.frames = 'enabled';
      } catch { modules.frames = 'unavailable'; }
      Object.freeze(modules);
    } catch { /* Restricted, discarded, or inaccessible realm. */ }
  }
  install(root);
}
