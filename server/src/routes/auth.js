const express = require('express');
const bcrypt = require('bcryptjs');
const { getUser, saveUser } = require('../userStore');

const router = express.Router();

// POST /api/auth/signup — link an email/password to an Alpaca account_id.
// Called right after account creation succeeds.
// Body: { email, password, account_id }
router.post('/signup', async (req, res) => {
  const { email, password, account_id } = req.body || {};
  if (!email || !password || !account_id) {
    return res.status(400).json({ error: 'email, password, and account_id are all required' });
  }
  if (getUser(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  saveUser(email, { passwordHash, accountId: account_id });
  res.status(201).json({ email, account_id });
});

// POST /api/auth/login — verify password, return the linked account_id.
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = getUser(email);
  if (!user) {
    return res.status(404).json({ error: 'No account found for this email. Create one first.' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.json({ email, account_id: user.accountId });
});

module.exports = router;