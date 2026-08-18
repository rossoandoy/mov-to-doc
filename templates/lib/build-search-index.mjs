/**
 * Build unified search index for feature manuals + glossary terms.
 */
import { join } from "path";
import { extractMdText } from "./extract-md-text.mjs";
import { normalizeForSearch, loadNormalizationRules } from "./normalize-query.mjs";
import { loadFeatureCatalog, moduleLabel } from "./catalog-utils.mjs";

/**
 * @param {{ repoRoot: string, manuals: object[], terms: object[] }} opts
 */
export function buildSearchIndex({ repoRoot, manuals = [], terms = [] }) {
  const catalog = loadFeatureCatalog(repoRoot);
  const rules = loadNormalizationRules(repoRoot);

  const manualItems = manuals.map((m) => {
    const mdPath = join(repoRoot, "manuals", m.slug, "operation_manual.md");
    const { text: bodyText, excerpt } = extractMdText(mdPath);
    const modLabel = moduleLabel(catalog, m.moduleId);
    const rawKeywords = [
      m.title,
      m.slug,
      m.menuPath,
      m.featureId,
      modLabel,
      bodyText,
    ]
      .filter(Boolean)
      .join(" ");
    return {
      type: "manual",
      title: m.title ?? m.slug,
      href: `/manuals/${m.slug}/`,
      keywords: normalizeForSearch(rawKeywords, rules),
      excerpt: excerpt || undefined,
    };
  });

  const termItems = terms.map((t) => {
    const mod = moduleLabel(catalog, t.moduleId);
    const rawKeywords = [
      t.id,
      t.canonical,
      t.definition,
      t.objectApiName,
      t.moduleId,
      mod,
      ...(t.variants ?? []),
    ]
      .filter(Boolean)
      .join(" ");
    return {
      type: "term",
      title: t.canonical,
      href: `/glossary/terms/${t.id}/`,
      keywords: normalizeForSearch(rawKeywords, rules),
    };
  });

  return [...manualItems, ...termItems];
}
