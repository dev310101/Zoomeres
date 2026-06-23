// ============================================================
// Dashboard — gamification hub, ad watch, badges, order history
// Features: Daily ad limit (5/day), VIP crown, streak display
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, PlayCircle, Clock, Package, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import { BADGE_META } from '../utils/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [adModal, setAdModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [adWatching, setAdWatching] = useState(false);
  const [coinsAnimating, setCoinsAnimating] = useState(false);

  const { user, isLoggedIn, orders, watchAd } = useStore(s => ({
    user: s.user,
    isLoggedIn: s.isLoggedIn,
    orders: s.orders,
    watchAd: s.watchAd,
  }));

  useEffect(() => {
    if (!isLoggedIn) navigate('/');
  }, [isLoggedIn]);

  // Daily ad watch count from localStorage
  const today = new Date().toISOString().split('T')[0];
  const adKey = `nd_adwatch_${user?.username}_${today}`;
  const [adWatchedToday, setAdWatchedToday] = useState(() =>
    parseInt(localStorage.getItem(adKey) || '0')
  );

  const handleWatchAd = () => {
    if (adWatchedToday >= 5) {
      toast.error('Daily limit reached! Come back tomorrow. 🌅');
      return;
    }
    setAdModal(true);
    setCountdown(5);
    setAdWatching(true);
  };

  useEffect(() => {
    if (!adWatching) return;
    if (countdown <= 0) {
      handleAdComplete();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, adWatching]);

  const handleAdComplete = async () => {
    setAdWatching(false);
    setAdModal(false);
    const result = await watchAd();
    if (result.success) {
      const newCount = adWatchedToday + 1;
      setAdWatchedToday(newCount);
      localStorage.setItem(adKey, String(newCount));
      setCoinsAnimating(true);
      setTimeout(() => setCoinsAnimating(false), 600);
      toast.success(`+10 coins earned! Watch ${5 - newCount} more today.`);
    } else {
      toast.error(result.message);
    }
  };

  const userIsVIP = user?.isVIP || (user?.virtualCoins >= 500);
  const coinsToVIP = Math.max(0, 500 - (user?.virtualCoins || 0));
  const vipProgress = Math.min(100, ((user?.virtualCoins || 0) / 500) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-brand-purple to-brand-purple-light text-white rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center 
                          text-2xl font-extrabold uppercase">
            {user?.username?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold">{user?.username}</h1>
              {userIsVIP && <span title="VIP Member" className="text-xl">👑</span>}
            </div>
            <p className="text-blue-200 text-xs">
              {userIsVIP ? '🌟 VIP Member' : `Member since ${new Date(user?.joinDate || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
            </p>
            <p className="text-blue-300 text-xs">🔥 {user?.loginStreak || 1} day streak</p>
          </div>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 mb-3">
          <span className={`text-3xl ${coinsAnimating ? 'coin-pop' : ''}`}>🪙</span>
          <div>
            <p className="text-2xl font-extrabold">{user?.virtualCoins || 0}</p>
            <p className="text-blue-200 text-xs">Virtual Coins</p>
          </div>
          <Link to="/shop-coins" className="ml-auto bg-brand-orange text-white text-xs 
                                            font-bold px-3 py-1.5 rounded-xl hover:bg-brand-orange-dark">
            Get More +
          </Link>
        </div>

        {/* VIP progress */}
        {!userIsVIP && (
          <div>
            <div className="flex justify-between text-xs text-blue-200 mb-1">
              <span>Progress to VIP</span>
              <span>{coinsToVIP} coins needed</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full">
              <div className="h-2 bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${vipProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Orders', val: orders.length, icon: '📦' },
          { label: 'Coins Earned', val: user?.virtualCoins || 0, icon: '🪙' },
          { label: 'Day Streak', val: user?.loginStreak || 1, icon: '🔥' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Watch Ad for Coins */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
              <PlayCircle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Watch Ad for +10 Coins</p>
              <p className="text-xs text-slate-400">{adWatchedToday}/5 watched today</p>
            </div>
          </div>
          <button
            onClick={handleWatchAd}
            disabled={adWatchedToday >= 5}
            className={`font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95
                        ${adWatchedToday >= 5
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
          >
            {adWatchedToday >= 5 ? '✅ Limit Reached' : '🎥 Watch Ad'}
          </button>
        </div>
        {/* Ad progress dots */}
        <div className="flex gap-1.5 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < adWatchedToday ? 'bg-red-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="card p-4 mb-5">
        <h2 className="font-bold text-slate-800 mb-3">🏆 Your Badges</h2>
        <div className="flex flex-wrap gap-2">
          {(user?.badges || ['newcomer']).map(badge => {
            const meta = BADGE_META[badge] || { emoji: '⭐', label: badge };
            return (
              <div key={badge} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 
                                          px-3 py-1.5 rounded-full text-sm font-medium text-slate-700">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </div>
            );
          })}
          {/* Locked badges */}
          {Object.entries(BADGE_META)
            .filter(([k]) => !(user?.badges || []).includes(k))
            .map(([k, meta]) => (
              <div key={k} className="flex items-center gap-1.5 bg-slate-50 border border-dashed 
                                       border-slate-200 px-3 py-1.5 rounded-full text-sm text-slate-300">
                <span>🔒</span>
                <span>{meta.label}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Order History */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">📦 Order History</h2>
          <Link to="/orders" className="text-xs text-brand-purple font-semibold">View All →</Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-4xl">📭</span>
            <p className="text-slate-400 text-sm mt-2">No orders yet. Start shopping!</p>
            <Link to="/" className="inline-block mt-3 btn-primary text-sm">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 3).map(order => (
              <Link key={order.id} to={`/track/${order.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-semibold text-sm text-slate-800 font-mono">#{order.id}</p>
                  <p className="text-xs text-slate-400">
                    {order.items?.length} items · {new Date(order.fakeOrderDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                    {order.trackingStatus || 'Processing'}
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Ad Modal */}
      {adModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center animate-fade-in">
            <div className="text-5xl mb-4">{countdown > 0 ? '📺' : '🎉'}</div>
            <h3 className="font-extrabold text-lg text-slate-800 mb-2">
              {countdown > 0 ? 'Ad is Playing...' : 'Ad Complete!'}
            </h3>
            <div className="w-20 h-20 rounded-full bg-brand-purple/10 border-4 border-brand-purple 
                            flex items-center justify-center mx-auto my-4">
              <span className="text-3xl font-extrabold text-brand-purple">{countdown}</span>
            </div>
            <p className="text-slate-400 text-sm mb-1">Simulated ad for demonstration</p>
            <p className="text-amber-600 font-semibold text-sm">+10 coins on completion 🪙</p>
            <div className="h-1.5 bg-slate-100 rounded-full mt-4">
              <div className="h-1.5 bg-brand-orange rounded-full transition-all"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
