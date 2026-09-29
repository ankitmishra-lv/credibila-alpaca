const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

async function testOrders(baseUrl, accountId) {
  banner('5. Orders', '📋');

  step('Fetching ALL orders (status=all) via GET /api/accounts/:id/orders?status=all');

  let all;
  try {
    all = await api(baseUrl, accountId, '/orders?status=all');
  } catch (e) {
    fail(`Failed to fetch all orders: ${e.message}`);
    return { ok: false, all: [], open: [], closed: [] };
  }

  result('GET orders?status=all', true);
  success(`Retrieved ${all.length} total orders`);
  data('All orders', all.map((o) => ({
    id: o.orderId || o.id,
    symbol: o.symbol,
    side: o.side,
    qty: o.qty,
    type: o.type,
    status: o.status,
    filled_avg_price: o.filled_avg_price,
    filled_qty: o.filled_qty,
  })));

  step('Fetching OPEN orders via GET /api/accounts/:id/orders?status=open');

  let open;
  try {
    open = await api(baseUrl, accountId, '/orders?status=open');
    result('GET orders?status=open', true);
    success(`Retrieved ${open.length} open orders`);
    data('Open orders', open.map((o) => ({
      id: o.orderId || o.id,
      symbol: o.symbol,
      side: o.side,
      qty: o.qty,
      status: o.status,
    })));
  } catch (e) {
    warn(`Could not fetch open orders: ${e.message}`);
    open = [];
  }

  step('Fetching CLOSED orders via GET /api/accounts/:id/orders?status=closed');

  let closed;
  try {
    closed = await api(baseUrl, accountId, '/orders?status=closed');
    result('GET orders?status=closed', true);
    success(`Retrieved ${closed.length} closed orders`);
    data('Closed orders', closed.map((o) => ({
      id: o.orderId || o.id,
      symbol: o.symbol,
      side: o.side,
      qty: o.qty,
      status: o.status,
      filled_avg_price: o.filled_avg_price,
    })));
  } catch (e) {
    warn(`Could not fetch closed orders: ${e.message}`);
    closed = [];
  }

  return { ok: true, all, open, closed };
}

module.exports = { testOrders };
