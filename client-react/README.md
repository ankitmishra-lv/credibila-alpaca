# Broker Demo — React Client

Same app as `../client/index.html` (login → create account → fund →
trade/portfolio/notifications), rebuilt as a Vite + React app.

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. On the login screen, set "Backend URL" to
wherever `../server` is running (`http://localhost:4000` by default).

## Structure

- `src/App.jsx` — everything: `LoginView`, `CreateAccountView`, `FundView`,
  `Dashboard` (watchlist, chart, order ticket, positions/orders/notifications
  tabs), all as function components with hooks.
- `src/api.js` — a tiny `fetch` wrapper used by every component to talk to
  the Express proxy.
- `src/App.css` — the same visual styling as the plain-HTML version.

State (account, watchlist, notifications) is kept in localStorage so a
refresh doesn't lose your session; positions/orders/cash are always re-pulled
live from the backend on entering the dashboard.
