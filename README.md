# Markets Tracker

A full-stack app with public **Metals**, **Stocks**, and **Crypto** tabs, each showing live
prices and a historical chart with switchable time ranges (1H, 1D, 1W, 1M, 6M, 1Y, 5Y).
Use **Log in** to open the sign-in form and access **My Portfolio** alongside the market tabs.
Logging out returns to the public markets.

The portfolio and sign-in are a demo, not a privacy boundary: holdings are included in the
client code and authentication uses an in-memory session. Do not use this setup for private data.

## Market assistant

The public market assistant discusses possible scenarios for the selected metal, stock from the
app's watchlist, or CoinGecko coin. It receives the latest available quote and its timestamp, not
news or historical trends. Its responses are not validated price forecasts or financial advice.
Questions and recent chat messages are sent to Groq; do not enter personal or financial information.

Create a free API key at [Groq Console](https://console.groq.com/keys), then set `GROQ_API_KEY`
in the server environment before starting the server. On Render, add it as a secret environment
variable in the service dashboard and redeploy. Never put the key in client code or commit it.
The [free plan](https://console.groq.com/docs/rate-limits) has shared quotas and may change; a
public assistant can exhaust them. The app also limits chat requests per server instance, but this
is not a substitute for production abuse protection. Without a key, the assistant reports that
it is not configured.

## Stack

- **`server/`** — Node.js + Express API that proxies free public APIs:
  - [gold-api.com](https://www.gold-api.com) for live gold (XAU) and silver (XAG) spot prices.
  - [Yahoo Finance chart API](https://query1.finance.yahoo.com) for metals/stocks/index history and
    live stock quotes (no API key, works for any ticker/future symbol: `GC=F`, `SI=F`, `AAPL`, `^IXIC`, …).
  - [CoinGecko](https://www.coingecko.com) public API for crypto (keyless by default; an optional
    free API key is strongly recommended in production — see "Deploying to Render" below).
- **`client/`** — React 19 app (Vite) with a [Recharts](https://recharts.org) area chart, tabs,
  range selectors, and watchlist tables that poll for live updates.

The backend exists to avoid CORS issues with these endpoints, normalize the response shape across
three very different upstream APIs, and (for crypto) cache/batch requests to stay within
CoinGecko's rate limit. No paid API keys or secrets are required anywhere.

## Tabs

- **Metals** — Gold and Silver charts side by side, each with its own range selector. Each
  spot quote also shows the corresponding futures price change in dollars per troy ounce and
  percent versus the previous trading close (Yahoo Finance); this is not a spot-price change.
- **Stocks** — A watchlist (NASDAQ Composite, NVIDIA, Apple, Tesla, Amazon, plus a curated static
  snapshot of ~20 large US-listed companies by market cap) with a chart for whichever row you click.
  *Note: this list is a fixed snapshot, not a live market-cap ranking — see `server/instruments.js`.
  Anthropic and SpaceX are private companies with no public ticker, so they aren't included.*
- **Crypto** — Top 20 coins by market cap (live-ranked via CoinGecko) plus Cookie DAO (COOKIE),
  Official Trump (TRUMP), and World Liberty Financial (WLFI), with a chart for whichever row you
  click. CoinGecko's free public API caps historical data at 365 days, so "5Y" shows the same
  1-year window as "1Y" for crypto.

## Project layout

```
gold-project/
├── render.yaml                 # Render Blueprint (single Web Service: API + built frontend)
├── server/                    # Express API (port 4000)
│   ├── index.js               # routes + static-serves client/dist in production
│   ├── instruments.js         # metals + stocks catalog (Yahoo/gold-api symbols)
│   ├── crypto.js              # CoinGecko watchlist/live/history + caching
│   └── cache.js                # tiny TTL cache used to batch/throttle upstream calls
├── client/                    # React + Vite app (port 5173)
│   └── src/
│       ├── api.js                     # fetch helpers + supported range list
│       ├── utils/format.js            # currency/date formatting helpers
│       ├── components/
│       │   ├── Tabs.jsx               # Metals / Stocks / Crypto switcher
│       │   ├── PriceTicker.jsx        # live price + 24h change display
│       │   ├── RangeSelector.jsx      # 1H/1D/1W/1M/6M/1Y/5Y buttons
│       │   ├── PriceChart.jsx         # Recharts area chart
│       │   ├── InstrumentPanel.jsx    # ticker + selector + chart, self-polling (metals/stocks)
│       │   ├── StockWatchlist.jsx     # stocks table, polls a live-quote batch endpoint
│       │   ├── CryptoWatchlist.jsx    # crypto table (quotes come from the parent page)
│       │   └── CryptoDetailPanel.jsx  # ticker + selector + chart for the selected coin
│       └── pages/
│           ├── MetalsPage.jsx
│           ├── StocksPage.jsx
│           └── CryptoPage.jsx
└── package.json  # convenience scripts to run both apps together
```

## Getting started

Install dependencies for both apps:

```bash
npm run install:all
```

Run both the API and the frontend together (from the repo root):

```bash
npm run dev
```

This starts:
- the Express API at **http://localhost:4000**
- the Vite dev server at **http://localhost:5173** (proxies `/api/*` to the Express server)

Open http://localhost:5173 in your browser.

You can also run each side individually:

```bash
npm run dev:server   # just the API
npm run dev:client   # just the frontend
```

## Deploying to Render

In production, a single Express service serves **both** the API and the built React app (the
client calls relative `/api/...` paths, so no CORS/proxy config is needed). `render.yaml` at the
repo root defines this as a Render Blueprint:

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In the [Render Dashboard](https://dashboard.render.com), choose **New → Blueprint** and point it
   at this repo. Render will read `render.yaml` and create a single **Web Service** with:
   - Build command: `npm run build` (installs client deps, builds `client/dist`, installs server
     production deps)
   - Start command: `npm start` (runs `server/index.js`, which serves `client/dist` plus the API)
   - Health check path: `/api/health`
3. Deploy. Render sets `PORT` automatically; the server already reads `process.env.PORT`.

No required environment variables or API keys — every upstream API used (gold-api.com, Yahoo
Finance, CoinGecko) is public and keyless. There is one **optional but recommended** one for
production, covered below.

If you'd rather configure it manually instead of via the Blueprint: create a **Web Service**, set
Build Command to `npm run build` and Start Command to `npm start`, with the repo root as the root
directory.

### Optional: CoinGecko API key (fixes crypto rate-limiting in production)

CoinGecko's free public API tracks its rate limit **per IP address**. Render's free tier shares a
pool of outbound IPs across many unrelated apps, so the Crypto tab can intermittently (or
persistently) fail with a `429 rate limit` error in production even though this app's own request
volume is low — the shared IP's quota can already be used up by *other* tenants' traffic.

The fix is a free CoinGecko "Demo" API key, which ties the rate limit to the key instead of the
IP:

1. Sign up and generate a key at the [CoinGecko Developer Dashboard](https://www.coingecko.com/en/developers/dashboard)
   (no payment required).
2. In your Render service's **Environment** tab, add:
   - Key: `COINGECKO_API_KEY`
   - Value: *(your key)*
3. Redeploy. [server/crypto.js](server/crypto.js) automatically sends it as the `x-cg-demo-api-key`
   header when the env var is set, and falls back to keyless requests (fine for local dev) when
   it isn't.

## API endpoints (server)

| Endpoint                              | Description                                                          |
|-----------------------------------------|------------------------------------------------------------------------|
| `GET /api/instruments`                  | Metals + stocks catalog (id, label, symbol, type).                    |
| `GET /api/price/live?id=gold`           | Live price for a metal/stock/index id.                                |
| `GET /api/price/metal-change?id=gold`   | Metal futures change versus the previous trading close.              |
| `GET /api/price/live-batch?ids=a,b,c`   | Live prices for several metal/stock/index ids in one call.            |
| `GET /api/price/history?id=gold&range=1d` | Historical price points. `range`: `1h,1d,1w,1m,6m,1y,5y`.            |
| `GET /api/crypto/list`                  | Top 20 coins by market cap + Cookie/Trump/WLFI, with live quotes.      |
| `GET /api/crypto/live?id=bitcoin`       | Live quote for one CoinGecko coin id.                                  |
| `GET /api/crypto/history?id=bitcoin&range=1d` | Historical price points for one coin.                            |
| `GET /api/health`                       | Health check.                                                          |

## Notes / possible improvements

- These free APIs are unauthenticated and rate-limit friendly for personal/demo use, but aren't
  meant for production trading — for production you'd likely swap in a paid provider behind the
  same routes, and add more robust caching/retry handling.
- Yahoo Finance doesn't expose a native "last 1 hour" range, so the server requests one day of
  1-minute candles and trims it to the last 60 minutes. CoinGecko's crypto history endpoint is
  handled the same way for "1H".
- The stocks "top 20 by market cap" list is a static, manually curated snapshot (not a live
  ranking) to keep the demo simple and avoid relying on fragile/undocumented screener APIs. The
  crypto "top 20" *is* a live ranking, since CoinGecko's public API supports sorting by market cap
  directly.
