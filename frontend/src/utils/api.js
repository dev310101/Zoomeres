// Centralized API calls with local fallback using seed data
const BASE = '/api';

export async function fetchProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/products?${query}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchProduct(id) {
  const res = await fetch(`${BASE}/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function toggleSponsored(id, sponsored, password) {
  const res = await fetch(`${BASE}/products/${id}/sponsored`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sponsored, password }),
  });
  if (!res.ok) throw new Error('Unauthorized or failed');
  return res.json();
}

export async function fetchInsights(password) {
  const res = await fetch(`${BASE}/admin/insights?password=${password}`);
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export const COUPONS = {
  SAVE50: { type: 'percent', value: 50, label: '50% OFF' },
  KHARIDO20: { type: 'percent', value: 20, label: '20% OFF' },
  FREESHIP: { type: 'flat', value: 99, label: 'Free Shipping (₹99 off)' },
};

export function applyCoupon(code, subtotal) {
  const c = COUPONS[code.toUpperCase()];
  if (!c) return { valid: false, discount: 0, label: '' };
  const discount = c.type === 'percent'
    ? Math.floor(subtotal * c.value / 100)
    : Math.min(c.value, subtotal);
  return { valid: true, discount, label: c.label };
}

export function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price);
}

export function discountedPrice(price, discountPct) {
  return Math.floor(price * (1 - discountPct / 100));
}

export const BADGE_META = {
  newcomer:       { emoji: '🌱', label: 'Newcomer' },
  first_order:    { emoji: '🛍️', label: 'First Order' },
  serial_shopper: { emoji: '🔥', label: 'Serial Shopper' },
  mega_shopper:   { emoji: '👑', label: 'Mega Shopper' },
  coin_collector: { emoji: '🪙', label: 'Coin Collector' },
  vip_shopper:    { emoji: '💎', label: 'VIP Shopper' },
};
