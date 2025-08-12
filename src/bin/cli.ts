#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import simpleUpdateNotifier from 'simple-update-notifier';

const require = createRequire(import.meta.url);
// package.json (nome/versão) para o notificador
const pkgJson = require('../../package.json') as { name: string; version: string };

const FILE = path.resolve(process.cwd(), 'playwright-seo.config.ts');

// ---- Update notifier (silencioso em CI / pode ser desativado por env)
(function notifyUpdate() {
  const pkg = { name: pkgJson.name, version: pkgJson.version };
  const disabledByEnv = process.env.PLAYWRIGHT_SEO_UPDATE_NOTIFIER === 'false';
  const isCI = process.env.CI === 'true';
  const isDevVersion = typeof pkg.version === 'string' && pkg.version.startsWith('0.0.0');
  if (!disabledByEnv && !isCI && !isDevVersion) {
    try { simpleUpdateNotifier({ pkg }); } catch { /* never block CLI */ }
  }
})();

// ---- Template do arquivo de config
const template = `// Config for playwright-seo — generated for you.
// true = on, false = off. Adjust thresholds as needed.
import { defineSeoConfig } from 'playwright-seo/config';

export default defineSeoConfig({
  // Rules (on/off)
  enforceHtmlLang: true,
  enforceViewport: true,
  enforceSingleH1: true,

  enforceTitle: true,
  title: { min: 10, max: 70 },

  enforceMetaDescription: true,
  metaDescription: { min: 50, max: 160 },

  enforceCanonical: true,
  enforceImgAlt: true,
  forbidNoindexOnProd: true,
  checkMainResponseStatus: true,

  // Behavior
  skipIfNoindex: true,
  maxNodesPerIssue: 5,
  excludeUrls: [], // e.g. ['/', '/admin/*', /\\/api\\//]
  waitFor: 'load', // 'load' | 'domcontentloaded' | 'networkidle'

  // Runner (how the audit is executed)
  runner: {
    // Avoid running the same URL more than once per worker
    dedupePerWorker: true
  }
});
`;

async function run() {
  if (fs.existsSync(FILE)) {
    console.log('✅ playwright-seo.config.ts already exists. Nothing to do.');
    process.exit(0);
  }
  fs.writeFileSync(FILE, template, 'utf8');
  console.log('✨ Created playwright-seo.config.ts');
}

run().catch((err) => {
  console.error('❌ Failed to create playwright-seo.config.ts');
  console.error(err);
  process.exit(1);
});
