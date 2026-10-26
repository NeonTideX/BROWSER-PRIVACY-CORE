// SPDX-License-Identifier: GPL-3.0-or-later
import { quantizeHardware } from '../core.js';

export function installNavigator(win, config, seed, patcher) {
  const proto = win.Navigator?.prototype;
  if (!proto) return false;
  let installed = false;
  for (const [key, transform] of [
    ['hardwareConcurrency', actual => quantizeHardware(actual, config.hardwareCap)],
    ['deviceMemory', actual => Number.isFinite(actual) && actual > 0 ? Math.min(actual, config.memoryCap) : actual],
  ]) {
    if (!Object.hasOwn(proto, key)) continue;
    patcher.must(patcher.getter(proto, key, transform), `navigator.${key}`);
    installed = true;
  }
  return installed;
}

export function installBattery(win, config, seed, patcher) {
  if (!config.battery) return false;
  const proto = win.Navigator?.prototype;
  if (!proto || !Object.hasOwn(proto, 'getBattery')) return false;
  return patcher.must(patcher.replace(proto, 'getBattery', { value: undefined }), 'navigator.getBattery');
}

export function installClientHints(win, config, seed, patcher) {
  if (!config.clientHints || !win.navigator.userAgentData) return false;
  const proto = Object.getPrototypeOf(win.navigator.userAgentData);
  if (!Object.hasOwn(proto, 'getHighEntropyValues')) return false;
  return patcher.must(patcher.method(proto, 'getHighEntropyValues', (target, receiver, args) =>
    Reflect.apply(target, receiver, args).then(values => {
      const result = new win.Object();
      for (const key of ['brands', 'mobile', 'platform']) {
        if (Object.hasOwn(values, key)) result[key] = values[key];
      }
      return result;
    })), 'userAgentData.getHighEntropyValues');
}

export function installMediaDevices(win, config, seed, patcher) {
  if (!config.mediaDevices || !win.navigator.mediaDevices) return false;
  const proto = Object.getPrototypeOf(win.navigator.mediaDevices);
  if (!Object.hasOwn(proto, 'enumerateDevices')) return false;
  return patcher.must(patcher.method(proto, 'enumerateDevices', (target, receiver, args) =>
    Reflect.apply(target, receiver, args).then(devices => devices.filter(device => device.label !== ''))), 'mediaDevices.enumerateDevices');
}
