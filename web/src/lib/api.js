// Cliente HTTP mínimo para la API de Proyecta.
// En desarrollo, Vite hace proxy de /api hacia localhost:4000 (ver vite.config.js).
// En producción, si el frontend se publica en un dominio distinto al backend,
// define VITE_API_BASE (ej. https://proyecta-api.onrender.com/api) al hacer el build.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'proyecta_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...((token ?? getToken()) ? { Authorization: `Bearer ${token ?? getToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) throw new ApiError(data?.error || `Error ${res.status}`, res.status);
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const del = (path) => api(path, { method: 'DELETE' });
