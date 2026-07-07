import React, { useState, useEffect } from 'react';

export default function Settings({ apiKey, onApiKeyChange }) {
  const [keyInput, setKeyInput] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setKeyInput(apiKey || '');
  }, [apiKey]);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', keyInput.trim());
    onApiKeyChange(keyInput.trim());
    setStatusMsg('API key saved successfully!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    onApiKeyChange('');
    setKeyInput('');
    setStatusMsg('API key removed.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your system preferences and integrations</p>
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', marginTop: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Gemini API Integration</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
          This application uses the Gemini API to analyze files, automatically extract categories and skills, visualize relationships, and drive the semantic chat retrieval system.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
              GEMINI_API_KEY
            </label>
            <input
              type="password"
              placeholder="Paste your Gemini API Key here (starts with AIza...)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!keyInput.trim()}>
              Save API Key
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              Clear Key
            </button>
          </div>

          {statusMsg && (
            <div style={{ 
              color: statusMsg.includes('success') ? 'var(--success)' : 'var(--warning)', 
              fontSize: '0.9rem', 
              fontWeight: '500',
              marginTop: '8px'
            }}>
              {statusMsg}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', marginTop: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>System Status</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Express Server</span>
            <span style={{ color: 'var(--success)', fontWeight: '600' }}>ONLINE (Port 5000)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database</span>
            <span style={{ color: 'var(--success)', fontWeight: '600' }}>MongoDB RUNNING</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Processing Engine</span>
            <span style={{ color: apiKey ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>
              {apiKey ? 'API KEY CONFIGURED' : 'KEY MISSING'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
