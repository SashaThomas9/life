import React, { useState } from 'react';
import './styles/App.css';
import Home from './pages/Home';
import Work from './pages/Work';
import Life from './pages/Life';
import Training from './pages/Training';
import History from './pages/History';
import { getCurrentUser, loginUser, logoutUser } from './utils/storage';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(getCurrentUser());
  const [nameInput, setNameInput] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const sanitized = loginUser(nameInput);
    if (sanitized) {
      setUser(sanitized);
      setNameInput('');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setActiveTab('home');
  };

  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Life Planning App</h1>
        </header>
        <main className="app-main">
          <div className="login-page">
            <div className="login-card">
              <h2>Welcome</h2>
              <p>Enter your name to get started. Your data will sync across all your devices.</p>
              <form onSubmit={handleLogin} className="login-form">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name..."
                  className="input-field"
                  autoFocus
                />
                <button type="submit" className="btn-primary">Continue</button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'work':
        return <Work />;
      case 'life':
        return <Life />;
      case 'training':
        return <Training />;
      case 'history':
        return <History />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Life Planning App</h1>
        <div className="header-user">
          <span>{user}</span>
          <button onClick={handleLogout} className="btn-logout">Log Out</button>
        </div>
      </header>

      <main className="app-main">
        {renderPage()}
      </main>

      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="tab-icon">🏠</span>
          <span className="tab-label">Home</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'work' ? 'active' : ''}`}
          onClick={() => setActiveTab('work')}
        >
          <span className="tab-icon">💼</span>
          <span className="tab-label">Work</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'life' ? 'active' : ''}`}
          onClick={() => setActiveTab('life')}
        >
          <span className="tab-icon">🌱</span>
          <span className="tab-label">Life</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          <span className="tab-icon">🏋️</span>
          <span className="tab-label">Training</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">Calendar</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
