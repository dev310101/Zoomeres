// ============================================================
// Zustand Global Store
// Manages: user auth, cart, coin balance, orders, analytics
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API = '/api';

const useStore = create(
  persist(
    (set, get) => ({
      // ── AUTH ──────────────────────────────────────────────
      user: null,
      isLoggedIn: false,

      login: async (username) => {
        try {
          const res = await fetch(`${API}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });
          const user = await res.json();
          set({ user, isLoggedIn: true });

          // Track daily login for analytics
          const today = new Date().toISOString().split('T')[0];
          const lastLogin = localStorage.getItem('nd_lastLogin');
          if (lastLogin !== today) {
            localStorage.setItem('nd_lastLogin', today);
            // Auto-award daily login bonus
            await get().addCoins(10, 'Daily Login Bonus');
          }
          return user;
        } catch {
          // Fallback: create local user when backend is down
          const user = {
            id: `local_${username}`,
            username,
            virtualCoins: 50,
            dailyAdWatchCount: 0,
            lastAdWatchDate: null,
            joinDate: new Date().toISOString(),
            isVIP: false,
            loginStreak: 1,
            badges: ['newcomer'],
          };
          set({ user, isLoggedIn: true });
          return user;
        }
      },

      logout: () => {
        set({ user: null, isLoggedIn: false, cart: [] });
      },

      // ── COINS ─────────────────────────────────────────────
      addCoins: async (amount, reason = '') => {
        const { user } = get();
        if (!user) return;

        try {
          const res = await fetch(`${API}/users/${user.username}/coins`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason }),
          });
          const updated = await res.json();
          set({ user: updated });
        } catch {
          // Local fallback
          set(state => ({
            user: {
              ...state.user,
              virtualCoins: (state.user?.virtualCoins || 0) + amount,
              isVIP: ((state.user?.virtualCoins || 0) + amount) > 500,
            }
          }));
        }
      },

      watchAd: async () => {
        const { user } = get();
        if (!user) return { success: false, message: 'Please login first' };

        // Check local daily limit
        const today = new Date().toISOString().split('T')[0];
        const key = `nd_adwatch_${user.username}_${today}`;
        const watched = parseInt(localStorage.getItem(key) || '0');
        if (watched >= 5) {
          return { success: false, message: 'Daily limit reached. Come back tomorrow!' };
        }

        try {
          const res = await fetch(`${API}/users/${user.username}/watch-ad`, {
            method: 'PATCH',
          });
          if (res.status === 429) return { success: false, message: 'Daily limit reached!' };
          const updated = await res.json();
          set({ user: updated });
          localStorage.setItem(key, String(watched + 1));
          return { success: true, coinsEarned: 10 };
        } catch {
          // Local fallback
          localStorage.setItem(key, String(watched + 1));
          await get().addCoins(10, 'Ad Watch');
          return { success: true, coinsEarned: 10 };
        }
      },

      // ── CART UI STATE (global so any component can open it)
      cartOpen: false,
      openCart:  () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),
      toggleCart: () => set(s => ({ cartOpen: !s.cartOpen })),

      // ── CART ITEMS ────────────────────────────────────────
      cart: [],

      addToCart: (product) => {
        set(state => {
          const existing = state.cart.find(i => i.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map(i =>
                i.id === product.id ? { ...i, qty: i.qty + 1 } : i
              )
            };
          }
          return { cart: [...state.cart, { ...product, qty: 1 }] };
        });
      },

      removeFromCart: (productId) => {
        set(state => ({ cart: state.cart.filter(i => i.id !== productId) }));
      },

      updateQty: (productId, qty) => {
        if (qty < 1) {
          get().removeFromCart(productId);
          return;
        }
        set(state => ({
          cart: state.cart.map(i => i.id === productId ? { ...i, qty } : i)
        }));
      },

      clearCart: () => set({ cart: [] }),

      cartCount: () => get().cart.reduce((sum, i) => sum + i.qty, 0),

      // ── ORDERS ────────────────────────────────────────────
      orders: [],

      placeOrder: async (address, coupon, virtualTotal = 0) => {
        const { cart, user } = get();
        if (!cart.length || !user) return null;

        const orderId = `VIR-${Math.floor(1000 + Math.random() * 9000)}`;
        const newOrder = {
          id: orderId,
          userId: user.username,
          items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, discount: i.discount })),
          address,
          coupon,
          totalAmount:  0,          // always ₹0 — real payment
          virtualTotal: virtualTotal, // what they "would have paid" — for dopamine display
          fakeOrderDate: new Date().toISOString(),
          trackingStatus: 'Order Placed',
          trackingStep: Math.floor(Math.random() * 3) + 1,
        };

        try {
          await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.username, items: newOrder.items, address }),
          });
        } catch { /* continue with local order */ }

        // Award coins for placing order
        await get().addCoins(25, 'Order Placed');

        // Check milestone badges
        const currentOrders = get().orders.length + 1;
        const updatedBadges = [...(user.badges || [])];
        if (currentOrders >= 1 && !updatedBadges.includes('first_order')) updatedBadges.push('first_order');
        if (currentOrders >= 5 && !updatedBadges.includes('serial_shopper')) updatedBadges.push('serial_shopper');
        if (currentOrders >= 10 && !updatedBadges.includes('mega_shopper')) updatedBadges.push('mega_shopper');
        set(state => ({ user: { ...state.user, badges: updatedBadges } }));

        // Save order locally and clear cart
        set(state => ({ orders: [newOrder, ...state.orders], cart: [] }));

        // Update leaderboard in localStorage
        const lb = JSON.parse(localStorage.getItem('nd_leaderboard') || '{}');
        lb[user.username] = (lb[user.username] || 0) + 1;
        localStorage.setItem('nd_leaderboard', JSON.stringify(lb));

        return newOrder;
      },

      // ── SEARCH ANALYTICS ──────────────────────────────────
      trackSearch: (keyword) => {
        if (!keyword.trim()) return;
        const data = JSON.parse(localStorage.getItem('nd_searches') || '{}');
        data[keyword] = (data[keyword] || 0) + 1;
        localStorage.setItem('nd_searches', JSON.stringify(data));
      },

      trackCoupon: (code) => {
        const data = JSON.parse(localStorage.getItem('nd_coupons') || '{}');
        data[code] = (data[code] || 0) + 1;
        localStorage.setItem('nd_coupons', JSON.stringify(data));
        fetch(`${API}/admin/track-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }).catch(() => {});
      },
    }),
    {
      name: 'zoomeres-store',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        cart: state.cart,
        orders: state.orders,
        // cartOpen intentionally excluded — always starts closed
      }),
    }
  )
);

export default useStore;
