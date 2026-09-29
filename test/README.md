# Alpaca Public Markets Flow Tests

A test application that exercises every public markets flow against the Alpaca
Broker API sandbox, going through the Express proxy in `server/`.

## Prerequisites

1. **Backend server** — configured with valid sandbox credentials in `server/.env`.
   See `server/README.md`.

2. **Node.js 18+** — the test uses native `fetch`.

3. **An ACTIVE, funded sandbox account** (optional but recommended).
   New sandbox accounts start in `SUBMITTED` status and can't trade until approved.
   You can either:
   - Reuse an existing account: set `TEST_ACCOUNT_ID` env var
   - Let the test create one: `TEST_ACCOUNT_ID` not set (account may need manual approval)

4. **Funding** — sandbox accounts start at $0. To journal in test cash, set
   `ALPACA_SWEEP_ACCOUNT_ID` to your Brokerdash sweep/from-account ID.
   Without funding, buy/sell tests will fail for "insufficient buying power."

## Quick Start

```bash
# From the project root
npm run test:flows

# With an existing account and funding
TEST_ACCOUNT_ID=<your-account-id> \
ALPACA_SWEEP_ACCOUNT_ID=<your-sweep-account-id> \
npm run test:flows
```

The test runner automatically starts the backend server (if not already running),
runs all flows, prints a summary, and stops the server it started.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TEST_ACCOUNT_ID` | _(create new)_ | Reuse an existing sandbox account ID |
| `TEST_SYMBOL` | `AAPL` | Symbol to trade |
| `TEST_QTY` | `0.01` | Fractional share quantity |
| `TEST_LIMIT_PRICE` | `150.00` | Limit price for cancel test (below market, won't fill) |
| `ALPACA_SWEEP_ACCOUNT_ID` | _(skip funding)_ | Sweep/from-account ID for journal funding |

## Flows Tested

The test application demonstrates all seven required public markets flows:

1. **Buy Transaction** — Places a market buy order (`POST /api/accounts/:id/orders`),
   confirms it was accepted, and verifies it transitions to `filled`.

2. **Sell Transaction** — Places a market sell order for the same symbol,
   confirms fill via the orders list.

3. **Cancel Transaction** — Places a limit buy order priced below market (so it
   stays open), sends `DELETE /api/accounts/:id/orders/:orderId`, then fetches
   the order to confirm status changed to `canceled`.

4. **Trade Confirmation** — Polls `GET /api/accounts/:id/orders/:orderId` for each
   order, reporting `filled_qty`, `filled_avg_price`, and `filled_at`.

5. **Orders** — Fetches order history with `GET /api/accounts/:id/orders`
   using `?status=all`, `?status=open`, and `?status=closed`.

6. **Portfolio** — Fetches account trading details
   (`GET /api/accounts/:id/trading-details` → equity, cash, buying power)
   and open positions (`GET /api/accounts/:id/positions`).

7. **Trade Notifications** — Polls order status changes and emits notification
   events when orders transition between states (e.g. `pending_new` → `filled`).

## Output

Each flow prints:
- A banner with the flow name and icon
- Steps showing each API call
- Full JSON responses for key data
- Pass/fail status per assertion

A summary at the end reports total passed and failed counts.

## File Structure

```
test/
├── test-flows.js              # Main runner — orchestrates all flows
├── helpers/
│   ├── api.js                 # HTTP client wrapper with error handling
│   ├── output.js              # Colored console output (banner/step/success/fail)
│   └── server.js              # Server lifecycle (start if needed, stop)
└── flows/
    ├── buy.js                 # Buy transaction test
    ├── sell.js                 # Sell transaction test
    ├── cancel.js               # Cancel transaction test
    ├── confirm.js              # Trade confirmation test
    ├── orders.js               # Orders listing test
    ├── portfolio.js            # Portfolio/positions test
    └── notify.js               # Trade notifications test
```

## Sandbox Quirks

- Orders respect real market hours — market orders placed after close queue
  for the next session instead of filling instantly.
- Fractional shares require `DAY` time_in_force (GTC is not allowed).
- Minimum order value is $1 (limit_price × qty).
- Cancelled orders typically remain visible via `GET /orders/:id` with status `canceled`.
