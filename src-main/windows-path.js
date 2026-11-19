// Windows: folders where agent CLIs live but that an app started from the Start menu may not
// have on PATH. Kept free of Electron so it can be tested with plain Node.

const fs = require('fs');
const path = require('path');

/**
 * Extra PATH entries for agent CLIs on Windows, after the app's own PATH:
 * - %APPDATA%\npm: npm's global folder, which a fresh Node.js install may not have on PATH yet.
 * - fnm's default Node (<fnm dir>\aliases\default): fnm puts Node and the CLIs installed with it
 *   on PATH only in shells that ran `fnm env` (through a per-shell fnm_multishells folder), so GUI
 *   apps never see them. The fnm dir is %FNM_DIR%, else %APPDATA%\fnm, else %USERPROFILE%\.fnm.
 */
const windowsAgentDirs = (env, exists = fs.existsSync) => {
  const dirs = [];
  if (env.APPDATA) dirs.push(path.win32.join(env.APPDATA, 'npm'));
  const fnmDirs = [
    env.FNM_DIR,
    env.APPDATA && path.win32.join(env.APPDATA, 'fnm'),
    env.USERPROFILE && path.win32.join(env.USERPROFILE, '.fnm')
  ].filter(Boolean);
  const fnmDir = fnmDirs.find((dir) => exists(dir));
  if (fnmDir) {
    const defaultNode = path.win32.join(fnmDir, 'aliases', 'default');
    if (exists(defaultNode)) dirs.push(defaultNode);
  }
  return dirs;
};

/** PATH for the engine on Windows: the app's PATH first, then the folders above not already on it. */
const windowsAgentPath = (currentPath, env, exists) => {
  const entries = (currentPath || '').split(';').filter(Boolean);
  const seen = new Set(entries.map((dir) => dir.replace(/[\\/]+$/, '').toLowerCase()));
  for (const dir of windowsAgentDirs(env, exists)) {
    if (!seen.has(dir.toLowerCase())) entries.push(dir);
  }
  return entries.join(';');
};

module.exports = {windowsAgentDirs, windowsAgentPath};
