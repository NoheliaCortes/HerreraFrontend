/**
 * prices.service.js
 * Capa de acceso a datos del modulo Precios.
 */

const PricesService = (() => {
    const API_ORIGIN = 'https://localhost:7035';
    const BASE_URL = `${API_ORIGIN}/api`;

    function _buildJsonHeaders() {
        return {
            ..._buildAuthHeaders(),
            'Content-Type': 'application/json',
        };
    }

    function _buildAuthHeaders() {
        const headers = { 'Accept': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    async function _readEnvelope(response) {
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

    function _appendParam(params, key, value) {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    }

    function _asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.Data)) return data.Data;
        return [];
    }

    async function getGeneralPrices(query = {}) {
        const params = new URLSearchParams();
        _appendParam(params, 'lineId', query.lineId);

        const url = `${BASE_URL}/GeneralPrices/general${params.size ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return _asArray(await _readEnvelope(response)).map(dto => new GeneralPrice(dto));
    }

    async function createGeneralPrice(payload) {
        const response = await fetch(`${BASE_URL}/GeneralPrices/general`, {
            method: 'POST',
            headers: _buildJsonHeaders(),
            body: JSON.stringify(payload),
        });

        return await _readEnvelope(response);
    }

    async function changeGeneralPrice(linePresentationId, payload) {
        const response = await fetch(`${BASE_URL}/GeneralPrices/general/${linePresentationId}`, {
            method: 'PUT',
            headers: _buildJsonHeaders(),
            body: JSON.stringify(payload),
        });

        return await _readEnvelope(response);
    }

    async function getPriceStatistics() {
        const response = await fetch(`${BASE_URL}/prices/statistics`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return new PriceStatistics(await _readEnvelope(response));
    }

    async function getLinePresentations() {
        const response = await fetch(`${BASE_URL}/LinePresentations`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return _asArray(await _readEnvelope(response));
    }

    return {
        getGeneralPrices,
        createGeneralPrice,
        changeGeneralPrice,
        getPriceStatistics,
        getLinePresentations,
    };
})();
