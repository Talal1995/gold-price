import fetch from 'node-fetch';
import { withCache } from './cache.js';

const API = 'https://api.coingecko.com/api/v3';

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

async function fetchMarkets(query) {
  const url = `${API}/coins/markets?vs_currency=usd&${query}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`CoinGecko responded with ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

// Top 20 coins by market cap, merged with the explicitly requested extras,
// deduplicated. A single cached call serves both the watchlist *and* live
// quotes, since CoinGecko's /coins/markets already includes current price
// and 24h change.
export function getCryptoWatchlist() {
  return withCache('crypto:list', LIST_TTL_MS, async () => {
    const [top20, extras] = await Promise.all([
      fetchMarkets('order=market_cap_desc&per_page=20&page=1'),
      fetchMarkets(`ids=${EXTRA_IDS.join(',')}`),
    ]);

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
    const url = `${API}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`CoinGecko responded with ${response.status}: ${body.slice(0, 200)}`);
      err.status = 502;
      throw err;
    }
    const data = await response.json();

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
