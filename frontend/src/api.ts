import axios from 'axios';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use((config) => {
  const user = localStorage.getItem('portal_user') || 'engineer_user';
  config.headers['X-Portal-User'] = user;
  return config;
});

export default api;
