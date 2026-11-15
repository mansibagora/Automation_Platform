import axios from 'axios';

const portalApi = axios.create({
  baseURL: '/portal-api',
});

portalApi.interceptors.request.use((config) => {
  const user = localStorage.getItem('portal_user') || 'engineer_user';
  config.headers['X-Portal-User'] = user;
  return config;
});

export default portalApi;
