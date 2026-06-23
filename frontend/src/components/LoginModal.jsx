// ============================================================
// LoginModal — mock auth, no password required
// UI looks premium and secure for MVP
// ============================================================
import React, { useState } from 'react';
import { X, ShoppingBag, Shield, Coins } from 'lucide-react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

export default function LoginModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useStore(s => s.login);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return toast.error('Enter a username');
    setLoading(true);
    try {
      await login(username.trim());
      toast.success(`Welcome to Zoomeres, ${username}! 🎉 +50 welcome coins!`);
      onClose();
    } catch {
      toast.error('Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-purple via-brand-purple-dark to-brand-pink p-6 text-white text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X size={20} />
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-3">
            <span className="text-3xl">⚡</span>
          </div>
          <h2 className="text-2xl font-extrabold">Zoomeres</h2>
          <p className="text-purple-200 text-sm mt-1">your ₹0 shopping playground 🛍️</p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Trust badges */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 flex items-center gap-1.5 bg-green-50 text-green-700 text-xs rounded-xl p-2.5">
              <Shield size={14} /> <span className="font-medium">100% Safe</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs rounded-xl p-2.5">
              <span className="text-base">🪙</span> <span className="font-medium">Get 50 free coins</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Choose your username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. ShopKing_Rahul"
                className="input-field"
                maxLength={30}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">No password needed. Just your vibe.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base rounded-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>⚡ let's gooo (it's free!)</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            by joining you agree this is 100% virtual.<br />
            no real money. ever. pinky promise 🤙
          </p>
        </div>
      </div>
    </div>
  );
}
