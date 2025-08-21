// src/index.ts
// API
export { runSeoChecks } from './core/runSeoChecks';
export { createSeoTest } from './playwright/createSeoTest';

// Public types
export type {
    SeoIssue,
    SeoResult,
    SeoRuleConfig,
    RunOptions,
} from './core/types';

// Configuration helpers re-exported in root
export {
    defineSeoConfig,
    toRuleConfig,
    toRunnerOptions,
} from './config';
export type { PlaywrightSeoUserConfig } from './config';
