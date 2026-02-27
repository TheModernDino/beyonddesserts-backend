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

  if (emailResult.status === 'rejected') {
    console.error('❌ Email failed:', emailResult.reason?.message);
  } else {
    console.log('✅ Email sent');
  }

  if (sheetsResult.status === 'rejected') {
    console.error('❌ Sheets logging failed:', sheetsResult.reason?.message);
  } else {
    console.log('✅ Sheet updated');
  }

  // Return success even if one service had an issue — order is received
  return res.status(200).json({
    success: true,
    orderId,
    email:  emailResult.status  === 'fulfilled' ? 'sent'   : 'failed',
    sheets: sheetsResult.status === 'fulfilled' ? 'logged' : 'failed'
  });
});

module.exports = router;
