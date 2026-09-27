const express = require('express');
const { alpacaFetch } = require('../alpaca');

const router = express.Router();

// POST /api/accounts — create a brokerage account.
// Expects a body already shaped like Alpaca's create-account payload:
// { contact, identity, disclosures, agreements, documents, trusted_contact }
router.post('/', async (req, res) => {
  try {
    const account = await alpacaFetch('/v1/accounts', {
      method: 'POST',
      body: req.body,
    });
    res.status(201).json(account);
  } catch (err) {
    console.log(err)
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// GET /api/accounts/:id — fetch one account (status, id, account_number, etc.)
router.get('/:id', async (req, res) => {
  try {
    const account = await alpacaFetch(`/v1/accounts/${req.params.id}`);
    res.json(account);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// GET /api/accounts/:id/trading-details — cash, buying power, equity, etc.
router.get('/:id/trading-details', async (req, res) => {
  try {
    const details = await alpacaFetch(`/v1/trading/accounts/${req.params.id}/account`);
    res.json(details);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

module.exports = router;
