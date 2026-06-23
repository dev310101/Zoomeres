import React, { useState } from 'react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    coins: 100,
    price: 49,
    color: 'from-slate-100 to-slate-200',
    textColor: 'text-slate-700',
    badge: null,
    icon: '🪙',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    coins: 300,
    price: 129,
    originalPrice: 147,
    color: 'from-brand-purple to-brand-purple-light',
    textColor: 'text-white',
    badge: 'Most Popular • Save 12%',
    icon: '💎',
  },
  {
    id: 'mega',
    name: 'Mega Pack',
    coins: 800,
    price: 299,
    originalPrice: 392,
    color: 'from-amber-400 to-amber-500',
    textColor: 'text-amber-900',
    badge: 'Best Value • Save 24%',
    icon: '👑',
  },
];

export default function ShopCoins() {
  const [confirmModal, setConfirmModal] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const { addCoins, user, isLoggedIn } = useStore(s => ({
    addCoins: s.addCoins,
    user: s.user,
    isLoggedIn: s.isLoggedIn,
  }));

  const handleBuyNow = (pkg) => {
    setConfirmModal(pkg);
  };

  const handleSimulate = async () => {
    if (!confirmModal) return;
    setSimulating(true);
    await addCoins(confirmModal.coins, `Purchased ${confirmModal.name}`);
    setSimulating(false);
    setConfirmModal(null);
    toast.success(`🎉 ${confirmModal.coins} coins added to your wallet!`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">🪙 Shop Coins</h1>
        <p className="text-slate-500 text-sm">
          Use coins to unlock VIP products, flex on the leaderboard, and more.
        </p>
        {isLoggedIn && (
          <div className="inline-flex items-center gap-2 mt-3 bg-amber-50 border border-amber-200 
                          rounded-full px-4 py-1.5 text-amber-700 font-semibold text-sm">
            🪙 Your balance: {user?.virtualCoins || 0} coins
          </div>
        )}
      </div>

      {/* Packages */}
      <div className="space-y-4 mb-6">
        {PACKAGES.map(pkg => (
          <div key={pkg.id}
            className={`bg-gradient-to-br ${pkg.color} rounded-3xl p-5 relative overflow-hidden`}>
            {pkg.badge && (
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-xs 
                              font-bold px-2 py-0.5 rounded-full text-current">
                {pkg.badge}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl mb-1`}>{pkg.icon}</p>
                <h3 className={`font-extrabold text-lg ${pkg.textColor}`}>{pkg.name}</h3>
                <p className={`text-3xl font-extrabold ${pkg.textColor}`}>
                  {pkg.coins} Coins
                </p>
                {pkg.originalPrice && (
                  <p className={`text-xs opacity-70 ${pkg.textColor} line-through`}>
                    ₹{pkg.originalPrice} worth
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-2xl font-extrabold ${pkg.textColor}`}>₹{pkg.price}</p>
                <p className={`text-xs opacity-70 ${pkg.textColor} mb-3`}>one-time</p>
                <button
                  onClick={() => handleBuyNow(pkg)}
                  className={`font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 
                              ${pkg.id === 'pro'
                                ? 'bg-white text-brand-purple hover:bg-blue-50'
                                : pkg.id === 'mega'
                                ? 'bg-amber-800 text-white hover:bg-amber-900'
                                : 'bg-brand-purple text-white hover:bg-brand-purple-dark'
                              }`}
                >
                  Buy Now →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Free coin methods */}
      <div className="card p-4">
        <h3 className="font-bold text-slate-800 mb-3">🆓 Earn Coins for Free</h3>
        <div className="space-y-2">
          {[
            { icon: '🎁', text: 'Daily Login Bonus', coins: '+10/day' },
            { icon: '🛒', text: 'Place an Order', coins: '+25/order' },
            { icon: '🎥', text: 'Watch Ads (5/day)', coins: '+10/ad' },
            { icon: '👋', text: 'Welcome Bonus', coins: '+50 one-time' },
          ].map(item => (
            <div key={item.text} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-slate-700">{item.text}</span>
              </div>
              <span className="text-sm font-bold text-amber-600">{item.coins}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-fade-in">
            <div className="text-center mb-5">
              <p className="text-5xl mb-3">{confirmModal.icon}</p>
              <h3 className="font-extrabold text-xl text-slate-800">{confirmModal.name}</h3>
              <p className="text-slate-500 text-sm mt-1">
                {confirmModal.coins} Coins for ₹{confirmModal.price}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center mb-5">
              <p className="text-amber-800 font-semibold text-sm mb-2">
                🚧 Payment Gateway Coming Soon!
              </p>
              <p className="text-amber-600 text-xs">
                Real payment integration (Razorpay/Stripe) will be added soon.
                Click "Simulate Purchase" to demo the coin addition flow.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSimulate}
                disabled={simulating || !isLoggedIn}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 
                           rounded-2xl transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>🎮 Simulate Purchase (Add {confirmModal.coins} Coins)</>
                )}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            {!isLoggedIn && (
              <p className="text-center text-red-500 text-xs mt-2">Please login to purchase coins.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
