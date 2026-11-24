import { useState, useEffect } from 'react';
import './App.css';
import Tabs from './components/Tabs';
import Login from './components/Login';
import Portfolio from './components/Portfolio';
import MetalsPage from './pages/MetalsPage';
import StocksPage from './pages/StocksPage';
import CryptoPage from './pages/CryptoPage';
import MarketChat from './components/MarketChat';

const TABS = [
  { key: 'portfolio', label: 'My Portfolio' },
  { key: 'metals', label: 'Metals' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
];

const PAGES = {
  portfolio: Portfolio,
  metals: MetalsPage,
  stocks: StocksPage,
  crypto: CryptoPage,
};

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('metals');
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = () => {
      const localSession = localStorage.getItem('user_session');
      const sessionSession = sessionStorage.getItem('user_session');
      
      if (localSession) {
        try {
          const session = JSON.parse(localSession);
          setUser({ email: session.email, token: session.token });
          setActiveTab('portfolio');
        } catch (e) {
          console.error('Failed to parse session:', e);
        }
      } else if (sessionSession) {
        try {
          const session = JSON.parse(sessionSession);
          setUser({ email: session.email, token: session.token });
          setActiveTab('portfolio');
        } catch (e) {
          console.error('Failed to parse session:', e);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = (email, token) => {
    setUser({ email, token });
    setActiveTab('portfolio');
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
    sessionStorage.removeItem('user_session');
    setActiveTab('metals');
  };

  if (loading) {
    return <div className="app__loading">Loading...</div>;
  }

  if (!user && showLogin) {
    return <Login onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
  }

  const ActivePage = PAGES[activeTab];

  return (
    <div className="app">
      <header className="app__header">
        <div className="header-content">
          <div>
            <h1>Markets Tracker</h1>
            <p className="app__subtitle">Live prices &amp; historical charts</p>
          </div>
          <div className="header-user">
            {user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="logout-btn">Log in</button>
            )}
          </div>
        </div>
      </header>

      <Tabs tabs={user ? TABS : TABS.filter((tab) => tab.key !== 'portfolio')} active={activeTab} onSelect={setActiveTab} />

      <ActivePage />

      <MarketChat />

      <footer className="app__footer">
        Precious metals: live spot price via{' '}
        <a href="https://www.gold-api.com" target="_blank" rel="noreferrer">gold-api.com</a>, history
        via Yahoo Finance futures (GC=F / SI=F). Stocks &amp; indices: live quotes and history via
        Yahoo Finance. Crypto: live quotes and history via{' '}
        <a href="https://www.coingecko.com" target="_blank" rel="noreferrer">CoinGecko</a>.
      </footer>
    </div>
  );
}

export default App;
