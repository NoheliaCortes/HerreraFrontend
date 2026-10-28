/**
 * restock.service.js
 * Capa de acceso a datos del modulo Reabastecimientos.
 */

const RestockService = (() => {
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
            items: (pagedData?.data ?? []).map(dto => new RestockListItem(dto)),
            totalCount: pagedData?.totalRecords ?? 0,
            pageNumber: pagedData?.currentPage ?? 1,
            pageSize: pagedData?.pageSize ?? 10,
            totalPages: pagedData?.totalPages ?? 1,
            hasPreviousPage: Boolean(pagedData?.hasPreviousPage),
            hasNextPage: Boolean(pagedData?.hasNextPage),
        };
    }

    async function getStatistics() {
        await _ensureApiService();
        return new RestockStatistics(await ApiService.get('/restocks/statistics'));
    }

    async function getRestocks(query = {}) {
        await _ensureApiService();
        const params = new URLSearchParams();
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 10);
        _appendParam(params, 'fromDate', query.fromDate);
        _appendParam(params, 'toDate', query.toDate);
        _appendParam(params, 'search', query.search?.trim());

        return _mapPagedResponse(await ApiService.get(`/restocks?${params.toString()}`));
    }

    async function getDetail(restockId) {
        await _ensureApiService();
        return new RestockDetail(await ApiService.get(`/restocks/${restockId}/detail`));
    }

    async function createRestock(formData) {
        await _ensureApiService();
        const payload = RestockCreateRequest.toApiPayload(formData);
        return new RestockResponse(await ApiService.post('/restocks', payload));
    }

    async function getLines() {
        await _ensureApiService();
        const data = await ApiService.get('/Lines');
        return _asArray(data).map(dto => new RestockLineOption(dto));
    }

    async function getLinePresentations() {
        await _ensureApiService();
        const data = await ApiService.get('/LinePresentations');
        return _asArray(data).map(dto => new RestockLinePresentationOption(dto));
    }

    async function getLinePresentationsByLine(lineId) {
        const selectedLineId = Number(lineId);
        return (await getLinePresentations())
            .filter(item => Number(item.lineId) === selectedLineId);
    }

    async function getProductsByLinePresentation(linePresentationId) {
        await _ensureApiService();
        if (!linePresentationId) return [];

        const params = new URLSearchParams();
        params.set('linePresentationId', String(linePresentationId));

        const data = await ApiService.get(`/Products/by-line-presentation?${params.toString()}`);
        return _asArray(data).map(dto => new RestockProductOption(dto));
    }

    function _asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    return {
        getStatistics,
        getRestocks,
        getDetail,
        createRestock,
        getLines,
        getLinePresentations,
        getLinePresentationsByLine,
        getProductsByLinePresentation,
    };
})();
