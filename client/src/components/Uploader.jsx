import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function Uploader({ apiKey, authToken, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Link form states
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setStatusMsg({ type: 'info', text: `Ingesting "${file.name}"... Extracted text will be analyzed by Gemini.` });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-gemini-key': apiKey,
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.status === 201) {
        setStatusMsg({ type: 'success', text: `Successfully ingested "${file.name}"! Categorized as: ${data.category}` });
        onUploadSuccess();
      } else {
        setStatusMsg({ type: 'error', text: `Ingestion failed: ${data.error || 'Unknown error'}` });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Server connection error. Ensure backend is running.' });
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    setSubmittingLink(true);
    setStatusMsg({ type: 'info', text: `Analyzing URL "${linkUrl}" using Gemini...` });

    try {
      const res = await fetch(`${API_BASE_URL}/api/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': apiKey,
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: linkTitle,
          url: linkUrl,
          description: linkDesc
        })
      });
      const data = await res.json();
      if (res.status === 201) {
        setStatusMsg({ type: 'success', text: `Successfully linked portfolio resource! Categorized as: ${data.category}` });
        setLinkTitle('');
        setLinkUrl('');
        setLinkDesc('');
        onUploadSuccess();
      } else {
        setStatusMsg({ type: 'error', text: `Link ingestion failed: ${data.error || 'Unknown error'}` });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Server connection error. Ensure backend is running.' });
    } finally {
      setSubmittingLink(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="uploader-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Data Ingestion</h1>
          <p className="page-subtitle">Upload certificates, resumes, reports or input professional links</p>
        </div>
      </div>

      {statusMsg.text && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '0.95rem',
          fontWeight: '500',
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 
                      statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 
                      'rgba(139, 92, 246, 0.15)',
          color: statusMsg.type === 'success' ? 'var(--success)' : 
                 statusMsg.type === 'error' ? 'var(--error)' : 
                 'var(--text-secondary)',
          border: `1px solid ${
            statusMsg.type === 'success' ? 'var(--success)' : 
            statusMsg.type === 'error' ? 'var(--error)' : 
            'var(--border-color)'
          }`
        }}>
          {statusMsg.text}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        {/* File Drag Drop Ingestion */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Document Uploader
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
            Supported formats: PDF, DOCX, TXT, and Images (JPEG, PNG). Gemini will analyze certificates, resumes, and project reports directly.
          </p>

          <div 
            className={`dropzone ${dragActive ? 'dragover' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
            />
            <div className="dropzone-icon">📥</div>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>
              Drag and drop your file here
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              or click to browse from explorer
            </p>
          </div>
        </div>

        {/* Link Submission Ingestion */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Web Resource Linker
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
            Ingest links to your GitHub repositories, online portfolios, LinkedIn profiles, or published projects.
          </p>

          <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Resource Title
              </label>
              <input
                type="text"
                placeholder="e.g. My GitHub ML Repository, Portfolio Website"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                URL Link
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Context / Description (Optional)
              </label>
              <textarea
                placeholder="Add brief details about the project, contributions, or skills used."
                rows={3}
                value={linkDesc}
                onChange={(e) => setLinkDesc(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submittingLink || !linkUrl.trim()}
              style={{ width: '100%' }}
            >
              {submittingLink ? 'Ingesting Link...' : 'Link Resource'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
