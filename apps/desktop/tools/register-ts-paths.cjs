const Module = require('node:module');
const path = require('node:path');

module.exports = function registerTsPaths(projectRoot) {
  const originalResolveFilename = Module._resolveFilename;
  const srcRoot = path.join(projectRoot, 'src');

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request === '@src' || request.startsWith('@src/')) {
      const nextRequest = path.join(srcRoot, request.slice('@src'.length));
      return originalResolveFilename.call(this, nextRequest, parent, isMain, options);
    }
    if (request === '@main' || request.startsWith('@main/')) {
      const nextRequest = path.join(srcRoot, 'main', request.slice('@main'.length));
      return originalResolveFilename.call(this, nextRequest, parent, isMain, options);
    }
    if (request === '@renderer' || request.startsWith('@renderer/')) {
      const nextRequest = path.join(srcRoot, 'renderer', request.slice('@renderer'.length));
      return originalResolveFilename.call(this, nextRequest, parent, isMain, options);
    }
    if (request === '@components' || request.startsWith('@components/')) {
      const nextRequest = path.join(srcRoot, 'renderer', 'components', request.slice('@components'.length));
      return originalResolveFilename.call(this, nextRequest, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
};
