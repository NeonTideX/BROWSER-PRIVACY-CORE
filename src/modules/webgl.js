// SPDX-License-Identifier: GPL-3.0-or-later

export function installWebGL(win, config, seed, patcher) {
  let installed = false;
  for (const proto of [win.WebGLRenderingContext?.prototype, win.WebGL2RenderingContext?.prototype]) {
    if (!proto) continue;
    installed = patcher.method(proto, 'getParameter', (target, receiver, args) => {
      let parameter;
      const adjusted = [...args];
      if (args.length) {
        // Let native receiver validation run before argument coercion. Record the enum
        // during its one conversion, including strings and custom valueOf objects.
        adjusted[0] = { valueOf() { parameter = +args[0]; return parameter; } };
      }
      const result = Reflect.apply(target, receiver, adjusted);
      // First execute native validation; never synthesize results for invalid enums/receivers.
      const enumValue = parameter >>> 0;
      if ((enumValue === 0x9245 || enumValue === 0x9246) && typeof result === 'string') return 'WebGL';
      return result;
    }) || installed;
    if (config.webgl !== 'block-debug') continue;
    patcher.method(proto, 'getExtension', (target, receiver, args) => {
      // Native conversion/validation happens exactly once, including exotic arguments.
      const result = Reflect.apply(target, receiver, args);
      if (result && win.WebGLDebugRendererInfo && result instanceof win.WebGLDebugRendererInfo) return null;
      // Some engines do not expose an interface constructor for this extension.
      if (result && 'UNMASKED_VENDOR_WEBGL' in result && 'UNMASKED_RENDERER_WEBGL' in result) return null;
      return result;
    });
    patcher.method(proto, 'getSupportedExtensions', (target, receiver, args) => {
      const list = Reflect.apply(target, receiver, args);
      return list?.filter(name => name.toLowerCase() !== 'webgl_debug_renderer_info') ?? list;
    });
  }
  return installed;
}
