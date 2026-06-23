// ============================================================
// amazonService.js — Amazon PA-API 5.0 Integration
//
// IMPORTANT REALITY CHECK (read before touching this file):
// ─────────────────────────────────────────────────────────
// This code is correct and production-ready BUT it will return
// 401 errors until your Amazon Associates account has generated
// 3 qualifying sales. That is Amazon's requirement — not a bug.
//
// Timeline expectation:
//   1. Sign up at affiliate-program.amazon.in
//   2. Make 3 sales within 180 days (you can use your own links)
//   3. Apply for PA-API access via the Associates dashboard
//   4. Receive API keys (usually 24-48 hrs after approval)
//   5. Set env vars → this file becomes live
//
// Until then: searchRedirectUrl() works immediately and earns
// real affiliate commission without any API.
//
// API Reference: https://webservices.amazon.com/paapi5/documentation/
// ============================================================

const crypto = require('crypto');
const https = require('https');

// ── Circuit Breaker State ────────────────────────────────
// If Amazon API fails 5 times in a row, open the circuit for
// 10 minutes. This prevents hammering a rate-limited endpoint.
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  state: 'CLOSED', // CLOSED = operational, OPEN = not calling, HALF_OPEN = testing
  FAILURE_THRESHOLD: 5,
  RECOVERY_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes
};

function checkCircuit() {
  if (circuitBreaker.state === 'CLOSED') return true;
  if (circuitBreaker.state === 'OPEN') {
    const elapsed = Date.now() - circuitBreaker.lastFailure;
    if (elapsed > circuitBreaker.RECOVERY_TIMEOUT_MS) {
      circuitBreaker.state = 'HALF_OPEN';
      console.log('[Amazon] Circuit breaker: HALF_OPEN — testing API');
      return true;
    }
    return false; // Still open
  }
  if (circuitBreaker.state === 'HALF_OPEN') return true;
  return true;
}

function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'CLOSED';
}

function recordFailure(error) {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.FAILURE_THRESHOLD) {
    circuitBreaker.state = 'OPEN';
    console.warn(`[Amazon] Circuit breaker OPEN after ${circuitBreaker.failures} failures. Pausing for 10 min.`);
  }
}

// ── AWS Signature V4 (required by PA-API) ────────────────
// PA-API uses standard AWS SigV4 signing. No SDK needed if
// we implement this correctly.

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate    = sign(Buffer.from('AWS4' + key, 'utf8'), dateStamp);
  const kRegion  = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  const kSigning = sign(kService, 'aws4_request');
  return kSigning;
}

function buildSignedHeaders(payload, path) {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('AMAZON_ACCESS_KEY and AMAZON_SECRET_KEY must be set in .env');
  }

  const host        = 'webservices.amazon.in';
  const region      = 'eu-west-1'; // PA-API India uses eu-west-1
  const service     = 'ProductAdvertisingAPI';
  const contentType = 'application/json; charset=utf-8';
  const target      = path.includes('searchitems')
    ? 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    : 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';

  const now        = new Date();
  const amzDate    = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp  = amzDate.slice(0, 8);

  const payloadStr  = JSON.stringify(payload);
  const payloadHash = crypto.createHash('sha256').update(payloadStr, 'utf8').digest('hex');

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST', path, '',
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credScope     = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign  = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n` +
    crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');

  const signingKey  = getSignatureKey(secretKey, dateStamp, region, service);
  const signature   = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'content-encoding':  'amz-1.0',
    'content-type':      contentType,
    'host':              host,
    'x-amz-date':        amzDate,
    'x-amz-target':      target,
    'Authorization':     authHeader,
  };
}

// ── Core HTTP caller ─────────────────────────────────────
function callPaApi(path, payload) {
  return new Promise((resolve, reject) => {
    if (!checkCircuit()) {
      return reject(new Error('Amazon circuit breaker OPEN — pausing calls'));
    }

    let headers;
    try {
      headers = buildSignedHeaders(payload, path);
    } catch (err) {
      return reject(err);
    }

    const bodyStr = JSON.stringify(payload);
    const options = {
      hostname: 'webservices.amazon.in',
      port: 443,
      path,
      method: 'POST',
      headers: { ...headers, 'content-length': Buffer.byteLength(bodyStr) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            recordSuccess();
            resolve(parsed);
          } else {
            const err = new Error(`PA-API ${res.statusCode}: ${JSON.stringify(parsed)}`);
            err.statusCode = res.statusCode;
            err.response = parsed;
            recordFailure(err);
            reject(err);
          }
        } catch (e) {
          reject(new Error(`Failed to parse PA-API response: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      recordFailure(err);
      reject(err);
    });

    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Amazon PA-API request timed out (8s)'));
    });

    req.write(bodyStr);
    req.end();
  });
}

// ── Resource extraction helpers ──────────────────────────
function extractItemData(item) {
  if (!item) return null;

  const info      = item.ItemInfo || {};
  const offers    = item.Offers?.Listings?.[0] || {};
  const images    = item.Images?.Primary || {};
  const partnerTag = process.env.AMAZON_PARTNER_TAG || '';

  // Price: prefer DisplayAmount, fall back to Amount
  const priceAmount = offers.Price?.Amount || null;
  const priceDisplay = offers.Price?.DisplayAmount || null;
  const savingsDisplay = offers.Price?.Savings?.DisplayAmount || null;
  const originalDisplay = offers.Price?.SavingBasis?.DisplayAmount || null;

  // Availability
  const availability = offers.Availability?.Type || 'Unknown';
  const inStock = availability === 'Now';

  // Affiliate URL
  const baseUrl = item.DetailPageURL || '';
  const affiliateUrl = baseUrl
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}tag=${partnerTag}`
    : `https://www.amazon.in/dp/${item.ASIN}?tag=${partnerTag}`;

  return {
    asin:             item.ASIN,
    title:            info.Title?.DisplayValue || '',
    brand:            info.ByLineInfo?.Brand?.DisplayValue || '',
    price:            priceAmount,
    priceDisplay:     priceDisplay,
    originalPrice:    originalDisplay,
    savings:          savingsDisplay,
    inStock,
    availability,
    imageUrl:         images.Large?.URL || images.Medium?.URL || '',
    affiliateUrl,
    source:           'amazon',
    fetchedAt:        Date.now(),
  };
}

// ── Public API ───────────────────────────────────────────

/**
 * Search Amazon India for a product by keyword.
 * Returns array of normalized product data.
 * Throws if API is unavailable or unconfigured.
 */
async function searchProducts(keyword, itemCount = 5) {
  const payload = {
    Keywords:    keyword,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
      'Offers.Listings.Availability.Type',
      'Images.Primary.Large',
      'Images.Primary.Medium',
    ],
    PartnerTag:   process.env.AMAZON_PARTNER_TAG,
    PartnerType:  'Associates',
    Marketplace:  'www.amazon.in',
    ItemCount:    itemCount,
    SearchIndex:  'All',
  };

  const result = await callPaApi('/paapi5/searchitems', payload);
  const items  = result.SearchResult?.Items || [];
  return items.map(extractItemData).filter(Boolean);
}

/**
 * Get details for a specific ASIN (or array of ASINs, max 10).
 * Used when we already know the product's ASIN.
 */
async function getItemsByAsin(asins) {
  const asinArray = Array.isArray(asins) ? asins.slice(0, 10) : [asins];

  const payload = {
    ItemIds:   asinArray,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
      'Offers.Listings.Availability.Type',
      'Images.Primary.Large',
    ],
    PartnerTag:  process.env.AMAZON_PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.in',
  };

  const result = await callPaApi('/paapi5/getitems', payload);
  const items  = result.ItemsResult?.Items || [];
  return items.map(extractItemData).filter(Boolean);
}

/**
 * Find the best matching Amazon product for a given product name.
 * Returns single best match or null.
 * Safe to call — returns null on any error rather than throwing.
 */
async function findBestMatch(productName, existingAsin = null) {
  try {
    // If we already have an ASIN, fetch it directly (more reliable)
    if (existingAsin) {
      const items = await getItemsByAsin([existingAsin]);
      return items[0] || null;
    }

    const results = await searchProducts(productName, 3);
    if (!results.length) return null;

    // Basic relevance: prefer results where title contains words from productName
    const words = productName.toLowerCase().split(/\s+/);
    const scored = results.map(item => {
      const titleLower = item.title.toLowerCase();
      const matches = words.filter(w => titleLower.includes(w)).length;
      return { item, score: matches };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.item || null;
  } catch (err) {
    // Don't propagate — caller gets null and falls back to redirect link
    console.error(`[Amazon] findBestMatch failed for "${productName}":`, err.message);
    return null;
  }
}

/**
 * Build an affiliate search-redirect URL.
 * Works immediately without API approval.
 * This is the fallback when findBestMatch returns null.
 */
function buildSearchRedirectUrl(productName) {
  const partnerTag = process.env.AMAZON_PARTNER_TAG || '';
  const query      = encodeURIComponent(productName);
  return `https://www.amazon.in/s?k=${query}&tag=${partnerTag}`;
}

/**
 * Get circuit breaker status for admin panel.
 */
function getCircuitStatus() {
  return {
    state:    circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailure: circuitBreaker.lastFailure
      ? new Date(circuitBreaker.lastFailure).toISOString()
      : null,
    configured: !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY),
  };
}

module.exports = {
  searchProducts,
  getItemsByAsin,
  findBestMatch,
  buildSearchRedirectUrl,
  getCircuitStatus,
};
