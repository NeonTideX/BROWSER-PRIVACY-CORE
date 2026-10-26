// SPDX-License-Identifier: GPL-3.0-or-later

export function forceRelay(configuration) {
  // Match Web IDL dictionary behavior for null, undefined, primitives, and inherited members.
  if (configuration == null) return { iceTransportPolicy: 'relay' };
  if (typeof configuration !== 'object' && typeof configuration !== 'function') return configuration;
  // Forward dictionary reads with their original receiver, including inherited accessors.
  return new Proxy(Object.create(null), {
    get(target, key) {
      return key === 'iceTransportPolicy' ? 'relay' : Reflect.get(configuration, key, configuration);
    },
  });
}

export function installWebRTC(win, config, seed, patcher) {
  if (config.webrtc !== 'relay' || !win.RTCPeerConnection) return false;
  const Original = win.RTCPeerConnection;
  const proxy = new win.Proxy(Original, {
    construct(target, args, newTarget) {
      const adjusted = [...args];
      adjusted[0] = forceRelay(args[0]);
      return Reflect.construct(target, adjusted, newTarget);
    },
  });
  patcher.must(patcher.replace(win, 'RTCPeerConnection', { value: proxy }, Original), 'RTCPeerConnection');
  if (win.webkitRTCPeerConnection === Original) {
    patcher.must(patcher.replace(win, 'webkitRTCPeerConnection', { value: proxy }, Original), 'webkitRTCPeerConnection');
  }
  patcher.replace(Original.prototype, 'constructor', { value: proxy }, Original);
  patcher.must(patcher.method(Original.prototype, 'setConfiguration', (target, receiver, args) => {
    const adjusted = [...args];
    // Preserve the native missing-required-argument error.
    if (args.length) adjusted[0] = forceRelay(args[0]);
    return Reflect.apply(target, receiver, adjusted);
  }), 'RTCPeerConnection.setConfiguration');
  return true;
}
