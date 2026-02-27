/**
 * Middleware: validate the secret token sent by the frontend.
 * The token is sent in the request header: x-api-token
 * This prevents random people from hitting your API endpoint directly.
 */
module.exports = function validateToken(req, res, next) {
  const token = req.headers['x-api-token'];

  if (!token) {
    return res.status(401).json({ error: 'Missing API token' });
  }

  if (token !== process.env.API_SECRET_TOKEN) {
    console.warn(`⚠️  Invalid token attempt from IP: ${req.ip}`);
    return res.status(403).json({ error: 'Invalid API token' });
  }

  next();
};
