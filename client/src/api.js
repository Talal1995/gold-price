// Ordered list of selectable chart timeframes, matching the server's
// supported `range` values in server/index.js (RANGE_CONFIG).
export const TIME_RANGES = [
  { key: '1h', label: '1H' },
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
];

async function getJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Request to ${url} failed with ${response.status}`);
  }
  return data;
}

export function fetchInstruments() {
  return getJson('/api/instruments');
}

export function fetchLivePrice(id) {
  return getJson(`/api/price/live?id=${encodeURIComponent(id)}`);
}

export function fetchMetalChange(id) {
  return getJson(`/api/price/metal-change?id=${encodeURIComponent(id)}`);
}

export function fetchLivePriceBatch(ids) {
  return getJson(`/api/price/live-batch?ids=${encodeURIComponent(ids.join(','))}`);
}

export function fetchPriceHistory(id, range) {
  return getJson(`/api/price/history?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`);
}

export function fetchCryptoList() {
  return getJson('/api/crypto/list');
}

export function fetchCryptoLive(id) {
  return getJson(`/api/crypto/live?id=${encodeURIComponent(id)}`);
}

export function fetchCryptoHistory(id, range) {
  return getJson(`/api/crypto/history?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`);
}

export function askMarketAssistant(assetType, assetId, messages) {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetType, assetId, messages }),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed with ${response.status}`);
    return data;
  });
}
