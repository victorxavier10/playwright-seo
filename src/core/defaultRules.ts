import type { SeoIssue, SeoRuleConfig } from './types';

export function evalDomRules(dom: any, cfg: Required<SeoRuleConfig>, url: string): SeoIssue[] {
  const issues: SeoIssue[] = [];

  if (cfg.enforceHtmlLang && !dom.htmlLang) {
    issues.push({
      ruleId: 'html-lang',
      message: '<html> without lang attribute.',
      nodesSelectors: dom.htmlNode ? [dom.htmlNode.selector] : undefined,
      nodesHtml: dom.htmlNode ? [dom.htmlNode.html] : undefined,
    });
  }

  if (cfg.enforceViewport && !dom.hasViewport) {
    issues.push({ ruleId: 'viewport', message: 'Meta viewport ausente.' });
  }

  if (cfg.enforceTitle) {
    const len = dom.title?.length ?? 0;
    if (!len) {
      issues.push({
        ruleId: 'title-missing',
        message: '<title> absent or empty.',
        nodesSelectors: dom.titleNodes?.selectors,
        nodesHtml: dom.titleNodes?.html,
      });
    } else if (len < cfg.enforceTitle.min || len > cfg.enforceTitle.max) {
      issues.push({
        ruleId: 'title-length',
        message: `<title> size ${len} out of ideal (${cfg.enforceTitle.min}-${cfg.enforceTitle.max}).`,
        nodesSelectors: dom.titleNodes?.selectors,
        nodesHtml: dom.titleNodes?.html,
      });
    }
  }

  if (cfg.enforceMetaDescription) {
    const len = dom.metaDescription?.length ?? 0;
    if (!len) {
      issues.push({
        ruleId: 'meta-description-missing',
        message: 'Missing or empty meta description.',
        nodesSelectors: dom.metaDescriptionNodes?.selectors,
        nodesHtml: dom.metaDescriptionNodes?.html,
      });
    } else if (len < cfg.enforceMetaDescription.min || len > cfg.enforceMetaDescription.max) {
      issues.push({
        ruleId: 'meta-description-length',
        message: `Meta description size ${len} out of ideal (${cfg.enforceMetaDescription.min}-${cfg.enforceMetaDescription.max}).`,
        nodesSelectors: dom.metaDescriptionNodes?.selectors,
        nodesHtml: dom.metaDescriptionNodes?.html,
      });
    }
  }

  if (cfg.enforceCanonical) {
    const canonicals: string[] = dom.canonicals || [];
    if (canonicals.length === 0) {
      issues.push({ ruleId: 'canonical-missing', message: 'Link rel="canonical" ausente.' });
    } else if (canonicals.length > 1) {
      issues.push({
        ruleId: 'canonical-duplicate',
        message: 'More than one canonical on the page.',
        nodesSelectors: dom.canonicalNodes?.selectors,
        nodesHtml: dom.canonicalNodes?.html,
      });
    } else {
      try {
        new URL(canonicals[0]);
      } catch {
        issues.push({
          ruleId: 'canonical-invalid',
          message: 'Canonical is not absolute URL.',
          nodesSelectors: dom.canonicalNodes?.selectors,
          nodesHtml: dom.canonicalNodes?.html,
        });
      }
    }
  }

  if (cfg.enforceSingleH1 && dom.h1Count !== 1) {
    issues.push({
      ruleId: 'h1-count',
      message: `There must be exactly one <h1>. Found: ${dom.h1Count}.`,
      nodesSelectors: dom.h1Nodes?.selectors,
      nodesHtml: dom.h1Nodes?.html,
    });
  }

  if (cfg.enforceImgAlt && dom.imgWithoutAlt?.total > 0) {
    issues.push({
      ruleId: 'img-alt',
      message: `Images without useful alt: ${dom.imgWithoutAlt.total}`,
      nodesHtml: dom.imgWithoutAlt.html,
      nodesSelectors: dom.imgWithoutAlt.selectors
    });
  }

  if (cfg.forbidNoindexOnProd && process.env.APP_ENV === 'production' && dom.hasNoindex) {
    issues.push({
      ruleId: 'noindex-prod',
      message: 'Meta robots noindex found in production.',
      nodesSelectors: dom.noindexMeta?.selectors,
      nodesHtml: dom.noindexMeta?.html,
    });
  }

  return issues;
}