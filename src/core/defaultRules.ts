import type { SeoIssue, SeoRuleConfig } from './types';

export function evalDomRules(dom: any, cfg: Required<SeoRuleConfig>, url: string): SeoIssue[] {
  const issues: SeoIssue[] = [];

  if (cfg.enforceHtmlLang && !dom.htmlLang) {
    issues.push({ ruleId: 'html-lang', message: '<html> sem atributo lang.' });
  }
  if (cfg.enforceViewport && !dom.hasViewport) {
    issues.push({ ruleId: 'viewport', message: 'Meta viewport ausente.' });
  }
  if (cfg.enforceTitle) {
    const len = dom.title?.length ?? 0;
    if (!len) {
      issues.push({ ruleId: 'title-missing', message: '<title> ausente ou vazio.' });
    } else if (len < cfg.enforceTitle.min || len > cfg.enforceTitle.max) {
      issues.push({
        ruleId: 'title-length',
        message: `Tamanho do <title> ${len} fora do ideal (${cfg.enforceTitle.min}-${cfg.enforceTitle.max}).`
      });
    }
  }
  if (cfg.enforceMetaDescription) {
    const len = dom.metaDescription?.length ?? 0;
    if (!len) {
      issues.push({ ruleId: 'meta-description-missing', message: 'Meta description ausente ou vazia.' });
    } else if (len < cfg.enforceMetaDescription.min || len > cfg.enforceMetaDescription.max) {
      issues.push({
        ruleId: 'meta-description-length',
        message: `Tamanho da meta description ${len} fora do ideal (${cfg.enforceMetaDescription.min}-${cfg.enforceMetaDescription.max}).`
      });
    }
  }
  if (cfg.enforceCanonical) {
    const canonicals: string[] = dom.canonicals || [];
    if (canonicals.length === 0) {
      issues.push({ ruleId: 'canonical-missing', message: 'Link rel="canonical" ausente.' });
    } else if (canonicals.length > 1) {
      issues.push({ ruleId: 'canonical-duplicate', message: 'Mais de um canonical na página.' });
    } else {
      try {
        new URL(canonicals[0]);
      } catch {
        issues.push({ ruleId: 'canonical-invalid', message: 'Canonical não é URL absoluta.' });
      }
    }
  }
  if (cfg.enforceSingleH1 && dom.h1Count !== 1) {
    issues.push({ ruleId: 'h1-count', message: `Deve haver exatamente um <h1>. Encontrados: ${dom.h1Count}.` });
  }
  if (cfg.enforceImgAlt && dom.imgWithoutAlt?.total > 0) {
    issues.push({
      ruleId: 'img-alt',
      message: `Imagens sem alt útil: ${dom.imgWithoutAlt.total}`,
      nodesHtml: dom.imgWithoutAlt.html,
      nodesSelectors: dom.imgWithoutAlt.selectors
    });
  }
  if (cfg.forbidNoindexOnProd && process.env.APP_ENV === 'production' && dom.hasNoindex) {
    issues.push({ ruleId: 'noindex-prod', message: 'Meta robots noindex encontrado em produção.' });
  }

  return issues;
}
