# playwright-seo

[![npm version](https://img.shields.io/npm/v/playwright-seo.svg?color=blue)](https://www.npmjs.com/package/playwright-seo)
[![npm downloads](https://img.shields.io/npm/dm/playwright-seo.svg)](https://www.npmjs.com/package/playwright-seo)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

> SEO checks for Playwright — **simple**, **configurable**, and **framework-agnostic**.  
> Run lightweight SEO audits automatically after each test or on-demand, with clean Playwright-style output.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1) Generate config](#1-generate-config)
  - [2) Config SEO tests per project/environment (via options fixtures) -> Recommended](#2-config-seo-tests-per-projectenvironment-via-options-fixtures---recommended)
  - [3) Automatic SEO tests](#3-automatic-seo-tests)
  - [*) Other ways -> Alternatives](#other-ways---alternatives)
- [Targeted Usage](#targeted-usage)
  - [Per project (e.g., staging)](#per-project-eg-staging)
  - [Per spec / describe](#per-spec--describe)
  - [Direct call in a focused test](#direct-call-in-a-focused-test)
- [Configuration Reference](#configuration-reference)
  - [Rules (on/off)](#rules-onoff)
  - [Runner (execution behavior)](#runner-execution-behavior)
- [API Reference](#api-reference)
  - [`defineSeoConfig`](#defineseoconfig)
  - [`toRuleConfig`](#toruleconfig)
  - [`toRunnerOptions`](#torunneroptions)
  - [`createSeoTest`](#createseotest)
  - [`runSeoChecks`](#runseochecks)
- [Output & Logging](#output--logging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- ✅ **Drop-in wrapper** to run audits automatically after each test
- ✅ **On-demand API** (`runSeoChecks`) for focused checks
- ✅ **Config file** with **on/off** switches for every rule
- ✅ **Skip `noindex`** (meta or `X-Robots-Tag`)
- ✅ **Exclude URLs** via glob or RegExp
- ✅ **Pretty, actionable output**: URL + rule + HTML snippets
- ✅ **Per-worker dedupe** to reduce noise on large suites
- ✅ **Severity**: choose **`error`** (fail tests) or **`warning`** (log only, don’t fail)
- ✅ **Peer dep** on `@playwright/test` — no vendor lock-in

---

## Prerequisites

- **Node.js** ≥ 16  
- **Playwright Test** ≥ 1.41  
- Tests in **TypeScript or JavaScript**  
- Ability to install dev dependencies

> **Tip:** If you use TypeScript, ensure the tsconfig used by your tests is the one Playwright loads at runtime.

---

## Installation

### npm
```bash
npm i -D playwright-seo
# (optional) if your editor complains about Node APIs used by the CLI:
npm i -D @types/node
```

### Yarn
```bash
yarn add -D playwright-seo
# (optional)
yarn add -D @types/node
```

> The CLI prints a friendly update notice using `simple-update-notifier`. Disable via `PLAYWRIGHT_SEO_UPDATE_NOTIFIER=false` (CI is silent by default).

---

## Quick Start

### 1) Generate config

Create `playwright-seo.config.ts` at your project root.

**npm**
```bash
npx playwright-seo-config
# or
npm run playwright-seo-config
```

**Yarn**
```bash
yarn playwright-seo-config
# or
yarn run playwright-seo-config
```

This creates **`playwright-seo.config.ts`** (safe to edit):

```ts
// playwright-seo.config.ts
import { defineSeoConfig } from 'playwright-seo';

export default defineSeoConfig({
  // Rules (on/off)
  enforceHtmlLang: true,
  enforceViewport: true,
  enforceSingleH1: true,

  enforceTitle: true,
  title: { min: 10, max: 70 }, // Size

  enforceMetaDescription: true,
  metaDescription: { min: 50, max: 160 }, // Size

  enforceCanonical: true,
  enforceImgAlt: true,
  forbidNoindexOnProd: true,
  checkMainResponseStatus: true,

  // Behavior
  skipIfNoindex: true,
  maxNodesPerIssue: 5,
  excludeUrls: [], // e.g. ['/', '/admin/*', /\/api\//]
  waitFor: 'load', // 'load' | 'domcontentloaded' | 'networkidle'

  // Runner (how the audit is executed)
  runner: {
    // Avoid running the same URL more than once per worker
    dedupePerWorker: true,
    // Severity:
    //  - 'error'   => fail test on violations (default)
    //  - 'warning' => log only, don't fail
    severity: 'error'
  }
});
```

### 2) Config SEO tests per project/environment (via options fixtures) -> Recommended

You can pass `seoAudit`/`seoOptions` through `playwright.config.ts` using option fixtures:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import type { SeoAutoFixtures } from 'playwright-seo/fixture';
import seoUser from './playwright-seo.config';
import { toRuleConfig } from 'playwright-seo';

export default defineConfig<SeoAutoFixtures>({
  projects: [
    {
      name: 'e2e-seo',
      use: {
        /**
         * Toggle SEO audit by environment // optional
         * seoAudit: process.env.APP_ENV !== 'development',
        **/
        seoAudit: true,
        // Apply your generated config:
        seoOptions: {
          config: toRuleConfig(seoUser), 
          severity: 'warning' // optional
        }, 
      } as any
    }
  ]
});
```
This way you can turn things on/off and parameterize them per project without touching the specs, following Playwright's official fixture best practices.

*Other *configuration* methods available

### 3) Automatic SEO tests

```ts
// example.spec.ts
import { test, expect } from '@playwright/test';

test('SEO Tests in playwright-seo - npm', async ({ page }) => {
  await page.goto('https://www.npmjs.com/package/playwright-seo');
  await expect(page).toHaveTitle(/playwright-seo - npm/);
  // ✅ SEO audit runs automatically after the test
});
```

*Other ways of *use* available

### *) Other ways -> Alternatives

**Alternative 1 - Auto-fixture**

Create `tests/support/seo.auto.ts` file:

```ts
// tests/support/seo.auto.ts
import { test as base, expect } from '@playwright/test';
import seoUser from '../../playwright-seo.config';
import { toRuleConfig, toRunnerOptions } from 'playwright-seo';
import { seoAuto } from 'playwright-seo/fixture';

// Integra o audit como auto-fixture (sem chamar por spec)
export const test = base.extend(
  seoAuto({
    defaults: { config: toRuleConfig(seoUser) },
    dedupePerWorker: toRunnerOptions(seoUser).dedupePerWorker,
    severity: toRunnerOptions(seoUser).severity, // 'error' | 'warning'
  })
);
export { expect } from '@playwright/test';

```

Use `test` in your specs

```ts
// before: import { test, expect } from '@playwright/test'
import { test, expect } from '../support/seo.auto';

test('SEO Tests in playwright-seo - npm', async ({ page }) => {
  await page.goto('https://www.npmjs.com/package/playwright-seo');
  await expect(page).toHaveTitle(/playwright-seo - npm/);
  // ✅ SEO audit runs automatically after the test
});

```

**Alternative 2 - Wrapper**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import seoUser from './playwright-seo.config';
import { toRuleConfig } from 'playwright-seo';

export default defineConfig({
  projects: [
    {
      name: 'e2e',
      use: {
        ...devices['Desktop Chrome'],

        // Toggle SEO audit by environment:
        seoAudit: process.env.APP_ENV !== 'development',

        // Apply your generated config:
        seoOptions: { config: toRuleConfig(seoUser) }
      } as any
    }
  ]
});
```

> `toRuleConfig` converts your user config into the internal format used by the engine.  
> Prefer importing from the **root** (`playwright-seo`). The legacy subpath (`playwright-seo/config`) also works.

*Enable audit globally (one-liner)*

Create a wrapper once and use it in all specs:

```ts
// tests/support/withSeo.ts
import { createSeoTest } from 'playwright-seo';
import seoUser from '../../playwright-seo.config';
import { toRuleConfig, toRunnerOptions } from 'playwright-seo';

export const { test, expect } = createSeoTest({
  // Feed the rules/thresholds
  defaults: { config: toRuleConfig(seoUser) },

  // Runner behavior
  dedupePerWorker: toRunnerOptions(seoUser).dedupePerWorker,
  severity: toRunnerOptions(seoUser).severity, // 'error' | 'warning'
});
```

Use the wrapper in your tests (swap one import):

```ts
// before: import { test, expect } from '@playwright/test'
import { test, expect } from '../support/withSeo';

test('SEO Tests in playwright-seo - npm', async ({ page }) => {
  await page.goto('https://www.npmjs.com/package/playwright-seo');
  await expect(page).toHaveTitle(/playwright-seo - npm/);
  // ✅ SEO audit runs automatically after the test
});
```

---

**Optional alias via `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@tests": ["tests/support/withSeo"] }
  }
}
```
Then in specs:
```ts
import { test, expect } from '@tests';
```

---

## Targeted Usage

### Per project (e.g., staging)

```ts
// playwright.config.ts
projects: [
  {
    name: 'staging',
    use: {
      seoAudit: true,
      seoOptions: {
        config: {
          ...toRuleConfig(seoUser),
          excludeUrls: ['/preview/*', /\/internal\//]
        }
      }
    } as any
  },
  { name: 'local', use: { seoAudit: false } as any } // turn off locally
]
```

### Per spec / describe

```ts
import { test } from '../support/withSeo';

// disable for this entire file
test.use({ seoAudit: false });

test.describe('Smoke without SEO', () => {
  test('loads', async ({ page }) => { /* ... */ });
});
```

### Direct call in a focused test

```ts
import { test, expect } from '@playwright/test';
import { runSeoChecks } from 'playwright-seo';
import seoUser from '../../playwright-seo.config';
import { toRuleConfig } from 'playwright-seo';

test('SEO Tests in playwright-seo - npm', async ({ page }) => {
  await page.goto('https://www.npmjs.com/package/playwright-seo');
  await expect(page).toHaveTitle(/playwright-seo - npm/);
  const res = await runSeoChecks(page, { config: toRuleConfig(seoUser) });
  expect(res.ok, res.message).toBeTruthy();
});
```

---

## Configuration Reference

### Rules (on/off)

Key options you can toggle:

- `enforceHtmlLang`: require `<html lang="...">`  
- `enforceViewport`: require `<meta name="viewport">`  
- `enforceSingleH1`: require exactly one `<h1>`  
- `enforceTitle` + `title.min/max`: check `<title>` length  
- `enforceMetaDescription` + `metaDescription.min/max`: check meta description length  
- `enforceCanonical`: require exactly one absolute `rel="canonical"`  
- `enforceImgAlt`: require useful `alt` (allows `alt=""` only when **not** inside `<a>`)  
- `forbidNoindexOnProd`: forbid `noindex` when `APP_ENV === 'production'`  
- `checkMainResponseStatus`: unexpected status codes on the main response  
- `skipIfNoindex`: skip audit if `meta noindex` or `X-Robots-Tag: noindex` is present  
- `excludeUrls`: patterns to ignore (glob or RegExp)  
- `waitFor`: `'load' | 'domcontentloaded' | 'networkidle'`  
- `maxNodesPerIssue`: how many sample nodes to show per rule

### Runner (execution behavior)

- `runner.dedupePerWorker` (default **true**): Audit each **normalized URL once per worker** to avoid duplicated logs.  
- `runner.severity` (`'error'` | `'warning'`, default **`'error'`**):
  - **`error`** → violations **fail the test** (current default behavior)
  - **`warning`** → violations are **logged** and **annotated**, but **don’t fail**

Use them in your wrapper via:
```ts
import { toRunnerOptions } from 'playwright-seo';
createSeoTest({
  dedupePerWorker: toRunnerOptions(seoUser).dedupePerWorker,
  severity: toRunnerOptions(seoUser).severity,
});
```

---

## API Reference

### `defineSeoConfig`
Helper for config IntelliSense and validation in `playwright-seo.config.ts`.

### `toRuleConfig`
Converts user config → internal rule config consumed by `runSeoChecks`.

### `toRunnerOptions`
Extracts runner options (e.g., `dedupePerWorker`, `severity`) from the user config.

### `createSeoTest`
Creates a Playwright `test` wrapper that runs the SEO audit after each test.
```ts
createSeoTest(opts?: {
  defaults?: RunOptions;
  dedupePerWorker?: boolean;
  severity?: 'error' | 'warning';
})
```

### `runSeoChecks`
Runs the audit once on the current `page` and returns a report.
```ts
const result = await runSeoChecks(page, { config, formatter? });
```

---

## Output & Logging

Failure output follows Playwright’s style and includes the audited **URL**, the **failing rule**, and **pretty-printed HTML** snippets for problematic elements, e.g.:

```
SEO violations at: https://www.npmjs.com/package/playwright-seo
────────────────────────────────────────
[img-alt] Images without useful alt: 2
  • Element 1:
```html
<img src="/x.webp" alt="">
```
```

**Severity behavior**:
- **`error`**: prints the violations and **fails** the test (`expect(...).toBeTruthy()`).
- **`warning`**: prints the violations via `console.warn` and adds a `seo-warning` **annotation** to the test (visible in the HTML report), but **does not fail**.

---

## Best Practices

- Keep `skipIfNoindex: true` to avoid false alarms on intentionally hidden pages.  
- Use `excludeUrls` for admin, health, preview, and internal routes.  
- Leave `runner.dedupePerWorker: true` to reduce log noise.  
- Run the audit on **stable environments** (staging/prod) for reliable results.  
- Treat failures as **actionable tasks**: missing `alt`, duplicate canonicals, etc.

---

## Troubleshooting

**“Cannot find name 'document' / 'HTMLElement'”**  
Add DOM libs to the tsconfig compiling the package/project that uses the lib:
```json
{ "compilerOptions": { "lib": ["ES2021", "DOM", "DOM.Iterable"] } }
```

**“Cannot find module 'node:fs'” in the CLI**  
Install Node types and ensure they’re enabled:
```json
{ "compilerOptions": { "types": ["node"] } }
```

**Module resolution (TS)**  
You can import from the **root** (`playwright-seo`) in any project.  
The legacy subpath import (`playwright-seo/config`) is also supported (via `exports` + `typesVersions`) for projects using `moduleResolution: node`.

**Update notifier in the CLI**  
Silence with:
```bash
PLAYWRIGHT_SEO_UPDATE_NOTIFIER=false
```
CI is silent by default (`CI=true`).

---

## FAQ

**Do I have to change all my imports?**  
Just once. Point tests to the wrapper (`../support/withSeo` or `@tests`).  
Prefer a one-off code mod if you have many files.  
Alternatively, call `runSeoChecks` only where you want it.

**Does it work with plain JS projects?**  
Yes. The wrapper and CLI work in JS. If you use TS, you’ll get IntelliSense in `playwright-seo.config.ts`.

**Monorepo?**  
Add a `playwright-seo.config.ts` per package that has tests, and import it from that package’s `playwright.config.ts`.

**Where do I configure “dedupe per worker” and severity?**  
In your config under `runner`, and pass it to the wrapper via `toRunnerOptions`:
```ts
import { toRunnerOptions } from 'playwright-seo';
createSeoTest({
  dedupePerWorker: toRunnerOptions(seoUser).dedupePerWorker,
  severity: toRunnerOptions(seoUser).severity
});
```

---

## Contributing

PRs are welcome! Please:
- Run `npm run typecheck` and `npm run build`.
- Add tests or examples for new rules/behaviors (e.g., severity).
- Keep the README and config template in sync.

---

## License

MIT © Contributors

---

Happy testing!
