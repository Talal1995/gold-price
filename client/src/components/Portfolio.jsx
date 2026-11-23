import { useState, useEffect } from 'react';
import '../styles/Portfolio.css';

const GOLD_HOLDINGS = [
  { weight: 172, purity: '24K', symbol: 'XAU' },
  { weight: 102, purity: '18K', symbol: 'XAU' },
  { weight: 77.97, purity: '21K', symbol: 'XAU' },
];

export default function Portfolio() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/price/live?id=gold');
        if (!response.ok) throw new Error('Failed to fetch gold price');
        const data = await response.json();
        setPrices(data);
        setError('');
      } catch (err) {
        setError(err.message);
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const calculatePurity = (weight, purity) => {
    const purityMap = { '24K': 1, '21K': 0.875, '18K': 0.75, '14K': 0.583 };
    return weight * (purityMap[purity] || 1);
  };

  const calculateValue = (weight, purity, pricePerOz) => {
    const pureWeight = calculatePurity(weight, purity);
    const weightInOz = pureWeight / 31.1035; // 1 troy oz = 31.1035 grams
    return weightInOz * pricePerOz;
  };

  const totalValue = GOLD_HOLDINGS.reduce((sum, holding) => {
    const price = prices.price || 0;
    return sum + calculateValue(holding.weight, holding.purity, price);
  }, 0);

  const lastUpdated = prices.updatedAt ? new Date(prices.updatedAt).toLocaleTimeString() : 'N/A';

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h2>My Gold Portfolio</h2>
        <div className="price-display">
          <div className="current-price">
            <span className="label">Current Gold Price</span>
            <span className="price">
              {loading ? 'Loading...' : `$${prices.price?.toFixed(2) || 'N/A'}`}
              <span className="unit">/oz</span>
            </span>
          </div>
          <div className="total-value">
            <span className="label">Total Portfolio Value</span>
            <span className="value">${loading ? 'Loading...' : totalValue.toFixed(2)}</span>
          </div>
          <div className="last-update">
            Updated: {lastUpdated}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="holdings-list">
        <h3>Your Holdings</h3>
        {GOLD_HOLDINGS.map((holding, idx) => {
          const value = calculateValue(holding.weight, holding.purity, prices.price || 0);
          const pure = calculatePurity(holding.weight, holding.purity);
          return (
            <div key={idx} className="holding-card">
              <div className="holding-info">
                <div className="holding-spec">
                  <span className="weight">{holding.weight}g</span>
                  <span className="purity">{holding.purity}</span>
                </div>
                <div className="holding-details">
                  <p>Pure Weight: {pure.toFixed(2)}g</p>
                  <p>Value: ${loading ? 'Loading...' : value.toFixed(2)}</p>
                </div>
              </div>
              <div className="holding-chart" style={{ width: `${(pure / 300) * 100}%` }}></div>
            </div>
          );
        })}
      </div>

      <div className="portfolio-stats">
        <div className="stat">
          <span className="stat-label">Total Weight</span>
          <span className="stat-value">{(172 + 102 + 77.97).toFixed(2)}g</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Pure Weight</span>
          <span className="stat-value">
            {(calculatePurity(172, '24K') + calculatePurity(102, '18K') + calculatePurity(77.97, '21K')).toFixed(2)}g
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Average Purity</span>
          <span className="stat-value">
            {(((calculatePurity(172, '24K') + calculatePurity(102, '18K') + calculatePurity(77.97, '21K')) / (172 + 102 + 77.97)) * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
