import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-slate-300 mt-12 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-white font-extrabold text-lg mb-2">🛍️ Zoomeres</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              the ₹0 shopping playground for india's gen z. infinite dopamine, zero financial guilt.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-2">Explore</p>
            <div className="space-y-1.5 text-xs">
              {[['/', 'Home'], ['/products', 'Products'], ['/leaderboard', 'Leaderboard']].map(([to, label]) => (
                <div key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-2">Account</p>
            <div className="space-y-1.5 text-xs">
              {[['/dashboard', 'Dashboard'], ['/orders', 'My Orders'], ['/shop-coins', 'Shop Coins']].map(([to, label]) => (
                <div key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-2">Legal</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              ⚠️ This platform is a simulation. No real money is exchanged. No real products are delivered. For entertainment only.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-700 pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-500">© 2024 Zoomeres. 100% Virtual. 0% Real Transactions.</p>
          <p className="text-xs text-slate-500">
            Affiliate links may earn us a commission · built with ❤️ by zoomers, for zoomers
          </p>
        </div>
      </div>
    </footer>
  );
}
