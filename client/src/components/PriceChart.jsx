import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency, formatTimestamp } from '../utils/format';

function ChartTooltip({ active, payload, range, currency }) {
  if (!active || !payload?.length) return null;
  const { time, price } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__time">{formatTimestamp(time, range)}</div>
      <div className="chart-tooltip__price">{formatCurrency(price, currency)}</div>
    </div>
  );
}

export default function PriceChart({ points, range, currency, loading, error }) {
  if (error) {
    return <div className="chart-status chart-status--error">Unable to load chart data. {error}</div>;
  }

  if (loading) {
    return <div className="chart-status">Loading chart…</div>;
  }

  if (!points?.length) {
    return <div className="chart-status">No chart data available for this range.</div>;
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = Math.max((max - min) * 0.1, 1);
  const trendUp = points[points.length - 1].price >= points[0].price;

  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart data={points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={trendUp ? '#2e7d32' : '#c62828'} stopOpacity={0.35} />
            <stop offset="95%" stopColor={trendUp ? '#2e7d32' : '#c62828'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#30333d" />
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => formatTimestamp(value, range)}
          stroke="#8a8f98"
          minTickGap={40}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tickFormatter={(value) => formatCurrency(value, currency)}
          stroke="#8a8f98"
          width={90}
        />
        <Tooltip content={<ChartTooltip range={range} currency={currency} />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={trendUp ? '#2e7d32' : '#c62828'}
          strokeWidth={2}
          fill="url(#goldGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
