// SPDX-License-Identifier: GPL-3.0-or-later

export function installFrames(win, config, seed, patcher, install) {
  const document = win.document;
  const proto = win.HTMLIFrameElement?.prototype;
  const nativeWindow = proto && Object.getOwnPropertyDescriptor(proto, 'contentWindow')?.get;
  if (!nativeWindow || !win.MutationObserver) return false;

  function visit(frame) {
    try {
      const child = Reflect.apply(nativeWindow, frame, []);
      if (child) install(child);
    } catch { /* Cross-origin or discarded frame. */ }
  }
  function collect(node, frames) {
    const type = node.nodeType;
    if (type !== 1 && type !== 9 && type !== 11 || node.isConnected === false) return;
    if (node.localName === 'iframe') frames.add(node);
    node.querySelectorAll?.('iframe').forEach(frame => frames.add(frame));
  }

  patcher.must(patcher.getter(proto, 'contentWindow', child => {
    if (child) install(child);
    return child;
  }), 'iframe.contentWindow');
  patcher.must(patcher.getter(proto, 'contentDocument', child => {
    if (child?.defaultView) install(child.defaultView);
    return child;
  }), 'iframe.contentDocument');

  const observer = new win.MutationObserver(records => {
    const frames = new Set();
    for (const record of records) for (const node of record.addedNodes) collect(node, frames);
    for (const frame of frames) visit(frame);
  });
  const onLoad = event => { if (event.target?.localName === 'iframe') visit(event.target); };
  try {
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener('load', onLoad, true);
    const initial = new Set();
    collect(document, initial);
    for (const frame of initial) visit(frame);
  } catch (error) {
    observer.disconnect();
    document.removeEventListener('load', onLoad, true);
    throw error;
  }
  return true;
}
