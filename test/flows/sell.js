const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

async function testSell(baseUrl, accountId, config, buyResult) {
  banner('2. Sell Transaction', '🔴');

  if (!buyResult?.ok || !buyResult.order) {
    warn('Skipping sell — no successful buy to sell from.');
    return { ok: false, order: null, reason: 'no bought position' };
  }

  const { symbol } = config;
  const posQty = parseFloat(buyResult.order.filled_qty) || parseFloat(buyResult.order.qty);

  if (posQty <= 0) {
    warn('Buy order did not fill any shares; cannot sell.');
    return { ok: false, order: null, reason: 'buy did not fill' };
  }

  step(`Placing market sell order: ${posQty} shares of ${symbol}`);

  let order;
  try {
    order = await api(baseUrl, accountId, '/orders', {
      method: 'POST',
      body: {
        symbol,
        qty: String(posQty),
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
