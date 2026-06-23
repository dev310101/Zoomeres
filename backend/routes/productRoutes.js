// ============================================================
// productRoutes.js — New routes for price sync and enriched products
//
// Mounts at /api/products (alongside existing routes in server.js)
// Existing routes are NOT changed. These are additive.
// ============================================================

const express = require('express');
const router  = express.Router();
const sync    = require('../services/productSyncService');
const cache   = require('../services/priceCacheService');

// ── GET /api/products/:id/prices ─────────────────────────
// Returns live or cached Amazon + Flipkart pricing for one product.
// The frontend calls this on the Product Detail Page.
// Responds quickly with cached data; refreshes stale data in background.
router.get('/:id/prices', async (req, res) => {
  const { products } = req.app.locals; // products array set in server.js
  const product = (products || []).find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const forceRefresh = req.query.refresh === '1';

  try {
    const enriched = await sync.enrichProduct(product, { forceRefresh });
    res.json({
      productId:       product.id,
      amazonData:      enriched.amazonData,
      flipkartData:    enriched.flipkartData,
      lastPriceUpdate: enriched.lastPriceUpdate,
      // Always include fallback redirect URLs so UI always has something to show
      fallbackUrls:    sync.buildFallbackUrls(product),
    });
  } catch (err) {
    // Even on error, return fallback redirect URLs — UI must never be blank
    res.status(200).json({
      productId:    product.id,
      amazonData:   null,
      flipkartData: null,
      fallbackUrls: sync.buildFallbackUrls(product),
      error:        err.message,
    });
  }
});

// ── GET /api/products/refresh-prices ─────────────────────
// Admin: trigger a full bulk sync of all products.
// Long-running (can take minutes). Use SSE for progress.
// Protected by admin password query param.
router.get('/refresh-prices', async (req, res) => {
  if (req.query.password !== 'admin123') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { products } = req.app.locals;
  if (!products?.length) {
    return res.status(400).json({ error: 'No products loaded' });
  }

  // Use Server-Sent Events so admin panel can show live progress
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: 'start', total: products.length });

  try {
    const results = await sync.syncAllProducts(
      products,
      (current, total, name) => {
        send({ type: 'progress', current, total, name });
      }
    );

    send({ type: 'complete', results });
    res.end();
  } catch (err) {
    send({ type: 'error', message: err.message });
    res.end();
  }
});

// ── GET /api/products/sync-status ────────────────────────
// Admin: get current status of both APIs and the price cache.
router.get('/sync-status', (req, res) => {
  if (req.query.password !== 'admin123') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json(sync.getServicesStatus());
});

// ── GET /api/products/search-enriched ────────────────────
// Enriched product search: runs your existing search AND attaches
// price data from both platforms.
// ?q=query&category=X&sort=Y
router.get('/search-enriched', async (req, res) => {
  const { products } = req.app.locals;
  if (!products) return res.status(500).json({ error: 'Products not loaded' });

  let results = [...products];
  const { q, category, sort } = req.query;

  if (category && category !== 'All') {
    results = results.filter(p => p.category === category);
  }
  if (q) {
    const ql = q.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(ql) ||
      p.brand.toLowerCase().includes(ql) ||
      p.description.toLowerCase().includes(ql)
    );
  }
  if (sort === 'price_asc')  results.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
  if (sort === 'rating')     results.sort((a, b) => b.avgRating - a.avgRating);

  // Attach cached price data without triggering new fetches (non-blocking)
  const enriched = results.map(p => ({
    ...p,
    amazonData:   cache.getCached('amazon', p.id),
    flipkartData: cache.getCached('flipkart', p.id),
    fallbackUrls: sync.buildFallbackUrls(p),
  }));

  res.json(enriched);
});

module.exports = router;
