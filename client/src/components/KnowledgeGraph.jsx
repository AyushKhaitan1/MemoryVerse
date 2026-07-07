import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';

export default function KnowledgeGraph({ apiKey, authToken }) {
  const canvasRef = useRef(null);
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // Graph state refs for animation loop
  const stateRef = useRef({
    nodes: [],
    edges: [],
    draggingNode: null,
    hoveredNode: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    isPanning: false,
    startX: 0,
    startY: 0
  });

  useEffect(() => {
    fetchGraphData();
  }, [apiKey, authToken]);

  const fetchGraphData = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/graph`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const json = await res.json();
      
      // Initialize nodes with positions
      const width = 800;
      const height = 550;
      const nodes = json.nodes.map((node, i) => {
        // Position skills on a perimeter, docs near center
        const angle = (i / json.nodes.length) * Math.PI * 2;
        const radius = node.group === 'skill' ? 220 : 80;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
          radius: node.group === 'skill' ? 28 : 20
        };
      });

      setData({ nodes, edges: json.edges });
      stateRef.current.nodes = nodes;
      stateRef.current.edges = json.edges;
    } catch (err) {
      console.error('Error fetching graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // Rescale for Retina displays
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();

    // Physics constants
    const repulsion = 400;
    const attraction = 0.03;
    const gravity = 0.015;
    const damping = 0.85;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Ensure we start with center pan
    if (stateRef.current.panX === 0 && stateRef.current.panY === 0) {
      stateRef.current.panX = 0;
      stateRef.current.panY = 0;
    }

    const tick = () => {
      const state = stateRef.current;
      const nodes = state.nodes;
      const edges = state.edges;

      // 1. Repulsion force between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const u = nodes[i];
          const v = nodes[j];
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          // Force inversely proportional to distance
          const force = repulsion / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (u !== state.draggingNode) {
            u.vx -= fx;
            u.vy -= fy;
          }
          if (v !== state.draggingNode) {
            v.vx += fx;
            v.vy += fy;
          }
        }
      }

      // 2. Attraction force along edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const restLength = 120;
        const force = (dist - restLength) * attraction;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sourceNode !== state.draggingNode) {
          sourceNode.vx += fx;
          sourceNode.vy += fy;
        }
        if (targetNode !== state.draggingNode) {
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // 3. Gravity pulling to center
      const centerX = width / 2;
      const centerY = height / 2;
      nodes.forEach(node => {
        if (node === state.draggingNode) return;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * gravity;
        node.vy += dy * gravity;
      });

      // 4. Update positions with damping
      nodes.forEach(node => {
        if (node === state.draggingNode) return;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;
      });

      // --- Draw Canvas ---
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      
      // Apply pan & zoom transforms
      ctx.translate(state.panX + width / 2, state.panY + height / 2);
      ctx.scale(state.zoom, state.zoom);
      ctx.translate(-width / 2, -height / 2);

      // Draw Edges (Lines)
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const isHighlighted = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);
        const isHovered = state.hoveredNode && (state.hoveredNode.id === edge.source || state.hoveredNode.id === edge.target);

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        if (isHighlighted || isHovered) {
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = 'rgba(147, 51, 234, 0.12)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      });

      // Draw Nodes
      nodes.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isHovered = state.hoveredNode && state.hoveredNode.id === node.id;
        const isRelated = selectedNode && edges.some(e => 
          (e.source === selectedNode.id && e.target === node.id) || 
          (e.target === selectedNode.id && e.source === node.id)
        );

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Styling based on node type
        let color = '#8b5cf6'; // default
        let glow = false;
        
        if (node.group === 'skill') {
          color = '#c084fc';
          glow = isSelected || isHovered;
        } else {
          // Document node color schemes based on category
          switch (node.category) {
            case 'Projects': color = '#3b82f6'; break;
            case 'Certifications': color = '#10b981'; break;
            case 'Internships': color = '#f59e0b'; break;
            case 'Achievements': color = '#ec4899'; break;
            case 'Academics': color = '#0ea5e9'; break;
            default: color = '#6b7280'; break;
          }
          glow = isSelected || isHovered;
        }

        // Draw shadow/glow if needed
        if (glow || isRelated) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
        } else {
          ctx.shadowBlur = 0;
        }

        // Fill node
        ctx.fillStyle = isSelected ? '#fff' : color;
        ctx.fill();

        // Stroke border
        ctx.shadowBlur = 0; // reset
        ctx.strokeStyle = isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = node.group === 'skill' ? 'bold 11px var(--font-sans)' : '10px var(--font-sans)';
        ctx.fillStyle = (isSelected || isHovered) ? '#fff' : 'var(--text-primary)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate labels that are too long
        let text = node.label;
        if (text.length > 15) {
          text = text.substring(0, 12) + '...';
        }
        
        ctx.fillText(text, node.x, node.y);
      });

      ctx.restore();
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [loading, selectedNode]);

  // Drag & drop / click detection helpers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const state = stateRef.current;
    
    // Mouse coords relative to canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Inverse transform to find model space coords
    const width = rect.width;
    const height = rect.height;
    
    const mx = (x - (state.panX + width / 2)) / state.zoom + width / 2;
    const my = (y - (state.panY + height / 2)) / state.zoom + height / 2;
    return { x: mx, y: my };
  };

  const handleMouseDown = (e) => {
    const mouse = getMousePos(e);
    const state = stateRef.current;

    // Check hit test on nodes
    const hitNode = state.nodes.find(node => {
      const dx = node.x - mouse.x;
      const dy = node.y - mouse.y;
      return (dx * dx + dy * dy) < (node.radius * node.radius);
    });

    if (hitNode) {
      state.draggingNode = hitNode;
      setSelectedNode(hitNode);
    } else {
      // Start panning
      state.isPanning = true;
      state.startX = e.clientX - state.panX;
      state.startY = e.clientY - state.panY;
    }
  };

  const handleMouseMove = (e) => {
    const mouse = getMousePos(e);
    const state = stateRef.current;

    if (state.draggingNode) {
      state.draggingNode.x = mouse.x;
      state.draggingNode.y = mouse.y;
      state.draggingNode.vx = 0;
      state.draggingNode.vy = 0;
    } else if (state.isPanning) {
      state.panX = e.clientX - state.startX;
      state.panY = e.clientY - state.startY;
    } else {
      // Hover check
      const hoverNode = state.nodes.find(node => {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        return (dx * dx + dy * dy) < (node.radius * node.radius);
      });
      state.hoveredNode = hoverNode || null;
    }
  };

  const handleMouseUp = () => {
    const state = stateRef.current;
    state.draggingNode = null;
    state.isPanning = false;
  };

  const handleZoom = (factor) => {
    const state = stateRef.current;
    state.zoom = Math.max(0.5, Math.min(3, state.zoom + factor));
  };

  const handleResetPan = () => {
    const state = stateRef.current;
    state.panX = 0;
    state.panY = 0;
    state.zoom = 1;
    setSelectedNode(null);
  };

  return (
    <div className="knowledge-graph-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Connections</h1>
          <p className="page-subtitle">Interactive map connecting your certifications, skills, and projects</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => handleZoom(0.1)} style={{ padding: '8px 12px' }}>➕</button>
          <button className="btn btn-secondary" onClick={() => handleZoom(-0.1)} style={{ padding: '8px 12px' }}>➖</button>
          <button className="btn btn-secondary" onClick={handleResetPan} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Reset Map</button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {loading ? (
          <div className="glass-card" style={{ height: '550px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Powering up network nodes...
          </div>
        ) : (
          <div className="graph-container">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', cursor: stateRef.current.isPanning ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        )}

        {/* Info panel on clicked node */}
        <div className="glass-card" style={{ height: '550px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Node Inspector
          </h2>

          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span className={`badge badge-${selectedNode.category.toLowerCase()}`}>
                  {selectedNode.category || selectedNode.group}
                </span>
                <h3 style={{ fontSize: '1.2rem', marginTop: '10px', fontWeight: '700' }}>{selectedNode.label}</h3>
              </div>

              {selectedNode.group === 'document' ? (
                <>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date & Timeline</span>
                    <span style={{ fontSize: '0.95rem' }}>{new Date(selectedNode.date).toLocaleDateString()}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Skills Extracted</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {data.edges
                        .filter(e => e.source === selectedNode.id && e.type === 'implicit')
                        .map(e => (
                          <span key={e.id} className="skill-tag" onClick={() => {
                            const found = stateRef.current.nodes.find(n => n.id === e.target);
                            if (found) setSelectedNode(found);
                          }} style={{ cursor: 'pointer' }}>
                            {e.target}
                          </span>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                /* It's a skill node */
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Associated Milestones</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {data.edges
                      .filter(e => e.target === selectedNode.id && e.type === 'implicit')
                      .map(e => {
                        const doc = data.nodes.find(n => n.id === e.source);
                        if (!doc) return null;
                        return (
                          <div 
                            key={doc.id} 
                            onClick={() => setSelectedNode(doc)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'rgba(10,5,22,0.4)',
                              border: '1px solid rgba(139,92,246,0.1)',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span className={`badge badge-${doc.category.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginBottom: '4px' }}>
                              {doc.category}
                            </span>
                            <div style={{ fontWeight: '600' }}>{doc.label}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Click any node (circles represent documents, glowing text tags represent skills) inside the network graph to inspect details and view core connections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
