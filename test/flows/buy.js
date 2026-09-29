const { api, apiRaw } = require('../helpers/api');
const { banner, step, success, fail, data, warn, result } = require('../helpers/output');

async function testBuy(baseUrl, accountId, config) {
  banner('1. Buy Transaction', '🟢');

  const { symbol, qty } = config;
  step(`Placing market buy order: ${qty} shares of ${symbol}`);

  let order;
  try {
    order = await api(baseUrl, accountId, '/orders', {
      method: 'POST',
      body: {
        symbol,
        qty: String(qty),
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
      },
    });
  } catch (e) {
    fail(`Buy order rejected: ${e.message}`);
    return { ok: false, order: null };
  }

  result('Order placed via POST /api/accounts/:id/orders', true);
  data('Order response', order);
  success(`Buy order ${order.side.toUpperCase()} ${order.symbol} ${order.qty} shares — status: ${order.status}`);
  return { ok: true, order };
}

module.exports = { testBuy };
