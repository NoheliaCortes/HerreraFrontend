import { CONFIG } from '../../core/config/app.config.js';

function buildHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export const PresentationService = {
  getAll: async (token, page = 1, pageSize = 10) => {
    const response = await fetch(`${CONFIG.API_URL}/Presentations?Page=${page}&PageSize=${pageSize}`, {
      method: 'GET',
      headers: buildHeaders(token, false)
    });
    return await parseJsonSafe(response);
  },

  getById: async (token, id) => {
    const response = await fetch(`${CONFIG.API_URL}/Presentations/${id}`, {
      method: 'GET',
      headers: buildHeaders(token, false)
    });
    return await parseJsonSafe(response);
  },

  create: async (token, dto) => {
    const response = await fetch(`${CONFIG.API_URL}/Presentations`, {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify(dto)
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await parseJsonSafe(response)
    };
  },

  update: async (token, id, dto) => {
    const response = await fetch(`${CONFIG.API_URL}/Presentations/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token, true),
      body: JSON.stringify(dto)
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await parseJsonSafe(response)
    };
  },

  updateStatus: async (token, id, dto) => {
    const response = await fetch(`${CONFIG.API_URL}/Presentations/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token, true),
      body: JSON.stringify(dto)
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await parseJsonSafe(response)
    };
  }
};