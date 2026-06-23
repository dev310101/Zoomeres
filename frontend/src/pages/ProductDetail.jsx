// ============================================================
// Product Detail Page
// Affiliate buttons, fake reviews, add-to-cart, related section
// ============================================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Shield, Truck, RotateCcw, ChevronLeft } from 'lucide-react';
import useStore from '../store/useStore';
import StarRating from '../components/StarRating';
import PriceComparison from '../components/PriceComparison';
import ReviewForm from '../components/ReviewForm';
import { fetchProduct, formatPrice, discountedPrice } from '../utils/api';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [animating, setAnimating] = useState(false);
  // Merges seed reviews with any user-added ones (optimistic)
  const [localReviews, setLocalReviews] = useState([]);

  const { addToCart, isLoggedIn } = useStore(s => ({
    addToCart: s.addToCart,
    isLoggedIn: s.isLoggedIn,
  }));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true);
    fetchProduct(id)
      .then(data => { setProduct(data); setSelectedImage(0); setLocalReviews(data.ratings || []); })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!isLoggedIn) { toast.error('Login to add to cart!'); return; }
    setAnimating(true);
    addToCart(product);
    toast.success('Added to cart! 🛒');
    setTimeout(() => setAnimating(false), 500);
  };

  // Affiliate clicks are now handled inside PriceComparison component

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="skeleton rounded-2xl h-80 bg-slate-200" />
          <div className="space-y-4">
            {[80, 60, 40, 100, 80].map((w, i) => (
              <div key={i} className={`skeleton h-4 bg-slate-200 rounded w-${w}% `} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl">😕</span>
        <p className="text-slate-500 mt-4 font-medium">Product not found</p>
        <button onClick={() => navigate('/products')} className="mt-4 btn-primary">
          Back to Products
        </button>
      </div>
    );
  }

  const finalPrice = discountedPrice(product.price, product.discount);
  const savings = product.price - finalPrice;

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-5">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-500 hover:text-brand-purple text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Images */}
        <div>
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 mb-3">
            {product.sponsored && (
              <span className="badge-sponsored">Sponsored</span>
            )}
            <img
              src={product.images?.[selectedImage] || `https://picsum.photos/seed/${product.id}/600/600`}
              alt={product.name}
              className="w-full h-72 md:h-96 object-contain bg-slate-50 p-3"
              onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/600/600`; }}
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`rounded-xl overflow-hidden border-2 transition-all
                              ${selectedImage === i ? 'border-brand-purple' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-16 h-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{product.brand}</p>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight mb-2">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={product.avgRating} size="base" />
            <span className="text-sm font-semibold text-slate-700">{product.avgRating}</span>
            <span className="text-xs text-slate-400">({product.ratings?.length} reviews)</span>
          </div>

          {/* Price */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-extrabold text-slate-900">{formatPrice(finalPrice)}</span>
              <span className="text-slate-400 line-through text-sm">{formatPrice(product.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {product.discount}% OFF
              </span>
              <span className="text-green-700 text-sm font-medium">
                You save {formatPrice(savings)} (virtually!)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">⚠️ This is a simulated price. No real payment required.</p>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mb-5">{product.description}</p>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: <Shield size={14} />, text: 'Virtual Guarantee' },
              { icon: <Truck size={14} />, text: 'Fake Fast Delivery' },
              { icon: <RotateCcw size={14} />, text: 'Easy Returns' },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1 bg-slate-50 rounded-xl p-2 text-center">
                <span className="text-brand-purple">{b.icon}</span>
                <span className="text-[10px] text-slate-500 font-medium">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Price Comparison Panel — Zoomeres + Amazon + Flipkart */}
          <PriceComparison
            product={product}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* Reviews */}
      <section>
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Customer Reviews</h2>

        {/* Rating summary — uses localReviews so count updates after user posts */}
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-slate-800">
              {localReviews.length
                ? (localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length).toFixed(1)
                : product.avgRating}
            </p>
            <StarRating
              rating={localReviews.length
                ? localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length
                : product.avgRating}
              size="base"
            />
            <p className="text-xs text-slate-400 mt-1">{localReviews.length} ratings</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = localReviews.filter(r => r.rating === star).length;
              const pct   = localReviews.length ? (count / localReviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-slate-500">{star}★</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write a review */}
        <div className="mb-5">
          <ReviewForm
            productId={product.id}
            onReviewAdded={(review) => setLocalReviews(prev => [review, ...prev])}
          />
        </div>

        {/* Review list */}
        <div className="space-y-3">
          {localReviews.map((r, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-purple text-white flex items-center
                                  justify-center text-xs font-bold uppercase">
                    {r.user?.[0]}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-800">{r.user}</span>
                    {r.date && (
                      <p className="text-[10px] text-slate-400">
                        {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <StarRating rating={r.rating} />
              </div>
              <p className="text-slate-600 text-sm">{r.comment}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
