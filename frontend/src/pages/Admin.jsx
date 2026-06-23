// ============================================================
// Admin.jsx — Secure admin panel
// - Password sent to backend via POST (never in URL/query params)
// - JWT token stored in sessionStorage (cleared on tab close)
// - All admin API calls include Authorization: Bearer <token>
// - No password or token hardcoded anywhere in this file
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ToggleLeft, ToggleRight, BarChart2, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

const API = '/api';

// ── Auth helpers ──────────────────────────────────────────
function getToken()       { return sessionStorage.getItem('nd_admin_token'); }
function setToken(t)      { sessionStorage.setItem('nd_admin_token', t); }
function clearToken()     { sessionStorage.removeItem('nd_admin_token'); }
function authHeader()     { return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

export default function Admin() {
  const [authed, setAuthed]         = useState(false);
  const [pw, setPw]                 = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toggling, setToggling]     = useState(null);

  // Sync state
  const [syncStatus, setSyncStatus]     = useState(null);
  const [syncing, setSyncing]           = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [lastSynced, setLastSynced]     = useState(null);

  // Check for existing valid session on mount
  useEffect(() => {
    if (getToken()) {
      setAuthed(true);
      loadProducts();
      loadSyncStatus();
    }
  }, []);

  // ── Login ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res  = await fetch(`${API}/admin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      setToken(data.token);
      setAuthed(true);
      setPw('');
      loadProducts();
      loadSyncStatus();
    } catch {
      setLoginError('Cannot reach server. Is the backend running?');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setProducts([]);
    setSyncStatus(null);
  };

  // ── Products ───────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(data);
    } catch { toast.error('Failed to load products'); }
    finally  { setLoading(false); }
  }, []);

  const handleToggle = async (product) => {
    setToggling(product.id);
    try {
      const res = await fetch(`${API}/products/${product.id}/sponsored`, {
        method:  'PUT',
        headers: authHeader(),
        body:    JSON.stringify({ sponsored: !product.sponsored }),
      });
      if (res.status === 401) { handleLogout(); toast.error('Session expired — please log in again'); return; }
      if (!res.ok) throw new Error('Toggle failed');
      const updated = await res.json();
      setProducts(ps => ps.map(p => p.id === product.id ? updated : p));
      toast.success(`${product.name} — sponsored ${updated.sponsored ? 'ON ✅' : 'OFF'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  // ── Sync status ────────────────────────────────────────
  const loadSyncStatus = async () => {
    try {
      const res = await fetch(`${API}/admin/sync-status`, { headers: authHeader() });
      if (res.ok) setSyncStatus(await res.json());
    } catch { /* sync service optional */ }
  };

  // ── Sync prices via SSE stream ─────────────────────────
  const handleSyncPrices = () => {
    setSyncing(true);
    setSyncProgress({ current: 0, total: products.length, name: 'Starting...' });
    const token = getToken();
    // Note: EventSource doesn't support custom headers natively.
    // We pass the token as a query param for this SSE endpoint only.
    // The backend should validate it as a query param for this route.
    const url = `${API}/products/refresh-prices?token=${token}`;
    const evtSource = new EventSource(url);

    evtSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'progress') {
          setSyncProgress({ current: msg.current, total: msg.total, name: msg.name });
        } else if (msg.type === 'complete') {
          setSyncing(false); setSyncProgress(null);
          setLastSynced(new Date().toLocaleTimeString('en-IN'));
          evtSource.close(); loadSyncStatus();
          toast.success(`Sync complete: ${msg.results?.succeeded || 0} OK`);
        } else if (msg.type === 'error') {
          setSyncing(false); setSyncProgress(null);
          evtSource.close();
          toast.error(`Sync error: ${msg.message}`);
        }
      } catch { /* ignore parse errors */ }
    };
    evtSource.onerror = () => {
      setSyncing(false); setSyncProgress(null); evtSource.close();
      toast.error('Sync stream disconnected');
    };
  };

  // ── Export CSV ─────────────────────────────────────────
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API}/admin/export-csv`, { headers: authHeader() });
      if (res.status === 401) { handleLogout(); toast.error('Session expired'); return; }
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'zoomeres-orders.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch {
      // Local fallback
      const store  = JSON.parse(localStorage.getItem('zoomeres-store') || '{}');
      const orders = store?.state?.orders || [];
      const rows   = [
        ['Order ID', 'User', 'Items', 'Date', 'Status'],
        ...orders.map(o => [o.id, o.userId || '', (o.items || []).map(i => i.name).join(' | '), o.fakeOrderDate, o.trackingStatus]),
      ];
      const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'zoomeres-orders.csv'; a.click();
      toast.success('CSV exported from local data');
    }
  };

  // ── Login screen ───────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-brand-purple" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-800 mb-1">admin access 🔐</h1>
          <p className="text-slate-400 text-sm mb-5">enter the secret password to vibe in here</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setLoginError(''); }}
              placeholder="Admin password"
              className="input-field text-center"
              autoFocus
            />
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl py-2 px-3">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading || !pw}
              className="w-full btn-secondary py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loginLoading
                ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                : '🔐 Login as Admin'
              }
            </button>
          </form>
          <p className="text-xs text-slate-300 mt-4">password lives in the backend .env — ask your dev self</p>
        </div>
      </div>
    );
  }

  // ── Admin panel ────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Shield size={20} className="text-brand-purple" /> zoomeres admin ⚡
          </h1>
          <p className="text-slate-400 text-sm">manage all the zoomer stuff 🛍️</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/insights" className="flex items-center gap-1.5 btn-secondary text-sm">
            <BarChart2 size={15} /> Insights
          </Link>
          <button onClick={handleSyncPrices} disabled={syncing}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white 
                       font-semibold px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-60">
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Prices'}
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white 
                       font-semibold px-3 py-2 rounded-xl text-sm transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={handleLogout}
            className="text-red-500 hover:text-red-700 text-sm font-semibold px-3 py-2">
            Logout
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && syncProgress && (
        <div className="card p-4 mb-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">
              Syncing... ({syncProgress.current}/{syncProgress.total})
            </p>
            <span className="text-xs text-slate-400 truncate max-w-[200px]">{syncProgress.name}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full">
            <div className="h-2 bg-purple-500 rounded-full transition-all"
              style={{ width: `${syncProgress.total ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* API status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-1">
            {syncStatus?.amazon?.configured
              ? <Wifi size={14} className={syncStatus.amazon.state === 'CLOSED' ? 'text-green-500' : 'text-red-400'} />
              : <WifiOff size={14} className="text-slate-300" />}
            <span className="text-xs font-bold text-slate-700">Amazon PA-API</span>
          </div>
          <p className="text-xs text-slate-500">
            {syncStatus?.amazon?.configured
              ? `${syncStatus.amazon.state} · ${syncStatus.amazon.failures} failures`
              : 'Not configured — using redirect links'}
          </p>
          {lastSynced && <p className="text-[10px] text-slate-400 mt-1">Last sync: {lastSynced}</p>}
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-1">
            {syncStatus?.flipkart?.configured
              ? <Wifi size={14} className={syncStatus.flipkart.circuit === 'CLOSED' ? 'text-green-500' : 'text-red-400'} />
              : <WifiOff size={14} className="text-slate-300" />}
            <span className="text-xs font-bold text-slate-700">Flipkart</span>
          </div>
          <p className="text-xs text-slate-500">
            {syncStatus?.flipkart?.configured
              ? `${syncStatus.flipkart.circuit} · ${syncStatus.flipkart.cachedFeeds} feeds`
              : 'Not configured — using redirect links'}
          </p>
        </div>
        <div className="card p-3">
          <span className="text-xs font-bold text-slate-700">🗄️ Cache</span>
          <p className="text-xs text-slate-500 mt-1">
            {syncStatus?.priceCache
              ? `${syncStatus.priceCache.totalCached} cached · ${syncStatus.priceCache.knownFailures} failures`
              : 'No sync status loaded yet'}
          </p>
          <button onClick={loadSyncStatus} className="text-[10px] text-brand-purple mt-1 hover:underline">
            Refresh
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Products', val: products.length, icon: '📦' },
          { label: 'Sponsored', val: products.filter(p => p.sponsored).length, icon: '⭐' },
          { label: 'Categories', val: 5, icon: '🗂️' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Sponsored Toggles</h2>
          <button onClick={loadProducts} className="text-xs text-brand-purple font-semibold hover:underline">
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Category</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Price</th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Sponsored</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img src={product.images?.[0]} alt=""
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/50/50`; }} />
                        <span className="font-medium text-slate-800 text-xs line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-xs text-slate-600">
                      ₹{product.price?.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleToggle(product)} disabled={toggling === product.id}
                        className="flex items-center justify-center mx-auto transition-all">
                        {toggling === product.id
                          ? <span className="animate-spin rounded-full h-5 w-5 border-2 border-brand-purple border-t-transparent" />
                          : product.sponsored
                          ? <ToggleRight size={28} className="text-brand-orange" />
                          : <ToggleLeft  size={28} className="text-slate-300" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
