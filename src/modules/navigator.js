// SPDX-License-Identifier: GPL-3.0-or-later
import { quantizeHardware } from '../core.js';

export function installNavigator(win, config, seed, patcher) {
  const proto = win.Navigator?.prototype;
  if (!proto) return false;
  patcher.getter(proto, 'hardwareConcurrency', actual => quantizeHardware(actual, config.hardwareCap));
  patcher.getter(proto, 'deviceMemory', actual => {
    if (!Number.isFinite(actual) || actual <= 0) return actual;
    return Math.min(actual, config.memoryCap);
  });
  return true;
}

export function installBattery(win, config, seed, patcher) {
  if (!config.battery) return false;
  const proto = win.Navigator?.prototype;
  if (!proto || !Object.hasOwn(proto, 'getBattery')) return false;
  return patcher.replace(proto, 'getBattery', { value: undefined });
}

export function installClientHints(win, config, seed, patcher) {
  if (!config.clientHints || !win.navigator.userAgentData) return false;
  const proto = Object.getPrototypeOf(win.navigator.userAgentData);
  return patcher.method(proto, 'getHighEntropyValues', (target, receiver, args) =>
    Reflect.apply(target, receiver, args).then(values => {
      const result = {};
      for (const key of ['brands', 'mobile', 'platform']) {
        if (Object.hasOwn(values, key)) result[key] = values[key];
      }
      return result;
    }));
}

export function installMediaDevices(win, config, seed, patcher) {
  if (!config.mediaDevices || !win.navigator.mediaDevices) return false;
  const proto = Object.getPrototypeOf(win.navigator.mediaDevices);
  return patcher.method(proto, 'enumerateDevices', (target, receiver, args) =>
    Reflect.apply(target, receiver, args).then(devices => devices.filter(device => device.label !== '')));
}
