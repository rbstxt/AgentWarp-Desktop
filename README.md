# AgentWarp

**TurboWarp with a coding agent built in.** Open any Scratch project (`.sb3`), ask Claude, Codex or
OpenCode in the panel on the right, and save from the editor as usual. The agent uses the CLI you
already have and its sign-in (your Claude / ChatGPT subscription or API key), like T3 Code does.

[日本語](#日本語) | [English](#english)

---

## 日本語

### インストール

#### 1. AgentWarp を入れる

[Releases](https://github.com/rbstxt/AgentWarp-Desktop/releases/latest) から、お使いのパソコン用のファイルをダウンロードします。

- **Mac**：`.dmg`（Apple シリコン〈M1 以降〉は **arm64**、Intel Mac は **x64**）。開いて AgentWarp を「アプリケーション」へ
  ドラッグします。**初回だけ** AgentWarp を **右クリック → 開く** で起動してください（まだ Apple の公証を受けていないため）。
  開けない場合は「システム設定 → プライバシーとセキュリティ」の「このまま開く」を押します。
- **Windows**：`AgentWarp-Setup-….exe` を実行します。「Windows によって PC が保護されました」と出たら
  **詳細情報 → 実行** を選んでください（まだコード署名をしていないため）。
- **Linux**：`.AppImage` に実行権限を付けて（`chmod +x AgentWarp-*.AppImage`）起動します。`.tar.gz` もあります。

Windows 版と Linux 版は新しく、Mac 版ほど試せていません。うまく動かないときは Issue で教えてください。

#### 2. エージェントを用意する（アプリが案内します）

AgentWarp は、パソコンに入っているエージェントの CLI とそのサインインをそのまま使います。初めて起動すると、右のパネルが
「どれを使うか」を聞いて、必要なコマンドを表示します（「ターミナルで実行」ボタン付き）。CLI のインストールには
[Node.js](https://nodejs.org/)（npm）が必要です。

| こんな人に | エージェント | インストール | サインイン |
|---|---|---|---|
| Claude Pro / Max を持っている | **Claude Code** | `npm install -g @anthropic-ai/claude-code@latest` | `claude auth login` |
| ChatGPT Plus / Pro を持っている | **Codex CLI** | `npm install -g @openai/codex@latest` | `codex login` |
| サブスクリプションを持っていない | **OpenCode**（無料モデル） | `npm install -g opencode-ai@latest` | 不要 |

OpenCode の無料モデルはサインインなしで使えます。ただし一部の無料モデルは、送った内容をモデルの改善に使うことがあります。
個人情報は送らないでください。API キーや他のサービスを使うときは `opencode auth login` でサインインします。

### 使い方

1. AgentWarp を起動し、作品を開く（「ファイル → 開く」、または `.sb3` をダブルクリック）か、新しく作ります。
2. 右のパネルでエージェントとモデルを選び、やりたいことを書いて送ります（例：「矢印キーで動かせるようにして」）。
3. エージェントの変更はすぐエディタに反映されます。変更点はパネルで確認でき、ターンごとに元に戻せます。
4. いつもどおり **⌘S**（Windows・Linux は **Ctrl+S**）で保存します。保存した `.sb3` が本物の作品です。

パネルに「未インストール」「サインインが必要」と出たら、表示されたコマンドをターミナルで実行し、
「もう一度確認」を押してください。

### よくある質問

- **普段の TurboWarp と一緒に使える？** はい。設定・アドオン・作品の保存場所は別です。
- **エージェントはどこで作業している？** 開いている作品のテキスト版（隠しフォルダ。Mac は
  `~/Library/Application Support/agentwarp-desktop/projects/`、Windows は `%APPDATA%\agentwarp-desktop\projects\`、
  Linux は `~/.config/agentwarp-desktop/projects/`）です。作品ごとに 1 つで、同じファイルを開き直すと
  会話の続きができます。
- **料金は？** AgentWarp は無料です。エージェントの利用分は、各 CLI のプランや API キーの扱いに従います。
- **パネルに「エンジンを起動できませんでした」と出たら？** AgentWarp を再起動してください。直らない場合は、上のフォルダの隣にある
  `logs/agentwarp-engine.log` を添えて Issue で報告してください。

---

## English

### Install

#### 1. Install AgentWarp

Download the file for your computer from [Releases](https://github.com/rbstxt/AgentWarp-Desktop/releases/latest):

- **Mac**: the `.dmg` (**arm64** for Apple Silicon, **x64** for Intel). Drag AgentWarp into Applications.
  **First launch only:** right-click it and choose **Open** (not notarized yet); if macOS refuses, use
  **Open Anyway** in System Settings → Privacy & Security.
- **Windows**: run `AgentWarp-Setup-….exe`. If SmartScreen warns, choose **More info → Run anyway** (not signed yet).
- **Linux**: make the `.AppImage` executable (`chmod +x AgentWarp-*.AppImage`) and run it; a `.tar.gz` is also there.

The Windows and Linux builds are new and less tested than the Mac one; please report problems in Issues.

#### 2. Get an agent (the app walks you through it)

AgentWarp drives the agent CLI installed on your computer with its own sign-in. On first launch the panel
asks which fits you and shows the exact commands (with a "Run in Terminal" button). Installing a CLI needs
[Node.js](https://nodejs.org/) (npm).

| If you have | Agent | Install | Sign in |
|---|---|---|---|
| Claude Pro / Max | **Claude Code** | `npm install -g @anthropic-ai/claude-code@latest` | `claude auth login` |
| ChatGPT Plus / Pro | **Codex CLI** | `npm install -g @openai/codex@latest` | `codex login` |
| No subscription | **OpenCode** (free models) | `npm install -g opencode-ai@latest` | not needed |

OpenCode's free models work without signing in; some of them may use what you send to improve the model, so
do not send personal information. To use an API key or another provider, run `opencode auth login`.

### Use

Open a project (or start a new one), pick an agent and model in the panel on the right, describe what
you want, and save with **⌘S** (**Ctrl+S** on Windows and Linux) as usual. The panel shows what changed and can undo a turn. If an agent
shows "not installed" or "sign-in required", run the command it shows in Terminal and press "Check again".
If the panel says the engine could not start, restart AgentWarp; if that does not help, open an issue with
`agentwarp-desktop/logs/agentwarp-engine.log` from your app data folder (`~/Library/Application Support` on
Mac, `%APPDATA%` on Windows, `~/.config` on Linux).

---

## How it works

- The app starts an engine as soon as it launches, so the first window's panel connects at once; each
  further editor window starts its own engine (`agentwarp app` from
  [AgentWarp](https://github.com/rbstxt/AgentWarp), a submodule here) on Electron's built-in Node, on a
  random local port with a random token only that window knows (`src-main/agentwarp.js`).
- The engine keeps a hidden text mirror of the open project (one per file; unsaved projects get a
  temporary one, removed after a week). Agents work in that mirror over ACP; their edits show up in the
  editor within a second and the user's edits flow back. The `.sb3` the user saves is the real project.
- Claude and Codex run through the bundled ACP adapters pointed at the installed `claude` / `codex`
  (`CLAUDE_CODE_EXECUTABLE`, `CODEX_PATH`); OpenCode runs `opencode acp`. The app reads the login
  shell's `PATH` to find them.
- The agent panel (`packages/panel` in AgentWarp) is injected into the editor page
  (`src-renderer-webpack/editor/gui/index.jsx`) and connected through the preload (`AgentWarpDesktop`).
- Settings, addons and projects live in their own profile (`agentwarp-desktop`).

## Development

```sh
git clone --recurse-submodules https://github.com/rbstxt/AgentWarp-Desktop
cd AgentWarp-Desktop
npm ci && npm run fetch
NODE_OPTIONS=--openssl-legacy-provider npm run webpack:compile
npm start
```

In development the app uses a checkout of AgentWarp next to this folder (`../agentwarp`) if there is
one, else the submodule (set up its packages per its README), or `AGENTWARP_HOME`.

Release build: `node scripts/stage-agentwarp.mjs --arch=arm64` then
`node release-automation/build.mjs --mac --arm64 --production` (`--windows --x64`, `--appimage --tarball --x64`
on the other systems). CI (`.github/workflows/build.yml`) builds macOS (arm64, x64), Windows (x64) and
Linux (x64) on every push; pushing an `agentwarp-v*` tag (e.g. `agentwarp-v0.1.0`) publishes a GitHub Release.

## License

GPL-3.0, like [TurboWarp Desktop](https://github.com/TurboWarp/desktop) (see `README.turbowarp.md` for
its original README). AgentWarp's engine and panel are MIT. TurboWarp is a project of its authors;
AgentWarp is an independent fork and not affiliated with TurboWarp.
