/**
 * マニュアルディレクトリを Cloudflare Workers Static Assets 用 site/ に配置
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
import { renderSiteIndex } from "./lib/render-site-index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const manualDir = resolve(process.env.MOV_TO_DOC_CWD ?? args[0] ?? __dirname);

function defaultSiteDir(dir) {
  const parent = dirname(dir);
  if (basename(parent) === "manuals") return join(parent, "..", "site");
  return join(dir, "..", "site");
}

const siteDir = resolve(args[1] ?? defaultSiteDir(manualDir));
const slugArg = process.env.MOV_TO_DOC_CWD ? args[1] : args[2];
const slug =
  slugArg ??
  (basename(manualDir).replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase() || "manual");

const htmlCandidates = ["index.html", "operation_manual.html"];
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

const repoRoot = basename(dirname(manualDir)) === "manuals"
  ? dirname(dirname(manualDir))
  : dirname(manualDir);

const destDir = join(siteDir, "manuals", slug);
mkdirSync(destDir, { recursive: true });
copyFileSync(htmlSrc, join(destDir, "index.html"));

const imagesSrc = join(manualDir, "images");
if (existsSync(imagesSrc)) {
  cpSync(imagesSrc, join(destDir, "images"), { recursive: true });
}

let html = readFileSync(join(destDir, "index.html"), "utf8");
html = html.replace(/\.\/images\//g, "images/");
writeFileSync(join(destDir, "index.html"), html, "utf8");

// Copy data/ to site/data/
const dataSrc = join(repoRoot, "data");
const dataDest = join(siteDir, "data");
if (existsSync(dataSrc)) {
  cpSync(dataSrc, dataDest, { recursive: true });
}

regenerateSiteIndex(siteDir, repoRoot);
console.log("site/ に配置しました:", destDir);

function regenerateSiteIndex(root, repoRootPath) {
  mkdirSync(join(root, "manuals"), { recursive: true });
  const indexHtml = renderSiteIndex({ siteDir: root, repoRoot: repoRootPath });
  writeFileSync(join(root, "index.html"), indexHtml, "utf8");
}
