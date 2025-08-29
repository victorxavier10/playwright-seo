import type { Page } from '@playwright/test';
import type { SeoIssue, SeoRuleConfig } from './types';

export const defaultConfig: Required<SeoRuleConfig> = {
  enforceHtmlLang: true,
  enforceViewport: true,
  enforceSingleH1: true,
  enforceTitle: { min: 10, max: 70 },
  enforceMetaDescription: { min: 50, max: 160 },
  enforceCanonical: true,
  enforceImgAlt: true,
  forbidNoindexOnProd: true,
  checkMainResponseStatus: true,
  skipIfNoindex: true,
  maxNodesPerIssue: 5,
  excludeUrls: [],
  waitFor: 'load'
};

export function normalizeForMatch(raw: string): { full: string; path: string } {
  try {
    const u = new URL(raw);
    let p = u.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return { full: `${u.origin}${p}`, path: p || '/' };
  } catch {
    return { full: raw, path: raw };
  }
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function globToRegex(glob: string) {
  const rx = '^' + glob.split('*').map(escapeRegex).join('.*') + '$';
  return new RegExp(rx);
}
export function isExcludedUrl(url: string, patterns: (string | RegExp)[]): boolean {
  const { full, path } = normalizeForMatch(url);
  return patterns.some((p) => {
    if (p instanceof RegExp) return p.test(full) || p.test(path);
    const target = p.startsWith('/') ? path : full;
    return globToRegex(p).test(target);
  });
}

export function prettyHtml(html: string): string {
  return html.replace(/></g, '>\n<').trim();
}

export function formatIssues(url: string, issues: SeoIssue[]): string {
  const lines: string[] = [];
  lines.push(`SEO violations at: ${url}`);
  lines.push('────────────────────────────────────────');
  for (const issue of issues) {
    lines.push(`[${issue.ruleId}] ${issue.message}`);

    const sels = issue.nodesSelectors ?? [];
    const nodes = issue.nodesHtml ?? [];

    nodes.forEach((h, idx) => {
      const sel = sels[idx];
      lines.push(`  • Element ${idx + 1}:`);
      if (sel) lines.push(`    selector: ${sel}`);
      lines.push('```html');
      lines.push(prettyHtml(h));
      lines.push('```');
    });

    const hiddenCount = Math.max(0, sels.length - nodes.length);
    if (hiddenCount > 0) lines.push(`  … +${hiddenCount} elementos omitidos`);

    lines.push(''); // separate issues
  }
  return lines.join('\n');
}

/** DOM e flags in unique evaluate (+ header X-Robots-Tag optional) */
export async function collectDom(
  page: Page,
  cfg: Required<SeoRuleConfig>,
  headerCheck = true
) {
  const url = page.url();

  const { metaNoindex, dom } = await page.evaluate((maxNodes) => {
    const q = (sel: string) => Array.from(document.querySelectorAll(sel));

    // local helpers
    const selectorFor = (el: Element) => {
      const base = el.tagName.toLowerCase();
      const id = (el as HTMLElement).id;
      const cls = (el as HTMLElement).className?.toString().trim();
      return base
        + (id ? `#${id}` : '')
        + (cls ? '.' + cls.split(/\s+/).filter(Boolean).join('.') : '');
    };
    const htmlOf = (el: Element) => {
      try {
        let h = (el as HTMLElement).outerHTML || `<${el.tagName.toLowerCase()}>`;
        if (h.length > 800) h = h.slice(0, 800) + '…';
        return h;
      } catch {
        return `<${el.tagName.toLowerCase()}>`;
      }
    };
    const take = <T,>(arr: T[]) => arr.slice(0, maxNodes);

    // IMG alt
    const imgs = q('img') as HTMLImageElement[];
    const imgWithoutAltNodes = imgs.filter((img) => {
      const alt = img.getAttribute('alt');
      const ariaHidden = img.getAttribute('aria-hidden') === 'true';
      const role = img.getAttribute('role');
      const isInLink = !!img.closest('a'); // alt="" em link NÃO é decorativo
      const isDecorative =
        (alt === '' && !isInLink) || ariaHidden || role === 'presentation' || role === 'none';
      const hasUsefulAlt = alt !== null && alt.trim() !== '';
      return !(hasUsefulAlt || isDecorative);
    });
    const limitedImgs = take(imgWithoutAltNodes);

    // noindex Flags
    const hasMetaNoindex =
      !!document.querySelector('meta[name="robots"][content*="noindex" i]') ||
      !!document.querySelector('meta[name="googlebot"][content*="noindex" i]');
    const noindexMetas = q('meta[name="robots"], meta[name="googlebot"]')
      .filter((m) => /noindex/i.test((m.getAttribute('content') || '')))
    const noindexLimited = take(noindexMetas);

    // Node <html> (para html-lang)
    const htmlEl = document.documentElement;
    const htmlSelector = 'html';
    const htmlOpenTag = (() => {
      const attrs = htmlEl.getAttributeNames().map(n => `${n}="${htmlEl.getAttribute(n) ?? ''}"`).join(' ');
      return `<html${attrs ? ' ' + attrs : ''}>`;
    })();

    // Viewport, Title, Meta Description
    const viewportEl = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const titleEl = document.querySelector('title');
    const metaDescEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;

    // Canonicals
    const canonicalEls = q('link[rel="canonical"]') as HTMLLinkElement[];
    const canonicalLimited = take(canonicalEls);

    // H1
    const h1Els = q('h1');
    const h1Limited = take(h1Els);

    const dom = {
      // rules
      htmlLang: htmlEl.getAttribute('lang') || '',
      hasViewport: !!viewportEl,
      title: titleEl?.textContent?.trim() || '',
      metaDescription: metaDescEl?.getAttribute('content')?.trim() || '',
      canonicals: (canonicalEls).map((n) => (n as HTMLLinkElement).href),
      h1Count: h1Els.length,

      // Impression node collections
      htmlNode: { selector: htmlSelector, html: htmlOpenTag }, // só a tag de abertura
      viewportNodes: viewportEl ? { selectors: [selectorFor(viewportEl)], html: [htmlOf(viewportEl)] } : null,
      titleNodes: titleEl ? { selectors: [selectorFor(titleEl)], html: [htmlOf(titleEl)] } : null,
      metaDescriptionNodes: metaDescEl ? { selectors: [selectorFor(metaDescEl)], html: [htmlOf(metaDescEl)] } : null,
      canonicalNodes: {
        selectors: canonicalEls.map(selectorFor),
        html: canonicalLimited.map(htmlOf)
      },
      h1Nodes: {
        total: h1Els.length,
        selectors: h1Els.map(selectorFor),
        html: h1Limited.map(htmlOf)
      },
      imgWithoutAlt: {
        total: imgWithoutAltNodes.length,
        selectors: imgWithoutAltNodes.map(selectorFor),
        html: limitedImgs.map(htmlOf)
      },
      noindexMeta: {
        total: noindexMetas.length,
        selectors: noindexMetas.map(selectorFor),
        html: noindexLimited.map(htmlOf),
      },

      hasNoindex: hasMetaNoindex
    };

    return { metaNoindex: hasMetaNoindex, dom };
  }, cfg.maxNodesPerIssue);

  let headerNoindex = false;
  if (headerCheck) {
    try {
      const resp = await page.request.get(url, { timeout: 15000 });
      const xrt = resp.headers()['x-robots-tag'];
      if (xrt) {
        const v = Array.isArray(xrt) ? xrt.join(',') : xrt;
        headerNoindex = /noindex/i.test(v);
      }
    } catch { /* ignore */ }
  }

  return { dom, metaNoindex, headerNoindex };
}
