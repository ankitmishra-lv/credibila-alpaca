// A minimal persistent store for demo purposes: a JSON file mapping
// email -> { passwordHash, accountId }. Fine for a dummy app; swap for a
// real database before this ever touches real users.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
}

function readAll() {
  ensureStore();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUser(email) {
  const users = readAll();
  return users[email.toLowerCase()] || null;
}

function saveUser(email, { passwordHash, accountId }) {
  const users = readAll();
  users[email.toLowerCase()] = { passwordHash, accountId };
  writeAll(users);
}

module.exports = { getUser, saveUser };