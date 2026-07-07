import React, { useEffect, useState } from 'react';

export default function Timeline({ apiKey, authToken, documents, onFetchDocs }) {
  const [timelineData, setTimelineData] = useState({});
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [documents, filter, authToken]);

  const fetchTimeline = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/timeline', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      
      // Filter data on frontend for responsive tab switching
      const filtered = {};
      Object.keys(data).forEach(year => {
        const docs = data[year].filter(doc => filter === 'All' || doc.category === filter);
        if (docs.length > 0) {
          filtered[year] = docs;
        }
      });

      setTimelineData(filtered);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        onFetchDocs(); // refresh global document list
      } else {
        alert('Failed to delete milestone.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  const categories = ['All', 'Projects', 'Certifications', 'Internships', 'Achievements', 'Academics'];
  const yearsSorted = Object.keys(timelineData).sort((a, b) => b - a); // descending order

  return (
    <div className="timeline-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Digital Journey Timeline</h1>
          <p className="page-subtitle">A chronological record of your professional growth and milestones</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem', 
              borderRadius: '20px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Chronologizing milestones...</div>
      ) : yearsSorted.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '16px' }}>⏳</span>
          No milestones found in this category. Upload files in the Ingestion core to populate your timeline!
        </div>
      ) : (
        <div className="timeline-container">
          {yearsSorted.map(year => (
            <div key={year} className="timeline-year-group">
              <div className="timeline-year">{year}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {timelineData[year].map(doc => (
                  <div key={doc._id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="glass-card timeline-card">
                      <div className="timeline-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 className="timeline-card-title">{doc.title}</h3>
                            <span className={`badge badge-${doc.category.toLowerCase()}`}>
                              {doc.category}
                            </span>
                          </div>
                          <div className="timeline-card-org">
                            {doc.organization || 'Independent'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(doc.date).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => handleDelete(doc._id)} 
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--error)', 
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '4px'
                            }}
                            title="Delete Milestone"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {doc.summary && (
                        <p style={{ fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                          {doc.summary}
                        </p>
                      )}

                      {doc.description && doc.description !== doc.summary && (
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                          {doc.description}
                        </p>
                      )}

                      {/* Skills Tags */}
                      {doc.skills && doc.skills.length > 0 && (
                        <div className="timeline-card-skills">
                          {doc.skills.map(skill => (
                            <span key={skill} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                      )}

                      {/* Original File / Link button */}
                      {(doc.filepath || doc.sourceUrl) && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                          {doc.filepath && (
                            <a
                              href={`http://localhost:5000/${doc.filepath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                textDecoration: 'none',
                                alignSelf: 'flex-start'
                              }}
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
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                textDecoration: 'none',
                                alignSelf: 'flex-start'
                              }}
                            >
                              🔗 Open Resource Link
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
