// ============================================================
// Admin Insights — analytics dashboard
// Reads from backend + localStorage fallback
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, TrendingUp, Download, ChevronLeft, Search, Tag, Package, Users } from 'lucide-react';
import { fetchInsights } from '../utils/api';
import toast from 'react-hot-toast';

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Bar({ label, value, max, color = 'bg-brand-purple' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-600 w-28 truncate flex-shrink-0">{label}</p>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-bold text-slate-700 w-8 text-right">{value}</p>
    </div>
  );
}

export default function AdminInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check JWT token in sessionStorage (set by Admin.jsx on login)
    if (!sessionStorage.getItem('nd_admin_token')) {
      window.location.href = '/admin';
      return;
    }
    loadInsights();
  }, []);

  const authHeader = () => ({
    'Authorization': `Bearer ${sessionStorage.getItem('nd_admin_token')}`,
  });

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/insights', { headers: authHeader() });
      if (res.status === 401) { window.location.href = '/admin'; return; }
      if (!res.ok) throw new Error('Fetch failed');
      setData(await res.json());
    } catch {
      // Build from localStorage
      const store = JSON.parse(localStorage.getItem('zoomeres-store') || '{}');
      const orders = store?.state?.orders || [];
      const searches = JSON.parse(localStorage.getItem('nd_searches') || '{}');
      const coupons = JSON.parse(localStorage.getItem('nd_coupons') || '{}');

      // Count product orders from order items
      const productCounts = {};
      orders.forEach(o => (o.items || []).forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + 1;
      }));

      setData({
        totalOrders: orders.length,
        totalUsers: 1,
        topProducts: Object.entries(productCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, orderCount]) => ({ name, orderCount })),
        topKeywords: Object.entries(searches).sort((a, b) => b[1] - a[1]).slice(0, 10),
        couponStats: Object.entries(coupons).sort((a, b) => b[1] - a[1]),
        dauData: [{ date: new Date().toISOString().split('T')[0], count: 1 }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!data) return;
    try {
      const res = await fetch('/api/admin/export-csv', { headers: authHeader() });
      if (res.status === 401) { window.location.href = '/admin'; return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'zoomeres-insights.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Local fallback CSV from data state
      const rows = [
        ['Metric', 'Value'], ['Total Orders', data.totalOrders], ['Total Users', data.totalUsers], [''],
        ['Top Products (name, orders)'],
        ...(data.topProducts || []).map(p => [p.name, p.orderCount]),
        [''], ['Search Keywords (keyword, count)'],
        ...(data.topKeywords || []).map(([k, v]) => [k, v]),
      ];
      const csv  = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'zoomeres-insights.csv'; a.click();
    }
    toast.success('CSV exported!');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-20 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxProductOrders = Math.max(1, ...(data?.topProducts || []).map(p => p.orderCount));
  const maxKeywords = Math.max(1, ...(data?.topKeywords || []).map(([, v]) => v));
  const maxCoupons = Math.max(1, ...(data?.couponStats || []).map(([, v]) => v));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-slate-500 hover:text-slate-700">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <BarChart2 size={20} className="text-brand-purple" /> Market Insights
            </h1>
            <p className="text-slate-400 text-xs">Sell this data to brands and market research firms</p>
          </div>
        </div>
        <button onClick={handleExportCSV}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white 
                     font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
          <Download size={15} /> Export as CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Package size={16} className="text-brand-purple" />}
          label="Total Orders" value={data?.totalOrders || 0} sub="Virtual orders placed" />
        <StatCard icon={<Users size={16} className="text-brand-purple" />}
          label="Active Users" value={data?.totalUsers || 0} sub="Registered shoppers" />
        <StatCard icon={<Search size={16} className="text-brand-purple" />}
          label="Searches" value={data?.topKeywords?.length || 0} sub="Unique keywords" />
        <StatCard icon={<Tag size={16} className="text-brand-purple" />}
          label="Coupons Used" value={data?.couponStats?.reduce((s, [, v]) => s + v, 0) || 0} sub="Total redemptions" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="card p-4">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-orange" /> Top 10 Most "Purchased"
          </h2>
          {!data?.topProducts?.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No order data yet</p>
          ) : (
            <div className="space-y-2.5">
              {data.topProducts.map((p, i) => (
                <Bar key={i} label={p.name} value={p.orderCount} max={maxProductOrders}
                  color="bg-brand-purple" />
              ))}
            </div>
          )}
        </div>

        {/* Search Keywords */}
        <div className="card p-4">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Search size={16} className="text-green-500" /> Top Search Keywords
          </h2>
          {!data?.topKeywords?.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No search data yet. Use the search bar!</p>
          ) : (
            <div className="space-y-2.5">
              {data.topKeywords.map(([keyword, count], i) => (
                <Bar key={i} label={keyword} value={count} max={maxKeywords} color="bg-green-500" />
              ))}
            </div>
          )}
        </div>

        {/* Coupon Usage */}
        <div className="card p-4">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Tag size={16} className="text-purple-500" /> Coupon Code Usage
          </h2>
          {!data?.couponStats?.length ? (
            <p className="text-slate-400 text-sm text-center py-4">No coupons applied yet</p>
          ) : (
            <div className="space-y-2.5">
              {data.couponStats.map(([code, count], i) => (
                <Bar key={i} label={code} value={count} max={maxCoupons} color="bg-purple-500" />
              ))}
            </div>
          )}
        </div>

        {/* DAU */}
        <div className="card p-4">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-amber-500" /> Daily Active Users
          </h2>
          <div className="space-y-2.5">
            {(data?.dauData || []).slice(-7).map((d, i) => (
              <Bar key={i}
                label={new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                value={d.count}
                max={Math.max(1, ...(data?.dauData || []).map(x => x.count))}
                color="bg-amber-400"
              />
            ))}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-semibold">💡 Monetization Tip</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Package this data as "Indian E-commerce Consumer Behaviour Report" and sell to FMCG, 
              Fashion, and Tech brands for ₹5,000–₹50,000 per report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
