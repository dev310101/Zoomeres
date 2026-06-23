require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { issueAdminToken, requireAdmin } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : '*',
  credentials: true,
}));
app.use(express.json());

// Rate limit admin login: 5 attempts per 15 min per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const { products: seedProducts } = require('./seed');
let products  = [...seedProducts];
let orders    = [];
let users     = {};
let analytics = { searchKeywords: {}, couponUsage: {}, dailyActiveUsers: {} };

app.locals.products = products;

// Price sync routes (from Phase 2 work)
try {
  const productPriceRoutes = require('./routes/productRoutes');
  app.use('/api/products', productPriceRoutes);
} catch (e) { /* optional — price sync not required */ }

// ── ADMIN LOGIN (rate-limited, JWT response) ──────────────
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not set in .env' });
  }
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  try {
    const token = issueAdminToken();
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PRODUCTS (public) ─────────────────────────────────────
app.get('/api/products', (req, res) => {
  let result = [...products];
  const { category, search, sort } = req.query;
  if (category && category !== 'All')
    result = result.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
    analytics.searchKeywords[search] = (analytics.searchKeywords[search] || 0) + 1;
  }
  if (sort === 'price_asc')  result.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
  if (sort === 'rating')     result.sort((a, b) => b.avgRating - a.avgRating);
  res.json(result);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/products/:id/reviews — logged-in users only (userId from body)
app.post('/api/products/:id/reviews', (req, res) => {
  const { userId, rating, comment } = req.body;
  if (!userId || !rating || !comment?.trim())
    return res.status(400).json({ error: 'userId, rating, and comment required' });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be 1–5' });

  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const review = {
    user: userId, rating: parseInt(rating),
    comment: comment.trim().slice(0, 500),
    date: new Date().toISOString(),
  };
  products[idx].ratings = [...(products[idx].ratings || []), review];
  const all = products[idx].ratings;
  products[idx].avgRating = parseFloat(
    (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1)
  );
  res.status(201).json({ success: true, review, avgRating: products[idx].avgRating });
});

// ── ADMIN PRODUCT ROUTES (require JWT) ───────────────────
app.put('/api/products/:id/sponsored', requireAdmin, (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx].sponsored = Boolean(req.body.sponsored);
  res.json(products[idx]);
});

// ── ORDERS ────────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { userId, items, address } = req.body;
  if (!userId || !items?.length)
    return res.status(400).json({ error: 'userId and items required' });
  const orderId = `VIR-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder = {
    id: orderId, userId, items, address, totalAmount: 0,
    fakeOrderDate: new Date().toISOString(),
    trackingStatus: 'Order Placed',
    trackingStep: Math.floor(Math.random() * 3) + 1,
  };
  orders.push(newOrder);
  items.forEach(item => {
    const p = products.find(p => p.id === item.id);
    if (p) p.orderCount = (p.orderCount || 0) + 1;
  });
  const today = new Date().toISOString().split('T')[0];
  if (!analytics.dailyActiveUsers[today]) analytics.dailyActiveUsers[today] = new Set();
  analytics.dailyActiveUsers[today].add(userId);
  res.status(201).json(newOrder);
});

app.get('/api/orders/:userId', (req, res) => {
  res.json(orders.filter(o => o.userId === req.params.userId));
});

// ── USERS ─────────────────────────────────────────────────
app.post('/api/users/login', (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });
  const name = username.trim();
  if (!users[name]) {
    users[name] = {
      id: uuidv4(), username: name, virtualCoins: 50,
      dailyAdWatchCount: 0, lastAdWatchDate: null,
      joinDate: new Date().toISOString(), isVIP: false,
      loginStreak: 1, lastLoginDate: new Date().toISOString().split('T')[0],
      badges: ['newcomer'],
    };
  } else {
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (users[name].lastLoginDate === yesterday)
      users[name].loginStreak = (users[name].loginStreak || 1) + 1;
    else if (users[name].lastLoginDate !== today)
      users[name].loginStreak = 1;
    users[name].lastLoginDate = today;
  }
  res.json(users[name]);
});

app.patch('/api/users/:username/coins', (req, res) => {
  const u = users[req.params.username];
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.virtualCoins = (u.virtualCoins || 0) + req.body.amount;
  u.isVIP = u.virtualCoins > 500;
  const b = u.badges || [];
  if (u.virtualCoins >= 100 && !b.includes('coin_collector')) b.push('coin_collector');
  if (u.virtualCoins >= 500 && !b.includes('vip_shopper'))    b.push('vip_shopper');
  u.badges = b;
  res.json(u);
});

app.patch('/api/users/:username/watch-ad', (req, res) => {
  const u = users[req.params.username];
  if (!u) return res.status(404).json({ error: 'User not found' });
  const today = new Date().toISOString().split('T')[0];
  if (u.lastAdWatchDate !== today) { u.dailyAdWatchCount = 0; u.lastAdWatchDate = today; }
  if (u.dailyAdWatchCount >= 5)
    return res.status(429).json({ error: 'Daily ad limit reached' });
  u.dailyAdWatchCount++;
  u.virtualCoins = (u.virtualCoins || 0) + 10;
  u.isVIP = u.virtualCoins > 500;
  res.json(u);
});

// ── ADMIN ANALYTICS (require JWT) ────────────────────────
app.get('/api/admin/insights', requireAdmin, (req, res) => {
  res.json({
    totalOrders: orders.length,
    totalUsers:  Object.keys(users).length,
    topProducts: [...products]
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
      .slice(0, 10).map(p => ({ id: p.id, name: p.name, orderCount: p.orderCount || 0 })),
    topKeywords: Object.entries(analytics.searchKeywords).sort((a, b) => b[1] - a[1]).slice(0, 10),
    couponStats: Object.entries(analytics.couponUsage).sort((a, b) => b[1] - a[1]),
    dauData: Object.entries(analytics.dailyActiveUsers).map(([date, u]) => ({
      date, count: u instanceof Set ? u.size : u,
    })),
  });
});

app.post('/api/admin/track-coupon', (req, res) => {
  const { code } = req.body;
  if (code) analytics.couponUsage[code] = (analytics.couponUsage[code] || 0) + 1;
  res.json({ ok: true });
});

app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
  const rows = [
    ['Order ID', 'User', 'Items', 'Date', 'Status'],
    ...orders.map(o => [
      o.id, o.userId,
      (o.items || []).map(i => i.name).join(' | '),
      o.fakeOrderDate, o.trackingStatus,
    ]),
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=zoomeres-orders.csv');
  res.send(rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── STARTUP WARNINGS ──────────────────────────────────────
const missing = ['ADMIN_PASSWORD', 'JWT_SECRET'].filter(k => !process.env[k]);
if (missing.length)
  console.warn(`⚠️  Missing .env vars: ${missing.join(', ')} — copy .env.example to .env`);

app.listen(PORT, () => {
  console.log(`✅ Zoomeres backend on http://localhost:${PORT}`);
  console.log(`📦 ${products.length} products loaded`);
  console.log(`🔐 Admin: ${process.env.ADMIN_PASSWORD ? 'configured' : 'NOT CONFIGURED'}`);
});
