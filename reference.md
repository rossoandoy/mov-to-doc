# リファレンス（動画 → マニュアル・派生出力）

## 複数動画・品質方針

**本文のルール（テンプレ禁止・キャプチャ準拠・複数動画は本ごとにパイプライン）**は [SKILL.md](SKILL.md) 本編を正とする。フレーム抽出のコマンド例だけ本ファイルにあり、**手順文の一括生成はスキル上禁止**に近い扱い。

## ffmpeg フレーム抽出（例）

動画パスにスペースがある場合はクォートする。

```bash
mkdir -p frames
ffmpeg -y -i "your-recording.mov" -vf "fps=1/3,scale=1080:-2" -q:v 3 "frames/frame_%03d.jpg"
```

- **fps**: `1/3` は約 3 秒に 1 枚。長い録画では `1/4`〜`1/5` などにする。
- **scale**: 幅 1080px 前後（高さは `-2` で偶数に丸められることが多い）。

### 品質のための 1 枚切り出し（秒位置の調整）

連続抽出では **読み込み中のフレーム** が混ざりやすい。問題のある枚は、前後の秒を変えて **1 フレームだけ** 取り直す。

```bash
ffmpeg -y -ss 78 -i "your-recording.mov" -vframes 1 -vf "scale=1080:-2" -q:v 3 "frames/pick_078s.jpg"
```

- **`-ss`**: キーフレームの都合で数フレームずれることがある。±2〜5 秒程度も試す。
- **採用しない画面**: スピナー、スケルトン、真っ白メイン、文と矛盾する無効な保存ボタンなど（スキル本編の Step A' 参照）。

メタデータだけ確認する例:

```bash
ffmpeg -hide_banner -i "your-recording.mov" 2>&1 | head -25
```

---

## 派生出力の一覧（網羅）

正本は **常に Markdown + `images/`**。以下は **派生** の候補。環境・ポリシーによって **自動化できない**ものは手動手順でよい。

### 1. 正本・プレビュー

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **Markdown** | Git 差分・AI 再編集 | そのまま | 正本 |
| **単一 HTML** | ブラウザ共有 | Pandoc（下記） | 社内ポリシーで MIME 制限あり得る |

### 2. 印刷・固定レイアウト

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **PDF** | 配布・印刷 | `build-pdf.mjs` + Chrome（SKILL Step F） | 既定の自動化 |
| **PDF（Pandoc）** | LaTeX 経由など | `pandoc -o out.pdf` | 日本語フォント設定が必要なことがある |
| **紙** | 掲示 | PDF を印刷 | PDF と同じ派生扱い |

### 3. Office

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **DOCX** | 校正・コメント | Pandoc | 最も汎用 |
| **ODT** | LibreOffice | Pandoc | `pandoc -o out.odt` |
| **PPTX** | スライド | Pandoc（簡易） | **レイアウト期待は下げる**。代替: Word から PowerPoint へ送る、手動 |

### 4. Web・静的サイト

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **MkDocs / Docusaurus / VitePress / Hugo** | プロダクトドキュメント | 各 CLI + 設定 | 別プロジェクト雛形が必要 |
| **GitHub / GitLab Pages** | 公開 | 上記 + CI | リポジトリ前提 |

### 5. Wiki・クラウド・共有

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **Confluence** | 社内 Wiki | **Atlassian MCP** または REST | **ツールのスキーマを読んでから** ページ作成・**画像添付**。スペース・親ページ ID はユーザー確認 |
| **Notion** | 軽量共有 | インポート / API | 画像は別アップロードになりがち |
| **Google ドキュメント** | 共同編集 | DOCX をアップロードして変換 等 | 手動も現実的 |
| **Microsoft 365**（SharePoint / Teams） | 社内 MS 統合 | Word ファイル共有、貼り付け | 完全自動はポリシー依存 |
| **Slack**（Canvas 等） | 簡易共有 | 手動 | 長文マニュアルの主用途には不向きなことが多い |

### 6. プレゼン

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **Marp** | MD からスライド | VS Code / CLI | 画像パスはプロジェクト基準に注意 |
| **reveal.js** | デモ・勉強会 | Pandoc 等 | セットアップコストあり |
| **Google スライド** | 共有スライド | PPTX インポート | 手動ステップが現実的 |

### 7. 電子書籍・その他

| 出力 | 用途 | 手段 | 備考 |
|------|------|------|------|
| **EPUB** | タブレット閲覧 | Pandoc | 画像入りで体裁確認を |
| **Typst / LaTeX** | 高品質組版 | 各ツール | 操作マニュアルのデフォルトにはしない |
| **画像のみ ZIP** | 納品例外 | 手動 | キャプチャだけ必要な場合 |

---

## Pandoc の例（要インストール）

[https://pandoc.org/](https://pandoc.org/) を参照。**作業ディレクトリ**（`images/` がある階層）で実行し、相対パスが解決されるようにする。

```bash
# Word
pandoc operation_manual.md -o operation_manual.docx

# 単一 HTML（自己完結しやすい例）
pandoc operation_manual.md -s -o operation_manual.html

# EPUB
pandoc operation_manual.md -o operation_manual.epub

# 簡易スライド（期待値は低め）
pandoc operation_manual.md -o slides.pptx
```

- 日本語フォントや画像が欠ける場合は、Pandoc のオプション・テンプレートを調整する。
- **PPTX** は 1 枚あたりのレイアウトが荒くなりやすい。**研修用の美しいスライド**には **Marp** や手組みを推奨することが多い。

---

## Confluence（MCP 利用時）チェックリスト

1. **認証**: Atlassian MCP が有効で、ユーザーが利用可能か。
2. **ツール**: 利用前に **MCP のツール定義（スキーマ）を読む**。ページ作成・更新・**添付ファイルアップロード**の有無を確認。
3. **宛先**: **スペースキー**、**親ページ ID**（または作成先）をユーザーに確認。
4. **本文**: Confluence のストレージ形式 / ADF は **ツールの要求に合わせる**。Markdown をそのまま貼れない場合は変換が必要。
5. **画像**: `./images/*.jpg` を **添付**し、本文から参照する形式にする（マクロや `!image.png!` 等はサイト設定依存）。

---

## Notion / Google ドキュメント（手動寄り）チェックリスト

- **Notion**: Markdown インポート後に画像パスが切れる場合がある → 画像をドラッグ＆ドロップで再配置する想定をユーザーに伝える。
- **Google ドキュメント**: **DOCX をアップロード**して開き、体裁を整えるのが手早いことが多い。

---

## Markdown 必須構成チェックリスト

- [ ] タイトル
- [ ] はじめに（目的）
- [ ] 前提条件
- [ ] 操作手順（番号付き、具体動作）
- [ ] 完了時の状態

## PDF・キャプチャ品質チェックリスト

- [ ] どのキャプチャにも **スピナー／スケルトン／意図しない空白** が写っていない
- [ ] 手順の説明（保存前・保存後・一覧反映など）と **画像の状態が一致**している
- [ ] 遅延の大きい画面（カレンダー・一覧）は **描画完了後** のフレームを使っている
- [ ] 成功が重要なステップでは **トーストや更新後一覧** など、結果が分かる画像がある（可能な範囲で）
- [ ] 必要ならマークダウンに **キャプチャ品質の短いルール** を書き、将来の差し替え基準を固定している

## 派生出力前のチェック

- [ ] **Markdown が最新**（ユーザーが直した内容が反映済み）
- [ ] 選んだ形式に必要なツール（Chrome / Pandoc / MCP）が使える

## 手順の網羅性（問合せ〜申請で抜けやすい導線）

録画だけだと省略されがちなので、該当する場合は本文・図の両方で明示する。

- [ ] **変換・提出などの直後**に **通知（ベル）** を開いて内容確認（レコード上／ホーム上のどちらか、または両方）
- [ ] **ホーム** タブや **アプリ切替** で「いまどのコンテキストにいるか」がわかる一文
- [ ] ホームの **問合せ管理** から **問合せステータス管理**（画面表記に合わせる）など、**ダッシュボード経由の別画面**
- [ ] 一覧・通知・検索のいずれかで **対象お問合せを再オープン** してから **入会状況 → Application**
- [ ] `process_flow.mmd` に上記に対応する **中間ノード** があり、本文の順序と一致

## 画像埋め込み

- 各手順の直下に `![説明](./images/xxx.jpg)` 形式であること（`![]()` が欠けるとプレビュー・PDF に出ない）。
- `images/` は `operation_manual.md` と同じディレクトリ階層に置く。

## Mermaid → PNG

```bash
npm install
npx mmdc -i diagrams/process_flow.mmd -o images/process_flow.png -w 1400 -b white
```

## PDF（テンプレート方式）

```bash
npm install
npm run pdf
# または図も再生成: npm run build
```

複数マニュアルがある場合は **`operation_manual.pdf` を上書きしない**よう、`node build-pdf.mjs 別件.md 別件.pdf` のように **出力ファイル名を変える**（プロジェクトの `package.json` に用途別 `pdf:*` / `build:*` を足すのが安全）。

Chrome が見つからない場合は環境変数 `CHROME_PATH` に実行ファイルのフルパスを設定する。

## HTML（Web 向け・推奨）

```bash
npm install
npm run html
# または: mov-to-doc build html operation_manual.md index.html
```

生成物: `index.html`（目次・**業務フロー概要**・**UAT バッジ**・分岐 tip・手順カード・画像拡大付き）

### `manual.meta.json`（任意・推奨）

マニュアルディレクトリに置く JSON。`build-html.mjs` が読み込み、詳細 HTML に反映する。

| キー | 用途 |
|------|------|
| `flowPhases` | 業務フェーズ ID（`business-flow.json` の `id` と一致） |
| `flowRange` | 一覧カード用 `{ from, to }` |
| `flowSummary` | 詳細ページ上部の 5〜6 ノード概要ストリップ |
| `branchTips` | 分岐 callout（例: Email 未入力時） |
| `uatMapping` | 手順番号 ↔ UAT ID の対応 |
| `referenceVideo` | 参照動画 `{ url, title?, duration? }`。HTML の「前提条件」直前に `<video>` セクションを埋込。大容量は R2 + Worker `/videos/*` 配信 |

### マニュアルリポジトリの `data/`

| ファイル | 用途 |
|----------|------|
| `data/business-flow.json` | 7 フェーズ定義（一覧のフローストリップ） |
| `data/uat-cases.json` | UAT テストケース一覧（Excel から `scripts/import-uat-xlsx.mjs` で生成可） |

## site/ 配置（Cloudflare Workers 用）

```bash
npm run site
# または: mov-to-doc build site . ../site my-topic-slug
```

- `site/manuals/<slug>/` — 詳細 HTML + images
- `site/data/` — `data/` のコピー
- `site/index.html` — **業務フロー起点の一覧**（`render-site-index.mjs` で自動生成）

## Cloudflare Workers デプロイ

マニュアルホスティング用リポジトリ（例: `manabie-tomas-mypage-manual`）で:

```jsonc
// wrangler.jsonc（Static Assets + R2 動画）
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "manabie-tomas-mypage-manual",
  "main": "worker.mjs",
  "compatibility_date": "2026-06-01",
  "assets": {
    "directory": "./site",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  "r2_buckets": [
    { "binding": "VIDEOS", "bucket_name": "manabie-tomas-mypage-manual-videos" }
  ]
}
```

`worker.mjs` は `/videos/*` を R2、`/` 以下を Static Assets から返す。

参照動画アップロード:

```bash
ffmpeg -i "source/videos/recording.mov" -c:v libx264 -crf 26 -preset medium \
  -vf "scale=1280:-2" -c:a aac -b:a 128k -movflags +faststart source/videos/<slug>.mp4
node scripts/upload-video-r2.mjs source/videos/<slug>.mp4
```

`manual.meta.json` の `referenceVideo.url` に `/videos/<slug>.mp4` を設定する。

```bash
npm install wrangler --save-dev
npx wrangler login
npx wrangler deploy
```

### Cloudflare MCP 検証（デプロイ後）

1. `search_cloudflare_documentation` — Static Assets の設定確認
2. `workers_list` — アカウント内 Worker 一覧
3. `workers_get_worker` — 対象 Worker の存在・状態確認

**注意**: MCP には `wrangler deploy` 相当のツールは無い。デプロイは CLI で行う。

## グローバル CLI

```bash
npm install -g github:rossoandoy/mov-to-doc
# または clone 後: npm link

mov-to-doc init ./manuals/my-topic
mov-to-doc skill install
mov-to-doc build html
mov-to-doc build site . ./site my-topic
```
