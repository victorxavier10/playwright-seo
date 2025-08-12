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
    const nodes = issue.nodesHtml ?? [];
    nodes.forEach((h, idx) => {
      lines.push(`  • Element ${idx + 1}:`);
      lines.push('```html');
      lines.push(prettyHtml(h));
      lines.push('```');
    });
    const hiddenCount =
      (issue.nodesSelectors?.length ?? 0) - (issue.nodesHtml?.length ?? 0);
    if (hiddenCount > 0) lines.push(`  … +${hiddenCount} elementos omitidos`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Coleta DOM e flags numa única evaluate (+ header X-Robots-Tag opcional) */
export async function collectDom(
  page: Page,
  cfg: Required<SeoRuleConfig>,
  headerCheck = true
) {
  const url = page.url();

  const { metaNoindex, dom } = await page.evaluate((maxNodes) => {
    const q = (sel: string) => Array.from(document.querySelectorAll(sel));

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
    const limitedImgs = imgWithoutAltNodes.slice(0, maxNodes);

    const metaNoindex =
      !!document.querySelector('meta[name="robots"][content*="noindex" i]') ||
      !!document.querySelector('meta[name="googlebot"][content*="noindex" i]');

    const dom = {
      htmlLang: document.documentElement.getAttribute('lang') || '',
      hasViewport: !!document.querySelector('meta[name="viewport"]'),
      title: document.title?.trim() || '',
      metaDescription:
        (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content?.trim() || '',
      canonicals: (q('link[rel="canonical"]') as HTMLLinkElement[]).map(
        (n) => (n as HTMLLinkElement).href
      ),
      h1Count: document.querySelectorAll('h1').length,
      imgWithoutAlt: {
        total: imgWithoutAltNodes.length,
        selectors: imgWithoutAltNodes.map((el) => {
          const id = (el as HTMLElement).id;
          const cls = (el as HTMLElement).className?.toString().trim();
          const base = el.tagName.toLowerCase();
          return base + (id ? `#${id}` : '') + (cls ? '.' + cls.split(/\s+/).filter(Boolean).join('.') : '');
        }),
        html: limitedImgs.map((el) => el.outerHTML)
      },
      hasNoindex: metaNoindex
    };

    return { metaNoindex, dom };
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
    } catch {
      /* ignore */
    }
  }

  return { dom, metaNoindex, headerNoindex };
}
