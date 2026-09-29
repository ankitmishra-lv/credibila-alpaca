const express = require('express');
const { alpacaFetch } = require('../alpaca');

const router = express.Router();

// POST /api/journals — move cash into a sandbox account so it has buying power.
// Body: { to_account: "<account_id>", entry_type: "JNLC", amount: "50000" }
// Note: in sandbox, journals need a funding/sweep account id as "from_account" —
// check your Brokerdash sandbox settings for that id, or use Alpaca's sandbox
// instant-funding helper if your dashboard exposes one.
router.post('/', async (req, res) => {
  try {
    const journal = await alpacaFetch('/v1/journals', {
      method: 'POST',
      body: req.body,
    });
    res.status(201).json(journal);
  } catch (err) {
    console.error(err.message, err.details || '');
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

// GET /api/journals/:id — check a journal's status (pending/executed/rejected)
router.get('/:id', async (req, res) => {
  try {
    const journal = await alpacaFetch(`/v1/journals/${req.params.id}`);
    res.json(journal);
  } catch (err) {
    console.error(err.message, err.details || '');
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

module.exports = router;