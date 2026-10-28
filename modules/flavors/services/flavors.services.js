import { CONFIG } from '../../core/config/app.config.js';

function getHeaders(isFormData = false) {
  const token = localStorage.getItem('token');

  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export const FlavorService = {
  getAll: async (pageNumber = 1, pageSize = 8) => {
    const response = await fetch(
      `${CONFIG.API_URL}/Flavors?PageNumber=${pageNumber}&PageSize=${pageSize}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener sabores del servidor');
    }

    return await response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${CONFIG.API_URL}/Flavors/${id}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Error al obtener el detalle del sabor');
    }

    return await response.json();
  },

  create: async (formData) => {
    const response = await fetch(`${CONFIG.API_URL}/Flavors`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(`Fallo de conexión o error grave en el servidor (${response.status}).`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.errorMessage || 'Error desconocido al crear el sabor.');
    }

    return data;
  },

  update: async (id, formData) => {
    const response = await fetch(`${CONFIG.API_URL}/Flavors/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: formData
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(`Fallo de conexión o error grave en el servidor (${response.status}).`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.errorMessage || 'Error desconocido al actualizar el sabor.');
    }

    return data;
  },

  delete: async (id) => {
    const response = await fetch(`${CONFIG.API_URL}/Flavors/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(`Fallo de conexión o error grave en el servidor (${response.status}).`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.errorMessage || 'Error desconocido al eliminar el sabor.');
    }

    return data;
  }
};

export default FlavorService;