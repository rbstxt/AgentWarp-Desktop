# AgentWarp Desktop

A fork of [TurboWarp Desktop](https://github.com/TurboWarp/desktop) with a coding agent built in.
Open any `.sb3`, ask the agent (Claude, Codex or OpenCode, on your own subscription) in the panel on the
right, and save from the editor as usual. There is no workspace to set up and no bridge to start.

## How it works

- Each editor window starts its own engine (`agentwarp app` from the
  [agentwarp](https://github.com/rbstxt/AgentWarp) repository) on Electron's built-in Node, on a random
  local port with a random token that only that window knows (`src-main/agentwarp.js`).
- The engine keeps a hidden text mirror of the open project under
  `~/Library/Application Support/agentwarp-desktop/projects/` (one per file; unsaved projects get a
  temporary one, removed after a week). The agents work in that mirror; their edits show up in the editor
  within a second, and the user's edits flow back. The `.sb3` the user saves is the real project.
- File > New / Load / opening a file in another window moves the window's engine to that project's mirror.
- The agent panel (`packages/panel` in agentwarp) is injected into the editor page by the renderer
  (`src-renderer-webpack/editor/gui/index.jsx`), connected through the preload (`AgentWarpDesktop`).
- Settings, addons and projects live in their own profile (`agentwarp-desktop`), separate from an installed TurboWarp.

## Development

```sh
# next to a checkout of agentwarp (../agentwarp), or set AGENTWARP_HOME
npm ci && npm run fetch
NODE_OPTIONS=--openssl-legacy-provider npm run webpack:compile
npm start
```

Local app bundle (unsigned, this machine): `npx electron-builder --dir`, then `codesign --force --deep -s - dist/mac-arm64/AgentWarp.app`.
The bundle finds the agentwarp checkout it was developed against (remembered in the profile) or `AGENTWARP_HOME`.

## License

GPL-3.0, like TurboWarp Desktop. TurboWarp is a trademark of its authors; this fork is not affiliated with TurboWarp.
