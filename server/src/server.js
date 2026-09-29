const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Fail fast with a clear message instead of a cryptic "Invalid URL" deep in fetch()
const required = ['ALPACA_CLIENT_ID', 'ALPACA_CLIENT_SECRET', 'ALPACA_AUTH_URL', 'ALPACA_BROKER_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\nMissing required .env values: ${missing.join(', ')}`);
  console.error(`Expected a .env file at: ${path.join(__dirname, '..', '.env')}\n`);
  process.exit(1);
}

const express = require('express');
const cors = require('cors');

const accountsRouter = require('./routes/accounts');
const tradingRouter = require('./routes/trading');
const journalsRouter = require('./routes/journals');
const authRouter = require('./routes/auth');
const { alpacaFetch } = require('./alpaca');

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// GET /api/clock — is the market open right now, and when's the next open/close
app.get('/api/clock', async (_req, res) => {
  try {
    const clock = await alpacaFetch('/v1/clock');
    res.json(clock);
  } catch (err) {
    console.error('GET /api/clock failed:', err.message, err.details || '');
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.use('/api/accounts', accountsRouter);
app.use('/api/accounts', tradingRouter);   // adds /:id/orders, /:id/positions
app.use('/api/journals', journalsRouter);
app.use('/api/auth', authRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Alpaca Broker API proxy listening on http://localhost:${PORT}`);
});