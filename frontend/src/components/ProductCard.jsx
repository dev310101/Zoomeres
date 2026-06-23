// ============================================================
// ProductCard — used on Homepage, PLP, VIP Store
// Handles sponsored badge, VIP-only lock, add-to-cart animation
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Lock } from 'lucide-react';
import useStore from '../store/useStore';
import StarRating from './StarRating';
import { formatPrice, discountedPrice } from '../utils/api';
import toast from 'react-hot-toast';

export default function ProductCard({ product, showVIPLock = false }) {
  const [animating, setAnimating] = useState(false);
  const { addToCart, isLoggedIn, user } = useStore(s => ({
    addToCart: s.addToCart,
    isLoggedIn: s.isLoggedIn,
    user: s.user,
  }));

  const isVIPOnly = product.isVIPOnly;
  const userIsVIP = user?.isVIP || (user?.virtualCoins >= 500);
  const locked = isVIPOnly && !userIsVIP;

  const finalPrice = discountedPrice(product.price, product.discount);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.error('Login to add items to cart!');
      return;
    }
    if (locked) {
      toast.error('🔒 VIP exclusive! Earn 500+ coins to unlock.');
      return;
    }

    setAnimating(true);
    addToCart(product);
    toast.success(`${product.name} added to cart! 🛒`);
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div className={`card overflow-hidden group ${locked ? 'opacity-80' : ''}`}>
      {/* Image */}
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden">
        <div className="relative w-full pt-[100%] bg-slate-50">
          <img
            src={product.images?.[0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/400/400`; }}
          />

          {/* Badges */}
          {product.sponsored && (
            <span className="badge-sponsored">Sponsored</span>
          )}
          {isVIPOnly && (
            <span className="absolute top-2 right-2 badge-vip flex items-center gap-1">
              👑 VIP Only
            </span>
          )}
          {product.discount >= 50 && !product.sponsored && !isVIPOnly && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] 
                           font-bold px-2 py-0.5 rounded-full">
              {product.discount}% OFF
            </span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">
          {product.brand}
        </p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 
                         hover:text-brand-purple transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mt-1 mb-2">
          <StarRating rating={product.avgRating} />
          <span className="text-xs text-slate-400">({product.avgRating})</span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-base font-bold text-slate-900">
            {formatPrice(finalPrice)}
          </span>
          <span className="text-xs text-slate-400 line-through">
            {formatPrice(product.price)}
          </span>
          <span className="text-xs text-green-600 font-semibold">{product.discount}% off</span>
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold
                      transition-all duration-150 active:scale-95
                      ${locked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-brand-purple to-brand-pink text-white hover:opacity-90 shadow-sm hover:shadow-purple-200 hover:shadow-md'
                      }
                      ${animating ? 'add-to-cart-anim' : ''}`}
          disabled={locked}
        >
          {locked ? (
            <><Lock size={14} /> VIP only 🔒</>
          ) : (
            <><ShoppingCart size={14} /> add to cart ✨</>
          )}
        </button>
      </div>
    </div>
  );
}
