// AgentWarp: the agent panel and its engine, built into the editor.
//
// Every editor window gets its own engine (`agentwarp app`), run on Electron's own Node, on a
// random local port with a random token that only this window learns (through the preload).
// The engine keeps a hidden text mirror of whatever project is open in the window, under
// <userData>/projects, and runs the coding agents (Claude, Codex, OpenCode) over ACP with that
// mirror as their working directory. The user never manages a workspace: they open an .sb3,
// talk to the agent, and save from the editor as usual.

const {app} = require('electron');
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

/** The agentwarp checkout (engine + panel). */
const findHome = () => {
  // Remembered from a development run, so a packaged app built on this machine finds it too.
  const rememberFile = path.join(app.getPath('userData'), 'agentwarp-home.txt');
  let remembered = null;
  try {
    remembered = fs.readFileSync(rememberFile, 'utf8').trim();
  } catch (e) {
    // not yet
  }
  const candidates = [
    process.env.AGENTWARP_HOME,
    app.isPackaged ? path.join(process.resourcesPath, 'agentwarp') : null,
    // Development: the fork sits next to the agentwarp repository.
    app.isPackaged ? null : path.resolve(__dirname, '..', '..', 'agentwarp'),
    remembered
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'packages', 'cli', 'agentwarp.ts'))) {
      if (dir !== remembered) {
        try {
          fs.mkdirSync(path.dirname(rememberFile), {recursive: true});
          fs.writeFileSync(rememberFile, dir);
        } catch (e) {
          // best effort
        }
      }
      return dir;
    }
  }
  return null;
};

let home;
const getHome = () => {
  if (home === undefined) home = findHome();
  return home;
};

/**
 * Apps started from the Dock or Finder get a minimal PATH, but agents live in the user's shell
 * PATH (npx, opencode, Homebrew, nvm, ...). Ask the login shell once.
 */
let shellPathPromise;
const getShellPath = () => {
  if (!shellPathPromise) {
    shellPathPromise = new Promise((resolve) => {
      const fallback = [
        process.env.PATH,
        '/opt/homebrew/bin',
        '/usr/local/bin',
        path.join(os.homedir(), '.local', 'bin'),
        path.join(os.homedir(), '.bun', 'bin'),
        path.join(os.homedir(), '.opencode', 'bin')
      ].filter(Boolean).join(path.delimiter);
      if (process.platform === 'win32') {
        resolve(process.env.PATH || '');
        return;
      }
      const shell = process.env.SHELL || '/bin/zsh';
      childProcess.execFile(shell, ['-ilc', 'printf "__AW_PATH__%s__AW_PATH__" "$PATH"'], {
        timeout: 8000,
        encoding: 'utf8'
      }, (error, stdout) => {
        const match = typeof stdout === 'string' && stdout.match(/__AW_PATH__(.*)__AW_PATH__/);
        resolve(match && match[1] ? `${match[1]}${path.delimiter}${fallback}` : fallback);
      });
    });
  }
  return shellPathPromise;
};

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const {port} = server.address();
    server.close(() => resolve(port));
  });
});

const engines = new Set();

class AgentWarpEngine {
  constructor () {
    this.token = crypto.randomBytes(24).toString('hex');
    this.port = null;
    this.process = null;
    this.stopped = false;
    this.restarts = 0;
    this.lines = [];
    this.ready = this.start();
    engines.add(this);
  }

  log (line) {
    this.lines.push(line);
    if (this.lines.length > 200) this.lines.shift();
    if (!app.isPackaged) console.log(`[agentwarp:${this.port}] ${line}`);
  }

  async start () {
    const dir = getHome();
    if (!dir) {
      this.error = 'AgentWarp engine not found (set AGENTWARP_HOME to the agentwarp folder)';
      this.log(this.error);
      return null;
    }
    if (this.port === null) this.port = await getFreePort();
    const PATH = await getShellPath();
    if (this.stopped) return null;
    const root = path.join(app.getPath('userData'), 'projects');
    const child = childProcess.spawn(process.execPath, [
      path.join(dir, 'packages', 'cli', 'agentwarp.ts'),
      'app',
      '--root', root,
      '--port', String(this.port)
    ], {
      cwd: dir,
      env: {
        ...process.env,
        PATH,
        ELECTRON_RUN_AS_NODE: '1',
        AGENTWARP_TOKEN: this.token
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group, so stopping the engine also stops the agents it started.
      detached: process.platform !== 'win32'
    });
    this.process = child;
    const onData = (data) => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) this.log(line);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code, signal) => {
      if (this.process === child) this.process = null;
      if (this.stopped) return;
      this.log(`engine exited (${signal || code}); restarting`);
      // Same port and token: the panel reconnects by itself and re-sends the open project.
      const delay = Math.min(30000, 500 * 2 ** this.restarts++);
      setTimeout(() => {
        if (!this.stopped) this.ready = this.start();
      }, delay);
    });
    setTimeout(() => {
      if (this.process === child) this.restarts = 0;
    }, 60000);
    return {
      url: `http://127.0.0.1:${this.port}`,
      token: this.token
    };
  }

  /** For the preload: where this window's engine listens. */
  async getConnection () {
    return this.ready;
  }

  stop () {
    this.stopped = true;
    engines.delete(this);
    const child = this.process;
    this.process = null;
    if (!child || child.exitCode !== null) return;
    try {
      if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill();
    } catch (e) {
      try { child.kill(); } catch (e2) { /* already gone */ }
    }
  }
}

app.on('will-quit', () => {
  for (const engine of [...engines]) engine.stop();
});

/** The panel bundle, injected into each editor window (read fresh, so rebuilding it needs no restart). */
const getClientCode = async () => {
  const dir = getHome();
  if (!dir) return '';
  for (const file of [
    path.join(dir, 'packages', 'panel', 'dist', 'agentwarp-client.js'),
    path.join(dir, 'packages', 'bridge', 'client', 'agentwarp-client.js')
  ]) {
    try {
      return await fs.promises.readFile(file, 'utf8');
    } catch (e) {
      // try the next one
    }
  }
  return '';
};

module.exports = {
  AgentWarpEngine,
  getClientCode
};
