// src/playwright/fixture.ts
import type { Page, TestInfo } from '@playwright/test';
import type { RunOptions } from '../core/types';
import { runSeoChecks } from '../core/runSeoChecks';

export function seoAuto(params?: {
    /** Default options passed to runSeoChecks */
    defaults?: RunOptions;
    /** Avoid auditing the same normalized URL more than once per worker (default: true) */
    dedupePerWorker?: boolean;
    /** Severity: 'error' (failure) | 'warning' (log, do not fail). Default: 'error' */
    severity?: 'error' | 'warning';
}) {
    const dedupe = params?.dedupePerWorker ?? true;
    const severity = params?.severity ?? 'error';

    const audited = new Set<string>();
    const normalize = (u: string) => {
        try {
            const x = new URL(u);
            return `${x.origin}${x.pathname.replace(/\/$/, '')}`;
        } catch {
            return u;
        }
    };

    return {
        // option fixtures (configurable via playwright.config.ts / test.use)
        seoAudit: [true, { option: true }] as const,
        seoOptions: [{ ...(params?.defaults ?? {}), severity }, { option: true }] as const,

        // auto-fixture: always runs after each test
        page: [
            async (
                {
                    page,
                    seoAudit,
                    seoOptions,
                }: { page: Page; seoAudit: boolean; seoOptions: RunOptions },
                use: (p: Page) => Promise<void>,
                testInfo: TestInfo
            ) => {
                // Run the “normal” test first
                await use(page);

                if (!seoAudit) return;
                if (testInfo.status === 'skipped') return;

                const url = page.url();
                if (!url || url.startsWith('about:')) return;

                if (dedupe) {
                    const key = normalize(url);
                    if (audited.has(key)) return;
                    audited.add(key);
                }

                const res = await runSeoChecks(page, seoOptions);

                // effective severity: can come from the global config (params.severity) or be overridden via test.use({ seoOptions: { severity: 'warning' } })
                const effectiveSeverity = seoOptions?.severity ?? severity;

                if (effectiveSeverity === 'warning') {
                    if (!res.ok) {
                        console.warn(res.message);
                        testInfo.annotations.push({ type: 'seo-warning', description: res.message });
                    }
                    return;
                }

                // default: 'error' → test fails
                if (!res.ok) throw new Error(res.message);
            },
            { auto: true },
        ] as const,
    };
}

export type SeoAutoFixtures = {
    seoAudit: boolean;
    seoOptions: RunOptions;
};
