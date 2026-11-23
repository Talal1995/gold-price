const currencyFormatters = new Map();

export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  // Sub-$1 prices (common for many cryptocurrencies, e.g. COOKIE ~$0.008)
  // need more than 2 decimal places or they'd all round to $0.00/$0.01.
  const fractionDigits = value !== 0 && Math.abs(value) < 1 ? 6 : 2;
  const key = `${currency}:${fractionDigits}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })
    );
  }
  return currencyFormatters.get(key).format(value);
}

// Chooses a sensible axis/tooltip date format depending on how zoomed-in the
// selected range is.
export function formatTimestamp(ms, range) {
  const date = new Date(ms);
  if (range === '1h' || range === '1d') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1w') {
    return date.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
