import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const originalFetch = window.fetch;
window.fetch = (url, options = {}) => {
  if (typeof url === 'string' && url.includes('ngrok-free.dev')) {
    options.headers = {
      ...options.headers,
      'ngrok-skip-browser-warning': 'true',
    };
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)