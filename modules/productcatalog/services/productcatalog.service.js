/**
 * productcatalog.service.js
 * Capa de acceso a datos del modulo Productos.
 */

const ProductCatalogService = (() => {
    function getApiOrigin() {
        return ApiService.getApiOrigin();
    }

    function _appendParam(params, key, value) {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    }

    function _mapPagedResponse(pagedData) {
        return {
            items: (pagedData?.data ?? []).map(dto => new ProductCatalogItem(dto)),
            totalCount: pagedData?.totalRecords ?? 0,
            pageNumber: pagedData?.currentPage ?? 1,
            pageSize: pagedData?.pageSize ?? 12,
            totalPages: pagedData?.totalPages ?? 1,
            hasPreviousPage: Boolean(pagedData?.hasPreviousPage),
            hasNextPage: Boolean(pagedData?.hasNextPage),
        };
    }

    async function getCatalog(query = {}) {
        const params = new URLSearchParams();
        _appendParam(params, 'page', query.page ?? 1);
        _appendParam(params, 'pageSize', query.pageSize ?? 12);
        _appendParam(params, 'lineId', query.lineId);
        _appendParam(params, 'presentationId', query.presentationId);
        _appendParam(params, 'flavorId', query.flavorId);
        _appendParam(params, 'search', query.search?.trim());
        _appendParam(params, 'active', query.active);

        return _mapPagedResponse(await ApiService.get(`/Products/catalog?${params.toString()}`));
    }

    async function getStats() {
        return await ApiService.get('/Products/stats');
    }

    async function getById(id) {
        return new Product(await ApiService.get(`/Products/${id}`));
    }

    async function uploadProductImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        return await ApiService.postFormData('/uploads/products', formData);
    }

    async function create(formData) {
        const payload = Product.toCreateDto(formData);
        return new Product(await ApiService.post('/Products', payload));
    }

    async function update(id, formData) {
        const payload = Product.toUpdateDto(formData);
        await ApiService.put(`/Products/${id}`, payload);
    }

    async function remove(id) {
        await ApiService.delete(`/Products/${id}`);
    }

    async function getLines() {
        return _asArray(await ApiService.get('/Lines'));
    }

    async function getFlavors() {
        const flavors = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const pagedData = await ApiService.get(`/Flavors?page=${page}&pageSize=50`);
            flavors.push(...(pagedData?.data ?? []));
            hasNextPage = Boolean(pagedData?.hasNextPage);
            page += 1;
        }

        return flavors;
    }

    async function getLinePresentations() {
        return _asArray(await ApiService.get('/LinePresentations'));
    }

    async function getLinePresentationsByLine(lineId) {
        const selectedLineId = Number(lineId);
        const relations = await getLinePresentations();

        return relations.filter(relation => Number(relation.line?.id) === selectedLineId);
    }

    function _asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    return {
        getApiOrigin,
        getCatalog,
        getStats,
        getById,
        uploadProductImage,
        create,
        update,
        remove,
        getLines,
        getFlavors,
        getLinePresentations,
        getLinePresentationsByLine,
    };
})();
