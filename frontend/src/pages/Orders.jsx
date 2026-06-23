import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice } from '../utils/api';

const STATUS_COLORS = {
  'Order Placed': 'bg-blue-100 text-blue-700',
  'Packed': 'bg-purple-100 text-purple-700',
  'Shipped': 'bg-amber-100 text-amber-700',
  'Out for Delivery': 'bg-orange-100 text-orange-700',
  'Delivered': 'bg-green-100 text-green-700',
};

export default function Orders() {
  const { orders, isLoggedIn } = useStore(s => ({
    orders: s.orders,
    isLoggedIn: s.isLoggedIn,
  }));
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl">🔐</span>
        <p className="text-slate-500 mt-4 font-medium">Please login to view your orders</p>
        <button onClick={() => navigate('/')} className="mt-4 btn-primary">Go Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-slate-800 mb-5 flex items-center gap-2">
        <Package size={22} className="text-brand-purple" /> My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 card p-8">
          <ShoppingBag size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-500">No virtual orders yet!</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Add items to cart and checkout to place your first order.</p>
          <Link to="/" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const statusColor = STATUS_COLORS[order.trackingStatus] || 'bg-slate-100 text-slate-600';
            return (
              <Link key={order.id} to={`/track/${order.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-brand-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 font-mono text-sm">#{order.id}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {order.items?.length || 0} items ·{' '}
                    {new Date(order.fakeOrderDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {order.trackingStatus || 'Order Placed'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {order.virtualTotal ? formatPrice(order.virtualTotal) : '—'}
                    </span>
                    <span className="text-[10px] text-green-600 font-semibold">Paid ₹0</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
