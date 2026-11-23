// Catalog of every instrument the app can show a price/chart for.
//
// `liveSource`:
//   - 'metal': live price comes from gold-api.com (spot price, no API key).
//   - 'yahoo': live price is derived from the Yahoo Finance chart endpoint's
//     metadata (regularMarketPrice / previousClose), same endpoint used for
//     historical data.
//
// `historySymbol` is always a Yahoo Finance chart symbol.
//
// The "stocks" list intentionally merges the explicitly requested names
// (NASDAQ, Nvidia, Apple, Tesla, Amazon) with a curated, static snapshot of
// ~20 of the largest US-listed companies by market cap. It is NOT a live
// ranking - re-ordering by actual market cap would require a paid data
// provider or a fragile unofficial screener call, so this list is a
// reasonable fixed approximation that already includes the requested names.
// Anthropic and SpaceX are private companies with no public ticker, so they
// are intentionally omitted (per user request).

export const METALS = [
  {
    id: 'gold',
    label: 'Gold',
    symbolLabel: 'XAU/USD',
    type: 'metal',
    liveSource: 'metal',
    liveSymbol: 'XAU',
    historySymbol: 'GC=F',
    unit: 'per troy ounce',
  },
  {
    id: 'silver',
    label: 'Silver',
    symbolLabel: 'XAG/USD',
    type: 'metal',
    liveSource: 'metal',
    liveSymbol: 'XAG',
    historySymbol: 'SI=F',
    unit: 'per troy ounce',
  },
];

export const STOCKS = [
  { id: 'ixic', label: 'NASDAQ Composite', symbolLabel: '^IXIC', type: 'index' },
  { id: 'nvda', label: 'NVIDIA', symbolLabel: 'NVDA', type: 'stock' },
  { id: 'aapl', label: 'Apple', symbolLabel: 'AAPL', type: 'stock' },
  { id: 'tsla', label: 'Tesla', symbolLabel: 'TSLA', type: 'stock' },
  { id: 'amzn', label: 'Amazon', symbolLabel: 'AMZN', type: 'stock' },
  { id: 'msft', label: 'Microsoft', symbolLabel: 'MSFT', type: 'stock' },
  { id: 'googl', label: 'Alphabet (Google)', symbolLabel: 'GOOGL', type: 'stock' },
  { id: 'meta', label: 'Meta Platforms', symbolLabel: 'META', type: 'stock' },
  { id: 'brk-b', label: 'Berkshire Hathaway', symbolLabel: 'BRK-B', type: 'stock' },
  { id: 'avgo', label: 'Broadcom', symbolLabel: 'AVGO', type: 'stock' },
  { id: 'lly', label: 'Eli Lilly', symbolLabel: 'LLY', type: 'stock' },
  { id: 'jpm', label: 'JPMorgan Chase', symbolLabel: 'JPM', type: 'stock' },
  { id: 'v', label: 'Visa', symbolLabel: 'V', type: 'stock' },
  { id: 'wmt', label: 'Walmart', symbolLabel: 'WMT', type: 'stock' },
  { id: 'xom', label: 'Exxon Mobil', symbolLabel: 'XOM', type: 'stock' },
  { id: 'unh', label: 'UnitedHealth Group', symbolLabel: 'UNH', type: 'stock' },
  { id: 'ma', label: 'Mastercard', symbolLabel: 'MA', type: 'stock' },
  { id: 'pg', label: 'Procter & Gamble', symbolLabel: 'PG', type: 'stock' },
  { id: 'jnj', label: 'Johnson & Johnson', symbolLabel: 'JNJ', type: 'stock' },
  { id: 'orcl', label: 'Oracle', symbolLabel: 'ORCL', type: 'stock' },
  { id: 'hd', label: 'Home Depot', symbolLabel: 'HD', type: 'stock' },
].map((s) => ({
  ...s,
  liveSource: 'yahoo',
  historySymbol: s.symbolLabel,
}));

export const ALL_INSTRUMENTS = [...METALS, ...STOCKS];

export function findInstrument(id) {
  return ALL_INSTRUMENTS.find((i) => i.id === id);
}
