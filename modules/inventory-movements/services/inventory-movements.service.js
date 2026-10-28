/**
 * Capa de acceso a datos del modulo Movimientos de Inventario.
 */

const InventoryMovementsService = (() => {
    const API_SERVICE_SRC = '/modules/core/services/api.service.js';

    async function _ensureApiService() {
        if (typeof ApiService !== 'undefined') return;

        await new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${API_SERVICE_SRC}"]`);
            if (existingScript) {
                existingScript.addEventListener('load', resolve, { once: true });
                existingScript.addEventListener('error', reject, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = API_SERVICE_SRC;
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar ApiService'));
            document.head.appendChild(script);
        });
    }

    function _appendParam(params, key, value) {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    }

    function _mapPagedResponse(pagedData = {}) {
        const rows = pagedData.data ?? pagedData.Data ?? [];
        return {
            items: rows.map(dto => new InventoryMovementListItem(dto)),
            totalCount: pagedData.totalRecords ?? pagedData.TotalRecords ?? 0,
            pageNumber: pagedData.currentPage ?? pagedData.CurrentPage ?? 1,
            pageSize: pagedData.pageSize ?? pagedData.PageSize ?? 10,
            totalPages: pagedData.totalPages ?? pagedData.TotalPages ?? 1,
            hasPreviousPage: Boolean(pagedData.hasPreviousPage ?? pagedData.HasPreviousPage),
            hasNextPage: Boolean(pagedData.hasNextPage ?? pagedData.HasNextPage),
        };
    }

    function _asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.Data)) return data.Data;
        return [];
    }

    async function getStatistics() {
        await _ensureApiService();
        return new InventoryMovementStats(await ApiService.get('/InventoryMovements/stats'));
    }

    async function getMovements(query = {}) {
        await _ensureApiService();
        const params = new URLSearchParams();
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 10);

        const queryString = params.toString();
        return _mapPagedResponse(await ApiService.get(`/InventoryMovements${queryString ? `?${queryString}` : ''}`));
    }

    async function getHeader(movementId) {
        await _ensureApiService();
        return new InventoryMovementHeader(await ApiService.get(`/InventoryMovements/${movementId}`));
    }

    async function getDetails(movementId) {
        await _ensureApiService();
        const data = await ApiService.get(`/InventoryMovements/${movementId}/details`);
        return _asArray(data).map(dto => new InventoryMovementDetailItem(dto));
    }

    async function getCompleteDetail(movementId) {
        const [header, details] = await Promise.all([
            getHeader(movementId),
            getDetails(movementId),
        ]);

        const sale = header.saleId ? await _getRelatedSale(header.saleId) : null;
        return { header, details, sale };
    }

    async function _getRelatedSale(saleId) {
        try {
            if (typeof SalesService !== 'undefined' && SalesService.getHeader) {
                return await SalesService.getHeader(saleId);
            }

            await _ensureApiService();
            return await ApiService.get(`/Sales/${saleId}`);
        } catch (error) {
            console.warn('No se pudo cargar la venta relacionada:', error.message);
            return null;
        }
    }

    async function getInventoryProducts(query = {}) {
        await _ensureApiService();
        const params = new URLSearchParams();
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 50);
        _appendParam(params, 'search', query.search?.trim());

        return _mapInventoryProductPagedResponse(await ApiService.get(`/Inventory?${params.toString()}`));
    }

    function _mapInventoryProductPagedResponse(pagedData = {}) {
        const rows = pagedData.data ?? pagedData.Data ?? [];
        return {
            items: rows.map(dto => new InventoryMovementProductOption(dto)),
            hasNextPage: Boolean(pagedData.hasNextPage ?? pagedData.HasNextPage),
        };
    }

    async function getAllInventoryProducts() {
        const products = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const result = await getInventoryProducts({ page, pageSize: 50 });
            products.push(...result.items);
            hasNextPage = result.hasNextPage;
            page += 1;
        }

        return products;
    }

    async function getProductBatches(productId) {
        await _ensureApiService();
        const data = await ApiService.get(`/Inventory/products/${productId}/batches`);
        const batches = data?.batches ?? data?.Batches ?? [];
        return batches.map(dto => new InventoryMovementBatchOption(dto));
    }

    async function getBatchDetail(batchId) {
        await _ensureApiService();
        return new InventoryMovementBatchDetail(await ApiService.get(`/Inventory/batches/${batchId}/detail`));
    }

    async function createTransfer(formData) {
        await _ensureApiService();
        const payload = InventoryMovementCreateRequest.toTransferPayload(formData);
        return new InventoryMovementResult(await ApiService.post('/InventoryMovements/transfer', payload));
    }

    async function createPositiveAdjustment(formData) {
        await _ensureApiService();
        const payload = InventoryMovementCreateRequest.toAdjustmentPayload(formData);
        return new InventoryMovementResult(await ApiService.post('/InventoryMovements/positive-adjustment', payload));
    }

    async function createNegativeAdjustment(formData) {
        await _ensureApiService();
        const payload = InventoryMovementCreateRequest.toAdjustmentPayload(formData);
        return new InventoryMovementResult(await ApiService.post('/InventoryMovements/negative-adjustment', payload));
    }

    return {
        getStatistics,
        getMovements,
        getHeader,
        getDetails,
        getCompleteDetail,
        getAllInventoryProducts,
        getProductBatches,
        getBatchDetail,
        createTransfer,
        createPositiveAdjustment,
        createNegativeAdjustment,
    };
})();
