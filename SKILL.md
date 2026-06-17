---
name: mov-to-doc
description: >-
  Converts large system screen-recording videos (mov/mp4) into a user-facing
  operation manual: ffmpeg frames, time-ordered screenshot analysis, Markdown
  with ./images/, Mermaid to PNG, then user-chosen outputs. Canonical source is
  always Markdown + images; derivatives include PDF (Chrome + puppeteer-core),
  DOCX/HTML/EPUB (Pandoc), slides (Marp / Pandoc), wiki (Confluence via MCP when
  available), and more—see reference.md. Enforces capture quality (no spinners
  or skeletons). When multiple videos are given in one user message, produces
  one optimized manual per video—no batch template fill; quality over speed.
  After draft MD, asks the user which formats to produce; user edits MD first,
  then regenerates derivatives. Triggers: mov-to-doc, mov-to-pdf,
  video-to-manual-pdf, screen recordings, operation_manual.pdf, 画面録画,
  マニュアル自動生成, HTML, Web公開, Cloudflare Workers, DOCX, Word, Confluence, 出力形式, 派生出力, PDF品質,
  キャプチャ品質, 複数動画, 一括動画, テンプレート禁止, 手順の品質.
---

# 動画からマニュアル生成（エージェント手順）

大容量の画面操作動画はそのままでは解析できない。**ffmpeg でフレーム抽出 → 画像を時系列で読む → Markdown 作成 → キャプチャを `./images/` に配置 → 処理ステップ図を PNG 化 →（ユーザーが選ぶ派生形式）**の順で進める。

**正本（Source of truth）** は常に **`*.md` + `images/`（＋必要なら `diagrams/*.mmd`）** である。PDF・DOCX・Confluence などは **派生成果物**。ユーザーは **まず Markdown を微修正してから**、必要な形式だけ再生成する。

## 前提ツール

- **ffmpeg**（`ffprobe` が無くても `ffmpeg -i "path/to/video"` でメタデータ取得可）
- **Node.js** と **npm**（PDF・Mermaid PNG 用）
- **PDF 派生**に使う場合: ローカルの **Google Chrome**（または Chromium）。テンプレートの `build-pdf.mjs` 内 `chromeCandidates` に OS に合わせてパスを追加してよい。
- **その他の派生**（任意）: **Pandoc**（DOCX / HTML / EPUB 等）、**Marp**（スライド）、**Atlassian MCP**（Confluence）など。環境に無い場合は [reference.md](reference.md) を参照し、ユーザーにインストールまたは手動手順を案内する。

## 作業ディレクトリと入力

- ユーザーが指定したフォルダ、またはプロジェクト内の `manual/` など一箇所に成果物をまとめる。
- 動画パスに **スペース** が含まれる場合はシェルで **必ずクォート**する。

## 複数動画が1回の指示で指定された場合（必須）

ユーザーが **複数の動画ファイルを1つのメッセージで** 列挙した場合でも、次を **必ず** 守る。**処理スピードより出力品質を優先**する。

| やること | 理由 |
|----------|------|
| **動画ごとに** `Step A → A' → B → C` を回す（抽出・品質選別・解析・Markdown 化） | 画面のオブジェクト名・ウィザードの列・ボタンが動画ごとに異なる。共通化すると誤記・運用事故になる。 |
| **動画ごとに** 別の `*.md`・別の `images/` 接頭辞（またはサブフォルダ）を使う | 1 本の `operation_manual.md` に混在させない。ファイル名は動画のトピックに合わせる（例: `本部事務_銀行マスタCSV登録_20260415.md`）。 |
| **各動画について**、採用フレームと手順文を **その動画のキャプチャの内容に即して** 書く | 「CSV 登録はすべて同じ段落」などの **テンプレート機械埋め・一括スクリプトによる本文生成**は禁止に等しい。 |
| 必要なら **動画 N 本で N 回**、ffmpeg の再抽出や秒位置調整を行う | 短時間で終わらせることより、**読者が実画面と照合できる手順**を優先する。 |

**禁止に近いアンチパターン**

- 複数動画に対し、**1 つのひな型 Markdown** にループでファイル名だけ差し替えて出力すること。
- **共通の「手順 4：CSV をアップロード」** のような固定見出しを、画面がインポートウィザードでも一覧でも **同じ文言で** 繰り返すこと（各キャプチャに合わせて書き直す）。
- 品質チェック（Step A'）を省略して **連続抽出の全フレーム** をそのまま貼り付けること。

**許容される効率化**: 同じアプリの **データインポートウィザード** など、画面構造が本当に同一であることが **キャプチャ上で確認できた** 場合に限り、**説明の文体**を揃えてよい。ただし **オブジェクト名・参照フィールド名・マッピング列・ファイル名** などは **その動画の画面表記どおり** に必ず差し替える（コピペ一本は禁止）。

## Step A — フレーム抽出（前処理）

1. 一時ディレクトリ `frames/` を作成する。
2. 例（間隔は動画に合わせ 2〜5 秒に相当する `fps` で調整。幅 1080px 前後にリサイズ）:

   ```bash
   ffmpeg -y -i "INPUT.mov" -vf "fps=1/3,scale=1080:-2" -q:v 3 "frames/frame_%03d.jpg"
   ```

3. 抽出枚数が多い場合はバッチ（数枚〜十数枚単位）で画像を読み、トークンを抑える。

### Step A' — キャプチャ品質（資料として採用する／しない）

**資料の説得力はキャプチャの状態に依存する。** 次の画面は **マニュアル本文・派生ファイルに採用しない**（見つかったら別の秒位置で切り直す）。

| 採用しない | 理由 |
|------------|------|
| **スピナー**（一覧・テーブル・モーダル内の「読み込み中」） | 操作結果が見えず、読者が正しい UI を判断できない |
| **スケルトン**・**プレースホルダー**だけの一覧 | 同上 |
| **メイン領域が真っ白**・極端に未描画 | 遷移途中のフレームの可能性が高い |
| 手順が「入力完了・保存直前／直後」を示すのに、**保存が無効**・必須が空のまま | 文と画像が矛盾する |
| **意図しない**のに **0 件**・**1-0 / 0** のページングだけでテーブルが空 | 読み込み失敗と区別がつかない |

**採用する例**: データ行・フォーム値が表示済み、成功トースト・更新後の一覧、カレンダーグリッドが描画済み（コマが無くても可）、主要ボタンが有効で次操作が明確。

**秒位置の詰め方**: まず `fps=1/N` の連番で **おおよその時刻** を把握し、問題のある枚は **`ffmpeg -ss <秒> -i "動画" -vframes 1 -vf "scale=1080:-2" -q:v 3 out.jpg`** で **1 枚だけ** 再抽出する（6 秒刻みなど粗い抽出だけに依存しない）。トーストやモーダル閉じは数秒単位でズレるため、前後数秒を試す。

**マークダウン側**: 運用で品質ルールを固定したい場合、**前提条件** または **専用の短い見出し**（例: 「キャプチャの品質」）に、上記の禁止事項と再抽出方針を 3〜6 行で書いてよい（保守担当が同じ基準で差し替えられるようにする）。

## Step B — 画像解析

`frames/` 内を **ファイル名順（時系列）** で読み、次を整理する。

- どのアプリ／画面か（可能ならラベル名）
- カーソル・クリック・入力の目安
- 画面遷移の前後差分
- エラー・警告の有無

## Step C — Markdown（`operation_manual.md`）

次の **必須構成** で書く（日本語ユーザー向けが一般的）。

1. タイトル  
2. はじめに（目的）  
3. 前提条件  
4. 操作手順（番号付き。クリック・入力など具体表現。注意・ヒント）  
5. 完了時の状態  

### 手順文とキャプチャの対応（必須）

- **手順の記載はテンプレート化しない。** CSV 用／画面用など、マスタ種別ごとの**同一の定型段落を流用しない**（誤解や運用事故の原因になる）。**複数動画を一度に依頼された場合も、動画ごとに中身を読み直し、同じ見出し文言のコピペで済ませない。**
- **各番号の本文は、その番号直下に貼ったキャプチャの画面**に即して書く。画面上の**アプリ名・タブ名・ボタン・フィールドラベル・一覧の列名・ステータス**を、読者が実画面と照合できるよう本文に含める。
- **「手順の骨格」だけ共通にして、各ステップの文はキャプチャごとに書き直す**のはよい（例: 「ウィザード左列でオブジェクトを選ぶ」→ 実際のオブジェクト名は **画像で読み取った名称** に必ず置き換える）。
- 体裁のお手本は本リポジトリの **`operation_manual.md`（新規問合せ〜入会）** とする（`1. **短い見出し**` → 説明の段落 → 画像）。お手本は **章立て・語り口の参考**であり、**本文のコピペ用テンプレートではない**。
- ffmpeg の連続抽出だけでは手順文は自動で書けない。**Step B で画像を時系列に読み**（複数動画なら **動画単位で** 読む）、その内容を Step C に落とし込む。品質担保（Step A'）で採用した各フレームに、**一対一で**説明文を対応させる。

各手順の直下に、対応するキャプチャを **Markdown 画像** で埋め込む。

```markdown
![説明文](./images/step01_example.jpg)
```

- **`./images/`** プレフィックスを付け、エディタのプレビューと PDF の両方で相対解決しやすくする。
- 本文に `![]()` が無いと画像は表示されない（キャプション文字だけ残すミスに注意）。

### フローが途切れやすい箇所（問合せ〜申請系で特に重要）

録画が省略気味でも、**ユーザーが次に何をすべきか**が一本線になるよう、次を手順と **Mermaid 図の両方** に反映する（詳細度は「手順ごとに 1 キャプチャ＋短文」の粒度を目安にする。過剰な一文説明は避ける）。

- **重要操作直後の通知**: 変換・申請提出などのあと、画面上部の **通知（ベル）** を開き、対象の **お問合せ番号** や **新規の見込み顧客追加** などの文言を確認する。**お問合せレコードを開いたまま** と **ホームに戻ってから** のどちらでも起こり得る場合は、**両方のスクショを 1 手順内に並べる**か、短い分岐見出しで済ませる。
- **ホーム／タブの明示**: **ホーム** タブへ戻る、アプリランチャーで別アプリへ切り替える等、**どのナビゲーションで次の画面に入ったか**を一文入れる（録画が飛んでいても補完する）。
- **ダッシュボード上のメニュー**: ホームの **問合せ管理** ブロックから **問合せステータス管理** を開く、など **一覧・管理画面は別 URL である** 手順を入れる。画面表記は **`問合せステータス管理`** が多いが、口頭では「お問合せステータス管理」と呼ぶことがある。**キャプションと本文は画面の文字に合わせ**、前提条件で呼び方の差を 1 行注記してよい。
- **一覧→レコードの再接続**: ステータス管理のあと、**問合せ一覧**・**通知のリンク**・**検索** のいずれかで対象 **お問合せ** を再オープンし、**入会状況** から **Application（商談 Stage 管理）** を開く、までを **一続きの手順** に書く（ここが抜けると「変換したのに次が Kanban だけ」になりがち）。
- **`diagrams/process_flow.mmd`**: 上記の **通知確認・ホーム・問合せステータス管理・対象お問合せを再オープン** を中間ノードとして含め、本文の番号順と整合させる。

## Step D — 処理ステップ図（Mermaid → PNG）

多くの PDF／印刷向け変換では **Mermaid のコードブロックが図にならない**。次を推奨する。

1. フロー図のソースを `diagrams/process_flow.mmd` に保存する（Mermaid `flowchart` 等）。
2. `@mermaid-js/mermaid-cli`（`mmdc`）で PNG を生成し、`images/process_flow.png` に出力する。
3. `operation_manual.md` では **`![処理ステップ図](./images/process_flow.png)`** で参照する。

テンプレートは `templates/` を作業ディレクトリにコピーして使える。

## Step E — 出力形式の確認（派生成果物の選択）

**Step C・D まで完了した時点**（マニュアル初稿とフロー図の取り込みが揃ったら）、エージェントは **ユーザーに最終的に欲しい形式**を確認する。Cursor では **AskQuestion** 等で **複数選択可** とする。

### よく選ばれる順（目安）

1. **Markdown のみ** — Git 管理・エディタで継続編集。派生は不要。
2. **HTML（Web）** — 業務ユーザー向けブラウザ閲覧（Step G）。**Chrome 不要**。
3. **PDF** — 配布・印刷（Step F）。
4. **DOCX（Word）** — 校正・コメント。Pandoc（[reference.md](reference.md)）。
5. **Confluence** — Atlassian MCP または REST。**ページ作成・画像添付**のツールスキーマを読んでから実行。**スペースキー・親ページ**はユーザー確認。
6. **Cloudflare Workers 公開** — HTML を `site/` に配置してデプロイ（Step H）。

### 派生出力の短縮表（詳細は reference.md）

| カテゴリ | 例 | 手段の例 | 自動化の目安 |
|----------|-----|----------|----------------|
| 正本・編集 | Markdown | そのまま | 高 |
| 印刷・固定レイアウト | PDF | Chrome + puppeteer（Step F）、または Pandoc | 高（テンプレート時） |
| Office | DOCX、ODT | Pandoc | 高（Pandoc 導入時） |
| スライド | PPTX、Marp | Pandoc（簡易）／Marp／Word 経由 | 低〜中（レイアウト期待は下げる） |
| Web | 単一 HTML、静的サイト | **build-html.mjs**（Step G）、Pandoc、MkDocs 等 | 高（テンプレート時） |
| Wiki・クラウド | Confluence、Notion、Google ドキュメント、Teams | MCP、API、手動貼り付け | 低〜中 |
| 電子書籍 | EPUB | Pandoc | 中 |

**微修正の流れ**: ユーザーが **`.md` を編集** → 必要な派生だけ **再生成**（PDF 上書き前は既存の確認ルールに従う）。

## Step F — PDF 出力（派生の一つ・既存 PDF の上書きに注意）

PDF が **不要**ならこの Step をスキップする。

1. 作業ディレクトリに `package.json`・`build-pdf.mjs` を置く（このスキルの `templates/` をコピー）。
2. `npm install` のあと、用途に応じてビルドする。
   - **既定（1 本だけのマニュアル）**: `npm run build`（`diagram` → `pdf`）または `npm run pdf` のみ → `operation_manual.md` → **`operation_manual.pdf`**。
   - **複数マニュアルがある場合（推奨）**: **`operation_manual.pdf` や他トピックの PDF を誤って上書きしない**よう、次のいずれかを徹底する。
     - **入出力を分ける**: `node build-pdf.mjs <入力.md> <出力.pdf>` で **トピックごとに別名の PDF** を出す。
     - **`package.json` に用途別スクリプト** を用意し、コマンドからファイル名が一目でわかるようにする（例: `npm run build:withdrawal` → `Manabie_退会.md` → `Manabie_退会.pdf`）。
     - **Mermaid も** `diagrams/Topic_flow.mmd`・`images/Topic_flow.png` のように **トピック単位でファイルを分ける**。
3. **エージェントの判断**: 既存の `*.pdf` を上書きしそうな操作の前に、**ユーザーへ一言確認してよい**（「`operation_manual.pdf` を再生成してよいですか？」「別名 `Topic.pdf` で出しますか？」など）。CI や厳格運用では、テンプレートの `build-pdf.mjs` が **`MANUAL_PDF_STRICT_OVERWRITE=1`** のとき既存 PDF があると中止し、**`--force`** でだけ上書きする動きになっている。
4. 成果物の PDF パスをユーザーに返す。

**注意**: `md-to-pdf` 等のみに依存すると Chromium のダウンロードに時間がかかることがある。**既存 Chrome + puppeteer-core**（テンプレート方式）をデフォルトとする。

## Step G — HTML 出力（Web 閲覧用・Chrome 不要）

HTML が **不要**ならこの Step をスキップする。**業務ユーザー向け Web マニュアル**の第一派生として推奨。

1. 作業ディレクトリに `mov-to-doc init` でテンプレートを展開する（または `templates/` をコピー）。
2. `npm install` のあと HTML を生成する。
   - **CLI（グローバル）**: `mov-to-doc build html operation_manual.md index.html`
   - **作業ディレクトリ内**: `npm run html` → `operation_manual.md` → **`index.html`**
   - **別名**: `node build-html.mjs <入力.md> <出力.html>`
3. 生成 HTML の特徴: レスポンシブ、目次サイドバー、手順カード、画像クリック拡大、Noto Sans JP、Manabie 系アクセントカラー（`#2954c2`）。
4. **`site/` へ反映**（Workers 公開前）: `npm run site` または `mov-to-doc build site [manual-dir] [site-dir] [slug]`
5. 上書きポリシー: 環境変数 **`MANUAL_HTML_STRICT_OVERWRITE=1`** で既存 HTML 上書きを禁止。`--force` で上書き。

**正本は Markdown のまま** — HTML は派生。ユーザーが `.md` を編集したら `npm run html` で再生成する。

## Step H — Cloudflare Workers へのデプロイ

HTML + `images/` を **インターネット公開**する場合（例: `manabie-tomas-mypage-manual` リポジトリ）。

1. マニュアルリポジトリに `wrangler.jsonc` を置き、`assets.directory` を `./site` に設定する（[reference.md](reference.md) 参照）。
2. Step G で `site/manuals/<slug>/` に HTML と images を配置済みであること。
3. デプロイ（**wrangler CLI**。Cloudflare MCP に deploy ツールは無い）:

   ```bash
   npm install wrangler --save-dev
   npx wrangler login    # 初回のみ
   npx wrangler deploy
   ```

4. **MCP による検証**（デプロイ後）:
   - `search_cloudflare_documentation` — Static Assets 設定の確認
   - `workers_list` → `workers_get_worker` — Worker の存在確認
5. 公開 URL（例: `https://<worker-name>.<account>.workers.dev`）を README に記載する。
6. **機密情報**: 公開前にキャプチャ・本文の個人情報をレビューする。後から **Cloudflare Access** で認証を追加可能。

### 2 リポジトリモデル

| リポジトリ | 役割 |
|-----------|------|
| **mov-to-doc** | ツール本体（CLI、Skill、テンプレート） |
| **各 manual リポジトリ**（例: manabie-tomas-mypage-manual） | 動画（Git LFS）、Markdown、HTML、公開用 `site/` |

### 他の AI / エディタでも使えるか

この `SKILL.md` は **Markdown の手順書**である。**Cursor の Agent Skill** として置けるほか、**Claude Code の Skill**、**自作のプロジェクトルール**、またはチャットに **ファイルを貼り付け／リポジトリを参照**させる形でも、内容に従って同じパイプラインを実行できる。必須は **ffmpeg・Node**（PDF 派生時は **Chrome**）が利用可能な環境と、エージェントがシェルコマンドを実行できることである（ツール名は製品ごとに異なる）。

## クリーンアップ

- 解析用の **`frames/`** は作業完了後に削除してよい（リポジトリにコミットしない運用が一般的）。
- **`node_modules`** は `.gitignore` に含める。

## 品質チェック

### 手順・図・本文の整合

- 手順の飛躍がないか（**通知・ホーム・一覧画面・タブ切替** など、録画で一瞬のものが抜けていないか）  
- 本文と **抽出画像の内容が矛盾しないか**  
- 個人情報・社内番号がそのまま載る場合はマスクや一般化をユーザーに確認する  

### キャプチャ・派生生成前（必須）

- **Step A'** の「採用しない」状態のキャプチャが **1 枚も混ざっていないか**（スピナー・スケルトン・意図しない空白）  
- 「保存前」「保存後」「一覧反映後」など、**手順が示す状態と画像が一致しているか**  
- **授業カレンダー・一覧** など読み込みの遅い画面は、**左パネルとグリッドが揃ってから** のフレームを使っているか（スピナー付きの週表示は避ける）  
- 成功を示す手順では、可能なら **トースト・更新済み一覧** など **結果が分かる 1 枚** を含める  
- **派生（PDF 等）を出す直前に**、**Markdown が最新の編集内容を反映しているか** を確認する  
- **複数動画を処理した場合**、各 `*.md` が **対応する動画の画面表記** と一致しているか（混線・別トピックのオブジェクト名が入っていないか）を **動画ごとに** 確認する  

**PDF 出力前**: 上記を満たしてから `npm run pdf` / `build:*` する。ユーザーが「資料品質」「PDF の品質担保」を求めたときは、**キャプチャ差し替えとマークダウン注記の両方**を検討する。

**ユーザーが「一括」「バッチ」「全ファイルに同じ処理」と言った場合**: **フレーム抽出や画像のリネームを自動化すること**と、**手順本文をテンプレートで一括生成すること**は区別する。前者は許容しうるが、**後者は本スキルの品質方針に反する**（各動画・各キャプチャに最適化した本文が必須）。

## 同梱テンプレート

| パス | 内容 |
|------|------|
| [cli.mjs](cli.mjs) | グローバル CLI（`init` / `skill install` / `build html\|pdf\|site`） |
| [templates/package.json](templates/package.json) | `diagram` / `html` / `pdf` / `site` / `build:web` |
| [templates/build-html.mjs](templates/build-html.mjs) | `operation_manual.md` → Web HTML |
| [templates/prepare-site.mjs](templates/prepare-site.mjs) | `site/` への配置（Workers Static Assets 用） |
| [templates/lib/render-manual.mjs](templates/lib/render-manual.mjs) | Markdown → HTML（Web / 印刷共通） |
| [templates/build-pdf.mjs](templates/build-pdf.mjs) | `operation_manual.md` → PDF |
| [templates/diagrams/process_flow.mmd](templates/diagrams/process_flow.mmd) | フロー図のひな型 |
| [reference.md](reference.md) | ffmpeg 例・派生出力の詳細・Cloudflare デプロイ |

新規案件では `templates/` をプロジェクトの `manual/` にコピーし、動画・本文に合わせて編集する。
