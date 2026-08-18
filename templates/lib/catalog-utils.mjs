/**
 * Feature catalog + glossary helpers
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadFeatureCatalog(repoRoot) {
  return readJson(join(repoRoot, "data", "feature-catalog.json"), { modules: [] });
}

export function loadGlossaryTerms(repoRoot) {
  return readJson(join(repoRoot, "data", "glossary", "terms.json"), []);
}

export function moduleLabel(catalog, moduleId) {
  return catalog.modules?.find((m) => m.id === moduleId)?.label ?? moduleId;
}

export function featureById(catalog, featureId) {
  for (const mod of catalog.modules ?? []) {
    const feat = mod.features?.find((f) => f.id === featureId);
    if (feat) return { ...feat, moduleLabel: mod.label };
  }
  return null;
}

export function listPublishedManuals(repoRoot, siteDir) {
  const manualsRoot = join(repoRoot, "manuals");
  const siteManualsRoot = join(siteDir, "manuals");
  if (!existsSync(siteManualsRoot)) return [];
  const slugs = readdirSync(siteManualsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return slugs.map((slug) => {
    const meta = readJson(join(manualsRoot, slug, "manual.meta.json"), { slug });
    return { slug, ...meta, title: meta.title ?? slug };
  });
}
