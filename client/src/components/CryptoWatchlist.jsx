import { formatCurrency } from '../utils/format';

// Presentational table: unlike StockWatchlist (which polls its own batch
// endpoint), the crypto list + live quotes are already fetched together by
// the parent page in one call, so this component just renders them.
export default function CryptoWatchlist({ coins, selectedId, onSelect, loading, error }) {
  if (error) {
    return <div className="watchlist watchlist--error">Unable to load coins. {error}</div>;
  }

  if (loading && !coins.length) {
    return <div className="chart-status">Loading coins…</div>;
  }

  return (
    <div className="watchlist-scroll">
      <table className="watchlist">
        <thead>
          <tr>
            <th>#</th>
            <th>Coin</th>
            <th>Price</th>
            <th>24h</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const hasChange = typeof coin.changePercent === 'number';
            const changeDirection = hasChange ? (coin.changePercent >= 0 ? 'up' : 'down') : null;

            return (
              <tr
                key={coin.id}
                className={`watchlist__row${coin.id === selectedId ? ' selected' : ''}`}
                onClick={() => onSelect(coin.id)}
              >
                <td className="watchlist__rank">{coin.marketCapRank ?? '—'}</td>
                <td>
                  <div className="watchlist__name">{coin.label}</div>
                  <div className="watchlist__symbol">{coin.symbolLabel}</div>
                </td>
                <td>{formatCurrency(coin.price, coin.currency)}</td>
                <td className={changeDirection ? `watchlist__change--${changeDirection}` : ''}>
                  {hasChange ? `${coin.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(coin.changePercent).toFixed(2)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
