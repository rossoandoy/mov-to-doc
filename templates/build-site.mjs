#!/usr/bin/env node
/**
 * Assemble site/ from feature manuals, glossary, search, and static pages.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { renderSiteIndex } from "./lib/render-site-index.mjs";
import { renderGlossaryIndex } from "./lib/render-glossary.mjs";
import { renderTermPage } from "./lib/render-term-page.mjs";
import { renderSearchPage } from "./lib/render-search.mjs";
import { renderSitemap } from "./lib/render-sitemap.mjs";
import { renderAboutPage } from "./lib/render-about.mjs";
import { setProductName } from "./lib/site-chrome.mjs";
import { buildSearchIndex } from "./lib/build-search-index.mjs";
import {
  loadFeatureCatalog,
  loadGlossaryTerms,
  listPublishedManuals,
} from "./lib/catalog-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const siteDir = join(repoRoot, "site");
const manualsRoot = join(repoRoot, "manuals");

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function copyManuals() {
  const featDirs = readdirSync(manualsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("feat-"))
    .map((d) => d.name);

  const siteManuals = join(siteDir, "manuals");
  mkdirSync(siteManuals, { recursive: true });

  for (const slug of featDirs) {
    const src = join(manualsRoot, slug);
    const dest = join(siteManuals, slug);
    mkdirSync(dest, { recursive: true });

    const htmlSrc = join(src, "index.html");
    if (!existsSync(htmlSrc)) {
      console.warn("skip (no index.html):", slug);
      continue;
    }
    let html = readFileSync(htmlSrc, "utf8");
    html = html.replace(/\.\/images\//g, "images/");
    writeFileSync(join(dest, "index.html"), html, "utf8");

    const imagesSrc = join(src, "images");
    if (existsSync(imagesSrc)) {
      cpSync(imagesSrc, join(dest, "images"), { recursive: true });
    }
    console.log("manual:", slug);
  }

  // Remove stale manual dirs
  if (existsSync(siteManuals)) {
    for (const entry of readdirSync(siteManuals, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!featDirs.includes(entry.name)) {
        rmSync(join(siteManuals, entry.name), { recursive: true, force: true });
        console.log("removed stale:", entry.name);
      }
    }
  }
}

function copyData() {
  const dataDest = join(siteDir, "data");
  mkdirSync(dataDest, { recursive: true });
  for (const name of ["feature-catalog.json"]) {
    const src = join(repoRoot, "data", name);
    if (existsSync(src)) copyFileSync(src, join(dataDest, name));
  }
  const glossaryDest = join(dataDest, "glossary");
  mkdirSync(glossaryDest, { recursive: true });
  for (const name of ["terms.json", "normalization.json"]) {
    const src = join(repoRoot, "data", "glossary", name);
    if (existsSync(src)) copyFileSync(src, join(glossaryDest, name));
  }
}

function buildGlossaryPages(catalog, terms, environment) {
  const glossaryDir = join(siteDir, "glossary");
  mkdirSync(glossaryDir, { recursive: true });
  writeFileSync(
    join(glossaryDir, "index.html"),
    renderGlossaryIndex({ terms, catalog, environment })
  );

  const termsDir = join(glossaryDir, "terms");
  mkdirSync(termsDir, { recursive: true });
  for (const term of terms) {
    const dir = join(termsDir, term.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      renderTermPage({ term, catalog, environment })
    );
  }
  console.log("glossary:", terms.length, "terms");
}

function main() {
  mkdirSync(siteDir, { recursive: true });
  copyManuals();
  copyData();

  const catalog = loadFeatureCatalog(repoRoot);
  const terms = loadGlossaryTerms(repoRoot);
  const environment = catalog.environment ?? "";
  setProductName(catalog.product);
  const manuals = listPublishedManuals(repoRoot, siteDir);

  buildGlossaryPages(catalog, terms, environment);

  mkdirSync(join(siteDir, "search"), { recursive: true });
  writeFileSync(
    join(siteDir, "search", "index.html"),
    renderSearchPage({ repoRoot, environment })
  );

  mkdirSync(join(siteDir, "sitemap"), { recursive: true });
  writeFileSync(
    join(siteDir, "sitemap", "index.html"),
    renderSitemap({ catalog, manuals, terms, environment })
  );

  mkdirSync(join(siteDir, "about"), { recursive: true });
  writeFileSync(
    join(siteDir, "about", "index.html"),
    renderAboutPage({ catalog, environment })
  );

  const searchIndex = buildSearchIndex({ repoRoot, manuals, terms });
  writeFileSync(
    join(siteDir, "search-index.json"),
    JSON.stringify(searchIndex, null, 2) + "\n",
    "utf8"
  );
  console.log("search-index:", searchIndex.length, "items");

  writeFileSync(
    join(siteDir, "index.html"),
    renderSiteIndex({ siteDir, repoRoot }),
    "utf8"
  );
  console.log("site/ build complete:", siteDir);
}

main();
