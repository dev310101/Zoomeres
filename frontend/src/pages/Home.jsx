// ============================================================
// Homepage — complete landing page with all monetization sections
// Sections: Hero, Categories, Flash Deals, Sponsored Picks,
//           Trending Now, VIP Store, Daily Login Bonus
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Star, Crown, Gift } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import useStore from '../store/useStore';
import { fetchProducts } from '../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Gadgets', 'Fashion', 'Beauty', 'Grocery', 'Gaming'];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const navigate = useNavigate();

  const { isLoggedIn, user, addCoins } = useStore(s => ({
    isLoggedIn: s.isLoggedIn,
    user: s.user,
    addCoins: s.addCoins,
  }));

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBonusClaimed(localStorage.getItem(`nd_bonus_${today}`) === '1');
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = activeCategory !== 'All' ? { category: activeCategory } : {};
    fetchProducts(params)
      .then(data => setProducts(data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleDailyBonus = async () => {
    if (!isLoggedIn) { toast.error('Login to claim your daily bonus!'); return; }
    const today = new Date().toISOString().split('T')[0];
    if (bonusClaimed) { toast('Already claimed today! Come back tomorrow 🌅', { icon: '⏰' }); return; }
    await addCoins(10, 'Daily Login Bonus');
    localStorage.setItem(`nd_bonus_${today}`, '1');
    setBonusClaimed(true);
    toast.success('🎉 +10 coins added! Come back tomorrow for more!');
  };

  // Derived product lists
  const flashDeals = products.filter(p => p.discount >= 60).slice(0, 4);
  const sponsored = products.filter(p => p.sponsored).slice(0, 4);
  const trending = products.filter(p => !p.isVIPOnly).slice(0, 8);
  const vipProducts = products.filter(p => p.isVIPOnly);
  const userIsVIP = user?.isVIP || (user?.virtualCoins >= 500);

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 pb-12">

      {/* ── Hero Banner ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl mt-4 mb-6 text-white"
               style={{ background: 'linear-gradient(135deg, #0F172A 0%, #4C1D95 50%, #1E1B4B 100%)' }}>
        {/* Decorative blobs — hidden on mobile */}
        <div className="absolute inset-0 overflow-hidden hidden md:block pointer-events-none">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-pink/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-48 h-48 bg-brand-cyan/15 rounded-full blur-2xl" />
          <div className="absolute top-10 right-40 text-6xl opacity-20">⚡</div>
          <div className="absolute bottom-8 right-16 text-5xl opacity-20">🛍️</div>
        </div>

        {/* Main content */}
        <div className="relative z-10 p-6 md:p-10 pb-6 md:pb-10">
          <span className="inline-block bg-gradient-to-r from-brand-pink to-brand-orange
                           text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            add to cart. not to your bill. ✨
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-3">
            shop like a<br />
            <span className="bg-gradient-to-r from-brand-pink via-brand-orange to-brand-cyan
                             bg-clip-text text-transparent">
              zoomer. 🔥
            </span>
          </h1>
          <p className="text-purple-200 text-sm md:text-base mb-6 max-w-md">
            browse, discover & "buy" your dream products — without spending a single rupee.
            it's the thrill of shopping with zero financial guilt.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-brand-pink to-brand-orange text-white font-bold
                         px-7 py-3.5 rounded-full hover:opacity-90 transition-all active:scale-95
                         shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
            >
              let's gooo 🚀
            </button>
            {!isLoggedIn && (
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('openLogin'))}
                className="bg-white/10 backdrop-blur-sm text-white font-semibold px-7 py-3.5
                           rounded-full hover:bg-white/20 transition-all border border-white/20"
              >
                join free → 50 coins 🪙
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 bg-white/5 backdrop-blur-sm px-6 py-3
                        flex gap-4 md:gap-8 text-xs text-purple-300 border-t border-white/10">
          {[
            { label: 'virtual orders', val: '2.4L+' },
            { label: 'products', val: '500+' },
            { label: 'zoomers', val: '18K+' },
          ].map(s => (
            <div key={s.label}>
              <span className="font-extrabold text-white text-sm">{s.val}</span>
              <span className="ml-1">{s.label}</span>
              <span className="ml-1">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Daily Login Bonus ────────────────────────────── */}
      <section className="mb-6">
        <div className={`relative overflow-hidden rounded-2xl p-4 flex items-center gap-4
                         ${bonusClaimed
                           ? 'bg-slate-100 border border-slate-200'
                           : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'
                         }`}>
          <div className={`text-3xl ${!bonusClaimed && 'animate-bounce'}`}>🎁</div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${bonusClaimed ? 'text-slate-500' : 'text-white'}`}>
              {bonusClaimed ? 'bonus claimed bestie ✅' : 'daily bonus is waiting for u 🎁'}
            </p>
            <p className={`text-xs ${bonusClaimed ? 'text-slate-400' : 'text-amber-100'}`}>
              {bonusClaimed
                ? 'come back tmrw for more 🌅'
                : 'tap to grab your free +10 coins rn 🪙'
              }
            </p>
          </div>
          <button
            onClick={handleDailyBonus}
            disabled={bonusClaimed}
            className={`flex-shrink-0 font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95
                        ${bonusClaimed
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-white text-amber-600 hover:bg-amber-50 shadow-md'
                        }`}
          >
            {bonusClaimed ? 'Claimed' : '+ Claim 10 🪙'}
          </button>
        </div>
      </section>

      {/* ── Category Pills ───────────────────────────────── */}
      <section className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold 
                          transition-all duration-150 active:scale-95
                          ${activeCategory === cat
                            ? 'bg-brand-purple text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-purple hover:text-brand-purple'
                          }`}
            >
              {cat === 'All' ? '🛍️ All' :
               cat === 'Gadgets' ? '📱 Gadgets' :
               cat === 'Fashion' ? '👗 Fashion' :
               cat === 'Beauty' ? '💄 Beauty' :
               cat === 'Grocery' ? '🛒 Grocery' :
               '🎮 Gaming'} 
            </button>
          ))}
        </div>
      </section>

      {/* ── Flash Deals ──────────────────────────────────── */}
      {(activeCategory === 'All' || flashDeals.length > 0) && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-brand-orange fill-brand-orange" />
              <h2 className="text-lg md:text-xl font-extrabold text-slate-800">flash deals 🔥</h2>
              <span className="bg-gradient-to-r from-brand-pink to-brand-orange text-white
                               text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                limited time
              </span>
            </div>
            <Link to="/products" className="text-brand-purple text-sm font-semibold hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {flashDeals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Sponsored Picks ──────────────────────────────── */}
      {(activeCategory === 'All') && sponsored.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={20} className="text-amber-400 fill-amber-400" />
              <h2 className="text-lg md:text-xl font-extrabold text-slate-800">sponsored picks ⭐</h2>
              <span className="text-xs text-slate-400 font-normal">(paid placement)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sponsored.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── VIP Exclusive Store ──────────────────────────── */}
      {vipProducts.length > 0 && (
        <section className="mb-8">
          <div className={`rounded-3xl p-5 md:p-6 mb-4
                           bg-gradient-to-br from-amber-50 to-amber-100 
                           border-2 border-amber-300`}>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={20} className="text-amber-500" />
              <h2 className="text-lg md:text-xl font-extrabold text-amber-800">VIP exclusive 👑</h2>
            </div>
            <p className="text-amber-600 text-sm mb-4">
              {userIsVIP
                ? `Welcome, VIP! 👑 Your crown unlocks these premium picks.`
                : `Earn 500+ coins to unlock exclusive luxury products! You have ${user?.virtualCoins || 0} coins.`
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              {vipProducts.map(p => (
                <ProductCard key={p.id} product={p} showVIPLock={!userIsVIP} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trending Now ─────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800">trending rn 📈</h2>
          </div>
          <Link to="/products" className="text-brand-purple text-sm font-semibold hover:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {trending.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* ── Affiliate CTA Banner ─────────────────────────── */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white text-center">
          <p className="text-sm text-slate-400 mb-1">Love what you see? Buy it for real!</p>
          <h3 className="text-xl font-bold mb-2">shop for real on amazon & flipkart 🛒</h3>
          <p className="text-slate-300 text-sm mb-4">
            We earn a small commission. It supports our platform at zero cost to you.
          </p>
          <div className="flex justify-center gap-3">
            <a href="https://www.amazon.in" target="_blank" rel="noopener noreferrer"
               className="bg-[#FF9900] text-black font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              🛒 Amazon.in
            </a>
            <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer"
               className="bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              🏪 Flipkart
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
