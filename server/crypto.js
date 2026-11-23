import fetch from 'node-fetch';
import { withCache } from './cache.js';

const API = 'https://api.coingecko.com/api/v3';
const REQUEST_HEADERS = {
  Accept: 'application/json',
  // A plain/default User-Agent is more likely to get rate-limited or
  // challenged by CoinGecko when requests come from shared cloud-host IPs
  // (e.g. Render's free tier) - identify ourselves like a normal client.
  'User-Agent':
    'Mozilla/5.0 (compatible; MarketsTrackerApp/1.0; +https://github.com/Talal1995/gold-price)',
};
const REQUEST_TIMEOUT_MS = 10_000;

// Coins explicitly requested that aren't necessarily in the top 20 by market
// cap (CoinGecko ids, resolved via /search): Cookie DAO, Official Trump,
// World Liberty Financial.
const EXTRA_IDS = ['cookie', 'official-trump', 'world-liberty-financial'];

const LIST_TTL_MS = 45_000;
const HISTORY_TTL_MS = 60_000;

// CoinGecko's `days` parameter for /market_chart. The free/public API caps
// historical data at 365 days, so "5y" is served as the same 365-day window
// as "1y" (flagged via `capped` in the response) rather than failing.
const DAYS_BY_RANGE = {
  '1h': 1,
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '6m': 180,
  '1y': 365,
  '5y': 365,
};

function mapMarketEntry(c) {
  return {
    id: c.id,
    label: c.name,
    symbolLabel: c.symbol?.toUpperCase(),
    type: 'crypto',
    price: c.current_price,
    currency: 'USD',
    changePercent:
      typeof c.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : null,
    updatedAt: c.last_updated,
    marketCapRank: c.market_cap_rank ?? null,
  };
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: REQUEST_HEADERS, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`CoinGecko responded with ${response.status}: ${body.slice(0, 200)}`);
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`CoinGecko request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// CoinGecko's free tier is aggressively rate-limited and shared cloud-host
// IPs (Render, Heroku, etc.) can easily see transient 429s even under light
// traffic. One short retry resolves most of these without meaningfully
// hurting latency, since these endpoints are only hit once per cache TTL.
async function getJsonWithRetry(url, retries = 1, delayMs = 1500) {
  try {
    return await getJson(url);
  } catch (err) {
    if (retries > 0 && err.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return getJsonWithRetry(url, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

function fetchMarkets(query) {
  return getJsonWithRetry(`${API}/coins/markets?vs_currency=usd&${query}`);
}

// Top 20 coins by market cap, merged with the explicitly requested extras,
// deduplicated. A single cached call serves both the watchlist *and* live
// quotes, since CoinGecko's /coins/markets already includes current price
// and 24h change. The two upstream requests are allowed to fail
// independently (via allSettled) so a hiccup fetching the extras doesn't
// take down the whole top-20 watchlist, and vice versa.
export function getCryptoWatchlist() {
  return withCache('crypto:list', LIST_TTL_MS, async () => {
    const [top20Result, extrasResult] = await Promise.allSettled([
      fetchMarkets('order=market_cap_desc&per_page=20&page=1'),
      fetchMarkets(`ids=${EXTRA_IDS.join(',')}`),
    ]);

    if (top20Result.status === 'rejected' && extrasResult.status === 'rejected') {
      throw top20Result.reason;
    }
    if (top20Result.status === 'rejected') {
      console.error('Failed to fetch top-20 crypto by market cap:', top20Result.reason.message);
    }
    if (extrasResult.status === 'rejected') {
      console.error('Failed to fetch extra coins (cookie/trump/wlfi):', extrasResult.reason.message);
    }

    const top20 = top20Result.status === 'fulfilled' ? top20Result.value : [];
    const extras = extrasResult.status === 'fulfilled' ? extrasResult.value : [];

    const seen = new Set();
    return [...top20, ...extras]
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .map(mapMarketEntry);
  });
}

export function getCryptoLive(id) {
  return withCache(`crypto:live:${id}`, LIST_TTL_MS, async () => {
    const [entry] = await fetchMarkets(`ids=${encodeURIComponent(id)}`);
    if (!entry) {
      const err = new Error(`Unknown coin id "${id}"`);
      err.status = 400;
      throw err;
    }
    return mapMarketEntry(entry);
  });
}

export function getCryptoHistory(id, rangeKey) {
  const days = DAYS_BY_RANGE[rangeKey];
  if (!days) {
    const err = new Error(
      `Invalid range "${rangeKey}". Valid values: ${Object.keys(DAYS_BY_RANGE).join(', ')}`
    );
    err.status = 400;
    throw err;
  }

  return withCache(`crypto:history:${id}:${rangeKey}`, HISTORY_TTL_MS, async () => {
    const data = await getJsonWithRetry(
      `${API}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`
    );

    let points = (data.prices || []).map(([time, price]) => ({ time, price }));
    if (rangeKey === '1h') {
      const cutoff = Date.now() - 60 * 60 * 1000;
      points = points.filter((p) => p.time >= cutoff);
    }

    return {
      id,
      range: rangeKey,
      currency: 'USD',
      points,
      capped: rangeKey === '5y',
    };
  });
}

