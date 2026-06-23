import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, CheckCircle } from 'lucide-react';
import useStore from '../store/useStore';
import { formatPrice, discountedPrice } from '../utils/api';

const STEPS = [
  { label: 'Order Placed', icon: '📋', desc: 'Your virtual order is confirmed!' },
  { label: 'Packed', icon: '📦', desc: 'Items carefully packed by our virtual team' },
  { label: 'Shipped', icon: '🚚', desc: 'On the way! Tracking ID: ND-789-KR' },
  { label: 'Out for Delivery', icon: '🛵', desc: 'Your delivery partner is nearby!' },
  { label: 'Delivered', icon: '🎉', desc: 'Delivered successfully! Enjoy!' },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(true);
  const orders = useStore(s => s.orders);

  const order = orders.find(o => o.id === orderId) || {
    id: orderId,
    fakeOrderDate: new Date().toISOString(),
    items: [],
    trackingStep: Math.floor(Math.random() * 3) + 1,
  };

  const targetStep = order.trackingStep || 2;

  useEffect(() => {
    // Animate progress bar step by step
    let i = 0;
    const interval = setInterval(() => {
      if (i >= targetStep) { clearInterval(interval); setAnimating(false); return; }
      i++;
      setCurrentStep(i);
    }, 600);
    return () => clearInterval(interval);
  }, [targetStep]);

  const progressPct = Math.min(100, (currentStep / (STEPS.length - 1)) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Track Your Order</h1>
            <p className="text-brand-purple font-mono font-bold text-xl">#{order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Placed on</p>
            <p className="text-sm font-semibold text-slate-700">
              {new Date(order.fakeOrderDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
            <p className="text-slate-700 font-bold text-lg">
              {order.virtualTotal ? formatPrice(order.virtualTotal) : '—'}
            </p>
            <p className="text-xs text-green-600 font-semibold">Paid ₹0.00 (Simulated)</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-slate-800 mb-5">Delivery Progress</h2>

        {/* Bar */}
        <div className="relative mb-8">
          <div className="h-2 bg-slate-100 rounded-full">
            <div
              className="h-2 bg-gradient-to-r from-brand-purple to-green-500 rounded-full progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="absolute inset-0 flex justify-between items-center">
            {STEPS.map((_, i) => (
              <div key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-500
                            ${i <= currentStep
                              ? 'bg-brand-purple border-brand-purple'
                              : 'bg-white border-slate-300'
                            }`}
              />
            ))}
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all
                            ${active ? 'bg-brand-purple/5 border border-brand-purple/20' : ''}
                            ${!done && !active ? 'opacity-40' : ''}`}
              >
                <span className={`text-xl flex-shrink-0 ${active ? 'animate-bounce' : ''}`}>
                  {done ? '✅' : step.icon}
                </span>
                <div>
                  <p className={`font-semibold text-sm ${active ? 'text-brand-purple' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.label}
                    {active && animating && (
                      <span className="ml-2 text-xs bg-brand-orange text-white px-2 py-0.5 rounded-full animate-pulse">
                        Current
                      </span>
                    )}
                  </p>
                  {(done || active) && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order items */}
      {order.items?.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold text-slate-800 mb-3">Order Items</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {formatPrice(discountedPrice(item.price || 0, 0))}
                </p>
              </div>
            ))}
            <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
              <span>Virtual Total</span>
              <span>{order.virtualTotal ? formatPrice(order.virtualTotal) : '—'}</span>
            </div>
            <div className="flex justify-between text-green-600 font-bold text-sm">
              <span>Actually Paid</span>
              <span>₹0.00 🎉</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/" className="flex-1 btn-primary text-center py-3 rounded-2xl">
          Continue Shopping
        </Link>
        <Link to="/dashboard" className="flex-1 btn-secondary text-center py-3 rounded-2xl">
          My Dashboard
        </Link>
      </div>
    </div>
  );
}
