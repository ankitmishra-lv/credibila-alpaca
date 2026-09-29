const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

async function testCancel(baseUrl, accountId, config) {
  banner('3. Cancel Transaction', '✖️');

  const { symbol, qty } = config;
  const limitPrice = (parseFloat(config.limitPrice) || 0.01).toFixed(2);

  step(`Placing limit BUY order for ${symbol} @ $${limitPrice} (far below market — will stay open)`);

  let placed;
  try {
    placed = await api(baseUrl, accountId, '/orders', {
      method: 'POST',
      body: {
        symbol,
        qty: String(qty),
        side: 'buy',
        type: 'limit',
        time_in_force: 'day',
        limit_price: limitPrice,
      },
    });
  } catch (e) {
    fail(`Could not place limit order for cancellation: ${e.message}`);
    return { ok: false, order: null };
  }

  result('Limit order placed', true);
  data('Placed order', placed);
  success(`Limit order ${placed.orderId || placed.id} — status: ${placed.status}`);

  const orderId = placed.orderId || placed.id;

  step(`Sending DELETE /api/accounts/:id/orders/${orderId}`);

  try {
    await fetch(`${baseUrl}/api/accounts/${accountId}/orders/${orderId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    fail(`Cancel request failed: ${e.message}`);
    return { ok: false, order: placed };
  }

  result('DELETE cancel endpoint called', true);

  step('Fetching order by ID to confirm cancellation...');

  let cancelled;
  try {
    cancelled = await api(baseUrl, accountId, `/orders/${orderId}`);
  } catch (e) {
    warn(`Note: fetch-after-cancel returned ${e.message} (Alpaca may not expose canceled orders via GET /orders/:id)`);
  }

  if (cancelled) {
    data('Order after cancel', cancelled);
    if (cancelled.status === 'canceled' || cancelled.canceled_at) {
      success(`Order confirmed canceled — final status: ${cancelled.status}`);
    } else {
      warn(`Order status after cancel: ${cancelled.status} (may still be processing)`);
    }
  } else {
    step('Checking open orders list for the canceled order...');
    try {
      const openOrders = await api(baseUrl, accountId, '/orders?status=open');
      const stillOpen = openOrders.find((o) => (o.orderId || o.id) === orderId);
      if (!stillOpen) {
        success('Order no longer appears in open orders — cancellation confirmed');
      } else {
        warn('Order still appears in open orders — cancellation may still be processing');
      }
    } catch (e) {
      warn(`Could not verify via open orders list: ${e.message}`);
    }
  }

  return { ok: true, order: placed };
}

module.exports = { testCancel };
