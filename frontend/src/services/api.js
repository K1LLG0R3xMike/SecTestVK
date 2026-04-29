import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isBrowserLocalhost = browserHost === 'localhost' || browserHost === '127.0.0.1';
const pointsToLocalhost = typeof configuredApiUrl === 'string' && /localhost|127\.0\.0\.1/.test(configuredApiUrl);

export const API_URL = configuredApiUrl
  ? (pointsToLocalhost && !isBrowserLocalhost ? '/api' : configuredApiUrl)
  : (isBrowserLocalhost ? 'http://localhost:8000' : '/api');

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

export const getDashboardStats = async ({ targetId = null, host = null } = {}) => {
  const response = await api.get('/scans/stats', {
    params: host ? { host } : (targetId ? { target_id: targetId } : undefined),
  });
  return response.data;
};

export const startScan = async (targetId, config = null, force = false) => {
  const payload = { target_id: targetId, force: force };
  if (config) {
    payload.config = config;
  }
  const response = await api.post('/scans/', payload);
  return response.data;
};

export const cancelScan = async (scanId) => {
  const response = await api.post(`/scans/${scanId}/cancel`);
  return response.data;
};

export const downloadReportPdf = async (scanId) => {
  const response = await api.get(`/scans/${scanId}/report/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const requestAttackVectorAnalysis = async (scanId, provider = 'claude') => {
  const response = await api.post(`/scans/${scanId}/analyze/vectors`, null, {
    params: { provider },
  });
  return response.data;
};

export const getAttackVectorAnalysisStatus = async (scanId, taskId) => {
  const response = await api.get(`/scans/${scanId}/analyze/vectors/status/${taskId}`);
  return response.data;
};

export const getAttackVectorAnalysis = async (scanId) => {
  const response = await api.get(`/scans/${scanId}/analyze/vectors`);
  return response.data;
};

export default api;
