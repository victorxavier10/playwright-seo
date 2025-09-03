import type { Page } from '@playwright/test';
import { collectDom, defaultConfig, formatIssues, isExcludedUrl } from './utils';
import type { RunOptions, SeoIssue, SeoResult } from './types';
import { evalDomRules } from './defaultRules';

export async function runSeoChecks(page: Page, options: RunOptions = {}): Promise<SeoResult> {
  const cfg = { ...defaultConfig, ...(options.config ?? {}) };
  const url = page.url();

  // Exclude URLs early
  if (cfg.excludeUrls.length && isExcludedUrl(url, cfg.excludeUrls)) {
    return { ok: true, issues: [], skipped: 'excluded', message: `SEO audit skipped (excluded) at: ${url}` };
  }

  await page.waitForLoadState(cfg.waitFor);

  // Main status (fail-fast issues issue here)
  const earlyIssues: SeoIssue[] = [];
  if (cfg.checkMainResponseStatus) {
    try {
      const resp = await page.request.get(url, { timeout: 15000 });
      if (!resp.ok()) {
        earlyIssues.push({
          ruleId: 'main-status',
          message: `Status no OK: ${resp.status()} ${resp.statusText()}`
        });
      }
    } catch (e: any) {
      earlyIssues.push({
        ruleId: 'main-status',
        message: `Status Check Failed: ${e?.message ?? e}`
      });
    }
  }

  // Single collection of DOM + noindex
  const { dom, metaNoindex, headerNoindex } = await collectDom(page, cfg, options.headerCheck !== false);

  if (cfg.skipIfNoindex && (metaNoindex || headerNoindex)) {
    return { ok: true, issues: [], skipped: 'noindex', message: `SEO audit skipped (noindex) at: ${url}` };
  }

  const domIssues = evalDomRules(dom, cfg, url);
  const allIssues = [...earlyIssues, ...domIssues];

  const ok = allIssues.length === 0;
  const message = ok ? `SEO OK at: ${url}` : (options.formatter ?? formatIssues)(url, allIssues);
  return { ok, issues: allIssues, message };
}
