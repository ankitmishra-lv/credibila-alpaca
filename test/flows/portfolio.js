const { api } = require('../helpers/api');
const { banner, step, success, fail, warn, data, result } = require('../helpers/output');

function fmt(n) {
  if (n == null) return '-';
  const v = parseFloat(n);
  return isNaN(v) ? '-' : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function testPortfolio(baseUrl, accountId) {
  banner('6. Portfolio', '💼');

  step('Fetching account trading details via GET /api/accounts/:id/trading-details');

  let details;
  try {
    details = await api(baseUrl, accountId, '/trading-details');
    result('GET trading-details', true);
    success('Account details retrieved');
    data('Account (equity / buying power / cash)', {
      id: details.id || details.account_number,
      status: details.status,
      cash: fmt(details.cash),
      portfolio_value: fmt(details.portfolio_value),
      equity: fmt(details.equity),
      buying_power: fmt(details.buying_power),
      currency: details.currency,
    });
  } catch (e) {
    fail(`Failed to fetch trading details: ${e.message}`);
    details = null;
  }

  step('Fetching open positions via GET /api/accounts/:id/positions');

  let positions;
  try {
    positions = await api(baseUrl, accountId, '/positions');
    result('GET positions', true);
    success(`Retrieved ${positions.length} open positions`);
    data('Positions', positions.map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      avg_entry_price: fmt(p.avg_entry_price_price || p.avg_entry_price),
      market_value: fmt(p.market_value),
      unrealpnl: fmt(p.unrealpnl),
      change_today: p.change_today,
    })));
  } catch (e) {
    warn(`Could not fetch positions: ${e.message}`);
    positions = [];
  }

  const totalPosValue = positions.reduce((sum, p) => sum + (parseFloat(p.market_value) || 0), 0);
  const totalCash = parseFloat(details?.cash || 0);
  const totalEquity = totalCash + totalPosValue;

  data('Portfolio summary', {
    cash: fmt(totalCash),
    positions_market_value: fmt(totalPosValue),
    total_equity: fmt(totalEquity),
  });

  return { ok: true, details, positions, totalEquity };
}

module.exports = { testPortfolio };
