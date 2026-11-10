import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Pass Token and valid UserId with every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Send valid numeric X-User-Id header
    if (userId && userId !== 'undefined' && userId !== 'null') {
      config.headers['X-User-Id'] = userId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Safe error logging without force-clearing session on minor API failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized or Token Expired for endpoint:', error.config?.url);
      
      // Clear storage and redirect ONLY if token is completely invalid/missing on protected routes
      const token = localStorage.getItem('token');
      if (!token && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;