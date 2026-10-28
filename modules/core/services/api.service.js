/**
 * Servicio HTTP compartido para centralizar la comunicacion con la API.
 * Encapsula la URL base, headers, lectura del envelope ApiResponse y metodos HTTP comunes.
 */
const ApiService = (() => {
    const API_ORIGIN = 'https://api-herrera-deega3a2e8d8cbge.canadacentral-01.azurewebsites.net/api';
    const BASE_URL = `${API_ORIGIN}/api`;

    function getApiOrigin() {
        return API_ORIGIN;
    }

    function getBaseUrl() {
        return BASE_URL;
    }

    function getAuthHeaders() {
        const headers = { 'Accept': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    function getJsonHeaders() {
        return {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        };
    }

    async function readEnvelope(response) {
        let envelope = null;

        try {
            envelope = await response.json();
        } catch {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const success = envelope.success ?? envelope.Success;
        const message = envelope.message ?? envelope.Message;
        const data = envelope.data ?? envelope.Data;

        if (!response.ok || success === false) {
            if (Array.isArray(data)) throw new Error(data.join('\n'));
            throw new Error(message || `Error HTTP ${response.status}`);
        }

        return data;
    }

    async function request(path, options = {}) {
        const response = await fetch(`${BASE_URL}${path}`, options);
        return await readEnvelope(response);
    }

    async function get(path) {
        return await request(path, {
            method: 'GET',
            headers: getJsonHeaders(),
        });
    }

    async function post(path, body) {
        return await request(path, {
            method: 'POST',
            headers: getJsonHeaders(),
            body: JSON.stringify(body),
        });
    }

    async function put(path, body) {
        return await request(path, {
            method: 'PUT',
            headers: getJsonHeaders(),
            body: JSON.stringify(body),
        });
    }

    async function remove(path) {
        return await request(path, {
            method: 'DELETE',
            headers: getJsonHeaders(),
        });
    }

    async function postFormData(path, formData) {
        return await request(path, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
        });
    }

    return {
        BASE_URL,
        getApiOrigin,
        getBaseUrl,
        getAuthHeaders,
        getJsonHeaders,
        readEnvelope,
        get,
        post,
        put,
        delete: remove,
        postFormData,
    };
})();
