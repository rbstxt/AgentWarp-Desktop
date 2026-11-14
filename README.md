# AgentWarp

**TurboWarp with a coding agent built in.** Open any Scratch project (`.sb3`), ask Claude, Codex or
OpenCode in the panel on the right, and save from the editor as usual. The agent uses the CLI you
already have and its sign-in (your Claude / ChatGPT subscription or API key), like T3 Code does.

[日本語](#日本語) | [English](#english)

---

## 日本語

### インストール

#### 1. エージェントの CLI を入れてサインインする（どれか 1 つ以上）

AgentWarp は、パソコンに入っているエージェントの CLI とそのサインイン情報をそのまま使います。
CLI のインストールには [Node.js](https://nodejs.org/)（npm）が必要です。

| エージェント | インストール | サインイン | 使えるプラン |
|---|---|---|---|
| **Claude**（Claude Code） | `npm install -g @anthropic-ai/claude-code@latest` | `claude auth login` | Claude Pro / Max、API キー |
| **Codex**（Codex CLI） | `npm install -g @openai/codex@latest` | `codex login` | ChatGPT Plus / Pro など、API キー |
| **OpenCode** | `npm install -g opencode-ai@latest` | `opencode auth login` | 各社の API キー、無料モデル |

ターミナルで `claude --version` などが表示されれば準備完了です。

#### 2. AgentWarp を入れる

1. [Releases](https://github.com/rbstxt/AgentWarp-Desktop/releases/latest) から `.dmg` をダウンロードします。
   Apple シリコン（M1 以降）は **arm64**、Intel Mac は **x64** です。
2. `.dmg` を開き、AgentWarp を「アプリケーション」フォルダへドラッグします。
3. **初回だけ**、アプリケーションフォルダで AgentWarp を **右クリック → 開く** を選びます
   （まだ Apple の公証を受けていないためです）。開けない場合は「システム設定 → プライバシーとセキュリティ」の
   下にある「このまま開く」を押してください。

### 使い方

1. AgentWarp を起動し、作品を開く（「ファイル → 開く」、または `.sb3` をダブルクリック）か、新しく作ります。
2. 右のパネルでエージェントとモデルを選び、やりたいことを書いて送ります（例：「矢印キーで動かせるようにして」）。
3. エージェントの変更はすぐエディタに反映されます。変更点はパネルで確認でき、ターンごとに元に戻せます。
4. いつもどおり **⌘S** で保存します。保存した `.sb3` が本物の作品です。

パネルに「未インストール」「サインインが必要」と出たら、表示されたコマンドをターミナルで実行し、
「もう一度確認」を押してください。

### よくある質問

- **普段の TurboWarp と一緒に使える？** はい。設定・アドオン・作品の保存場所は別です。
- **エージェントはどこで作業している？** 開いている作品のテキスト版（隠しフォルダ
  `~/Library/Application Support/agentwarp-desktop/projects/`）です。作品ごとに 1 つで、同じファイルを開き直すと
  会話の続きができます。
- **料金は？** AgentWarp は無料です。エージェントの利用分は、各 CLI のプランや API キーの扱いに従います。

---

## English

### Install

#### 1. Install and sign in to an agent CLI (at least one)

AgentWarp drives the agent CLIs installed on your Mac with their own sign-in. Installing a CLI needs
[Node.js](https://nodejs.org/) (npm).

| Agent | Install | Sign in | Works with |
|---|---|---|---|
| **Claude** (Claude Code) | `npm install -g @anthropic-ai/claude-code@latest` | `claude auth login` | Claude Pro / Max, API key |
| **Codex** (Codex CLI) | `npm install -g @openai/codex@latest` | `codex login` | ChatGPT plans, API key |
| **OpenCode** | `npm install -g opencode-ai@latest` | `opencode auth login` | provider API keys, free models |

#### 2. Install AgentWarp

1. Download the `.dmg` from [Releases](https://github.com/rbstxt/AgentWarp-Desktop/releases/latest):
   **arm64** for Apple Silicon, **x64** for Intel Macs.
2. Drag AgentWarp into Applications.
3. **First launch only:** right-click AgentWarp in Applications and choose **Open** (the app is not
   notarized yet). If macOS refuses, use **Open Anyway** in System Settings → Privacy & Security.

### Use

Open a project (or start a new one), pick an agent and model in the panel on the right, describe what
you want, and save with **⌘S** as usual. The panel shows what changed and can undo a turn. If an agent
shows "not installed" or "sign-in required", run the command it shows in Terminal and press "Check again".

---

## How it works

- Each editor window starts its own engine (`agentwarp app` from
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
`node release-automation/build.mjs --mac --arm64 --production`. CI (`.github/workflows/build.yml`) builds
arm64 and x64 on every push; pushing an `agentwarp-v*` tag (e.g. `agentwarp-v0.1.0`) publishes a GitHub Release.

## License

GPL-3.0, like [TurboWarp Desktop](https://github.com/TurboWarp/desktop) (see `README.turbowarp.md` for
its original README). AgentWarp's engine and panel are MIT. TurboWarp is a project of its authors;
AgentWarp is an independent fork and not affiliated with TurboWarp.
