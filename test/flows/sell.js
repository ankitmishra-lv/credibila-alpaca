const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

async function testSell(baseUrl, accountId, config, buyResult) {
  banner('2. Sell Transaction', '🔴');

  if (!buyResult?.ok || !buyResult.order) {
    warn('Skipping sell — no successful buy to sell from.');
    return { ok: false, order: null, reason: 'no bought position' };
  }

  const { symbol } = config;
  let filledQty = parseFloat(buyResult.order.filled_qty);

  if (filledQty <= 0) {
    warn(`Buy order not yet filled. Waiting for fill before selling to avoid wash trade...`);
    const { waitForStatus } = require('./confirm');
    const orderId = buyResult.order.orderId || buyResult.order.id;
    const filled = await waitForStatus(baseUrl, accountId, orderId, ['filled', 'partially_filled'], 6, 2000);
    if (!filled) {
      warn('Buy order did not fill within wait window; skipping sell.');
      return { ok: false, order: null, reason: 'buy not filled' };
    }
    filledQty = parseFloat(filled.filled_qty);
  }

  if (filledQty <= 0) {
    warn('Buy order filled but filled_qty is 0; cannot sell.');
    return { ok: false, order: null, reason: 'no shares to sell' };
  }

  step(`Placing market sell order: ${filledQty} shares of ${symbol}`);

  let order;
  try {
    order = await api(baseUrl, accountId, '/orders', {
      method: 'POST',
      body: {
        symbol,
        qty: String(filledQty),
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      },
    });
  } catch (e) {
    fail(`Sell order rejected: ${e.message}`);
    return { ok: false, order: null };
  }

  result('Sell order placed via POST /api/accounts/:id/orders', true);
  data('Order response', order);
  success(`Sell order ${order.side.toUpperCase()} ${order.symbol} ${order.qty} shares — status: ${order.status}`);
  return { ok: true, order };
}

module.exports = { testSell };
