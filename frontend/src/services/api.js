import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getTargets = async () => {
  const response = await api.get('/targets/');
  return response.data;
};

export const createTarget = async (targetData) => {
  const response = await api.post('/targets/', targetData);
  return response.data;
};

export const getScans = async () => {
  const response = await api.get('/scans/');
  return response.data;
};

export const startScan = async (targetId) => {
  const response = await api.post('/scans/', { target_id: targetId });
  return response.data;
};

export default api;
