/**
 * Website Quality Analyzer — fetches a URL and checks digital presence signals.
 * Runs server-side only. Uses cheerio for HTML parsing.
 */

import * as cheerio from "cheerio";

export interface WebsiteAnalysis {
  isReachable: boolean;
  hasSSL: boolean;
  isResponsive: boolean;
  loadTimeMs: number;
  technology: string | null;
  hasSocialLinks: boolean;
  socialLinks: Record<string, string>;
  hasStructuredData: boolean;
  hasContactForm: boolean;
  hasWhatsApp: boolean;
  copyrightYear: number | null;
  isOutdated: boolean;
}

const FETCH_TIMEOUT = 10_000; // 10 seconds

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const result: WebsiteAnalysis = {
    isReachable: false,
    hasSSL: false,
    isResponsive: false,
    loadTimeMs: 0,
    technology: null,
    hasSocialLinks: false,
    socialLinks: {},
    hasStructuredData: false,
    hasContactForm: false,
    hasWhatsApp: false,
    copyrightYear: null,
    isOutdated: false,
  };

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Validate URL format
  try {
    new URL(normalizedUrl);
  } catch {
    return result;
  }

  result.hasSSL = normalizedUrl.startsWith("https://");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const start = performance.now();
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MapKoBot/1.0; +https://mapko.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const loadTime = performance.now() - start;
    clearTimeout(timeout);

    if (!response.ok) return result;

    result.isReachable = true;
    result.loadTimeMs = Math.round(loadTime);

    // Check if final URL is HTTPS (after redirects)
    result.hasSSL = response.url.startsWith("https://");

    const html = await response.text();
    const $ = cheerio.load(html);

    // Responsive check: viewport meta tag
    const viewport = $('meta[name="viewport"]').attr("content") || "";
    result.isResponsive = viewport.includes("width=device-width");

    // Technology detection
    result.technology = detectTechnology($, html);

    // Social media links
    result.socialLinks = detectSocialLinks($);
    result.hasSocialLinks = Object.keys(result.socialLinks).length > 0;

    // Structured data (JSON-LD or microdata)
    result.hasStructuredData =
      $('script[type="application/ld+json"]').length > 0 ||
      $("[itemscope]").length > 0;

    // Contact form
    result.hasContactForm =
      $("form").length > 0 &&
      ($('input[type="email"]').length > 0 ||
        $('input[name*="email"]').length > 0 ||
        $("textarea").length > 0);

    // WhatsApp detection
    const htmlLower = html.toLowerCase();
    result.hasWhatsApp =
      htmlLower.includes("wa.me/") ||
      htmlLower.includes("api.whatsapp.com") ||
      htmlLower.includes("whatsapp");

    // Copyright year
    const copyrightMatch = html.match(
      /(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i
    );
    if (copyrightMatch) {
      result.copyrightYear = parseInt(copyrightMatch[1], 10);
      const currentYear = new Date().getFullYear();
      result.isOutdated = result.copyrightYear < currentYear - 2;
    }
  } catch {
    // Fetch failed — site unreachable or timeout
  }

  return result;
}

// ─── Technology Detection ─────────────────────────────────────
function detectTechnology($: cheerio.CheerioAPI, html: string): string | null {
  // WordPress
  if (
    html.includes("wp-content") ||
    html.includes("wp-includes") ||
    $('meta[name="generator"][content*="WordPress"]').length > 0
  ) {
    return "WordPress";
  }

  // Wix
  if (html.includes("wix.com") || html.includes("X-Wix")) {
    return "Wix";
  }

  // Squarespace
  if (html.includes("squarespace.com") || html.includes("Squarespace")) {
    return "Squarespace";
  }

  // Shopify
  if (html.includes("cdn.shopify.com") || html.includes("Shopify")) {
    return "Shopify";
  }

  // Webflow
  if (html.includes("webflow.com") || html.includes("Webflow")) {
    return "Webflow";
  }

  // GoDaddy Website Builder
  if (html.includes("godaddy.com") || html.includes("GoDaddy")) {
    return "GoDaddy";
  }

  // React/Next.js
  if (html.includes("__next") || html.includes("_next/static")) {
    return "Next.js";
  }

  // Generic React
  if (html.includes("react") && html.includes("__reactFiber")) {
    return "React";
  }

  return "Custom";
}

// ─── Social Link Detection ───────────────────────────────────
function detectSocialLinks($: cheerio.CheerioAPI): Record<string, string> {
  const links: Record<string, string> = {};
  const patterns: Record<string, RegExp> = {
    facebook: /facebook\.com\/[^"'\s]+/i,
    instagram: /instagram\.com\/[^"'\s]+/i,
    twitter: /(?:twitter|x)\.com\/[^"'\s]+/i,
    linkedin: /linkedin\.com\/(?:company|in)\/[^"'\s]+/i,
    youtube: /youtube\.com\/(?:channel|c|@)[^"'\s]+/i,
    tiktok: /tiktok\.com\/@[^"'\s]+/i,
  };

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    for (const [platform, regex] of Object.entries(patterns)) {
      if (!links[platform] && regex.test(href)) {
        links[platform] = href;
      }
    }
  });

  // Also check og:meta and link tags
  const ogUrl =
    $('meta[property="og:see_also"]').attr("content") ||
    $('meta[property="og:url"]').attr("content") ||
    "";
  for (const [platform, regex] of Object.entries(patterns)) {
    if (!links[platform] && regex.test(ogUrl)) {
      links[platform] = ogUrl;
    }
  }

  return links;
}
