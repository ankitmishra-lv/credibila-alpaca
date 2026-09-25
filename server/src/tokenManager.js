// Exchanges your client_id/client_secret for a short-lived OAuth2 access
// token, and caches it in memory until shortly before it expires.
// Alpaca's docs are explicit: don't request a new token on every call.

let cachedToken = null;   // { access_token, expires_at (ms epoch) }
let inFlight = null;      // dedupe concurrent refreshes

async function fetchNewToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.ALPACA_CLIENT_ID,
    client_secret: process.env.ALPACA_CLIENT_SECRET,
  });

  const res = await fetch(process.env.ALPACA_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json(); // { access_token, expires_in, token_type }
  const expiresInMs = (data.expires_in || 899) * 1000;

  // Refresh 60s before actual expiry to be safe.
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + expiresInMs - 60_000,
  };
  return cachedToken.access_token;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }
  if (!inFlight) {
    inFlight = fetchNewToken().finally(() => { inFlight = null; });
  }
  return inFlight;
}

module.exports = { getAccessToken };
