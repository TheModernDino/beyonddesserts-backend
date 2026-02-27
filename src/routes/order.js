const express     = require('express');
const router      = express.Router();
const validateToken = require('../middleware/auth');
const { sendOrderEmail } = require('../services/emailService');
const { logOrderToSheet } = require('../services/sheetsService');

// POST /api/order
// Protected by token middleware
router.post('/', validateToken, async (req, res) => {
  const {
    orderId, name, phone, email, address, notes,
    items, total, paymentMethod,
    screenshot, screenshotName, timestamp
  } = req.body;

  // ── Basic input validation ────────────────────────────────────
  if (!orderId || !name || !phone || !address || !items || !total || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  // Screenshot required for non-COD orders
  if (paymentMethod !== 'Cash on Delivery' && !screenshot) {
    return res.status(400).json({ error: 'Payment screenshot required for this payment method' });
  }

  const orderData = {
    orderId, name, phone,
    email: email || '—',
    address,
    notes: notes || '—',
    items,
    total,
    paymentMethod,
    screenshot: screenshot || null,
    screenshotName: screenshotName || null,
    timestamp: timestamp || new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
  };

  console.log(`📦 New order received: ${orderId} from ${name}`);

  // ── Run email + sheets in parallel ───────────────────────────
  const results = await Promise.allSettled([
    sendOrderEmail(orderData),
    logOrderToSheet(orderData)
  ]);

  const emailResult  = results[0];
  const sheetsResult = results[1];

  const emailOk  = emailResult.status  === 'fulfilled';
  const sheetsOk = sheetsResult.status === 'fulfilled';

  if (!emailOk)  console.error('❌ Email failed:',  emailResult.reason?.message);
  else           console.log('✅ Email sent');

  if (!sheetsOk) console.error('❌ Sheets failed:', sheetsResult.reason?.message);
  else           console.log('✅ Sheet updated');

  // Always return 200 if order was at least received
  // Frontend success screen should show regardless of email/sheets status
  return res.status(200).json({
    success: true,
    orderId,
    email:  emailOk  ? 'sent'   : 'failed',
    sheets: sheetsOk ? 'logged' : 'failed'
  });
});

module.exports = router;
