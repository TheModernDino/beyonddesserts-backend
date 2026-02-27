const { google } = require('googleapis');

// ── Authenticate with Google using Service Account ────────────────
function getAuthClient() {
  // The private key in .env has literal \n — convert to real newlines
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  privateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return auth;
}

// ── Ensure "Orders" sheet tab exists, create it if not ───────────
async function ensureSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.map(s => s.properties.title);

  if (!existing.includes('Orders')) {
    // Create the Orders tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: 'Orders' } } }]
      }
    });

    // Add header row to the new tab
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Orders!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Timestamp', 'Order ID', 'Customer Name', 'Phone',
          'Email', 'Address', 'Items', 'Total',
          'Payment Method', 'Screenshot', 'Notes'
        ]]
      }
    });
  }
}

// ── Main export ───────────────────────────────────────────────────
async function logOrderToSheet(order) {
  const auth          = getAuthClient();
  const sheets        = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Make sure the Orders tab exists
  await ensureSheet(sheets, spreadsheetId);

  // Append new order row
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range:            'Orders!A:K',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        order.timestamp,
        order.orderId,
        order.name,
        order.phone,
        order.email,
        order.address,
        order.items,
        order.total,
        order.paymentMethod,
        order.screenshot ? 'Yes ✅' : 'No',
        order.notes
      ]]
    }
  });

  return true;
}

module.exports = { logOrderToSheet };
