import axios from 'axios';

// Use explicit API URL in production if env var is missing
const defaultProdApi = 'https://react-task-manager-yw60.onrender.com';

const baseURL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || defaultProdApi)
  : (import.meta.env.VITE_API_URL || '/');

const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

export default api; 