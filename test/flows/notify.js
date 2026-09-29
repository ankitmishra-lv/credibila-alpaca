const { api } = require('../helpers/api');
const { banner, step, success, warn, data, result } = require('../helpers/output');

async function pollOrderStatus(baseUrl, accountId, orderId, prevStatuses, maxAttempts = 6, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    let order;
    try {
      order = await api(baseUrl, accountId, `/orders/${orderId}`);
    } catch (e) {
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    const currentStatus = order.status || order.order_status;
    if (currentStatus !== prevStatuses[prevStatuses.length - 1]) {
      return { order, newStatus: currentStatus, transition: true };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function testNotifications(baseUrl, accountId, context) {
  banner('7. Trade Notifications', '🔔');

  const ordersToCheck = [];
  if (context.buyResult?.order) ordersToCheck.push({ label: 'Buy', order: context.buyResult.order });
  if (context.sellResult?.order) ordersToCheck.push({ label: 'Sell', order: context.sellResult.order });

  if (ordersToCheck.length === 0) {
    warn('No orders to monitor for notifications. Notifications are triggered by order status changes.');
    return { ok: true, notifications: [] };
  }

  const notifications = [];

  for (const { label, order } of ordersToCheck) {
    const orderId = order.orderId || order.id;
    const initialStatus = order.status;

    data(`${label} order initial status`, { orderId, status: initialStatus });
    step(`Polling for status change on ${label} order ${orderId}...`);

    const result2 = await pollOrderStatus(baseUrl, accountId, orderId, [initialStatus], 4, 2000);

    if (result2?.transition) {
      const note = {
        icon: '🔔',
        title: `${label} order status changed`,
        detail: `${orderId} → ${initialStatus} → ${result2.newStatus}`,
        orderId,
      };
      notifications.push(note);
      data('Notification', note);
      success(`Notification: ${label} order transitioned ${initialStatus} → ${result2.newStatus}`);
      result(`Trade notification: ${label} order status change`, true);
    } else {
      warn(`No status change detected for ${label} order ${orderId} in polling window (orders may fill instantly or take time per market hours)`);
      result(`Trade notification: ${label} order status change`, false, 'no transition observed');
    }
  }

  if (notifications.length > 0) {
    data('All notifications', notifications);
  } else {
    warn('No status-change notifications triggered during the polling window.');
    warn('This is expected if orders filled instantly or are awaiting market open.');
  }

  return { ok: notifications.length > 0, notifications };
}

module.exports = { testNotifications };
