// ============================================================
// PriceComparison.jsx
// Shows Zoomeres (virtual) + Amazon + Flipkart side by side.
//
// States it handles:
//   loading   — fetching live prices
//   redirect  — API not configured / no exact match found
//              (still shows "Buy on Amazon" button via search URL)
//   live      — real price fetched from PA-API or Flipkart feed
//   error     — fetch failed, shows last known price or redirect
//   unavailable — product not found on that platform
// ============================================================
import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Clock, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';

function formatINR(amount) {
  if (!amount && amount !== 0) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

function timeSince(ts) {
  if (!ts) return null;
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1)   return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)   return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

// ── Single platform card ──────────────────────────────────
function PlatformCard({ platform, data, fakePrice, onAddToCart, isLoading }) {
  const isZoomeres    = platform === 'zoomeres';
  const isAmazon   = platform === 'amazon';
  const isFlipkart = platform === 'flipkart';

  const config = {
    zoomeres: { name: 'Zoomeres', emoji: '🛍️', color: 'blue',   bg: 'bg-brand-purple/5',  border: 'border-brand-purple/20' },
    amazon:   { name: 'Amazon.in',   emoji: '🛒', color: 'orange', bg: 'bg-orange-50',     border: 'border-orange-200'    },
    flipkart: { name: 'Flipkart',    emoji: '🏪', color: 'blue',   bg: 'bg-blue-50',       border: 'border-blue-200'      },
  }[platform];

  // Loading state
  if (isLoading && !isZoomeres) {
    return (
      <div className={`rounded-2xl border-2 ${config.border} ${config.bg} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{config.emoji}</span>
          <span className="font-bold text-slate-700 text-sm">{config.name}</span>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-2/3" />
          <div className="h-8 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Zoomeres card (always available)
  if (isZoomeres) {
    return (
      <div className={`rounded-2xl border-2 ${config.border} ${config.bg} p-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{config.emoji}</span>
          <span className="font-bold text-slate-700 text-sm">{config.name}</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">Simulation — always free</p>
        <div className="mb-3">
          <p className="text-2xl font-extrabold text-green-600">₹0.00</p>
          <p className="text-xs text-slate-400 line-through">{formatINR(fakePrice)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-600 mb-3">
          <CheckCircle size={12} /> <span>Always in virtual stock</span>
        </div>
        <button
          onClick={onAddToCart}
          className="w-full bg-brand-purple text-white font-bold py-2.5 rounded-xl text-sm
                     hover:bg-brand-purple-dark transition-colors active:scale-95 
                     flex items-center justify-center gap-1.5"
        >
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    );
  }

  // External platform (Amazon / Flipkart)
  const price      = data?.price;
  const inStock    = data?.inStock;
  const affUrl     = data?.affiliateUrl || data?.fallback;
  const isRedirect = data?.isRedirectOnly;
  const hasError   = data?.error;

  return (
    <div className={`rounded-2xl border-2 ${config.border} ${config.bg} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <span className="font-bold text-slate-700 text-sm">{config.name}</span>
        </div>
        {isRedirect && (
          <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
            Search
          </span>
        )}
      </div>

      {/* Status line */}
      {!price && !isRedirect && (
        <p className="text-xs text-slate-400 mb-2">
          {hasError ? '⚠️ Temporarily unavailable' : 'Price not available'}
        </p>
      )}
      {isRedirect && (
        <p className="text-xs text-slate-400 mb-2">See current price on site</p>
      )}

      {/* Price */}
      <div className="mb-3 min-h-[40px] flex flex-col justify-center">
        {price ? (
          <>
            <p className="text-2xl font-extrabold text-slate-900">{formatINR(price)}</p>
            {data?.mrp && data.mrp > price && (
              <p className="text-xs text-slate-400 line-through">{formatINR(data.mrp)}</p>
            )}
            {data?.savings && (
              <p className="text-xs text-green-600 font-medium">{data.savings} off</p>
            )}
          </>
        ) : (
          <p className="text-lg font-semibold text-slate-400">—</p>
        )}
      </div>

      {/* Stock status */}
      {price && (
        <div className={`flex items-center gap-1 text-xs mb-3 
          ${inStock ? 'text-green-600' : 'text-red-500'}`}>
          {inStock ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          <span>{inStock === null ? 'Check availability' : inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
      )}
      {!price && <div className="mb-3" />}

      {/* CTA Button */}
      {affUrl ? (
        <a
          href={affUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full font-bold py-2.5 rounded-xl text-sm transition-colors active:scale-95
                      flex items-center justify-center gap-1.5 text-white
                      ${isAmazon
                        ? 'bg-[#FF9900] hover:bg-[#e68900]'
                        : 'bg-blue-500 hover:bg-blue-600'
                      }`}
        >
          {isRedirect ? `Search on ${config.name}` : `Buy on ${config.name}`}
          <ExternalLink size={12} />
        </a>
      ) : (
        <div className="w-full bg-slate-100 text-slate-400 font-medium py-2.5 rounded-xl 
                        text-sm text-center cursor-not-allowed">
          Not Available
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function PriceComparison({ product, onAddToCart }) {
  const [priceData, setPriceData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrices = async (force = false) => {
    if (!product?.id) return;
    try {
      const url = `/api/products/${product.id}/prices${force ? '?refresh=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Price fetch failed');
      const data = await res.json();
      setPriceData(data);
      setLastUpdated(data.lastPriceUpdate || Date.now());
    } catch (err) {
      // On failure: build redirect-only fallback so UI never shows nothing
      const q = encodeURIComponent(product.name);
      setPriceData({
        amazonData: {
          affiliateUrl: `https://www.amazon.in/s?k=${q}`,
          isRedirectOnly: true,
          source: 'amazon',
        },
        flipkartData: {
          affiliateUrl: `https://www.flipkart.com/search?q=${q}`,
          isRedirectOnly: true,
          source: 'flipkart',
        },
        error: err.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPrices();
  }, [product?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrices(true);
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-base">
          💰 Price Comparison
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} />
              Updated {timeSince(lastUpdated)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1 text-xs text-brand-purple font-medium 
                       hover:underline disabled:opacity-40"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Three-column price cards — stacks on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PlatformCard
          platform="zoomeres"
          fakePrice={product?.price}
          onAddToCart={onAddToCart}
        />
        <PlatformCard
          platform="amazon"
          data={priceData?.amazonData || priceData?.fallbackUrls?.amazonUrl
            ? { affiliateUrl: priceData?.fallbackUrls?.amazonUrl, isRedirectOnly: true }
            : null}
          isLoading={loading}
        />
        <PlatformCard
          platform="flipkart"
          data={priceData?.flipkartData || priceData?.fallbackUrls?.flipkartUrl
            ? { affiliateUrl: priceData?.fallbackUrls?.flipkartUrl, isRedirectOnly: true }
            : null}
          isLoading={loading}
        />
      </div>

      {/* Affiliate disclaimer */}
      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        💡 Amazon &amp; Flipkart links are affiliate links. We earn a small commission on purchases — 
        at no extra cost to you. Prices shown may differ from actual site prices.
      </p>
    </div>
  );
}
