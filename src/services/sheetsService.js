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

// ── Ensure header row exists ──────────────────────────────────────
async function ensureHeaders(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:K1`
  });

  const existingRow = response.data.values?.[0];
  if (!existingRow || existingRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
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
  const sheetName     = 'Orders';

  // Make sure headers exist on first run
  await ensureHeaders(sheets, spreadsheetId, sheetName);

  // Append new order row
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range:            `${sheetName}!A:K`,
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
