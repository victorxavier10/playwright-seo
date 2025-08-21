import type { SeoRuleConfig } from './core/types';

/** User-facing config (playwright-seo.config.ts) */
export type PlaywrightSeoUserConfig = {
  // SEO rules (on/off)
  enforceHtmlLang: boolean;
  enforceViewport: boolean;
  enforceSingleH1: boolean;

  enforceTitle: boolean;
  title?: { min: number; max: number };

  enforceMetaDescription: boolean;
  metaDescription?: { min: number; max: number };

  enforceCanonical: boolean;
  enforceImgAlt: boolean;
  forbidNoindexOnProd: boolean;
  checkMainResponseStatus: boolean;

  // behavior
  skipIfNoindex: boolean;
  maxNodesPerIssue: number;
  excludeUrls: (string | RegExp)[];
  waitFor: 'load' | 'domcontentloaded' | 'networkidle';

  // runner behavior (how the audit executes)
  runner?: {
    /** Avoid auditing the same normalized URL more than once per worker */
    dedupePerWorker?: boolean;
    /** Severity of SEO audit outcome: 'error' fails the test, 'warning' logs only */
    severity?: 'error' | 'warning';
  };
};

/** Helper for IntelliSense/validation in user config */
export function defineSeoConfig(cfg: PlaywrightSeoUserConfig): PlaywrightSeoUserConfig {
  return cfg;
}

/** Convert user config -> internal rule config */
export function toRuleConfig(user: PlaywrightSeoUserConfig): SeoRuleConfig {
  return {
    enforceHtmlLang: user.enforceHtmlLang,
    enforceViewport: user.enforceViewport,
    enforceSingleH1: user.enforceSingleH1,

    enforceTitle: user.enforceTitle
      ? { min: user.title?.min ?? 10, max: user.title?.max ?? 70 }
      : undefined,

    enforceMetaDescription: user.enforceMetaDescription
      ? { min: user.metaDescription?.min ?? 50, max: user.metaDescription?.max ?? 160 }
      : undefined,

    enforceCanonical: user.enforceCanonical,
    enforceImgAlt: user.enforceImgAlt,
    forbidNoindexOnProd: user.forbidNoindexOnProd,
    checkMainResponseStatus: user.checkMainResponseStatus,

    skipIfNoindex: user.skipIfNoindex,
    maxNodesPerIssue: user.maxNodesPerIssue,
    excludeUrls: user.excludeUrls,
    waitFor: user.waitFor
  };
}

/** Extract runner options from user config (with sensible defaults) */
export function toRunnerOptions(user: PlaywrightSeoUserConfig) {
  return {
    dedupePerWorker: user.runner?.dedupePerWorker ?? true,
    severity: user.runner?.severity ?? 'error' as 'error' | 'warning',
  };
}
