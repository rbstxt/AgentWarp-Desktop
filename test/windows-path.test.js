// npm test
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {windowsAgentDirs, windowsAgentPath} = require('../src-main/windows-path');

const APPDATA = 'C:\\Users\\Jane Doe\\AppData\\Roaming';
const USERPROFILE = 'C:\\Users\\Jane Doe';
const only = (...dirs) => (dir) => dirs.includes(dir);

test('npm global folder is always added', () => {
  assert.deepEqual(windowsAgentDirs({APPDATA}, only()), [`${APPDATA}\\npm`]);
});

test("fnm's default Node is added from %APPDATA%\\fnm (Start menu launch, no fnm env)", () => {
  const fnm = `${APPDATA}\\fnm`;
  assert.deepEqual(
    windowsAgentDirs({APPDATA, USERPROFILE}, only(fnm, `${fnm}\\aliases\\default`)),
    [`${APPDATA}\\npm`, `${fnm}\\aliases\\default`]
  );
});

test('FNM_DIR wins, then the legacy %USERPROFILE%\\.fnm', () => {
  const custom = 'D:\\tools\\fnm';
  assert.deepEqual(
    windowsAgentDirs({APPDATA, FNM_DIR: custom}, only(custom, `${custom}\\aliases\\default`, `${APPDATA}\\fnm`)),
    [`${APPDATA}\\npm`, `${custom}\\aliases\\default`]
  );
  const legacy = `${USERPROFILE}\\.fnm`;
  assert.deepEqual(
    windowsAgentDirs({APPDATA, USERPROFILE}, only(legacy, `${legacy}\\aliases\\default`)),
    [`${APPDATA}\\npm`, `${legacy}\\aliases\\default`]
  );
});

test('no default alias, no fnm entry (never the per-shell fnm_multishells folder)', () => {
  const fnm = `${APPDATA}\\fnm`;
  const dirs = windowsAgentDirs({APPDATA}, only(fnm));
  assert.deepEqual(dirs, [`${APPDATA}\\npm`]);
  assert.ok(dirs.every((d) => !/fnm_multishells/i.test(d)));
});

test('the app PATH comes first and entries already on it are not repeated', () => {
  const fnmDefault = `${APPDATA}\\fnm\\aliases\\default`;
  const exists = only(`${APPDATA}\\fnm`, fnmDefault);
  assert.equal(
    windowsAgentPath('C:\\Windows\\system32;c:\\users\\jane doe\\appdata\\roaming\\npm\\', {APPDATA}, exists),
    `C:\\Windows\\system32;c:\\users\\jane doe\\appdata\\roaming\\npm\\;${fnmDefault}`
  );
  assert.equal(windowsAgentPath(undefined, {}, only()), '');
});
