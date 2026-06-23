// ============================================================
// middleware/auth.js — JWT-based admin authentication
//
// Flow:
//   POST /api/admin/login → verify password → issue JWT
//   All admin routes → verify JWT in Authorization header
//
// Security properties:
//   - Password lives only in .env (ADMIN_PASSWORD)
//   - Token signed with JWT_SECRET, expires in 1 hour
//   - Rate limited: 5 attempts per 15 minutes per IP (in server.js)
//   - Password never appears in logs or query strings
// ============================================================

const jwt = require('jsonwebtoken');

// ── Token generation ─────────────────────────────────────
function issueAdminToken() {
  const secret  = process.env.JWT_SECRET;
  const timeout = parseInt(process.env.ADMIN_SESSION_TIMEOUT || '3600');
  if (!secret) throw new Error('JWT_SECRET not set in .env');
  return jwt.sign({ role: 'admin', iat: Date.now() }, secret, { expiresIn: timeout });
}

// ── Token verification middleware ─────────────────────────
// Reads token from: Authorization: Bearer <token>
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing admin token' });
  }

  const token  = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[Auth] JWT_SECRET not configured in .env');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== 'admin') throw new Error('Not admin');
    req.admin = payload;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired — please log in again'
      : 'Invalid admin token';
    return res.status(401).json({ error: msg });
  }
}

module.exports = { issueAdminToken, requireAdmin };
