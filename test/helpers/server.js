const { spawn } = require('child_process');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', 'server');
const DEFAULT_PORT = 4000;
const DEFAULT_BASE = `http://localhost:${DEFAULT_PORT}`;

let child = null;
let ownProcess = false;

async function checkHealth(port = DEFAULT_PORT, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${DEFAULT_BASE.replace(/:\d+$/, `:${port}`)}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function ensureServer(port = DEFAULT_PORT) {
  const baseUrl = `http://localhost:${port}`;
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (res.ok) {
      return { baseUrl, started: false };
    }
  } catch {}

  const env = { ...process.env, PORT: String(port) };
  child = spawn('node', [path.join(SERVER_DIR, 'src', 'server.js')], {
    cwd: SERVER_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  ownProcess = true;

  if (child.stdout) child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  if (child.stderr) child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  const alive = await new Promise((resolve) => {
    const check = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (res.ok) resolve(true);
        else setTimeout(check, 300);
      } catch {
        setTimeout(check, 300);
      }
    };
    const t = setTimeout(() => resolve(false), 15000);
    check();
  });

  if (!alive) throw new Error(`Server did not start on port ${port} within 15s`);
  return { baseUrl, started: true };
}

async function stopServer() {
  if (child && ownProcess) child.kill('SIGTERM');
  child = null;
  ownProcess = false;
}

module.exports = { ensureServer, stopServer, checkHealth, DEFAULT_BASE, DEFAULT_PORT };
