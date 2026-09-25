const { getAccessToken } = require('./tokenManager');

// path e.g. "/v1/accounts", "/v1/trading/accounts/{id}/orders"
async function alpacaFetch(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();

  const res = await fetch(`${process.env.ALPACA_BROKER_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message || `Alpaca request failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

module.exports = { alpacaFetch };
