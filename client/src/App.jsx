import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Uploader from './components/Uploader';
import KnowledgeGraph from './components/KnowledgeGraph';
import Timeline from './components/Timeline';
import Retrieval from './components/Retrieval';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { API_BASE_URL } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiKey, setApiKey] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token') || '');
  const [authUsername, setAuthUsername] = useState(localStorage.getItem('auth_username') || '');
  const [hasServerApiKey, setHasServerApiKey] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);

  // Load API key and config on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(savedKey);
  }, []);

  // Fetch status and docs when auth state is active
  useEffect(() => {
    if (authToken) {
      checkServerStatus();
      fetchDocuments();
    }
  }, [authToken]);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setHasServerApiKey(data.hasServerApiKey || false);
      }
    } catch (err) {
      console.error('Error checking server status:', err);
    }
  };

  const fetchDocuments = async () => {
    if (!authToken) return;
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setFetchingDocs(false);
    }
  };

  const handleApiKeyChange = (newKey) => {
    setApiKey(newKey);
    fetchDocuments(); // refresh summaries
  };

  const handleLoginSuccess = (token, username) => {
    setAuthToken(token);
    setAuthUsername(username);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    setAuthToken('');
    setAuthUsername('');
    setDocuments([]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            apiKey={apiKey}
            authToken={authToken}
            documents={documents}
            onNavigate={setActiveTab}
            onFetchDocs={fetchDocuments}
          />
        );
      case 'upload':
        return (
          <Uploader
            apiKey={apiKey}
            authToken={authToken}
            onUploadSuccess={fetchDocuments}
          />
        );
      case 'graph':
        return <KnowledgeGraph apiKey={apiKey} authToken={authToken} />;
      case 'timeline':
        return (
          <Timeline
            apiKey={apiKey}
            authToken={authToken}
            documents={documents}
            onFetchDocs={fetchDocuments}
          />
        );
      case 'search':
        return <Retrieval apiKey={apiKey} authToken={authToken} />;
      case 'settings':
        return (
          <Settings
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
          />
        );
      default:
        return <div>Tab not found.</div>;
    }
  };

  // If not logged in, render the Auth portal
  if (!authToken) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">M</div>
          <span className="logo-text">MemoryVerse</span>
        </div>

        <div className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <span className="nav-icon">📥</span>
            <span>Data Ingestion</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            <span className="nav-icon">🕸️</span>
            <span>Knowledge Core</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <span className="nav-icon">⏳</span>
            <span>Journey Timeline</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="nav-icon">🔍</span>
            <span>Smart Search & Chat</span>
          </div>
        </div>

        <div className="sidebar-footer">
          {/* User info and Logout */}
          <div style={{
            padding: '8px 12px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1rem' }}>👤</span>
            <span style={{ 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90px'
            }}>{authUsername}</span>
            <button 
              onClick={handleLogout}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '2px 6px',
                textDecoration: 'underline'
              }}
            >
              Logout
            </button>
          </div>

          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ padding: '8px 12px', borderTop: 'none', marginBottom: '8px' }}
          >
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </div>

          <div className="key-status">
            <div className={`status-dot ${(apiKey || hasServerApiKey) ? 'active' : ''}`}></div>
            <span>{(apiKey || hasServerApiKey) ? 'API Active' : 'Gemini Key Missing'}</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {!(apiKey || hasServerApiKey) && activeTab !== 'settings' && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span><strong>System Offline:</strong> Please configure your Gemini API key in the settings panel to enable AI analysis and chat features.</span>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => setActiveTab('settings')}>
              Configure Key
            </button>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}
