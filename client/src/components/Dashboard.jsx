import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Dashboard({ apiKey, authToken, documents, onNavigate, onFetchDocs }) {
  const [synthesis, setSynthesis] = useState('');
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  useEffect(() => {
    fetchSynthesis();
  }, [documents.length, apiKey, authToken]);

  const fetchSynthesis = async () => {
    if (!authToken) return;
    if (documents.length === 0) {
      setSynthesis("Ingest your documents (resumes, certificates, project reports) to compile your AI Journey Synthesis!");
      return;
    }
    setLoadingSynthesis(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/synthesis`, {
        headers: {
          'x-gemini-key': apiKey,
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.error) {
        setSynthesis(`Error generating synthesis: ${data.error}`);
      } else {
        setSynthesis(data.synthesis);
      }
    } catch (err) {
      setSynthesis('Failed to generate career synthesis. Make sure the server is running and your API key is correct.');
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const renderFormattedSynthesis = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        const headerText = trimmed.replace(/\*\*/g, '');
        return (
          <h3 key={idx} style={{
            fontSize: '1.05rem',
            fontWeight: '700',
            color: 'var(--neon-accent)',
            marginTop: '20px',
            marginBottom: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '4px'
          }}>
            {headerText}
          </h3>
        );
      }
      if (trimmed.startsWith('-')) {
        const bulletText = trimmed.substring(1).trim();
        const parts = bulletText.split('**');
        const formattedParts = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return <strong key={pIdx} style={{ color: 'var(--text-secondary)' }}>{part}</strong>;
          }
          return part;
        });
        return (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '6px',
            paddingLeft: '12px',
            fontSize: '0.92rem',
            lineHeight: '1.5',
            color: 'var(--text-muted)'
          }}>
            <span style={{ color: 'var(--neon-accent)' }}>•</span>
            <div>{formattedParts}</div>
          </div>
        );
      }
      if (trimmed.length > 0) {
        return (
          <p key={idx} style={{
            fontSize: '0.92rem',
            lineHeight: '1.5',
            color: 'var(--text-muted)',
            marginBottom: '8px'
          }}>
            {trimmed}
          </p>
        );
      }
      return <div key={idx} style={{ height: '4px' }} />;
    });
  };

  // Group stats
  const stats = {
    Projects: 0,
    Certifications: 0,
    Internships: 0,
    Achievements: 0,
    Academics: 0,
    Skills: new Set()
  };

  documents.forEach(doc => {
    if (stats[doc.category] !== undefined) {
      stats[doc.category]++;
    }
    doc.skills.forEach(s => stats.Skills.add(s.trim()));
  });

  const recentDocs = documents.slice(0, 4);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Digital Identity Dashboard</h1>
          <p className="page-subtitle">Welcome to your intelligent digital memory core</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
          + Ingest Document
        </button>
      </div>

      {/* Overview Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>{stats.Projects}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399' }}>{stats.Certifications}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificates</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>{stats.Internships}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Internships</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#f472b6' }}>{stats.Achievements}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Achievements</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#c084fc' }}>{stats.Skills.size}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extracted Skills</span>
        </div>
      </div>

      {/* AI Synthesis Section */}
      <div className="glass-card synthesis-section" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-secondary)' }}>AI Journey Synthesis</h2>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
            onClick={fetchSynthesis}
            disabled={loadingSynthesis || documents.length === 0}
          >
            {loadingSynthesis ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        {loadingSynthesis ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="spinner" style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(139, 92, 246, 0.2)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Compiling your milestones and synthesizing career paths...</span>
          </div>
        ) : (
          <div className="synthesis-content" style={{ color: 'var(--text-primary)', fontSize: '0.98rem' }}>
            {renderFormattedSynthesis(synthesis)}
          </div>
        )}
      </div>

      {/* Split Grid: Recent Docs & Core Skills */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {/* Recent Uploads */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>Recent Digital Footprints</h2>
          {recentDocs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No data ingested yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentDocs.map(doc => (
                <div 
                  key={doc._id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(10, 5, 22, 0.4)',
                    border: '1px solid rgba(147, 51, 234, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '75%' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.title}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {doc.organization} • {new Date(doc.date).getFullYear()}
                    </span>
                  </div>
                  <span className={`badge badge-${doc.category.toLowerCase()}`}>{doc.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills Tag Cloud */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>Core Competency Core</h2>
          {stats.Skills.size === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No skills extracted yet. Upload certificates or reports to populate skills.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Array.from(stats.Skills).map(skill => (
                <span 
                  key={skill} 
                  className="skill-tag"
                  style={{ 
                    fontSize: '0.85rem', 
                    padding: '6px 12px', 
                    borderRadius: '6px',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
