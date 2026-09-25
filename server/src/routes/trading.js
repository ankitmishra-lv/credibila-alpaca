const express = require('express');
const { alpacaFetch } = require('../alpaca');

const router = express.Router();

// POST /api/accounts/:id/orders — place a buy/sell order
// Body: { symbol, qty, side: "buy"|"sell", type: "market"|"limit", time_in_force: "day", limit_price? }
router.post('/:id/orders', async (req, res) => {
  try {
    const order = await alpacaFetch(`/v1/trading/accounts/${req.params.id}/orders`, {
      method: 'POST',
      body: req.body,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// GET /api/accounts/:id/orders — order history (supports ?status=open|closed|all)
router.get('/:id/orders', async (req, res) => {
  try {
    const qs = req.query.status ? `?status=${req.query.status}` : '';
    const orders = await alpacaFetch(`/v1/trading/accounts/${req.params.id}/orders${qs}`);
    res.json(orders);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// DELETE /api/accounts/:id/orders/:orderId — cancel an open order
router.delete('/:id/orders/:orderId', async (req, res) => {
  try {
    await alpacaFetch(`/v1/trading/accounts/${req.params.id}/orders/${req.params.orderId}`, {
      method: 'DELETE',
    });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// GET /api/accounts/:id/positions — open positions
router.get('/:id/positions', async (req, res) => {
  try {
    const positions = await alpacaFetch(`/v1/trading/accounts/${req.params.id}/positions`);
    res.json(positions);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

module.exports = router;
