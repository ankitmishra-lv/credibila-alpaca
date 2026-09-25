require('dotenv').config();
const express = require('express');
const cors = require('cors');

const accountsRouter = require('./routes/accounts');
const tradingRouter = require('./routes/trading');
const journalsRouter = require('./routes/journals');

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/accounts', accountsRouter);
app.use('/api/accounts', tradingRouter);   // adds /:id/orders, /:id/positions
app.use('/api/journals', journalsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Alpaca Broker API proxy listening on http://localhost:${PORT}`);
});
