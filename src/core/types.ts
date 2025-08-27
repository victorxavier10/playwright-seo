import type { Page } from '@playwright/test';

export type SeoIssue = {
  ruleId: string;
  message: string;
  nodesSelectors?: string[];
  nodesHtml?: string[];
};

export type SeoResult = {
  ok: boolean;
  issues: SeoIssue[];
  message: string;
  skipped?: 'noindex' | 'excluded';
};

export type SeoRuleConfig = {
  enforceHtmlLang?: boolean;
  enforceViewport?: boolean;
  enforceSingleH1?: boolean;
  enforceTitle?: { min: number; max: number };
  enforceMetaDescription?: { min: number; max: number };
  enforceCanonical?: boolean;
  enforceImgAlt?: boolean;
  forbidNoindexOnProd?: boolean;
  checkMainResponseStatus?: boolean;
  skipIfNoindex?: boolean;
  maxNodesPerIssue?: number;
  excludeUrls?: (string | RegExp)[];
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle';
};

export type RunOptions = {
  config?: SeoRuleConfig;
  headerCheck?: boolean; // check X-Robots-Tag
  formatter?: (url: string, issues: SeoIssue[]) => string;
  
  severity?: 'error' | 'warning';
};
