/**
 * Capa de acceso a datos del modulo Ventas.
 */

const SalesService = (() => {
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

    function _mapPagedResponse(pagedData) {
        return {
            items: (pagedData?.data ?? []).map(dto => new SaleListItem(dto)),
            totalCount: pagedData?.totalRecords ?? 0,
            pageNumber: pagedData?.currentPage ?? 1,
            pageSize: pagedData?.pageSize ?? 10,
            totalPages: pagedData?.totalPages ?? 1,
            hasPreviousPage: Boolean(pagedData?.hasPreviousPage),
            hasNextPage: Boolean(pagedData?.hasNextPage),
        };
    }

    function _mapProductPagedResponse(pagedData) {
        const data = pagedData?.data ?? pagedData?.Data ?? [];
        return {
            items: data.map(dto => new SaleRetailProductOption(dto)),
            hasNextPage: Boolean(pagedData?.hasNextPage ?? pagedData?.HasNextPage),
        };
    }

    async function getStatistics() {
        await _ensureApiService();
        return new SaleStatistics(await ApiService.get('/Sales/stats'));
    }

    async function getSales(query = {}) {
        await _ensureApiService();
        const params = new URLSearchParams();
        _appendParam(params, 'startDate', query.startDate);
        _appendParam(params, 'endDate', query.endDate);
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 10);

        const queryString = params.toString();
        return _mapPagedResponse(await ApiService.get(`/Sales${queryString ? `?${queryString}` : ''}`));
    }

    async function getHeader(saleId) {
        await _ensureApiService();
        return new SaleHeader(await ApiService.get(`/Sales/${saleId}`));
    }

    async function getDetails(saleId) {
        await _ensureApiService();
        const data = await ApiService.get(`/Sales/${saleId}/details`);
        return _asArray(data).map(dto => new SaleDetailItem(dto));
    }

    async function getPayments(saleId) {
        await _ensureApiService();
        const data = await ApiService.get(`/Sales/${saleId}/payments`);
        return _asArray(data).map(dto => new SalePayment(dto));
    }

    async function getCompleteDetail(saleId) {
        const [header, details, payments] = await Promise.all([
            getHeader(saleId),
            getDetails(saleId),
            getPayments(saleId),
        ]);

        return { header, details, payments };
    }

    async function getActiveRetailProducts() {
        await _ensureApiService();

        const products = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const params = new URLSearchParams();
            _appendParam(params, 'page', page);
            _appendParam(params, 'pageSize', 50);
            _appendParam(params, 'active', true);

            const result = _mapProductPagedResponse(await ApiService.get(`/Products/catalog?${params.toString()}`));
            products.push(...result.items);
            hasNextPage = result.hasNextPage;
            page += 1;
        }

        return products;
    }

    async function createRetailSale(formData) {
        await _ensureApiService();
        const payload = SaleRetailCreateRequest.toApiPayload(formData);
        return new SaleRetailResponse(await ApiService.post('/Sales/retail', payload));
    }

    function _asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    return {
        getStatistics,
        getSales,
        getHeader,
        getDetails,
        getPayments,
        getCompleteDetail,
        getActiveRetailProducts,
        createRetailSale,
    };
})();
