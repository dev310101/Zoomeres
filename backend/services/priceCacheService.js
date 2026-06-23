// ============================================================
// priceCacheService.js
// In-memory TTL cache for product prices.
//
// WHY THIS EXISTS:
// Amazon PA-API: 1 req/sec rate limit. Flipkart feeds: 10-hour URLs.
// We cannot hit external APIs on every page load. This cache serves
// stale-while-revalidate: return last good data immediately,
// refresh in background when TTL expires.
//
// TTL strategy:
//   - Amazon prices: 1 hour (prices change but not by the minute)
//   - Flipkart prices: 6 hours (feed-based, bulk refreshed)
//   - Failed lookups: 15 min (don't hammer a failing endpoint)
// ============================================================

const NodeCache = require('node-cache');

// stdTTL = default seconds. checkperiod = cleanup interval.
const priceCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const failureCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

// Track which products are currently being refreshed (prevents stampede)
const inflightRefreshes = new Set();

const CACHE_KEYS = {
  amazon: (productId) => `amazon:${productId}`,
  flipkart: (productId) => `flipkart:${productId}`,
  failure: (service, productId) => `fail:${service}:${productId}`,
};

/**
 * Get cached price data for a product.
 * Returns null if not cached or expired.
 */
function getCached(service, productId) {
  const key = CACHE_KEYS[service](productId);
  return priceCache.get(key) || null;
}

/**
 * Store price data with optional custom TTL.
 */
function setCache(service, productId, data, ttlSeconds = 3600) {
  const key = CACHE_KEYS[service](productId);
  priceCache.set(key, { ...data, cachedAt: Date.now() }, ttlSeconds);
}

/**
 * Mark a product lookup as failed so we don't retry immediately.
 * Uses shorter TTL (15 min) so we eventually retry.
 */
function markFailure(service, productId, reason) {
  const key = CACHE_KEYS.failure(service, productId);
  failureCache.set(key, { reason, failedAt: Date.now() });
}

/**
 * Check if this product/service is in a known-failed state.
 */
function isKnownFailure(service, productId) {
  const key = CACHE_KEYS.failure(service, productId);
  return failureCache.has(key);
}

/**
 * Check if this product is currently being refreshed (stampede prevention).
 */
function isRefreshing(service, productId) {
  return inflightRefreshes.has(`${service}:${productId}`);
}

function startRefresh(service, productId) {
  inflightRefreshes.add(`${service}:${productId}`);
}

function endRefresh(service, productId) {
  inflightRefreshes.delete(`${service}:${productId}`);
}

/**
 * Check if cached data is stale (older than maxAgeMs).
 * Returns true if stale or not cached.
 */
function isStale(service, productId, maxAgeMs = 3600000) {
  const cached = getCached(service, productId);
  if (!cached) return true;
  return (Date.now() - (cached.cachedAt || 0)) > maxAgeMs;
}

/**
 * Get cache stats for admin panel display.
 */
function getStats() {
  const keys = priceCache.keys();
  const amazonKeys = keys.filter(k => k.startsWith('amazon:'));
  const flipkartKeys = keys.filter(k => k.startsWith('flipkart:'));
  const failKeys = failureCache.keys();

  return {
    totalCached: keys.length,
    amazonCached: amazonKeys.length,
    flipkartCached: flipkartKeys.length,
    knownFailures: failKeys.length,
    inflightRefreshes: inflightRefreshes.size,
  };
}

/** Flush all cached prices (e.g. before a full sync). */
function flushAll() {
  priceCache.flushAll();
  failureCache.flushAll();
  inflightRefreshes.clear();
}

module.exports = {
  getCached,
  setCache,
  markFailure,
  isKnownFailure,
  isRefreshing,
  startRefresh,
  endRefresh,
  isStale,
  getStats,
  flushAll,
  CACHE_KEYS,
};
