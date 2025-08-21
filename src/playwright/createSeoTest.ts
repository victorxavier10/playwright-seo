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
export function createSeoTest(opts?: {
  defaults?: RunOptions;
  dedupePerWorker?: boolean;
  /** 'error' fails the test, 'warning' logs only */
  severity?: 'error' | 'warning';
}) {
  const audited = new Set<string>();
  const normalize = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.origin}${x.pathname.replace(/\/$/, '')}`;
    } catch {
      return u;
    }
  };

  // defaults: reduce noise & fail tests by default
  const dedupe = opts?.dedupePerWorker ?? true;
  const severity: 'error' | 'warning' = opts?.severity ?? 'error';

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

      if (severity === 'error') {
        // hard fail
        expect(res.ok, res.message).toBeTruthy();
      } else {
        // warning-only
        if (!res.ok) {
          // Log in console output
          // eslint-disable-next-line no-console
          console.warn(res.message);
          // Optional: annotate test (appears in HTML report)
          try {
            (testInfo as any).annotations?.push?.({
              type: 'seo-warning',
              description: res.message,
            });
          } catch {
            /* ignore */
          }
        }
      }
    },
  });

  return { test, expect };
}
