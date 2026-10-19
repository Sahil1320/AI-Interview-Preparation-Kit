import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

const MAX_PAGE_SIZE = 2 * 1024 * 1024; // 2MB
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_PAGES_TO_CRAWL = 15;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// SSRF protection: reject private/loopback addresses
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block private IP ranges
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
    ];
    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) return true;
    }

    return false;
  } catch {
    return true; // Invalid URL
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isSafePublicUrl(url: string): boolean {
  return isValidUrl(url) && !isPrivateUrl(url);
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch a single page with retries and backoff
async function fetchPage(url: string, retries = 3): Promise<{ html: string; statusCode: number } | null> {
  if (!isValidUrl(url)) return null;
  if (isPrivateUrl(url)) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        maxContentLength: MAX_PAGE_SIZE,
        headers: {
          'User-Agent': 'InterviewPrepBot/1.0 (educational project)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        validateStatus: (status) => status < 500,
      });

      // Only accept HTML content
      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return null;
      }

      return { html: response.data, statusCode: response.status };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (attempt < retries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`Retry ${attempt + 1} for ${url} after ${backoff}ms`);
        await delay(backoff);
      } else {
        console.error(`Failed to fetch ${url}: ${axiosError.message}`);
        return null;
      }
    }
  }
  return null;
}

// Check robots.txt
async function checkRobotsTxt(baseUrl: string, targetPath: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const response = await axios.get(robotsUrl, { timeout: 5000 });
    const robots = robotsParser(robotsUrl, response.data);
    return robots.isAllowed(targetPath, 'InterviewPrepBot') !== false;
  } catch {
    // If robots.txt is not accessible, assume allowed
    return true;
  }
}

// Clean HTML to readable text
function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer, ads
  $('script, style, nav, footer, noscript, iframe, svg, .ad, .ads, .cookie-banner, .popup').remove();

  // Get text content
  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Limit to ~5000 chars to save LLM tokens
  return text.substring(0, 5000);
}

// Extract links from a page
function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;

      const absoluteUrl = new URL(href, baseUrl).toString();
      // Only follow links on the same domain
      const baseDomain = new URL(baseUrl).hostname;
      const linkDomain = new URL(absoluteUrl).hostname;

      if (linkDomain === baseDomain && !absoluteUrl.includes('#')) {
        links.push(absoluteUrl);
      }
    } catch {
      // Skip invalid URLs
    }
  });

  return [...new Set(links)]; // Deduplicate
}

// Score a URL for relevance to hiring/about/careers
function scoreUrl(url: string, linkText: string = ''): number {
  const urlLower = url.toLowerCase();
  const textLower = linkText.toLowerCase();
  let score = 0;

  // High-priority patterns
  const highPatterns = ['career', 'job', 'hiring', 'recruit', 'join-us', 'join_us', 'work-with', 'work_with', 'positions', 'openings', 'vacancies'];
  const medPatterns = ['about', 'team', 'people', 'culture', 'values', 'mission', 'engineering', 'blog', 'handbook'];
  const lowPatterns = ['company', 'who-we-are', 'what-we-do', 'our-story'];

  for (const p of highPatterns) {
    if (urlLower.includes(p) || textLower.includes(p)) score += 10;
  }
  for (const p of medPatterns) {
    if (urlLower.includes(p) || textLower.includes(p)) score += 5;
  }
  for (const p of lowPatterns) {
    if (urlLower.includes(p) || textLower.includes(p)) score += 2;
  }

  return score;
}

export interface CrawlResult {
  companyInfo: string;
  hiringInfo: string;
  pagesUsed: string[];
  errors: string[];
}

// Main crawl function: crawl company site to find what they do and how they hire
export async function crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
  const result: CrawlResult = {
    companyInfo: '',
    hiringInfo: '',
    pagesUsed: [],
    errors: [],
  };

  if (!isValidUrl(companyUrl)) {
    result.errors.push(`Invalid URL: ${companyUrl}`);
    return result;
  }

  // Normalize URL
  let baseUrl = companyUrl;
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  // Step 1: Fetch the homepage
  console.log(`Crawling homepage: ${baseUrl}`);
  const homepage = await fetchPage(baseUrl);
  if (!homepage) {
    result.errors.push(`Could not reach company site: ${companyUrl}`);
    return result;
  }

  if (homepage.statusCode === 404) {
    result.errors.push(`Company site returned 404: ${companyUrl}`);
    return result;
  }

  result.pagesUsed.push(baseUrl);
  const homepageText = cleanHtml(homepage.html);
  result.companyInfo = homepageText;

  // Step 2: Extract and rank links
  const $ = cheerio.load(homepage.html);
  const linkData: Array<{ url: string; text: string; score: number }> = [];

  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      const absoluteUrl = new URL(href, baseUrl).toString();
      const baseDomain = new URL(baseUrl).hostname;
      const linkDomain = new URL(absoluteUrl).hostname;

      if (linkDomain === baseDomain && !absoluteUrl.includes('#') && absoluteUrl !== baseUrl) {
        const text = $(el).text().trim();
        const score = scoreUrl(absoluteUrl, text);
        if (score > 0) {
          linkData.push({ url: absoluteUrl, text, score });
        }
      }
    } catch {
      // Skip invalid URLs
    }
  });

  // Sort by relevance score
  linkData.sort((a, b) => b.score - a.score);
  const uniqueUrls = [...new Set(linkData.map(l => l.url))];
  const topLinks = uniqueUrls.slice(0, MAX_PAGES_TO_CRAWL);

  // Step 3: Fetch top-ranked pages
  let hiringPages: string[] = [];
  let aboutPages: string[] = [];

  for (const url of topLinks) {
    // Check robots.txt
    const allowed = await checkRobotsTxt(baseUrl, url);
    if (!allowed) {
      console.log(`Blocked by robots.txt: ${url}`);
      continue;
    }

    await delay(RATE_LIMIT_DELAY); // Rate limit

    const page = await fetchPage(url);
    if (!page || page.statusCode !== 200) continue;

    const pageText = cleanHtml(page.html);
    result.pagesUsed.push(url);

    const urlLower = url.toLowerCase();
    if (urlLower.includes('career') || urlLower.includes('job') || urlLower.includes('hiring') ||
        urlLower.includes('recruit') || urlLower.includes('join') || urlLower.includes('position')) {
      hiringPages.push(pageText);
    } else {
      aboutPages.push(pageText);
    }
  }

  // Combine about info
  if (aboutPages.length > 0) {
    result.companyInfo += '\n\n' + aboutPages.join('\n\n');
  }

  // Combine hiring info
  if (hiringPages.length > 0) {
    result.hiringInfo = hiringPages.join('\n\n');
  } else {
    result.hiringInfo = 'No hiring or careers page was found on the company website.';
  }

  // Limit total text size
  result.companyInfo = result.companyInfo.substring(0, 8000);
  result.hiringInfo = result.hiringInfo.substring(0, 5000);

  return result;
}

// Search for public discussion about a company's interview process
export async function searchPublicDiscussion(companyName: string): Promise<{ content: string; sources: string[] }> {
  // We'll use the company name to construct search-like queries
  // Since we can't use a real search API without keys, we'll try common discussion sites
  const sources: string[] = [];
  const contents: string[] = [];

  // Try common patterns for public discussion
  const searchUrls = [
    `https://www.glassdoor.com/Reviews/${encodeURIComponent(companyName)}-reviews`,
    `https://www.indeed.com/cmp/${encodeURIComponent(companyName)}/reviews`,
  ];

  for (const url of searchUrls) {
    try {
      const page = await fetchPage(url, 1); // Only 1 retry for external searches
      if (page && page.statusCode === 200) {
        const text = cleanHtml(page.html);
        if (text.length > 100) {
          contents.push(text.substring(0, 3000));
          sources.push(url);
        }
      }
    } catch {
      // Skip failed searches
    }
    await delay(RATE_LIMIT_DELAY);
  }

  if (contents.length === 0) {
    return {
      content: 'No public discussion about this company\'s interview process was found.',
      sources: [],
    };
  }

  return {
    content: contents.join('\n\n'),
    sources,
  };
}
