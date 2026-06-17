/**
 * マニュアルディレクトリを Cloudflare Workers Static Assets 用 site/ に配置
 *
 * Usage:
 *   node prepare-site.mjs [manual-dir] [site-dir] [slug]
 *   node prepare-site.mjs . ../site mypage-20260618
 *
 * 複数マニュアル: site-dir を指定し、slug ごとに manuals/<slug>/ へコピー
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const manualDir = resolve(
  process.env.MOV_TO_DOC_CWD ?? args[0] ?? __dirname
);
function defaultSiteDir(dir) {
  const parent = dirname(dir);
  if (basename(parent) === "manuals") {
    return join(parent, "..", "site");
  }
  return join(dir, "..", "site");
}

const siteDir = resolve(args[1] ?? defaultSiteDir(manualDir));
const slugArg = process.env.MOV_TO_DOC_CWD ? args[1] : args[2];
const slug =
  slugArg ??
  (basename(manualDir).replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase() || "manual");

const htmlCandidates = ["index.html", "operation_manual.html"];
const mdPath = join(manualDir, "operation_manual.md");

let htmlSrc = null;
for (const name of htmlCandidates) {
  const p = join(manualDir, name);
  if (existsSync(p)) {
    htmlSrc = p;
    break;
  }
}

if (!htmlSrc) {
  console.error("HTML が見つかりません。先に npm run html を実行してください:", manualDir);
  process.exit(1);
}

const destDir = join(siteDir, "manuals", slug);
const imagesSrc = join(manualDir, "images");
const imagesDest = join(destDir, "images");

mkdirSync(destDir, { recursive: true });
copyFileSync(htmlSrc, join(destDir, "index.html"));

if (existsSync(imagesSrc)) {
  cpSync(imagesSrc, imagesDest, { recursive: true });
}

// Fix image paths in copied HTML if needed (./images/ → images/)
const htmlDest = join(destDir, "index.html");
let html = readFileSync(htmlDest, "utf8");
html = html.replace(/\.\/images\//g, "images/");
writeFileSync(htmlDest, html, "utf8");

// Regenerate site index listing all manuals
regenerateSiteIndex(siteDir);

console.log("site/ に配置しました:", destDir);

function regenerateSiteIndex(root) {
  const manualsRoot = join(root, "manuals");
  mkdirSync(manualsRoot, { recursive: true });

  const entries = existsSync(manualsRoot)
    ? readdirSync(manualsRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];

  const cards = entries
    .map((d) => {
      const slugName = d.name;
      let title = slugName;
      const mdInManual = join(manualsRoot, slugName, "..", "..", "manuals", slugName, "operation_manual.md");
      // Try to read title from operation_manual in repo manuals/ folder
      const repoMd = join(dirname(root), "manuals", slugName, "operation_manual.md");
      for (const mdFile of [repoMd, mdInManual]) {
        if (existsSync(mdFile)) {
          const m = readFileSync(mdFile, "utf8").match(/^#\s+(.+)$/m);
          if (m) title = m[1].replace(/\*\*/g, "").trim();
          break;
        }
      }
      return `<li class="manual-card">
  <a href="./manuals/${slugName}/">
    <h2>${escapeHtml(title)}</h2>
    <p class="slug">${escapeHtml(slugName)}</p>
  </a>
</li>`;
    })
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>操作マニュアル一覧</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap" rel="stylesheet">
<style>
:root { --brand: #2954c2; --bg: #f3f3f3; --surface: #fff; --border: #e0e0e0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Noto Sans JP", sans-serif; background: var(--bg); color: #181818; }
header { background: var(--brand); color: #fff; padding: 24px 32px; }
header h1 { margin: 0; font-size: 1.5rem; }
main { max-width: 720px; margin: 32px auto; padding: 0 24px 64px; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
.manual-card a {
  display: block; background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 20px 24px; text-decoration: none; color: inherit;
  box-shadow: 0 2px 8px rgba(0,0,0,.06); transition: border-color .15s;
}
.manual-card a:hover { border-color: var(--brand); }
.manual-card h2 { margin: 0 0 6px; font-size: 1.1rem; color: var(--brand); }
.slug { margin: 0; font-size: 0.8125rem; color: #706e6b; }
.empty { color: #706e6b; font-size: 0.9375rem; }
</style>
</head>
<body>
<header><h1>操作マニュアル一覧</h1></header>
<main>
<ul>
${cards || '<li class="empty">マニュアルがまだありません。</li>'}
</ul>
</main>
</body>
</html>`;

  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "index.html"), indexHtml, "utf8");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
