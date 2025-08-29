// src/register.d.ts
import type { RunOptions } from './core/types';

declare module '@playwright/test' {
    interface TestOptions {
        seoAudit: boolean;
        seoOptions: RunOptions;
    }
}