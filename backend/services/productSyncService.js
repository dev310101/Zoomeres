// ============================================================
// productSyncService.js — Orchestrates price fetching
//
// Flow for a single product:
//   1. Check priceCacheService — is data fresh? Return it.
//   2. Is this product in a known-failure state? Return stale data.
//   3. Is a refresh already in-flight? Return stale data (no stampede).
//   4. Fire parallel requests to Amazon + Flipkart.
//   5. For each: try real API first, fall back to redirect URL.
//   6. Cache results, return enriched product data.
//
// Flow for bulk sync (admin button):
//   Runs the above for every product in the database.
//   Rate-limited to avoid hammering Amazon (1 req/sec PA-API limit).
// ============================================================

const cache    = require('./priceCacheService');
const amazon   = require('./amazonService');
const flipkart = require('./flipkartService');

// Rate limiter: ensure we don't hit Amazon faster than 1 req/sec
const AMAZON_RATE_LIMIT_MS = 1100; // 1.1s between calls, giving headroom
let lastAmazonCall = 0;

async function amazonRateLimitedCall(fn) {
  const now   = Date.now();
  const wait  = Math.max(0, AMAZON_RATE_LIMIT_MS - (now - lastAmazonCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastAmazonCall = Date.now();
  return fn();
}

// ── Core: enrich a single product with price data ────────

/**
 * Fetch and attach Amazon + Flipkart pricing to a product object.
 * Always resolves (never rejects) — returns product with whatever data is available.
 *
 * @param {Object} product - product object from your database
 * @param {Object} opts
 * @param {boolean} opts.forceRefresh - ignore cache, fetch fresh
 * @returns {Object} enriched product with amazonData and flipkartData fields
 */
async function enrichProduct(product, { forceRefresh = false } = {}) {
  const pid = product.id;

  // ── Amazon ──────────────────────────────────────────────
  let amazonData = null;
  const cachedAmazon = cache.getCached('amazon', pid);

  if (!forceRefresh && cachedAmazon) {
    // Cache hit: use it
    amazonData = cachedAmazon;
  } else if (!forceRefresh && cache.isKnownFailure('amazon', pid)) {
    // Known failure: use stale data if any, else null
    amazonData = cachedAmazon || null;
  } else if (!cache.isRefreshing('amazon', pid)) {
    // Start a fresh fetch
    cache.startRefresh('amazon', pid);
    try {
      const found = await amazonRateLimitedCall(() =>
        amazon.findBestMatch(product.name, product.amazon_asin)
      );

      if (found) {
        amazonData = found;
        cache.setCache('amazon', pid, found);
      } else {
        // No result: store redirect URL as fallback
        amazonData = {
          price:        null,
          priceDisplay: null,
          inStock:      null,
          affiliateUrl: amazon.buildSearchRedirectUrl(product.name),
          isRedirectOnly: true,
          source:       'amazon',
          fetchedAt:    Date.now(),
        };
        cache.setCache('amazon', pid, amazonData, 3600);
        cache.markFailure('amazon', pid, 'No matching product found');
      }
    } catch (err) {
      console.error(`[Sync] Amazon fetch failed for "${product.name}": ${err.message}`);
      // Still provide a redirect link even on error
      amazonData = cachedAmazon || {
        price:        null,
        inStock:      null,
        affiliateUrl: amazon.buildSearchRedirectUrl(product.name),
        isRedirectOnly: true,
        source:       'amazon',
        error:        err.message,
      };
      cache.markFailure('amazon', pid, err.message);
    } finally {
      cache.endRefresh('amazon', pid);
    }
  } else {
    // Stampede protection: refresh in progress, use whatever we have
    amazonData = cachedAmazon || {
      affiliateUrl: amazon.buildSearchRedirectUrl(product.name),
      isRedirectOnly: true,
      source: 'amazon',
    };
  }

  // ── Flipkart ────────────────────────────────────────────
  let flipkartData = null;
  const cachedFlipkart = cache.getCached('flipkart', pid);

  if (!forceRefresh && cachedFlipkart) {
    flipkartData = cachedFlipkart;
  } else if (!forceRefresh && cache.isKnownFailure('flipkart', pid)) {
    flipkartData = cachedFlipkart || null;
  } else if (!cache.isRefreshing('flipkart', pid)) {
    cache.startRefresh('flipkart', pid);
    try {
      const found = await flipkart.findBestMatch(
        product.name,
        product.category,
        product.flipkart_id
      );

      if (found) {
        flipkartData = found;
        cache.setCache('flipkart', pid, found, 6 * 3600); // 6hr for feed-based data
      } else {
        flipkartData = {
          price:        null,
          inStock:      null,
          affiliateUrl: flipkart.buildSearchRedirectUrl(product.name),
          isRedirectOnly: true,
          source:       'flipkart',
          fetchedAt:    Date.now(),
        };
        cache.setCache('flipkart', pid, flipkartData, 6 * 3600);
      }
    } catch (err) {
      console.error(`[Sync] Flipkart fetch failed for "${product.name}": ${err.message}`);
      flipkartData = cachedFlipkart || {
        price:        null,
        inStock:      null,
        affiliateUrl: flipkart.buildSearchRedirectUrl(product.name),
        isRedirectOnly: true,
        source:       'flipkart',
        error:        err.message,
      };
    } finally {
      cache.endRefresh('flipkart', pid);
    }
  } else {
    flipkartData = cachedFlipkart || {
      affiliateUrl: flipkart.buildSearchRedirectUrl(product.name),
      isRedirectOnly: true,
      source: 'flipkart',
    };
  }

  return {
    ...product,
    amazonData,
    flipkartData,
    lastPriceUpdate: Math.max(
      amazonData?.fetchedAt   || 0,
      flipkartData?.fetchedAt || 0,
    ) || null,
  };
}

// ── Bulk sync ────────────────────────────────────────────

/**
 * Sync prices for all products. Called by admin "Sync Prices" button.
 * Rate-limited; returns a progress summary.
 *
 * @param {Array} products - all products from your DB
 * @param {Function} onProgress - optional callback(current, total, productName)
 */
async function syncAllProducts(products, onProgress) {
  const results = {
    total:     products.length,
    succeeded: 0,
    failed:    0,
    startedAt: Date.now(),
    errors:    [],
  };

  console.log(`[Sync] Starting bulk sync for ${products.length} products`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      await enrichProduct(product, { forceRefresh: true });
      results.succeeded++;
      if (onProgress) onProgress(i + 1, products.length, product.name);
    } catch (err) {
      results.failed++;
      results.errors.push({ productId: product.id, name: product.name, error: err.message });
    }

    // Brief pause between products to be a good API citizen
    if (i < products.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  results.completedAt  = Date.now();
  results.durationMs   = results.completedAt - results.startedAt;
  results.durationSec  = Math.round(results.durationMs / 1000);

  console.log(`[Sync] Bulk sync complete: ${results.succeeded} OK, ${results.failed} failed in ${results.durationSec}s`);
  return results;
}

/**
 * Build the affiliate redirect URLs for a product without making any API calls.
 * Safe to call anywhere — these are just URL constructions.
 */
function buildFallbackUrls(product) {
  return {
    amazonUrl:   amazon.buildSearchRedirectUrl(product.name),
    flipkartUrl: flipkart.buildSearchRedirectUrl(product.name),
  };
}

/**
 * Get status of both services for admin panel.
 */
function getServicesStatus() {
  return {
    amazon:      amazon.getCircuitStatus(),
    flipkart:    flipkart.getServiceStatus(),
    priceCache:  cache.getStats(),
  };
}

module.exports = {
  enrichProduct,
  syncAllProducts,
  buildFallbackUrls,
  getServicesStatus,
};
