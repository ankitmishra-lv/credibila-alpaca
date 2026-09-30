const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

async function fetchOrder(baseUrl, accountId, orderId) {
  return api(baseUrl, accountId, `/orders/${orderId}`);
}

async function waitForStatus(baseUrl, accountId, orderId, targetStatuses, maxAttempts = 10, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const order = await fetchOrder(baseUrl, accountId, orderId);
      if (targetStatuses.includes(order.status)) return order;
    } catch (e) {
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function testConfirmation(baseUrl, accountId, context) {
  banner('4. Trade Confirmation', '✅');

  step('Polling order details to confirm final status...');

  const ordersToCheck = [];
  if (context.buyResult?.order) ordersToCheck.push({ label: 'Buy', order: context.buyResult.order });
  if (context.sellResult?.order) ordersToCheck.push({ label: 'Sell', order: context.sellResult.order });

  if (ordersToCheck.length === 0) {
    warn('No successful orders to confirm.');
    return { ok: false };
  }

  let allConfirmed = true;

  for (const { label, order } of ordersToCheck) {
    const orderId = order.orderId || order.id;
    const currentStatus = order.status;

    data(`${label} order initial`, { orderId, status: currentStatus });

    step(`Polling ${label} order ${orderId} for filled/completed status...`);

    const finalOrder = await waitForStatus(
      baseUrl,
      accountId,
      orderId,
      ['filled', 'partially_filled', 'canceled'],
    12,
      1500
    );

    if (finalOrder) {
      if (finalOrder.status === 'filled') {
        data(`${label} order confirmed`, {
          orderId: finalOrder.orderId || finalOrder.id,
          status: finalOrder.status,
          filled_qty: finalOrder.filled_qty,
          filled_avg_price: finalOrder.filled_avg_price,
          filled_at: finalOrder.filled_at,
        });
        success(`${label} order CONFIRMED FILLED — ${finalOrder.filled_qty} shares @ ${finalOrder.filled_avg_price}`);
        result(`Trade confirmation: ${label} order filled`, true);
      } else if (finalOrder.status === 'partially_filled') {
        data(`${label} order partially filled`, {
          filled_qty: finalOrder.filled_qty,
          filled_avg_price: finalOrder.filled_avg_price,
        });
        success(`${label} order PARTIALLY FILLED — ${finalOrder.filled_qty} shares`);
        result(`Trade confirmation: ${label} order partially filled`, true);
      } else if (finalOrder.status === 'canceled') {
        warn(`${label} order was canceled — no fill`);
        result(`Trade confirmation: ${label} order status = ${finalOrder.status}`, true);
      }
    } else {
      fail(`${label} order did not reach a final status within polling window`);
      allConfirmed = false;
    }
  }

  return { ok: allConfirmed };
}

module.exports = { testConfirmation, waitForStatus, fetchOrder };
