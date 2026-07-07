import React, { useState } from 'react';

export default function Retrieval({ apiKey, authToken }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'chat'

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(null);

  // Chat States
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Hi there! I am your MemoryVerse AI career counselor. Ask me anything about your certificates, projects, or internships, or ask me to draft a professional summary for you!' }
  ]);
  const [chatting, setChatting] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !authToken) return;

    setSearching(true);
    setSearchResults(null);
    try {
      const res = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': apiKey,
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.results);
        setAppliedFilters(data.filters);
      } else {
        alert(`Search failed: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    } finally {
      setSearching(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim() || !authToken) return;

    const userMsg = { role: 'user', content: chatQuery };
    setChatHistory(prev => [...prev, userMsg]);
    setChatQuery('');
    setChatting(true);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': apiKey,
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: userMsg.content,
          chatHistory: chatHistory.slice(1) // exclude first greeting
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${data.error || 'Failed to generate response'}` }]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Connection error. Ensure server is running.' }]);
    } finally {
      setChatting(false);
    }
  };

  const clearChat = () => {
    setChatHistory([
      { role: 'ai', content: 'Hi there! I am your MemoryVerse AI career counselor. Ask me anything about your certificates, projects, or internships, or ask me to draft a professional summary for you!' }
    ]);
  };

  return (
    <div className="retrieval-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Retrieval Core</h1>
          <p className="page-subtitle">Access your data instantly via natural search or chat with your digital identity</p>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Natural Search
        </button>
        <button 
          className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 AI Career Companion
        </button>
      </div>

      {/* SEARCH TAB CONTENT */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Query Ingested Milestones</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="e.g. Show all python projects, Show google internships, Check if I have an AWS certification"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={searching}>
                {searching ? 'Parsing...' : 'Search'}
              </button>
            </form>
          </div>

          {appliedFilters && (
            <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                AI Interpreted Search Filters:
              </span>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                {appliedFilters.category && (
                  <span><strong>Category:</strong> <span className={`badge badge-${appliedFilters.category.toLowerCase()}`}>{appliedFilters.category}</span></span>
                )}
                {appliedFilters.skills && appliedFilters.skills.length > 0 && (
                  <span><strong>Skills:</strong> {appliedFilters.skills.map(s => <span key={s} className="skill-tag" style={{ marginLeft: '4px' }}>{s}</span>)}</span>
                )}
                {appliedFilters.organization && (
                  <span><strong>Organization:</strong> {appliedFilters.organization}</span>
                )}
                {appliedFilters.year && (
                  <span><strong>Year:</strong> {appliedFilters.year}</span>
                )}
                {appliedFilters.searchTerm && (
                  <span><strong>Keyword:</strong> "{appliedFilters.searchTerm}"</span>
                )}
                {!appliedFilters.category && (!appliedFilters.skills || appliedFilters.skills.length === 0) && !appliedFilters.organization && !appliedFilters.year && !appliedFilters.searchTerm && (
                  <span style={{ color: 'var(--text-muted)' }}>Broad text search match</span>
                )}
              </div>
            </div>
          )}

          {searchResults && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.15rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Search Results ({searchResults.length})
              </h2>
              {searchResults.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No milestones match this criteria.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {searchResults.map(doc => (
                    <div 
                      key={doc._id}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: 'rgba(10, 5, 22, 0.4)',
                        border: '1px solid rgba(139, 92, 246, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{doc.title}</h3>
                        <span className={`badge badge-${doc.category.toLowerCase()}`}>{doc.category}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {doc.organization} • {new Date(doc.date).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.summary || doc.description}</p>
                      
                      {doc.skills && doc.skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {doc.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                        </div>
                      )}

                      {(doc.filepath || doc.sourceUrl) && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                          {doc.filepath && (
                            <a
                              href={`http://localhost:5000/${doc.filepath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                            >
                              📄 View Original File
                            </a>
                          )}
                          {doc.sourceUrl && (
                            <a
                              href={doc.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                            >
                              🔗 Open Resource Link
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CHAT TAB CONTENT */}
      {activeTab === 'chat' && (
        <div className="glass-card chat-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.15rem', color: 'var(--text-secondary)' }}>AI Chat Assistant</h2>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={clearChat}>
              Clear Chat
            </button>
          </div>

          <div className="chat-messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
              </div>
            ))}
            {chatting && (
              <div className="chat-message ai" style={{ color: 'var(--text-muted)' }}>
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="chat-input-area">
            <input
              type="text"
              placeholder="Ask a question (e.g. Draft a short portfolio pitch about my projects, Suggest career roles...)"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              required
              disabled={chatting}
            />
            <button type="submit" className="btn btn-primary" disabled={chatting}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
