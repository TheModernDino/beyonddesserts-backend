require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const orderRoute = require('./routes/order');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── TRUST PROXY — required for Render.com (sits behind a proxy) ──
// This tells Express to trust the X-Forwarded-For header from Render
app.set('trust proxy', 1);

// ── CORS — only allow your frontend ─────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',   // for local testing with Live Server
  'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman during dev)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'x-api-token']
}));

// ── BODY PARSING ─────────────────────────────────────────────────
// Increase limit to 10mb to handle base64 payment screenshots
app.use(express.json({ limit: '10mb' }));

// ── RATE LIMITING — prevent spam ─────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 orders per 15 min per IP
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/order', limiter);

// ── ROUTES ────────────────────────────────────────────────────────
app.use('/api/order', orderRoute);

// Health check — Render.com uses this to confirm service is alive
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'KainNa Backend' }));

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍽  KainNa Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
