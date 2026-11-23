import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { ALL_INSTRUMENTS, findInstrument } from './instruments.js';
import { getCryptoWatchlist, getCryptoLive, getCryptoHistory } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Demo user credentials
const DEMO_USER = {
  email: 'talal@gmail.com',
  password: 'm12341234',
};

// Simple in-memory session store (in production, use a real database)
const sessions = new Map();

// Generate a simple token (in production, use JWT or similar)
function generateToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken();
  sessions.set(token, { email, createdAt: Date.now() });

  res.json({ email, token });
});

app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  res.json({ valid: true });
});

const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceApp/1.0)' };
const GOLD_API_BASE = 'https://api.gold-api.com/price';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

app.get('/api/instruments', (_req, res) => {
  res.json(
    ALL_INSTRUMENTS.map(({ id, label, symbolLabel, type }) => ({ id, label, symbolLabel, type }))
  );
});

// ---------------------------------------------------------------------------
// Live price
// ---------------------------------------------------------------------------
async function getMetalLivePrice(instrument) {
  const response = await fetch(`${GOLD_API_BASE}/${instrument.liveSymbol}`);
  if (!response.ok) throw new Error(`Upstream responded with ${response.status}`);
  const data = await response.json();
  return {
    price: data.price,
    currency: data.currency,
    updatedAt: data.updatedAt,
    previousClose: null,
    changePercent: null,
  };
}

async function getYahooLivePrice(instrument) {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(instrument.historySymbol)}?range=1d&interval=1m`;
  const response = await fetch(url, { headers: YAHOO_HEADERS });
  if (!response.ok) throw new Error(`Upstream responded with ${response.status}`);
  const payload = await response.json();
  const meta = payload?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('Unexpected response shape from Yahoo Finance');

  const price = meta.regularMarketPrice;
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
  const changePercent =
    typeof price === 'number' && typeof previousClose === 'number' && previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;

  return {
    price,
    currency: meta.currency || 'USD',
    updatedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    previousClose,
    changePercent,
  };
}

async function fetchLivePrice(instrument) {
  const result =
    instrument.liveSource === 'metal'
      ? await getMetalLivePrice(instrument)
      : await getYahooLivePrice(instrument);

  return {
    id: instrument.id,
    label: instrument.label,
    symbolLabel: instrument.symbolLabel,
    ...result,
  };
}

app.get('/api/price/live', async (req, res) => {
  const instrument = findInstrument(req.query.id);
  if (!instrument) {
    return res.status(400).json({ error: `Unknown instrument id "${req.query.id}"` });
  }

  try {
    res.json(await fetchLivePrice(instrument));
  } catch (err) {
    console.error(`Failed to fetch live price for ${instrument.id}:`, err.message);
    res.status(502).json({ error: `Failed to fetch live price for ${instrument.label}` });
  }
});

// Fetch live quotes for several instruments in one round trip (used by the
// stocks watchlist, so the browser doesn't open 20+ simultaneous requests).
// Per-item failures don't fail the whole batch; they're reported inline.
app.get('/api/price/live-batch', async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'Provide at least one id via ?ids=a,b,c' });
  }

  const results = await Promise.all(
    ids.map(async (id) => {
      const instrument = findInstrument(id);
      if (!instrument) return { id, error: `Unknown instrument id "${id}"` };
      try {
        return await fetchLivePrice(instrument);
      } catch (err) {
        return { id, label: instrument.label, error: `Failed to fetch live price for ${instrument.label}` };
      }
    })
  );

  res.json(results);
});

// ---------------------------------------------------------------------------
// Historical price: Yahoo Finance chart API. Yahoo doesn't expose a native
// "last 1 hour" range, so for that case we request a 1-day/1-minute series
// and trim it down on the server.
// ---------------------------------------------------------------------------
const RANGE_CONFIG = {
  '1h': { range: '1d', interval: '1m', trimToMs: 60 * 60 * 1000 },
  '1d': { range: '1d', interval: '2m' },
  '1w': { range: '5d', interval: '15m' },
  '1m': { range: '1mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '5y': { range: '5y', interval: '1wk' },
};

app.get('/api/price/history', async (req, res) => {
  const instrument = findInstrument(req.query.id);
  if (!instrument) {
    return res.status(400).json({ error: `Unknown instrument id "${req.query.id}"` });
  }

  const rangeKey = req.query.range;
  const config = RANGE_CONFIG[rangeKey];
  if (!config) {
    return res.status(400).json({
      error: `Invalid range "${rangeKey}". Valid values: ${Object.keys(RANGE_CONFIG).join(', ')}`,
    });
  }

  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(instrument.historySymbol)}?range=${config.range}&interval=${config.interval}`;
    const response = await fetch(url, { headers: YAHOO_HEADERS });
    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    if (!result) {
      throw new Error('Unexpected response shape from Yahoo Finance');
    }

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    let points = timestamps
      .map((t, i) => ({ time: t * 1000, price: closes[i] }))
      .filter((p) => typeof p.price === 'number');

    if (config.trimToMs) {
      const cutoff = Date.now() - config.trimToMs;
      points = points.filter((p) => p.time >= cutoff);
    }

    res.json({
      id: instrument.id,
      range: rangeKey,
      currency: result.meta?.currency || 'USD',
      points,
    });
  } catch (err) {
    console.error(`Failed to fetch price history for ${instrument.id}:`, err.message);
    res.status(502).json({ error: `Failed to fetch price history for ${instrument.label}` });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// Crypto: CoinGecko public API (free, no API key). One cached call to
// /coins/markets covers the whole watchlist (top 20 by market cap + Cookie
// DAO / Official Trump / World Liberty Financial) *and* live quotes, since
// that endpoint already returns current price and 24h change per coin.
// ---------------------------------------------------------------------------
app.get('/api/crypto/list', async (_req, res) => {
  try {
    res.json(await getCryptoWatchlist());
  } catch (err) {
    console.error('Failed to fetch crypto watchlist:', err.message);
    res.status(err.status || 502).json({ error: `Failed to fetch crypto watchlist: ${err.message}` });
  }
});

app.get('/api/crypto/live', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Provide ?id=<coingecko-id>' });

  try {
    res.json(await getCryptoLive(id));
  } catch (err) {
    console.error(`Failed to fetch live crypto price for ${id}:`, err.message);
    res.status(err.status || 502).json({ error: err.message });
  }
});

app.get('/api/crypto/history', async (req, res) => {
  const { id, range } = req.query;
  if (!id) return res.status(400).json({ error: 'Provide ?id=<coingecko-id>' });

  try {
    res.json(await getCryptoHistory(id, range));
  } catch (err) {
    console.error(`Failed to fetch crypto history for ${id}:`, err.message);
    res.status(err.status || 502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve the built React app (client/dist) in production, e.g. on Render,
// where this single Express service handles both the API and the frontend.
// In local dev, the frontend is served separately by the Vite dev server
// (see client/vite.config.js), and client/dist won't exist until built.
// ---------------------------------------------------------------------------
const clientDist = path.join(__dirname, '..', 'client', 'dist');

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gold price server listening on http://localhost:${PORT}`);
});
