# Alpaca Broker API Demo (Full Stack)

A dummy brokerage app wired to Alpaca's real sandbox Broker API.

- `client/index.html` — plain HTML/CSS/JS frontend, no build step.
- `client-react/` — the same UI as a Vite + React app, if you'd rather work
  in components. See `client-react/README.md`.
- `server/` — an Express proxy that holds your `client_id`/`client_secret`,
  exchanges them for a short-lived OAuth2 token, and forwards requests to
  Alpaca's sandbox Broker API. See `server/README.md` for endpoint details.

## Run it

**1. Start the backend**
```bash
cd server
npm install
cp .env.example .env   # fill in your sandbox client_id/client_secret
npm start               # http://localhost:4000
```

**2. Open the frontend**
Just open `client/index.html` directly in a browser (double-click it, or
`open client/index.html` / `start client/index.html`). On the login screen,
confirm the "Backend URL" field matches where your server is running
(`http://localhost:4000` by default).

## Flow

1. **Log in** — checks the backend is reachable (`GET /health`)
2. **Create account** — submits a real `POST /v1/accounts` via the proxy
3. **Fund account** — sandbox accounts start at $0; enter your Brokerdash
   sweep/from-account ID to journal in test cash (or skip and trade will
   simply reject for insufficient buying power until funded)
4. **Trade** — places real market/limit orders against your sandbox account
5. **Portfolio / Notifications** — pulled live from `/positions` and
   `/orders` on every trade

## Known sandbox quirks

- Orders respect real market hours — a market order placed after close
  queues instead of filling instantly.
- Watchlist prices/chart are still simulated client-side; wiring in real
  quotes would need Alpaca's separate Market Data API and its own keys.

## Deploying

### Backend (Render — easiest)

1. Push this repo to GitHub.
2. On [render.com](https://render.com), New → Blueprint, point it at your
   repo. It reads `render.yaml` at the root and creates the service
   automatically (root dir `server/`, build `npm install`, start `npm start`).
3. Render will prompt for the two secrets marked `sync: false` —
   `ALPACA_CLIENT_ID` and `ALPACA_CLIENT_SECRET`. Paste your sandbox values.
4. Once deployed you'll get a URL like `https://alpaca-broker-proxy.onrender.com`.
   Update `ALLOWED_ORIGIN` in Render's env vars to your frontend's real URL
   (not `*`) once you know it, so only your frontend can call the proxy.

No Render account? `server/Procfile` works the same way on Railway or
Heroku-style platforms — same env vars apply.

### Frontend

**Plain HTML (`client/`)** — it's fully static. Drag the `client` folder into
Netlify's manual-deploy UI, or push it to a `gh-pages` branch for GitHub
Pages. No build step. Once deployed, open the site and set "Backend URL" on
the login screen to your Render URL — this is saved in the browser's
localStorage, no code change needed.

**React (`client-react/`)** — has `vercel.json` and a root-level
`netlify.toml` already set up:
- **Vercel**: import the repo, set root directory to `client-react`, it
  picks up `vercel.json` automatically.
- **Netlify**: import the repo; `netlify.toml` at the root already points
  Netlify at `client-react` with the right build/publish paths.

Either way, set an environment variable `VITE_API_BASE` to your deployed
backend URL (e.g. `https://alpaca-broker-proxy.onrender.com`) so the login
screen defaults to the right place — still overridable per-visitor on the
login screen itself.
