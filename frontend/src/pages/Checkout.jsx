// ============================================================
// Checkout — 2-step flow: Address → Payment → Confetti success
// ============================================================
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { MapPin, CreditCard, CheckCircle, Package } from 'lucide-react';
import useStore from '../store/useStore';
import LoginModal from '../components/LoginModal';
import { formatPrice, discountedPrice } from '../utils/api';
import toast from 'react-hot-toast';

const STEP_LABELS = ['Address', 'Payment'];

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { coupon, discount } = location.state || {};
  const [step, setStep]           = useState(1);
  const [orderId, setOrderId]     = useState(null);
  const [placedTotal, setPlacedTotal] = useState(0);  // virtual total shown on success screen
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState({
    name: '', phone: '', addressLine: '', city: '', pincode: '', state: '',
  });
  const [payment, setPayment] = useState({
    method: 'upi', upiId: '', cardNum: '', cardExp: '', cardCvv: '',
  });

  const { cart, isLoggedIn, user, placeOrder } = useStore(s => ({
    cart: s.cart,
    isLoggedIn: s.isLoggedIn,
    user: s.user,
    placeOrder: s.placeOrder,
  }));

  useEffect(() => {
    if (!isLoggedIn) setShowLogin(true);
    if (!cart.length && !orderId) navigate('/');
  }, [isLoggedIn, cart.length]);

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    const { name, phone, addressLine, pincode } = address;
    if (!name || !phone || !addressLine || !pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    setStep(2);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Compute real virtual total to store with the order
    const itemsTotal  = cart.reduce((sum, i) => sum + discountedPrice(i.price, i.discount) * i.qty, 0);
    const virtualTotal = Math.max(0, itemsTotal - (discount || 0));

    const order = await placeOrder(address, coupon, virtualTotal);
    if (!order) { toast.error('Something went wrong. Try again.'); setLoading(false); return; }

    setOrderId(order.id);
    setPlacedTotal(virtualTotal);
    setLoading(false);

    // Fire confetti!
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.6 },
      colors: ['#1E3A8A', '#F97316', '#F59E0B', '#10B981', '#EC4899'],
    });
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 80, origin: { x: 0 } }), 400);
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 80, origin: { x: 1 } }), 600);

    toast.success(`Order ${order.id} placed! You earned +25 coins! 🎉`);
  };

  // Success Screen
  if (orderId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm mx-auto animate-fade-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Order Placed! 🎉</h1>
          <p className="text-slate-500 mb-1">Your virtual order is confirmed</p>
          <div className="bg-brand-purple text-white font-mono font-bold text-xl px-6 py-3 
                          rounded-2xl inline-block my-4">
            #{orderId}
          </div>

          {/* Dopamine hit — show what they "saved" */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Virtual cart value</p>
            <p className="text-3xl font-extrabold text-green-600">
              {formatPrice(placedTotal)}
            </p>
            <p className="text-xs text-green-700 font-semibold mt-1">
              Yours for FREE! 🎊
            </p>
          </div>

          <p className="text-xs text-slate-400 mb-1">💸 Actually charged: <strong>₹0.00</strong> (Simulated)</p>
          <p className="text-sm text-amber-600 font-semibold mb-6">🪙 +25 coins added to your wallet!</p>

          <div className="flex gap-3 justify-center">
            <Link to={`/track/${orderId}`} className="btn-primary flex items-center gap-2">
              <Package size={16} /> Track Order
            </Link>
            <Link to="/" className="btn-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {showLogin && <LoginModal onClose={() => { if (!isLoggedIn) navigate('/'); setShowLogin(false); }} />}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                 ${step >= n ? 'bg-brand-purple text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {step > n ? '✓' : n}
                </div>
                <span className={`text-xs mt-1 ${step >= n ? 'text-brand-purple font-semibold' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 ${step > n ? 'bg-brand-purple' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Address */}
      {step === 1 && (
        <form onSubmit={handleAddressSubmit} className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-brand-purple" />
            <h2 className="font-bold text-slate-800 text-lg">Delivery Address</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1 font-medium">Full Name *</label>
              <input className="input-field" placeholder="Rahul Kumar"
                value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1 font-medium">Phone Number *</label>
              <input className="input-field" placeholder="9876543210" type="tel" maxLength={10}
                value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1 font-medium">Address *</label>
              <input className="input-field" placeholder="House No., Street, Colony"
                value={address.addressLine} onChange={e => setAddress(a => ({ ...a, addressLine: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">City</label>
              <input className="input-field" placeholder="Mumbai"
                value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Pincode *</label>
              <input className="input-field" placeholder="400001" maxLength={6}
                value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1 font-medium">State</label>
              <input className="input-field" placeholder="Maharashtra"
                value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="w-full btn-primary py-3 rounded-2xl">
            Continue to Payment →
          </button>
        </form>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <form onSubmit={handlePayment} className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-brand-purple" />
            <h2 className="font-bold text-slate-800 text-lg">Simulated Payment</h2>
          </div>

          {/* Payment method toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'upi', label: '📲 UPI' },
              { id: 'card', label: '💳 Card' },
              { id: 'cod', label: '💵 COD' },
            ].map(m => (
              <button key={m.id} type="button"
                onClick={() => setPayment(p => ({ ...p, method: m.id }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                            ${payment.method === m.id
                              ? 'bg-white shadow-sm text-brand-purple'
                              : 'text-slate-500'
                            }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {payment.method === 'upi' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">UPI ID</label>
              <input className="input-field" placeholder="yourname@upi"
                value={payment.upiId} onChange={e => setPayment(p => ({ ...p, upiId: e.target.value }))} />
            </div>
          )}

          {payment.method === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Card Number</label>
                <input className="input-field" placeholder="4111 1111 1111 1111" maxLength={19}
                  value={payment.cardNum} onChange={e => setPayment(p => ({ ...p, cardNum: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Expiry</label>
                  <input className="input-field" placeholder="MM/YY" maxLength={5}
                    value={payment.cardExp} onChange={e => setPayment(p => ({ ...p, cardExp: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">CVV</label>
                  <input className="input-field" placeholder="•••" type="password" maxLength={3}
                    value={payment.cardCvv} onChange={e => setPayment(p => ({ ...p, cardCvv: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {payment.method === 'cod' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              😄 Cash on Delivery selected! (Remember: nothing to actually pay)
            </div>
          )}

          {/* Order summary — shows real virtual prices */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
            <p className="font-semibold text-slate-700 mb-2">Order Summary</p>
            {/* Per-item breakdown */}
            {cart.slice(0, 3).map(item => (
              <div key={item.id} className="flex justify-between text-slate-600">
                <span className="truncate max-w-[60%]">{item.name} ×{item.qty}</span>
                <span>{formatPrice(discountedPrice(item.price, item.discount) * item.qty)}</span>
              </div>
            ))}
            {cart.length > 3 && (
              <p className="text-xs text-slate-400">+{cart.length - 3} more items</p>
            )}
            <div className="border-t border-slate-200 pt-1.5 mt-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(cart.reduce((s, i) => s + discountedPrice(i.price, i.discount) * i.qty, 0))}</span>
              </div>
              {coupon && discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({coupon})</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1.5 mt-1 text-slate-800">
                <span>Virtual Total</span>
                <span>{formatPrice(Math.max(0, cart.reduce((s, i) => s + discountedPrice(i.price, i.discount) * i.qty, 0) - (discount || 0)))}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 text-center">
            🔒 Your data is not stored. This is a simulation. No real transaction happens.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl 
                       text-lg transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>🎉 Pay ₹0.00 (Simulated)</>
            )}
          </button>
          <button type="button" onClick={() => setStep(1)}
            className="w-full text-slate-500 text-sm hover:text-slate-700 py-2">
            ← Back to Address
          </button>
        </form>
      )}
    </div>
  );
}
