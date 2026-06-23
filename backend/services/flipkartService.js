// ============================================================
// flipkartService.js — Flipkart Affiliate Integration
//
// HONEST ASSESSMENT OF WHAT WORKS:
// ──────────────────────────────────
// Flipkart's real-time product search API is NOT available to
// new affiliates. What you actually get access to is:
//
//   1. Product Feed API — bulk JSON/CSV feed per category.
//      URLs are valid for 10 hours, must be re-fetched regularly.
//      This is what we implement here as the primary method.
//
//   2. Search Query API — available to select partners only,
//      not new signups. Code is included but gated behind a flag.
//
//   3. Search redirect URL — works immediately, earns commission.
//      Used as universal fallback.
//
// Setup at: https://affiliate.flipkart.com
// Get your Tracking ID and Fk-Affiliate-Token from the dashboard.
//
// Feed URLs look like:
// https://affiliate-api.flipkart.net/affiliate/1.0/feeds/{trackingId}/category/{categoryId}.json?expiresAt={ts}&token={token}
// ============================================================

const https = require('https');

// ── Circuit Breaker ──────────────────────────────────────
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  state: 'CLOSED',
  FAILURE_THRESHOLD: 5,
  RECOVERY_TIMEOUT_MS: 10 * 60 * 1000,
};

function checkCircuit() {
  if (circuitBreaker.state === 'CLOSED') return true;
  if (circuitBreaker.state === 'OPEN') {
    if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.RECOVERY_TIMEOUT_MS) {
      circuitBreaker.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }
  return true;
}

function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'CLOSED';
}

function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.FAILURE_THRESHOLD) {
    circuitBreaker.state = 'OPEN';
    console.warn('[Flipkart] Circuit breaker OPEN. Pausing API calls for 10 min.');
  }
}

// ── In-memory product feed cache ─────────────────────────
// Feed URLs expire in 10 hours, so we store the parsed products.
// Key: category string. Value: { products: [], fetchedAt, feedExpiresAt }
const feedCache = new Map();
const FEED_CACHE_TTL_MS = 9 * 60 * 60 * 1000; // 9 hours (1hr buffer before 10hr expiry)

// ── Flipkart category IDs ────────────────────────────────
// Map our internal categories to Flipkart category IDs
// These are the standard Flipkart affiliate category IDs
const CATEGORY_MAP = {
  'Gadgets':  'COMP_MOBILE_ACC',
  'Gaming':   'GAMING',
  'Fashion':  'CLOTHING',
  'Beauty':   'BEAUTY_AND_PERSONAL_CARE',
  'Grocery':  'GROCERY',
  // Additional for coverage
  'Electronics': 'MOBILES',
  'Laptop': 'LAPTOP',
};

// ── HTTP helper ──────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Fk-Affiliate-Id':    process.env.FLIPKART_AFFILIATE_ID || '',
        'Fk-Affiliate-Token': process.env.FLIPKART_API_TOKEN || '',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Flipkart API returned non-JSON: ${data.slice(0, 200)}`));
          }
        } else {
          reject(new Error(`Flipkart API ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Flipkart request timed out')); });
    req.on('error', reject);
  });
}

// ── Data normalisation ───────────────────────────────────
function normalizeFlipkartProduct(raw) {
  if (!raw) return null;

  // Flipkart feed product structure
  const productId  = raw.productId || raw.productBaseId || '';
  const title      = raw.productName || raw.title || '';
  const price      = raw.discountedPrice || raw.price?.finalPrice || raw.maximumRetailPrice || null;
  const mrp        = raw.maximumRetailPrice || raw.price?.mrp || null;
  const discount   = raw.discountPercentage || 0;
  const imageUrl   = raw.imageUrls?.['200x200'] || raw.imageUrl || '';
  const affiliateUrl = raw.productUrl || buildSearchRedirectUrl(title);
  const inStock    = raw.inStock !== false;
  const brand      = raw.brand || '';

  return {
    flipkartId:    productId,
    title,
    brand,
    price:         price ? parseFloat(price) : null,
    mrp:           mrp ? parseFloat(mrp) : null,
    discount,
    inStock,
    imageUrl,
    affiliateUrl,
    source:        'flipkart',
    fetchedAt:     Date.now(),
  };
}

// ── Feed URL fetcher ─────────────────────────────────────
/**
 * Fetch the live feed URL for a category from Flipkart's affiliate API.
 * This first call gets you a time-limited URL, which you then call to get products.
 */
async function fetchCategoryFeedUrl(categoryId) {
  const trackingId = process.env.FLIPKART_AFFILIATE_ID;
  const token      = process.env.FLIPKART_API_TOKEN;

  if (!trackingId || !token) {
    throw new Error('FLIPKART_AFFILIATE_ID and FLIPKART_API_TOKEN must be set in .env');
  }

  // Step 1: Get the feed listing (contains time-limited URLs for each category)
  const listUrl = `https://affiliate-api.flipkart.net/affiliate/feeds/${trackingId}/category/json?token=${token}`;
  const listing = await httpsGet(listUrl);

  // The listing returns an object with category keys and feed URLs
  const categoryFeed = listing?.apiGroups?.affiliate?.apiListings?.[categoryId];
  if (!categoryFeed) {
    throw new Error(`Category ${categoryId} not found in Flipkart feed listing`);
  }
  return categoryFeed.availableVariants?.v1?.get || categoryFeed.availableVariants?.default?.get;
}

/**
 * Load all products for a category into the in-memory feed cache.
 * Returns normalised array of products.
 */
async function loadCategoryFeed(categoryId) {
  // Check in-memory cache first
  const cached = feedCache.get(categoryId);
  if (cached && (Date.now() - cached.fetchedAt) < FEED_CACHE_TTL_MS) {
    return cached.products;
  }

  if (!checkCircuit()) {
    throw new Error('Flipkart circuit breaker OPEN');
  }

  try {
    const feedUrl = await fetchCategoryFeedUrl(categoryId);
    if (!feedUrl) throw new Error('No feed URL returned for category');

    const feedData = await httpsGet(feedUrl);

    // Flipkart feed structure: productInfoList array
    const rawProducts = feedData?.productInfoList || feedData?.products || [];
    const normalized  = rawProducts.map(normalizeFlipkartProduct).filter(Boolean);

    feedCache.set(categoryId, { products: normalized, fetchedAt: Date.now() });
    recordSuccess();
    console.log(`[Flipkart] Loaded ${normalized.length} products for category ${categoryId}`);
    return normalized;
  } catch (err) {
    recordFailure();
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Find the best Flipkart product match for a given product name.
 * Searches the cached category feeds by keyword matching.
 * Returns null on failure (never throws).
 */
async function findBestMatch(productName, category = 'Gadgets', existingFlipkartId = null) {
  try {
    const categoryId = CATEGORY_MAP[category] || CATEGORY_MAP['Gadgets'];
    let products;

    try {
      products = await loadCategoryFeed(categoryId);
    } catch (feedErr) {
      console.warn(`[Flipkart] Feed load failed: ${feedErr.message}. Using redirect fallback.`);
      return null; // Falls back to redirect URL in caller
    }

    if (!products.length) return null;

    // If we already have a Flipkart product ID, find it directly
    if (existingFlipkartId) {
      const direct = products.find(p => p.flipkartId === existingFlipkartId);
      if (direct) return direct;
    }

    // Keyword search in feed
    const words    = productName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored   = products.map(p => {
      const title  = p.title.toLowerCase();
      const brand  = p.brand.toLowerCase();
      const matches = words.filter(w => title.includes(w) || brand.includes(w)).length;
      return { p, score: matches };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Only return if we have at least 2 keyword matches (avoid false positives)
    return (best && best.score >= 2) ? best.p : null;
  } catch (err) {
    console.error(`[Flipkart] findBestMatch error for "${productName}":`, err.message);
    return null;
  }
}

/**
 * Build a Flipkart search redirect URL. Works immediately without API approval.
 * Earns commission when user makes a purchase.
 */
function buildSearchRedirectUrl(productName) {
  const trackingId = process.env.FLIPKART_AFFILIATE_ID || '';
  const query      = encodeURIComponent(productName);
  // affid param appends affiliate tracking to the search page
  return `https://www.flipkart.com/search?q=${query}&affid=${trackingId}`;
}

/**
 * Get all available Flipkart categories.
 */
async function getCategories() {
  const trackingId = process.env.FLIPKART_AFFILIATE_ID;
  const token      = process.env.FLIPKART_API_TOKEN;
  if (!trackingId || !token) return Object.keys(CATEGORY_MAP);

  try {
    const listUrl  = `https://affiliate-api.flipkart.net/affiliate/feeds/${trackingId}/category/json?token=${token}`;
    const listing  = await httpsGet(listUrl);
    return Object.keys(listing?.apiGroups?.affiliate?.apiListings || {});
  } catch {
    return Object.keys(CATEGORY_MAP);
  }
}

/**
 * Get circuit breaker and feed cache status for admin panel.
 */
function getServiceStatus() {
  return {
    circuit:     circuitBreaker.state,
    failures:    circuitBreaker.failures,
    cachedFeeds: feedCache.size,
    feedDetails: Array.from(feedCache.entries()).map(([cat, data]) => ({
      category:    cat,
      productCount: data.products.length,
      ageMinutes:  Math.round((Date.now() - data.fetchedAt) / 60000),
    })),
    configured: !!(process.env.FLIPKART_AFFILIATE_ID && process.env.FLIPKART_API_TOKEN),
  };
}

module.exports = {
  findBestMatch,
  buildSearchRedirectUrl,
  getCategories,
  getServiceStatus,
  loadCategoryFeed,
  CATEGORY_MAP,
};
