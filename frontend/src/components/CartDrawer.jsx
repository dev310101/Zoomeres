// ============================================================
// CartDrawer — slide-out cart panel
// Features: qty controls, coupon codes, price breakdown, checkout CTA
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Tag, Trash2, ShoppingBag } from 'lucide-react';
import useStore from '../store/useStore';
import { applyCoupon, formatPrice, discountedPrice } from '../utils/api';
import toast from 'react-hot-toast';

export default function CartDrawer({ onClose }) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const navigate = useNavigate();

  const { cart, updateQty, removeFromCart, trackCoupon } = useStore(s => ({
    cart: s.cart,
    updateQty: s.updateQty,
    removeFromCart: s.removeFromCart,
    trackCoupon: s.trackCoupon,
  }));

  // Virtual subtotal (for coupon display — always shown as ₹0 ultimately)
  const subtotal = cart.reduce((sum, item) => {
    return sum + discountedPrice(item.price, item.discount) * item.qty;
  }, 0);

  const couponResult = appliedCoupon
    ? applyCoupon(appliedCoupon, subtotal)
    : { valid: false, discount: 0, label: '' };

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponCode, subtotal);
    if (result.valid) {
      setAppliedCoupon(couponCode.toUpperCase());
      trackCoupon(couponCode.toUpperCase());
      toast.success(`Coupon applied: ${result.label} 🎉`);
    } else {
      toast.error('Invalid coupon code. Try: SAVE50, KHARIDO20, FREESHIP');
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout', { state: { coupon: appliedCoupon, discount: couponResult.discount } });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl 
                      flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-purple" />
            <h2 className="font-bold text-slate-800 text-lg">your cart 🛍️</h2>
            <span className="bg-brand-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-6xl mb-4">🛒</span>
              <p className="text-slate-500 font-medium">ur cart is empty... go shopping! 🛒</p>
              <p className="text-slate-400 text-sm mt-1">add some stuff and flex on the feed 😤</p>
              <button onClick={onClose} className="mt-4 btn-primary">
                Browse Products
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl">
                <img
                  src={item.images?.[0]}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  onError={e => { e.target.src = `https://picsum.photos/seed/${item.id}/100/100`; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                    {item.name}
                  </p>
                  <p className="text-brand-purple font-bold text-sm mt-1">
                    {formatPrice(discountedPrice(item.price, item.discount))}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom panel */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-4 space-y-4">
            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="SAVE50, KHARIDO20, FREESHIP"
                  className="input-field pl-8 text-xs"
                />
              </div>
              <button
                onClick={handleApplyCoupon}
                className="bg-brand-purple text-white px-3 py-2 rounded-xl text-sm font-semibold 
                           hover:bg-brand-purple-dark transition-colors"
              >
                Apply
              </button>
            </div>

            {/* Price breakdown */}
            <div className="space-y-1.5 text-sm">
              {/* MRP (before product discounts) */}
              <div className="flex justify-between text-slate-400">
                <span>MRP ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span className="line-through">
                  {formatPrice(cart.reduce((sum, item) => sum + item.price * item.qty, 0))}
                </span>
              </div>
              {/* Product discount savings */}
              <div className="flex justify-between text-green-600">
                <span>Product Discounts</span>
                <span>
                  −{formatPrice(
                    cart.reduce((sum, item) => sum + (item.price - discountedPrice(item.price, item.discount)) * item.qty, 0)
                  )}
                </span>
              </div>
              {/* Coupon discount */}
              {couponResult.valid && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon ({appliedCoupon})</span>
                  <span>−{formatPrice(couponResult.discount)}</span>
                </div>
              )}
              {/* Real total — what they'd actually pay on Amazon/Flipkart */}
              <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-100 pt-2">
                <span>Total Value</span>
                <span>{formatPrice(subtotal - (couponResult.discount || 0))}</span>
              </div>
              {/* Simulation note */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                <p className="text-green-700 font-bold text-sm">
                  You pay: ₹0.00 🎉
                </p>
                <p className="text-green-600 text-xs">
                  You're saving {formatPrice(subtotal - (couponResult.discount || 0))} — for FREE 🎊
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full btn-primary py-3 text-base rounded-2xl"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
