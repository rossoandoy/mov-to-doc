/**
 * Markdown + ./images（相対パス）を A4 PDF に出力する（Google Chrome / Chromium 必須）
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import puppeteer from "puppeteer-core";
import { renderManualHtml } from "./lib/render-manual.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manualDir = process.env.MOV_TO_DOC_CWD
  ? resolve(process.env.MOV_TO_DOC_CWD)
  : __dirname;

const rawArgs = process.argv.slice(2);
const forceOverwrite = rawArgs.includes("--force");
const args = rawArgs.filter((a) => a !== "--force");
const mdFile = args[0] ?? "operation_manual.md";
const pdfFile = args[1] ?? "operation_manual.pdf";

const mdPath = join(manualDir, mdFile);
const pdfPath = join(manualDir, pdfFile);

if (!existsSync(mdPath)) {
  console.error("入力 Markdown が見つかりません:", mdPath);
  process.exit(1);
}

const strictOverwrite =
  process.env.MANUAL_PDF_STRICT_OVERWRITE === "1" ||
  process.env.MANUAL_PDF_STRICT_OVERWRITE === "true";

if (existsSync(pdfPath)) {
  if (strictOverwrite && !forceOverwrite) {
    console.error("出力先 PDF が既に存在します（MANUAL_PDF_STRICT_OVERWRITE=1 のため上書きしません）:", pdfPath);
    process.exit(1);
  }
  console.warn("[mov-to-doc] 既存の PDF を上書きします:", pdfPath);
}

const safeHtmlStem = basename(mdFile, ".md").replace(/[^a-zA-Z0-9._-]/g, "_") || "manual";
const htmlPath = join(manualDir, `_pdf_temp_${safeHtmlStem}.html`);

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

function findChrome() {
  for (const p of chromeCandidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const chromePath = findChrome();
if (!chromePath) {
  console.error("Google Chrome が見つかりません。CHROME_PATH を設定するか、Chrome をインストールしてください。");
  process.exit(1);
}

const md = readFileSync(mdPath, "utf8");
const html = await renderManualHtml(md, { mode: "print" });

writeFileSync(htmlPath, html, "utf8");

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
});

await browser.close();
try {
  unlinkSync(htmlPath);
} catch {
  /* ignore */
}

console.log("PDF を出力しました:", pdfPath);
