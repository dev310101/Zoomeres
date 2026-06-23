// ============================================================
// Navbar — sticky header with search, cart badge, coins display
// Mobile-first: collapses search on small screens
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, X } from 'lucide-react';
import useStore from '../store/useStore';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Allow any component to open login modal via custom event
  useEffect(() => {
    const handler = () => setShowLogin(true);
    document.addEventListener('openLogin', handler);
    return () => document.removeEventListener('openLogin', handler);
  }, []);

  const { isLoggedIn, user, logout, cart, trackSearch, openCart } = useStore(s => ({
    isLoggedIn:  s.isLoggedIn,
    user:        s.user,
    logout:      s.logout,
    cart:        s.cart,
    trackSearch: s.trackSearch,
    openCart:    s.openCart,
  }));

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    trackSearch(query.trim());
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    setShowSearch(false);
    setQuery('');
  };

  return (
    <>
      {/* ── Simulation Banner ─────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-pink to-brand-purple text-white text-center py-1.5 px-4 text-xs font-bold tracking-wide z-50 relative">
        ⚡ SIMULATION MODE — 100% virtual, ₹0 charged, all dopamine. It's just for fun!
      </div>

      {/* ── Main Navbar ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-dark via-brand-purple-dark to-brand-dark shadow-lg shadow-purple-900/20">
        <div className="max-w-7xl mx-auto px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 h-14 md:h-16">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="text-xl md:text-2xl">⚡</span>
              <div className="leading-none">
                <span className="font-extrabold text-base md:text-xl tracking-tight">
                  <span className="text-white">Zoom</span><span className="text-brand-pink">eres</span>
                </span>
                <span className="hidden md:block text-purple-300 text-[10px] font-medium -mt-0.5">
                  Add to cart. Not to your bill.
                </span>
              </div>
            </Link>

            {/* Search — desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search products, brands, vibes..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl text-sm bg-white/10 
                             text-white placeholder-blue-300 border border-white/20
                             focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white">
                  <Search size={16} />
                </button>
              </div>
            </form>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-1 md:gap-2">

              {/* Mobile search toggle */}
              <button
                onClick={() => setShowSearch(v => !v)}
                className="md:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Search size={20} />
              </button>

              {/* Coins display */}
              {isLoggedIn && (
                <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 
                  bg-amber-400/20 text-amber-300 px-3 py-1.5 rounded-xl text-sm font-semibold
                  hover:bg-amber-400/30 transition-colors">
                  🪙 {user?.virtualCoins || 0}
                  {user?.isVIP && <span title="VIP Member">👑</span>}
                </Link>
              )}

              {/* Cart — button opens drawer via Zustand (no route navigation) */}
              <button
                onClick={openCart}
                className="relative text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-orange text-white text-[10px] 
                                   font-bold min-w-[18px] h-[18px] flex items-center justify-center 
                                   rounded-full px-1 animate-bounce-cart">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User menu */}
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 text-white hover:bg-white/10 
                               rounded-xl px-2 py-1.5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-orange flex items-center justify-center 
                                    font-bold text-sm uppercase">
                      {user?.username?.[0]}
                    </div>
                    <span className="hidden md:block text-sm font-medium max-w-[80px] truncate">
                      {user?.username}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl 
                                    border border-slate-100 overflow-hidden z-50 animate-fade-in">
                      <div className="p-3 border-b border-slate-100">
                        <p className="font-semibold text-slate-800 text-sm">{user?.username}</p>
                        <p className="text-xs text-slate-500">🪙 {user?.virtualCoins} coins</p>
                      </div>
                      {[
                        { to: '/dashboard', label: '📊 My Dashboard' },
                        { to: '/orders', label: '📦 My Orders' },
                        { to: '/shop-coins', label: '🪙 Shop Coins' },
                        { to: '/leaderboard', label: '🏆 Leaderboard' },
                      ].map(item => (
                        <Link key={item.to} to={item.to}
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 
                                   hover:bg-red-50 transition-colors border-t border-slate-100">
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-1.5 bg-brand-orange text-white text-sm 
                             font-semibold px-3 py-2 rounded-xl hover:bg-brand-orange-dark 
                             transition-colors active:scale-95">
                  <User size={16} /> Login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        {showSearch && (
          <div className="md:hidden border-t border-white/10 px-3 py-2 bg-brand-purple">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white 
                           placeholder-blue-300 text-sm focus:outline-none focus:bg-white/20
                           border border-white/20"
              />
              <button type="submit" className="bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Go
              </button>
              <button type="button" onClick={() => setShowSearch(false)} className="text-white p-2">
                <X size={18} />
              </button>
            </form>
          </div>
        )}
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
}
