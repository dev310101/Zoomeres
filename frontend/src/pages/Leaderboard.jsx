// ============================================================
// Leaderboard — top 5 virtual shoppers by order count
// Data stored in localStorage under nd_leaderboard
// Includes streak badges and rank indicators
// ============================================================
import React, { useState, useEffect } from 'react';
import { Trophy, Flame, ShoppingBag } from 'lucide-react';
import useStore from '../store/useStore';

const RANK_STYLES = [
  { bg: 'bg-amber-50 border-amber-300', icon: '🥇', label: '1st' },
  { bg: 'bg-slate-100 border-slate-300', icon: '🥈', label: '2nd' },
  { bg: 'bg-orange-50 border-orange-300', icon: '🥉', label: '3rd' },
  { bg: 'bg-white border-slate-200', icon: '4️⃣', label: '4th' },
  { bg: 'bg-white border-slate-200', icon: '5️⃣', label: '5th' },
];

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const { user, orders } = useStore(s => ({ user: s.user, orders: s.orders }));

  useEffect(() => {
    // Seed leaderboard with demo entries if empty
    const lb = JSON.parse(localStorage.getItem('nd_leaderboard') || '{}');

    // Inject current user's real count
    if (user?.username) lb[user.username] = orders.length;

    // Add demo users if leaderboard is sparse
    const defaults = {
      'ShopKing_Rahul': 47, 'SaleQueen_Priya': 39, 'DealHunter99': 31,
      'BargainBhai': 24, 'FlipMaster_Raj': 18,
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (!lb[k]) lb[k] = v;
    });

    const sorted = Object.entries(lb)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, count], i) => ({ username, count, rank: i + 1 }));

    setLeaders(sorted);
  }, [orders.length, user?.username]);

  const userRank = leaders.findIndex(l => l.username === user?.username) + 1;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 
                        bg-amber-100 rounded-2xl mb-3">
          <Trophy size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Virtual Shoppers Leaderboard</h1>
        <p className="text-slate-400 text-sm mt-1">Top 5 most active virtual shoppers this week</p>
      </div>

      {/* User's rank callout */}
      {user && userRank > 0 && (
        <div className="bg-brand-purple text-white rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs">Your Current Rank</p>
            <p className="font-extrabold text-2xl">#{userRank}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">Your Orders</p>
            <p className="font-bold text-lg">{orders.length}</p>
          </div>
          <div className="text-4xl">
            {userRank === 1 ? '🏆' : userRank <= 3 ? '🎖️' : '💪'}
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="space-y-3 mb-6">
        {leaders.map((leader, i) => {
          const style = RANK_STYLES[i] || RANK_STYLES[4];
          const isCurrentUser = leader.username === user?.username;
          return (
            <div key={leader.username}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all
                          ${style.bg}
                          ${isCurrentUser ? 'ring-2 ring-brand-purple ring-offset-2' : ''}`}>
              <span className="text-2xl flex-shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  {leader.username}
                  {isCurrentUser && (
                    <span className="text-xs bg-brand-purple text-white px-2 py-0.5 rounded-full">You</span>
                  )}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <ShoppingBag size={11} /> {leader.count} orders
                  </span>
                  {/* Show a random streak for demo */}
                  <span className="flex items-center gap-1 text-xs text-orange-500">
                    <Flame size={11} /> {Math.max(1, Math.floor(leader.count / 5))} day streak
                  </span>
                </div>
              </div>
              {/* Virtual coins estimate */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-amber-600 text-sm">
                  🪙 {leader.count * 25 + 50}
                </p>
                <p className="text-xs text-slate-400">coins</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak achievement info */}
      <div className="card p-4">
        <h3 className="font-bold text-slate-800 mb-3">🔥 Daily Streak Rewards</h3>
        <div className="space-y-2">
          {[
            { days: 3, reward: 'Bonus +30 coins', icon: '🌱' },
            { days: 7, reward: 'Bonus +75 coins + Badge', icon: '⭐' },
            { days: 14, reward: 'Bonus +200 coins + VIP boost', icon: '🔥' },
            { days: 30, reward: 'Mega +500 coins + Legend badge', icon: '👑' },
          ].map(s => (
            <div key={s.days} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span>{s.icon}</span>
                <span className="text-sm font-medium text-slate-700">{s.days}-Day Streak</span>
              </div>
              <span className="text-xs font-bold text-green-600">{s.reward}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
