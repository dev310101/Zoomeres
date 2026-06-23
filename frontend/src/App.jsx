// ============================================================
// App.jsx — root router + error boundary + scroll restoration
// Cart state now lives in Zustand (no more prop drilling)
// ============================================================
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import useStore from './store/useStore';

const Home          = lazy(() => import('./pages/Home'));
const ProductList   = lazy(() => import('./pages/ProductList'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout      = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Orders        = lazy(() => import('./pages/Orders'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const ShopCoins     = lazy(() => import('./pages/ShopCoins'));
const Leaderboard   = lazy(() => import('./pages/Leaderboard'));
const Admin         = lazy(() => import('./pages/Admin'));
const AdminInsights = lazy(() => import('./pages/AdminInsights'));
const NotFound      = lazy(() => import('./pages/NotFound'));

// ── ScrollToTop: fixes "page loads at bottom" bug ────────
// Runs on every route change and scrolls window to top
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <span className="text-6xl mb-4">💥</span>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6">{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-6 py-3 rounded-2xl">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Inner app reads cart state from Zustand ───────────────
function AppInner() {
  const { cartOpen, closeCart } = useStore(s => ({
    cartOpen:  s.cartOpen,
    closeCart: s.closeCart,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ScrollToTop />
      <Navbar />
      {cartOpen && <CartDrawer onClose={closeCart} />}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/products"       element={<ProductList />} />
            <Route path="/product/:id"    element={<ProductDetail />} />
            <Route path="/checkout"       element={<Checkout />} />
            <Route path="/track/:orderId" element={<OrderTracking />} />
            <Route path="/orders"         element={<Orders />} />
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/shop-coins"     element={<ShopCoins />} />
            <Route path="/leaderboard"    element={<Leaderboard />} />
            <Route path="/admin"          element={<Admin />} />
            <Route path="/admin/insights" element={<AdminInsights />} />
            <Route path="*"               element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppInner />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: '14px',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: '500',
              padding: '10px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
