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
    const defaultSeverity = params?.severity ?? 'error';

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
        // option fixtures (config playwright.config.ts / test.use)
        seoAudit: [true, { option: true }] as [boolean, { option: true }],
        seoOptions: [
            { ...(params?.defaults ?? {}), severity: defaultSeverity },
            { option: true }
        ] as [RunOptions, { option: true }],

        // auto-fixture
        _seoAuto: [
            async (
                {
                    page,
                    seoAudit,
                    seoOptions,
                }: { page: Page; seoAudit: boolean; seoOptions: RunOptions },
                use: (p?: unknown) => Promise<void>,
                testInfo: TestInfo
            ) => {
                // test again
                await use();

                // rules
                if (!seoAudit) return;
                if (testInfo.status === 'skipped') return;
                if (!page || typeof page.url !== 'function') return;

                const url = page.url();
                if (!url || url.startsWith('about:')) return;

                if (dedupe) {
                    const key = normalize(url);
                    if (audited.has(key)) return;
                    audited.add(key);
                }

                const res = await runSeoChecks(page, seoOptions);

                // severity
                const severity = seoOptions?.severity ?? defaultSeverity;

                if (severity === 'warning') {
                    if (!res.ok) {
                        console.warn(res.message);
                        testInfo.annotations.push({
                            type: 'flaky',
                            description: res.message,
                        });
                        await testInfo.attach('seo-warnings', {
                            body: res.message,
                            contentType: 'text/markdown'
                        });
                        await testInfo.attach('seo-issues.json', {
                            body: Buffer.from(JSON.stringify(res.issues, null, 2)),
                            contentType: 'application/json'
                        });
                    }
                    return;
                }

                if (!res.ok) throw new Error(res.message);
            },
            { auto: true }
        ] as [
                (
                    args: { page: Page; seoAudit: boolean; seoOptions: RunOptions },
                    use: (p?: unknown) => Promise<void>,
                    testInfo: TestInfo
                ) => Promise<void>,
                { auto: true }
            ],
    };
}

export type SeoAutoFixtures = {
    seoAudit: boolean;
    seoOptions: RunOptions;
};
