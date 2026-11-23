import { useState, useEffect } from 'react';
import '../styles/Portfolio.css';

const GOLD_HOLDINGS = [
  { weight: 172, purity: '24K', symbol: 'XAU' },
  { weight: 102, purity: '18K', symbol: 'XAU' },
  { weight: 77.97, purity: '21K', symbol: 'XAU' },
];

const CRYPTO_HOLDINGS = [
  { id: 'cookie', symbol: 'COOKIE', amount: 130000, label: 'Cookie Coin' },
];

export default function Portfolio() {
  const [goldPrice, setGoldPrice] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        
        // Fetch gold price
        const goldResponse = await fetch('/api/price/live?id=gold');
        if (!goldResponse.ok) throw new Error('Failed to fetch gold price');
        const goldData = await goldResponse.json();
        setGoldPrice(goldData);

        // Fetch crypto prices
        const cryptoData = {};
        for (const holding of CRYPTO_HOLDINGS) {
          try {
            const cryptoResponse = await fetch(`/api/crypto/live?id=${holding.id}`);
            if (cryptoResponse.ok) {
              const data = await cryptoResponse.json();
              cryptoData[holding.id] = data;
            }
          } catch (err) {
            console.error(`Failed to fetch ${holding.id} price:`, err);
          }
        }
        setCryptoPrices(cryptoData);
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

  const calculateGoldValue = (weight, purity, pricePerOz) => {
    const pureWeight = calculatePurity(weight, purity);
    const weightInOz = pureWeight / 31.1035; // 1 troy oz = 31.1035 grams
    return weightInOz * pricePerOz;
  };

  const totalGoldValue = GOLD_HOLDINGS.reduce((sum, holding) => {
    const price = goldPrice?.price || 0;
    return sum + calculateGoldValue(holding.weight, holding.purity, price);
  }, 0);

  const totalCryptoValue = CRYPTO_HOLDINGS.reduce((sum, holding) => {
    const cryptoData = cryptoPrices[holding.id];
    const price = cryptoData?.price || 0;
    return sum + (holding.amount * price);
  }, 0);

  const totalPortfolioValue = totalGoldValue + totalCryptoValue;

  const lastUpdated = goldPrice?.updatedAt ? new Date(goldPrice.updatedAt).toLocaleTimeString() : 'N/A';

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h2>My Portfolio</h2>
        <div className="price-display">
          <div className="total-value">
            <span className="label">Total Portfolio Value</span>
            <span className="value">${loading ? 'Loading...' : totalPortfolioValue.toFixed(2)}</span>
          </div>
          <div className="portfolio-breakdown">
            <span className="label">Breakdown</span>
            <div className="breakdown-items">
              <div className="breakdown-item">
                <span>Gold:</span>
                <span>${totalGoldValue.toFixed(2)}</span>
              </div>
              <div className="breakdown-item">
                <span>Crypto:</span>
                <span>${totalCryptoValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="last-update">
            Updated: {lastUpdated}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* GOLD HOLDINGS SECTION */}
      <div className="holdings-section">
        <h3>🥇 Gold Holdings</h3>
        <div className="current-price">
          <span className="label">Current Gold Price</span>
          <span className="price">
            {loading ? 'Loading...' : `$${goldPrice?.price?.toFixed(2) || 'N/A'}`}
            <span className="unit">/oz</span>
          </span>
        </div>

        <div className="holdings-list">
          {GOLD_HOLDINGS.map((holding, idx) => {
            const value = calculateGoldValue(holding.weight, holding.purity, goldPrice?.price || 0);
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

      {/* CRYPTO HOLDINGS SECTION */}
      <div className="holdings-section">
        <h3>🪙 Crypto Holdings</h3>
        
        <div className="holdings-list">
          {CRYPTO_HOLDINGS.map((holding, idx) => {
            const cryptoData = cryptoPrices[holding.id];
            const price = cryptoData?.price || 0;
            const value = holding.amount * price;
            const changePercent = cryptoData?.changePercent || 0;
            
            return (
              <div key={idx} className="holding-card crypto-card">
                <div className="holding-info">
                  <div className="holding-spec">
                    <span className="crypto-amount">{holding.amount.toLocaleString()}</span>
                    <span className="crypto-symbol">{holding.symbol}</span>
                    <span className="crypto-label">{holding.label}</span>
                  </div>
                  <div className="holding-details">
                    <p>Price: ${loading ? 'Loading...' : price.toFixed(8)}</p>
                    <p className={`change-percent ${changePercent >= 0 ? 'positive' : 'negative'}`}>
                      {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
                    </p>
                    <p className="crypto-value">Total Value: ${loading ? 'Loading...' : value.toFixed(2)}</p>
                  </div>
                </div>
                <div className="holding-chart crypto" style={{ width: '100%', backgroundColor: '#FF6B6B' }}></div>
              </div>
            );
          })}
        </div>

        <div className="crypto-stats">
          <div className="stat">
            <span className="stat-label">Total Coins</span>
            <span className="stat-value">{CRYPTO_HOLDINGS.reduce((sum, h) => sum + h.amount, 0).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Average Price</span>
            <span className="stat-value">
              ${loading ? 'Loading...' : (cryptoPrices['cookie']?.price || 0).toFixed(8)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Crypto Value</span>
            <span className="stat-value">${loading ? 'Loading...' : totalCryptoValue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
