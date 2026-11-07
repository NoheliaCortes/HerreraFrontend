/**
 * customer.service.js
 * Capa de acceso a datos del módulo Clientes.
 * Todos los métodos devuelven objetos Customer o PagedResponse<Customer>.
 *
 * Base URL: CONFIG.API_URL/Customers
 *
 * NOTA JWT: La autenticación Bearer está implementada en la API pero deshabilitada
 * durante desarrollo. Cuando se habilite, descomentar el header Authorization
 * en _buildHeaders() usando el token almacenado en la sesión.
 */

const CustomerService = (() => {
    const CONFIG_PROMISE = import('../../core/config/app.config.js');

    async function _getBaseUrl() {
        const { CONFIG } = await CONFIG_PROMISE;
        return `${CONFIG.API_URL}/Customers`;
    }

    // ─── Headers ────────────────────────────────────────────────────────────────

    function _buildHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        // TODO: Habilitar cuando JWT esté activo en producción
        // const token = sessionStorage.getItem('auth_token');
        // if (token) headers['Authorization'] = `Bearer ${token}`;

        return headers;
    }

    // ─── Manejo de respuesta global ──────────────────────────────────────────────

    async function _handleResponse(res) {
        let envelope;
        try {
            envelope = await res.json();
        } catch {
            throw new Error(`Error HTTP ${res.status}`);
        }

        const success = envelope.success ?? envelope.Success;
        const message = envelope.message ?? envelope.Message;
        const data = envelope.data ?? envelope.Data;
        if (!res.ok || success === false) {
            // Lanza el mensaje de la API para mostrarlo en UI
            throw new Error(message || `Error HTTP ${res.status}`);
        }

        return data;
    }

    // ─── NUEVO: GET /api/Customers/stats ──────────────────────────────────────────

    /**
     * Obtiene el DTO con el resumen estadístico de clientes para las Cards.
     * @returns {Promise<{activeCustomers: number, inactiveCustomers: number, distinctMunicipalitiesWithCustomers: number, activePointsOfSale: number}>}
     */
    async function getStats() {
        const res = await fetch(`${await _getBaseUrl()}/stats`, {
            method:  'GET',
            headers: _buildHeaders(),
        });

        return await _handleResponse(res);
    }

    // ─── MODIFICADO: GET /api/Customers con Filtros y Paginación ──────────────────

    /**
     * Obtiene la lista filtrada y paginada de clientes desde el servidor.
     * @param {number} pageNumber - Página actual (desde 1)
     * @param {number} pageSize   - Cantidad de registros por página
     * @param {string} search     - Texto de búsqueda opcional (nombre, apellido, POS)
     * @param {number|string} departmentId   - ID numérico del departamento (opcional)
     * @param {number|string} municipalityId - ID numérico del municipio (opcional)
     * @returns {Promise<{items: Customer[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number, hasPreviousPage: boolean, hasNextPage: boolean}>}
     */
    async function getAll(pageNumber = 1, pageSize = 10, search = '', departmentId = '', municipalityId = '') {
        
        // Construcción dinámica de los parámetros de consulta (Query Strings)
        const params = new URLSearchParams({
            page: pageNumber,
            pageSize: pageSize
        });

        // Solo agregamos los filtros a la URL si contienen un valor real
        if (search && search.trim() !== '') {
            params.append('search', search.trim());
        }
        if (departmentId) {
            params.append('departmentId', departmentId);
        }
        if (municipalityId) {
            params.append('municipalityId', municipalityId);
        }

        const url = `${await _getBaseUrl()}?${params.toString()}`;

        const res = await fetch(url, {
            method:  'GET',
            headers: _buildHeaders(),
        });

        const pagedData = await _handleResponse(res);

        // Mapeo adaptado a la respuesta estructurada de tu API de C#
        return {
            items:           (pagedData.data ?? pagedData.Data ?? []).map(dto => new Customer(dto)),
            totalCount:      pagedData.totalRecords ?? pagedData.TotalRecords ?? 0,
            pageNumber:      pagedData.currentPage ?? pagedData.CurrentPage ?? pageNumber,
            pageSize:        pagedData.pageSize ?? pagedData.PageSize ?? pageSize,
            totalPages:      pagedData.totalPages ?? pagedData.TotalPages ?? 1,
            hasPreviousPage: pagedData.hasPreviousPage ?? pagedData.HasPreviousPage ?? false,
            hasNextPage:     pagedData.hasNextPage ?? pagedData.HasNextPage ?? false
        };
    }
    // ─── GET /api/Customers/{id} ─────────────────────────────────────────────────

    /**
     * Obtiene un cliente por su ID.
     * @param {number} id
     * @returns {Promise<Customer>}
     * @throws Error si no se encuentra (404)
     */
    async function getById(id) {
        const res = await fetch(`${await _getBaseUrl()}/${id}`, {
            method:  'GET',
            headers: _buildHeaders(),
        });

        const dto = await _handleResponse(res);
        return new Customer(dto);
    }

    // ─── POST /api/Customers ─────────────────────────────────────────────────────

    /**
     * Crea un nuevo cliente.
     * @param {Object} formData - Datos del formulario
     * @returns {Promise<Customer>} Cliente recién creado con su ID asignado
     * @throws Error si hay duplicado o validación fallida (400)
     */
    async function create(formData) {
        const body = Customer.toCreateDto(formData);

        const res = await fetch(await _getBaseUrl(), {
            method:  'POST',
            headers: _buildHeaders(),
            body:    JSON.stringify(body),
        });

        const dto = await _handleResponse(res);
        return new Customer(dto);
    }

    // ─── PUT /api/Customers/{id} ─────────────────────────────────────────────────

    /**
     * Actualiza un cliente existente (requiere todos los campos).
     * @param {number} id
     * @param {Object} formData - Datos del formulario (incluye isActive)
     * @returns {Promise<void>}
     * @throws Error si no existe (404) o hay duplicado (400)
     */
    async function update(id, formData) {
        const body = Customer.toUpdateDto(formData);

        const res = await fetch(`${await _getBaseUrl()}/${id}`, {
            method:  'PUT',
            headers: _buildHeaders(),
            body:    JSON.stringify(body),
        });

        await _handleResponse(res);
    }

    // ─── DELETE /api/Customers/{id} ──────────────────────────────────────────────

    /**
     * Elimina un cliente.
     * @param {number} id
     * @returns {Promise<void>}
     * @throws Error si no existe (404) o tiene órdenes/ventas asociadas (400)
     */
    async function remove(id) {
        const res = await fetch(`${await _getBaseUrl()}/${id}`, {
            method:  'DELETE',
            headers: _buildHeaders(),
        });

        await _handleResponse(res);
    }

    // ─── API pública ─────────────────────────────────────────────────────────────

    return { getAll, getById, create, update, remove, getStats };

})();
