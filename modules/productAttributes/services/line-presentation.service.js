import { CONFIG } from '../../core/config/app.config.js';

function buildHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const LinePresentationService = {
  getAll: async (token) => {
    const response = await fetch(`${CONFIG.API_URL}/LinePresentations`, {
      headers: buildHeaders(token, false)
    });
    return await response.json();
  },

  getById: async (token, id) => {
    const response = await fetch(`${CONFIG.API_URL}/LinePresentations/${id}`, {
      headers: buildHeaders(token, false)
    });
    return await response.json();
  },

  create: async (token, dto) => {
    const response = await fetch(`${CONFIG.API_URL}/LinePresentations`, {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify(dto)
    });
    return await response.json();
  },

  delete: async (token, id) => {
    const response = await fetch(`${CONFIG.API_URL}/LinePresentations/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(token, false)
    });
    return await response.json();
  }
};