// Stage the parts of agentwarp that the app runs (engine, CLI, text formats, headless tools,
// agent adapters, panel bundle, agent docs) into dist-agentwarp/, with production dependencies
// only. electron-builder ships that folder as Resources/agentwarp (see package.json).
//
//   node scripts/stage-agentwarp.mjs [--arch=arm64|x64] [--skip-panel-build]
//
// Source: the agentwarp submodule (./agentwarp), or AGENTWARP_HOME.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as childProcess from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const src = path.resolve(process.env.AGENTWARP_HOME || path.join(root, 'agentwarp'));
const out = path.join(root, 'dist-agentwarp');
const arch = (process.argv.find((a) => a.startsWith('--arch=')) || `--arch=${process.arch}`).slice(7);
const skipPanelBuild = process.argv.includes('--skip-panel-build');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!fs.existsSync(path.join(src, 'packages', 'cli', 'agentwarp.ts'))) {
  throw new Error(`agentwarp not found at ${src} (run "git submodule update --init" or set AGENTWARP_HOME)`);
}

const run = (cwd, args) => {
  console.log(`$ (${path.relative(root, cwd) || '.'}) npm ${args.join(' ')}`);
  const r = childProcess.spawnSync(npm, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    // tools/render uses the user's Chrome at runtime; never download browsers into the app.
    env: {...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'}
  });
  if (r.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd}`);
};

// 1. The panel bundle (React app injected into the editor).
if (!skipPanelBuild) {
  run(path.join(src, 'packages', 'panel'), ['ci', '--no-audit', '--no-fund']);
  run(path.join(src, 'packages', 'panel'), ['run', 'build']);
}
if (!fs.existsSync(path.join(src, 'packages', 'panel', 'dist', 'agentwarp-client.js'))) {
  throw new Error('packages/panel/dist/agentwarp-client.js missing');
}

// 2. Copy sources (no tests, fixtures, docs or dependencies).
const SKIP_DIRS = new Set(['node_modules', 'test', 'tests', 'e2e', 'test-fixtures', 'samples', 'examples', '.git']);
const SKIP_FILE = (name) => /\.test\.(ts|mjs|js)$/.test(name) || name === 'test.mjs' || name === '.DS_Store';
const copy = (rel, {only} = {}) => {
  const from = path.join(src, rel);
  const to = path.join(out, rel);
  if (only) {
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.cpSync(from, to, {recursive: true});
    return;
  }
  fs.cpSync(from, to, {
    recursive: true,
    filter: (file) => {
      const name = path.basename(file);
      if (fs.statSync(file).isDirectory()) return file === from || !SKIP_DIRS.has(name);
      return !SKIP_FILE(name);
    }
  });
};

fs.rmSync(out, {recursive: true, force: true});
for (const rel of [
  'bin',
  'skill',
  'formats',
  'packages/cli',
  'packages/core',
  'packages/acp',
  'tools/vmrun',
  'tools/render'
]) copy(rel);
// The bridge minus its browser-side test client.
fs.cpSync(path.join(src, 'packages', 'bridge'), path.join(out, 'packages', 'bridge'), {
  recursive: true,
  filter: (file) => {
    const rel = path.relative(path.join(src, 'packages', 'bridge'), file);
    if (rel.split(path.sep)[0] === 'client') return false;
    const name = path.basename(file);
    if (fs.statSync(file).isDirectory()) return !SKIP_DIRS.has(name);
    return !SKIP_FILE(name);
  }
});
copy('packages/panel/dist', {only: true});
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES', 'README.md']) {
  fs.copyFileSync(path.join(src, file), path.join(out, file));
}

// 3. Production dependencies, for the target CPU (esbuild and friends ship native binaries).
const target = ['--cpu', arch, '--os', process.platform];
for (const rel of ['packages/core', 'packages/bridge', 'formats/ts', 'tools/vmrun', 'tools/render']) {
  run(path.join(out, rel), ['ci', '--omit=dev', '--no-audit', '--no-fund', ...target]);
}
// The ACP adapters drive the user's installed claude / codex CLIs, so their bundled native CLIs
// (optional dependencies, hundreds of MB) are left out.
run(path.join(out, 'packages/acp'), ['ci', '--omit=dev', '--omit=optional', '--no-audit', '--no-fund', ...target]);

const size = (dir) => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? size(p) : fs.lstatSync(p).size;
  }
  return total;
};
console.log(`staged agentwarp (${arch}) into ${path.relative(root, out)}: ${(size(out) / 1e6).toFixed(0)} MB`);
