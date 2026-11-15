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
    // Development: a checkout next to the fork (live edits), else the pinned submodule.
    app.isPackaged ? null : path.resolve(__dirname, '..', '..', 'agentwarp'),
    app.isPackaged ? null : path.resolve(__dirname, '..', 'agentwarp'),
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
/** Windows spells it Path; setting a second PATH key would leave which one wins to chance. */
const PATH_KEY = process.platform === 'win32' ? (Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'Path') : 'PATH';
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
        // npm installs agent CLIs into %APPDATA%\npm, which a fresh install may not have on PATH yet.
        const npmDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : null;
        resolve([process.env[PATH_KEY], npmDir].filter(Boolean).join(path.delimiter));
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
/** Started with the app, so the first window's agent panel connects at once. */
let spare = null;

/** Engine output, kept in <userData>/logs/agentwarp-engine.log (trimmed when it grows past 1 MB). */
const logFile = () => path.join(app.getPath('userData'), 'logs', 'agentwarp-engine.log');
let logChecked = false;
const writeLog = (line) => {
  try {
    const file = logFile();
    if (!logChecked) {
      logChecked = true;
      fs.mkdirSync(path.dirname(file), {recursive: true});
      try {
        if (fs.statSync(file).size > 1e6) fs.renameSync(file, `${file}.old`);
      } catch (e) {
        // no log yet
      }
    }
    fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    // logging is best effort
  }
};

class AgentWarpEngine {
  constructor () {
    this.token = crypto.randomBytes(24).toString('hex');
    this.port = null;
    this.process = null;
    this.stopped = false;
    this.restarts = 0;
    // Exits soon after starting, in a row: the engine cannot run, so tell the panel why.
    this.quickExits = 0;
    this.error = null;
    this.lines = [];
    this.ready = this.start();
    engines.add(this);
  }

  /**
   * The engine for a new editor window: the one started with the app if it is still unused,
   * else a fresh one.
   */
  static forWindow () {
    const engine = spare && !spare.stopped ? spare : new AgentWarpEngine();
    if (engine === spare) spare = null;
    return engine;
  }

  log (line) {
    this.lines.push(line);
    if (this.lines.length > 200) this.lines.shift();
    writeLog(`[${this.port}] ${line}`);
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
        [PATH_KEY]: PATH,
        ELECTRON_RUN_AS_NODE: '1',
        AGENTWARP_TOKEN: this.token,
        // The engine stops by itself if the app dies without stopping it.
        AGENTWARP_PARENT_PID: String(process.pid)
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group, so stopping the engine also stops the agents it started.
      detached: process.platform !== 'win32'
    });
    this.process = child;
    const startedAt = Date.now();
    const runLines = [];
    child.on('error', (error) => this.log(`could not start the engine: ${error.message}`));
    const onData = (data) => {
      for (const line of data.toString().split('\n')) {
        if (!line.trim()) continue;
        this.log(line);
        runLines.push(line);
        if (runLines.length > 12) runLines.shift();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code, signal) => {
      if (this.process === child) this.process = null;
      if (this.stopped) return;
      this.log(`engine exited (${signal || code}); restarting`);
      if (Date.now() - startedAt < 15000) this.quickExits++;
      else this.quickExits = 0;
      if (this.quickExits >= 3) {
        // What the last run printed (they all fail the same way).
        this.error = `${runLines.join('\n') || `exited (${signal || code})`}\n\nLog: ${logFile()}`;
      }
      // Same port and token: the panel reconnects by itself and re-sends the open project.
      const delay = Math.min(30000, 500 * 2 ** this.restarts++);
      setTimeout(() => {
        if (!this.stopped) this.ready = this.start();
      }, delay);
    });
    setTimeout(() => {
      if (this.process !== child) return;
      // Running for a while: it works now.
      this.quickExits = 0;
      this.error = null;
    }, 15000);
    setTimeout(() => {
      if (this.process === child) this.restarts = 0;
    }, 60000);
    return {
      url: `http://127.0.0.1:${this.port}`,
      token: this.token
    };
  }

  /**
   * For the preload: where this window's engine listens, plus `error` when it cannot run
   * (null with no error: still starting, the panel asks again).
   */
  async getConnection () {
    const connection = await this.ready;
    if (this.error) return {...connection, error: this.error};
    return connection;
  }

  stop () {
    this.stopped = true;
    engines.delete(this);
    const child = this.process;
    this.process = null;
    if (!child || child.exitCode !== null) return;
    try {
      if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      // Windows has no process groups: end the engine with the agents it started.
      else childProcess.spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {stdio: 'ignore', windowsHide: true});
    } catch (e) {
      try { child.kill(); } catch (e2) { /* already gone */ }
    }
  }
}

app.on('will-quit', () => {
  for (const engine of [...engines]) engine.stop();
});

// Start an engine together with the app (before the first window asks for one).
app.whenReady().then(() => {
  if (!spare && engines.size === 0) spare = new AgentWarpEngine();
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

/**
 * Onboarding: run an agent CLI's install or sign-in command in the user's terminal, where they can
 * see it and answer its prompts. Only these exact commands are accepted from the page.
 */
const TERMINAL_COMMANDS = new Set([
  'npm install -g @anthropic-ai/claude-code@latest',
  'claude auth login',
  'npm install -g @openai/codex@latest',
  'codex login',
  'npm install -g opencode-ai@latest',
  'opencode auth login'
]);

const LINUX_TERMINALS = [
  ['x-terminal-emulator', ['-e']],
  ['gnome-terminal', ['--']],
  ['konsole', ['-e']],
  ['xfce4-terminal', ['-x']],
  ['kitty', []],
  ['alacritty', ['-e']],
  ['xterm', ['-e']]
];

const DONE_MESSAGE = 'AgentWarp: done. Close this window and press "Check again" in the agent panel.';

const openInTerminal = async (command) => {
  if (!TERMINAL_COMMANDS.has(command)) throw new Error('Command not allowed');
  const id = crypto.randomBytes(6).toString('hex');
  if (process.platform === 'darwin') {
    const file = path.join(os.tmpdir(), `agentwarp-${id}.command`);
    await fs.promises.writeFile(file, [
      '#!/bin/zsh -l',
      `echo '$ ${command}'`,
      command,
      'echo',
      `echo '${DONE_MESSAGE}'`,
      `rm -f '${file}'`,
      ''
    ].join('\n'), {mode: 0o700});
    await new Promise((resolve, reject) => {
      childProcess.execFile('open', ['-a', 'Terminal', file], (error) => error ? reject(error) : resolve());
    });
    return;
  }
  if (process.platform === 'win32') {
    // npm, claude, codex and opencode are .cmd files: `call` returns to this script after each.
    const file = path.join(os.tmpdir(), `agentwarp-${id}.cmd`);
    await fs.promises.writeFile(file, [
      '@echo off',
      `echo ^> ${command}`,
      `call ${command}`,
      'echo.',
      `echo ${DONE_MESSAGE}`,
      ''
    ].join('\r\n'));
    const child = childProcess.spawn('cmd.exe', ['/c', 'start', '"AgentWarp"', 'cmd.exe', '/k', `"${file}"`], {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: true
    });
    child.unref();
    return;
  }
  // Linux: the first terminal emulator found on PATH.
  const file = path.join(os.tmpdir(), `agentwarp-${id}.sh`);
  await fs.promises.writeFile(file, [
    '#!/bin/bash -l',
    `echo '$ ${command}'`,
    command,
    'echo',
    `echo '${DONE_MESSAGE}'`,
    'read -r -p "Press Enter to close." _',
    `rm -f '${file}'`,
    ''
  ].join('\n'), {mode: 0o700});
  const PATH = await getShellPath();
  for (const [terminal, args] of LINUX_TERMINALS) {
    const found = PATH.split(path.delimiter).some((dir) => dir && fs.existsSync(path.join(dir, terminal)));
    if (!found) continue;
    const child = childProcess.spawn(terminal, [...args, file], {detached: true, stdio: 'ignore', env: {...process.env, PATH}});
    child.unref();
    return;
  }
  throw new Error('No terminal app found. Copy the command and run it in a terminal.');
};

module.exports = {
  AgentWarpEngine,
  getClientCode,
  openInTerminal
};
