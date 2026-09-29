# Alpaca Broker API Proxy

A minimal Express backend that keeps your `client_id`/`client_secret` off the
browser. It exchanges them for a short-lived OAuth2 access token (caching it
so it isn't re-requested on every call), and forwards account/trading
requests to Alpaca's sandbox Broker API.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in your real sandbox `ALPACA_CLIENT_ID` and
`ALPACA_CLIENT_SECRET` (from Brokerdash → API/Devs, in Sandbox mode).

```bash
npm start
```

Server runs on `http://localhost:4000` by default.

## Endpoints this proxy exposes

| Method | Path | Alpaca endpoint it calls |
|---|---|---|
| POST | `/api/accounts` | `POST /v1/accounts` — create an account |
| GET | `/api/accounts/:id` | `GET /v1/accounts/:id` — account status |
| GET | `/api/accounts/:id/trading-details` | `GET /v1/trading/accounts/:id/account` — cash/buying power/equity |
| POST | `/api/accounts/:id/orders` | `POST /v1/trading/accounts/:id/orders` — place an order |
| GET | `/api/accounts/:id/orders` | `GET /v1/trading/accounts/:id/orders` — order history |
| DELETE | `/api/accounts/:id/orders/:orderId` | cancel an open order |
| GET | `/api/accounts/:id/orders/:orderId` | `GET /v1/trading/accounts/:id/orders/:orderId` — fetch a single order (trade confirmation) |
| GET | `/api/accounts/:id/positions` | `GET /v1/trading/accounts/:id/positions` — open positions |
| POST | `/api/journals` | `POST /v1/journals` — fund an account |

Your frontend (e.g. the demo app) calls **this** server instead of Alpaca
directly. This server is the only thing that ever sees your client secret.

## Example: create an account

```bash
curl -X POST http://localhost:4000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "email_address": "jane@example.com",
      "phone_number": "555-666-7788",
      "street_address": ["20 N San Mateo Dr"],
      "city": "San Mateo",
      "state": "CA",
      "postal_code": "94401",
      "country": "USA"
    },
    "identity": {
      "given_name": "Jane",
      "family_name": "Doe",
      "date_of_birth": "1990-01-01",
      "tax_id_type": "USA_SSN",
      "tax_id": "666-55-4321",
      "country_of_citizenship": "USA",
      "country_of_birth": "USA",
      "country_of_tax_residence": "USA",
      "funding_source": ["employment_income"]
    },
    "disclosures": {
      "is_control_person": false,
      "is_affiliated_exchange_or_finra": false,
      "is_politically_exposed": false,
      "immediate_family_exposed": false
    },
    "agreements": [
      { "agreement": "margin_agreement", "signed_at": "2024-01-01T00:00:00Z", "ip_address": "127.0.0.1" },
      { "agreement": "account_agreement", "signed_at": "2024-01-01T00:00:00Z", "ip_address": "127.0.0.1" },
      { "agreement": "customer_agreement", "signed_at": "2024-01-01T00:00:00Z", "ip_address": "127.0.0.1" }
    ]
  }'
```

Save the returned `id` — every later call (orders, positions, funding) needs it.

## Example: place a market order

```bash
curl -X POST http://localhost:4000/api/accounts/<ACCOUNT_ID>/orders \
  -H "Content-Type: application/json" \
  -d '{ "symbol": "AAPL", "qty": "1", "side": "buy", "type": "market", "time_in_force": "day" }'
```

## Notes

- Sandbox orders still respect real market hours — a market order placed
  while the market is closed queues until the next open, it does not fill
  instantly.
- A brand-new account has $0 cash. Use `/api/journals` to move funds in
  before you can buy anything (check Brokerdash for your sandbox
  from-account/sweep id to use as `from_account`).
- Access tokens last 15 minutes; `tokenManager.js` refreshes automatically,
  you don't need to think about it elsewhere in the code.
- Requires Node 18+ (for native `fetch`).
