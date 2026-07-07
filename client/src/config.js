const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname.startsWith('192.168.'));

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isLocalhost ? 'http://localhost:5000' : 'https://memoryverse-qms1.onrender.com');
