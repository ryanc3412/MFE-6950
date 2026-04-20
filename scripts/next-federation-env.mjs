/**
 * Import this before `@module-federation/nextjs-mf` in each app's `next.config.js`.
 *
 * After Next runs `loadWebpackHook()`, `require.resolve('webpack/...')` is aliased to
 * `next/dist/compiled/webpack`, which breaks federation. Resolve the real package via paths on disk.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const searchRoots = [
  path.join(here, '../shell'),
  path.join(here, '../remote-a'),
  path.join(here, '../remote-b'),
];

let webpackRoot;
for (const root of searchRoots) {
  const candidate = path.join(root, 'node_modules', 'webpack', 'package.json');
  if (fs.existsSync(candidate)) {
    webpackRoot = path.dirname(candidate);
    break;
  }
}

if (!webpackRoot) {
  throw new Error(
    'next-federation-env.mjs: webpack not found under shell/remote-a/remote-b node_modules'
  );
}

process.env.NEXT_PRIVATE_LOCAL_WEBPACK = 'true';
process.env.FEDERATION_WEBPACK_PATH = path.join(webpackRoot, 'lib', 'index.js');
