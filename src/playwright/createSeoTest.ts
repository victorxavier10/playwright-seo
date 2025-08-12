import { test as base, expect } from '@playwright/test';
import { runSeoChecks } from '../core/runSeoChecks';
import type { RunOptions } from '../core/types';

type SeoFixtures = {
  /** Enable/disable SEO audit per test/project */
  seoAudit: boolean;
  /** SEO audit options (rules & formatter) */
  seoOptions: RunOptions;
};

/** Creates a Playwright test wrapper that runs the SEO audit after each test. */
export function createSeoTest(opts?: { defaults?: RunOptions; dedupePerWorker?: boolean }) {
  const audited = new Set<string>();
  const normalize = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.origin}${x.pathname.replace(/\/$/, '')}`;
    } catch {
      return u;
    }
  };

  // default to true if not provided (reduces noise by design)
  const dedupe = opts?.dedupePerWorker ?? true;

  const test = base.extend<SeoFixtures>({
    seoAudit: [true, { option: true }],
    seoOptions: [opts?.defaults ?? {}, { option: true }],

    page: async ({ page, seoAudit, seoOptions }, use, testInfo) => {
      await use(page);

      if (!seoAudit) return;
      if (testInfo.status === 'skipped') return;

      const current = page.url();
      if (!current || current === 'about:blank') return;

      if (dedupe) {
        const key = normalize(current);
        if (audited.has(key)) return;
        audited.add(key);
      }

      const res = await runSeoChecks(page, seoOptions);
      expect.soft(res.ok, res.message).toBeTruthy();
    }
  });

  return { test, expect };
}
