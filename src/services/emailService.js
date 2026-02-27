const nodemailer = require('nodemailer');

// ── Create reusable transporter ───────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD  // Gmail App Password, NOT your login password
    }
  });
}

// ── Build HTML email body ─────────────────────────────────────────
function buildEmailHtml(order) {
  const itemRows = order.items.split('\n').map(line => {
    const parts = line.split('=');
    const itemName  = parts[0]?.trim() || line;
    const itemPrice = parts[1]?.trim() || '';
    return `
      <tr>
        <td style="padding:10px 14px; border-bottom:1px solid #2e2b22; color:#f0ead8; font-size:14px;">${itemName}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #2e2b22; color:#e8a020; font-weight:bold; text-align:right; font-size:14px;">${itemPrice}</td>
      </tr>`;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0f0d0a;">
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:30px auto;background:#0f0d0a;padding:30px;border-radius:16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="margin:0;font-size:2.2rem;color:#e8a020;">🍽 KainNa</h1>
      <p style="margin:6px 0 0;color:#8a8070;font-size:14px;">New order received!</p>
    </div>

    <!-- Order ID -->
    <div style="background:#1a1710;border:1px solid #2e2b22;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
      <p style="margin:0 0 4px;font-size:12px;color:#8a8070;text-transform:uppercase;letter-spacing:.1em;">Order ID</p>
      <p style="margin:0;font-size:1.1rem;font-weight:700;color:#e8a020;font-family:monospace;">${order.orderId}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#8a8070;">${order.timestamp}</p>
    </div>

    <!-- Customer Details -->
    <div style="background:#1a1710;border:1px solid #2e2b22;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
      <p style="margin:0 0 12px;font-size:12px;color:#8a8070;text-transform:uppercase;letter-spacing:.1em;font-weight:600;">Customer Details</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#8a8070;width:90px;">Name</td><td style="color:#f0ead8;font-weight:600;">${order.name}</td></tr>
        <tr><td style="padding:4px 0;color:#8a8070;">Phone</td><td style="color:#f0ead8;">${order.phone}</td></tr>
        <tr><td style="padding:4px 0;color:#8a8070;">Email</td><td style="color:#f0ead8;">${order.email}</td></tr>
        <tr><td style="padding:4px 0;color:#8a8070;">Address</td><td style="color:#f0ead8;">${order.address}</td></tr>
        ${order.notes !== '—' ? `<tr><td style="padding:4px 0;color:#8a8070;">Notes</td><td style="color:#e8a020;">${order.notes}</td></tr>` : ''}
      </table>
    </div>

    <!-- Order Items -->
    <div style="background:#1a1710;border:1px solid #2e2b22;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
      <p style="margin:0 0 12px;font-size:12px;color:#8a8070;text-transform:uppercase;letter-spacing:.1em;font-weight:600;">Order Items</p>
      <table style="width:100%;border-collapse:collapse;">
        ${itemRows}
        <tr>
          <td style="padding:14px 14px 4px;font-weight:700;color:#e8a020;font-size:16px;">TOTAL</td>
          <td style="padding:14px 14px 4px;font-weight:700;color:#e8a020;font-size:16px;text-align:right;">${order.total}</td>
        </tr>
      </table>
    </div>

    <!-- Payment -->
    <div style="background:#1a1710;border:1px solid #2e2b22;border-radius:12px;padding:16px 20px;margin-bottom:20px;font-size:14px;color:#f0ead8;">
      💳 <strong>Payment Method:</strong> ${order.paymentMethod}<br/>
      📎 <strong>Screenshot:</strong> ${order.screenshot ? 'Attached to this email ✅' : 'Not provided (Cash on Delivery)'}
    </div>

    <p style="text-align:center;color:#8a8070;font-size:12px;margin-top:24px;">
      Automated notification from your KainNa ordering website.
    </p>
  </div>
  </body>
  </html>`;
}

// ── Main export ───────────────────────────────────────────────────
async function sendOrderEmail(order) {
  const transporter = createTransporter();

  // Build attachments if screenshot was uploaded
  const attachments = [];
  if (order.screenshot && order.screenshotName) {
    try {
      // screenshot is base64 data URL: "data:image/png;base64,XXXX"
      const matches = order.screenshot.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        attachments.push({
          filename: order.screenshotName,
          content:  Buffer.from(matches[2], 'base64'),
          contentType: matches[1]
        });
      }
    } catch (err) {
      console.warn('⚠️  Could not attach screenshot:', err.message);
    }
  }

  const mailOptions = {
    from:        `"KainNa Orders" <${process.env.GMAIL_USER}>`,
    to:          process.env.OWNER_EMAIL,
    subject:     `🍽 New Order — ${order.orderId} (${order.total})`,
    html:        buildEmailHtml(order),
    attachments
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}

module.exports = { sendOrderEmail };
