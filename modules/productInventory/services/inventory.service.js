/**
 * inventory.service.js
 * Capa de acceso a datos del modulo Inventario.
 */

const InventoryService = (() => {
    const API_ORIGIN = 'https://localhost:7035';
    const BASE_URL = `${API_ORIGIN}/api`;

    function _buildJsonHeaders() {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

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

    function _mapPagedResponse(pagedData) {
        return {
            items: (pagedData?.data ?? []).map(dto => new InventoryProduct(dto)),
            totalCount: pagedData?.totalRecords ?? 0,
            pageNumber: pagedData?.currentPage ?? 1,
            pageSize: pagedData?.pageSize ?? 10,
            totalPages: pagedData?.totalPages ?? 1,
            hasPreviousPage: Boolean(pagedData?.hasPreviousPage),
            hasNextPage: Boolean(pagedData?.hasNextPage),
        };
    }

    async function getStats(period = 'week') {
        const params = new URLSearchParams();
        _appendParam(params, 'period', period);

        const response = await fetch(`${BASE_URL}/Inventory/stats?${params.toString()}`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return new InventoryStats(await _readEnvelope(response));
    }

    async function getInventory(query = {}) {
        const params = new URLSearchParams();
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 10);
        _appendParam(params, 'search', query.search?.trim());
        _appendParam(params, 'lineId', query.lineId);
        _appendParam(params, 'flavorId', query.flavorId);
        _appendParam(params, 'presentationId', query.presentationId);

        const response = await fetch(`${BASE_URL}/Inventory?${params.toString()}`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return _mapPagedResponse(await _readEnvelope(response));
    }

    async function getProductBatches(productId) {
        const response = await fetch(`${BASE_URL}/Inventory/products/${productId}/batches`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return new InventoryProductBatches(await _readEnvelope(response));
    }

    async function getBatchDetail(batchId) {
        const response = await fetch(`${BASE_URL}/Inventory/batches/${batchId}/detail`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        return new InventoryBatchDetail(await _readEnvelope(response));
    }

    async function getFlavors() {
        const flavors = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const response = await fetch(`${BASE_URL}/Flavors?page=${page}&pageSize=50`, {
                method: 'GET',
                headers: _buildJsonHeaders(),
            });

            const pagedData = await _readEnvelope(response);
            flavors.push(...(pagedData?.data ?? []));
            hasNextPage = Boolean(pagedData?.hasNextPage);
            page += 1;
        }

        return flavors;
    }

    async function getLinePresentations() {
        const response = await fetch(`${BASE_URL}/LinePresentations`, {
            method: 'GET',
            headers: _buildJsonHeaders(),
        });

        const data = await _readEnvelope(response);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    return {
        getStats,
        getInventory,
        getProductBatches,
        getBatchDetail,
        getFlavors,
        getLinePresentations,
    };
})();
