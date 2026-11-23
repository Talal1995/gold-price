import { formatCurrency } from '../utils/format';

export default function PriceTicker({ data, previousPrice, loading, error }) {
  if (error) {
    return (
      <div className="price-ticker price-ticker--error">
        Unable to load the live price. {error}
      </div>
    );
  }

  if (loading && !data) {
    return <div className="price-ticker price-ticker--loading">Loading live price…</div>;
  }

  if (!data) return null;

  // Prefer the server-computed daily change (available for stocks/indices
  // via Yahoo's previousClose); fall back to comparing against the last
  // polled price for instruments that don't expose a previous close
  // (precious metals spot price).
  const tickDirection =
    typeof previousPrice === 'number' && data.price !== previousPrice
      ? data.price > previousPrice
        ? 'up'
        : 'down'
      : null;

  const changeDirection =
    typeof data.changePercent === 'number'
      ? data.changePercent > 0
        ? 'up'
        : data.changePercent < 0
          ? 'down'
          : null
      : tickDirection;

  const updated = data.updatedAt ? new Date(data.updatedAt) : null;

  return (
    <div className="price-ticker">
      <div className="price-ticker__label">
        {data.label} {data.symbolLabel ? `(${data.symbolLabel})` : ''}
      </div>
      <div className={`price-ticker__value${tickDirection ? ` price-ticker__value--${tickDirection}` : ''}`}>
        {formatCurrency(data.price, data.currency)}
      </div>
      {typeof data.changePercent === 'number' && (
        <div className={`price-ticker__change price-ticker__change--${changeDirection}`}>
          {data.changePercent > 0 ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}% today
        </div>
      )}
      {updated && (
        <div className="price-ticker__updated">Last updated {updated.toLocaleTimeString()}</div>
      )}
    </div>
  );
}
