/**
 * customer-dashboard.js
 * Orquestador del módulo Clientes. Responsabilidades:
 * - Inicializar los componentes de modales
 * - Cargar y actualizar las Stat Cards reales desde la API
 * - Cargar los departamentos reales y gestionar la cascada de municipios
 * - Cargar y renderizar la tabla de clientes aplicando filtros en el servidor (paginado)
 * - Manejar paginación real con datos del PagedResponse
 * - Escuchar eventos 'customer:saved' y 'customer:deleted' para recargar
 */

let _currentPage  = 1;
const PAGE_SIZE   = 10;

document.addEventListener('DOMContentLoaded', async () => {

    // ─── Inicializar componentes de modales ──────────────────────────────────────

    initCustomerFormModal();
    initCustomerDetailModal();

    // ─── Botón "Nuevo Cliente" ────────────────────────────────────────────────────

    document.querySelector('.btn-primary')
        .addEventListener('click', () => openCustomerFormModal(_reloadCurrentPage));

    // ─── Escuchar eventos globales de guardado / eliminación ─────────────────────

    document.addEventListener('customer:saved',   _reloadCurrentPage);
    document.addEventListener('customer:deleted', () => {
        // Si estábamos en la última página y queda vacía, retroceder
        _currentPage = Math.max(1, _currentPage - 1);
        _reloadCurrentPage();
    });

    // ─── Control de filtros geográficos encadenados (Regla del negocio) ──────────

    const deptSelect = document.getElementById('deptFilter');
    const muniSelect = document.getElementById('municipalityFilter');

    deptSelect.addEventListener('change', async (e) => {
        const departmentId = e.target.value;
        
        // Limpiar el combo de municipios siempre que cambie el departamento
        muniSelect.innerHTML = '<option value="">Todos</option>';
        muniSelect.value = '';

        if (departmentId) {
            // Habilitar si se seleccionó un departamento válido
            muniSelect.disabled = false;
            try {
                const municipalities = await LocationService.getMunicipalitiesByDepartment(departmentId);
                municipalities.forEach(m => {
                    muniSelect.innerHTML += `<option value="${m.id}">${m.municipalityName}</option>`;
                });
            } catch (err) {
                console.error("Error al cargar municipios:", err.message);
            }
        } else {
            // Si elige "Todos", se deshabilita el filtro de municipio
            muniSelect.disabled = true;
        }
    });

    // ─── Carga inicial de Datos de la API ──────────────────────────────────────────

    await _loadFiltersData();      // 1. Cargar combo box de departamentos
    await _loadDashboardStats();  // 2. NUEVO: Cargar los datos de las stat cards reales
    await _loadPage(_currentPage); // 3. Cargar la primera página de la tabla

    lucide.createIcons();
});

// ─── NUEVO: Cargar estadísticas desde la API y renderizar en las Cards ────────

async function _loadDashboardStats() {
    try {
        // Invocación a tu nuevo endpoint /api/Customers/stats
        const stats = await CustomerService.getStats();
        
        // Mapeo exacto hacia los IDs de tu estructura HTML
        document.getElementById('stat-active').textContent = stats.activeCustomers ?? 0;
        document.getElementById('stat-inactive').textContent = stats.inactiveCustomers ?? 0;
        document.getElementById('stat-municipalities').textContent = stats.distinctMunicipalitiesWithCustomers ?? 0;
        document.getElementById('stat-pos').textContent = stats.activePointsOfSale ?? 0;

    } catch (err) {
        console.error("Error al renderizar las cards de estadísticas:", err.message);
        // En caso de error, dejamos un indicador visual seguro
        document.getElementById('stat-active').textContent = "—";
        document.getElementById('stat-inactive').textContent = "—";
        document.getElementById('stat-municipalities').textContent = "—";
        document.getElementById('stat-pos').textContent = "—";
    }
}

// ─── Cargar Departamentos Iniciales en el Filtro de Ubicación ──────────────────

async function _loadFiltersData() {
    try {
        const departments = await LocationService.getDepartments();
        const deptSelect = document.getElementById('deptFilter');
        
        // Limpiamos opciones fijas de texto y dejamos solo la por defecto
        deptSelect.innerHTML = '<option value="">Todos</option>';
        
        departments.forEach(d => {
            deptSelect.innerHTML += `<option value="${d.id}">${d.departmentName}</option>`;
        });
    } catch (err) {
        console.error("Error cargando departamentos en filtros:", err.message);
    }
}

// ─── Cargar página desde la API (Con filtros en Servidor) ──────────────────────

async function _loadPage(pageNumber) {
    _showTableLoading(true);

    // Capturar el estado actual de los inputs de la interfaz
    const searchQuery = document.getElementById('searchInput').value;
    const departmentId = document.getElementById('deptFilter').value;
    const municipalityId = document.getElementById('municipalityFilter').value;

    try {
        // Consumir el getAll actualizado que procesa Query Strings en backend
        const result = await CustomerService.getAll(pageNumber, PAGE_SIZE, searchQuery, departmentId, municipalityId);
   
        _renderTable(result.items);
        _renderPagination(result);
        _updateFooterInfo(result);
        _updateTableBadge(result.totalCount);

    } catch (err) {
        _showTableError(err.message);
    } finally {
        _showTableLoading(false);
        lucide.createIcons();
    }
}

function _reloadCurrentPage() {
    _loadPage(_currentPage);
    _loadDashboardStats(); // Refrescar cards automáticamente si hubo altas, bajas o ediciones
}

// ─── Acciones de los botones Buscar y Limpiar de la Barra de Filtros ──────────

function applyFilters() {
    _currentPage = 1; // REGLA DE ORO: Regresar siempre a la página 1 en búsquedas nuevas
    _loadPage(_currentPage);
}

async function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('deptFilter').value = '';
    
    const muniSelect = document.getElementById('municipalityFilter');
    muniSelect.innerHTML = '<option value="">Todos</option>';
    muniSelect.value = '';
    muniSelect.disabled = true;

    _currentPage = 1;
    await _loadPage(_currentPage);
}

// ─── Renderizado de la tabla ─────────────────────────────────────────────────

function _renderTable(customers) {
    const tbody = document.getElementById('clientsTableBody');

    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
              <td colspan="5" class="table-empty">
                <i data-lucide="users"></i>
                No se encontraron clientes con los filtros aplicados
              </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = customers.map((c, index) => `
        <tr>
          <td>
            <div class="client-cell">
              <div class="client-avatar avatar-color-${index % 8}">${c.initials || 'C'}</div>
              <div class="client-info">
                <span class="client-name">${c.fullName}</span>
              </div>
            </div>
          </td>
          <td>${c.phone || '—'}</td>
          <td>
            <div class="location-cell">
              <i data-lucide="map-pin"></i>
               <span>${c.municipalityName} (${c.departmentName})</span>
            </div>
          </td>
          <td>${c.pointOfSale || '—'}</td>
          <td>
            <button
              class="btn-detail"
              data-customer-id="${c.id}"
              title="Ver detalles"
            >
              <i data-lucide="eye"></i>
            </button>
          </td>
        </tr>
    `).join('');

    // Vincular botones de detalle
    document.querySelectorAll('.btn-detail[data-customer-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.dataset.customerId);
            try {
                const customer = await CustomerService.getById(id);
                openCustomerDetailModal(customer, _reloadCurrentPage);
            } catch (err) {
                alert(`Error al cargar el cliente: ${err.message}`);
            }
        });
    });
}

// ─── Render de paginación real ───────────────────────────────────────────────

function _renderPagination(pagedResult) {
    const container = document.querySelector('.pagination');
    if (!container) return;

    const { pageNumber, totalPages, hasPreviousPage, hasNextPage } = pagedResult;
    _currentPage = pageNumber;

    const pages = _buildPageWindow(pageNumber, totalPages);

    container.innerHTML = `
        <button class="pagination-btn" id="btn-prev-page" ${!hasPreviousPage ? 'disabled' : ''}>
          <i data-lucide="chevron-left"></i>
        </button>
        ${pages.map(p => p === '...'
            ? `<button class="pagination-btn" disabled>…</button>`
            : `<button class="pagination-btn ${p === pageNumber ? 'active' : ''}" data-page="${p}">${p}</button>`
        ).join('')}
        <button class="pagination-btn" id="btn-next-page" ${!hasNextPage ? 'disabled' : ''}>
          <i data-lucide="chevron-right"></i>
        </button>
    `;

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (hasPreviousPage) _loadPage(_currentPage - 1);
    });
    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        if (hasNextPage) _loadPage(_currentPage + 1);
    });
    document.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => _loadPage(Number(btn.dataset.page)));
    });
}

function _buildPageWindow(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [];
    pages.push(1);
    if (current > 3)  pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        pages.push(p);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

// ─── Footer e Información complementaria de la Tabla ──────────────────────────

function _updateFooterInfo(result) {
    const el = document.querySelector('.table-footer-info');
    if (!el) return;

    if (result.totalCount === 0) {
        el.innerHTML = `Mostrando <strong>0–0</strong> de <strong>0</strong> clientes`;
        return;
    }

    const from = ((result.pageNumber - 1) * result.pageSize) + 1;
    const to   = Math.min(result.pageNumber * result.pageSize, result.totalCount);

    el.innerHTML = `Mostrando <strong>${from}–${to}</strong> de <strong>${result.totalCount}</strong> clientes`;
}

function _updateTableBadge(totalCount) {
    const badge = document.querySelector('.table-card-header .count-badge');
    if (badge) badge.textContent = totalCount;
}

// ─── UI Helpers (Cargando y Errores) ─────────────────────────────────────────

function _showTableLoading(loading) {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    if (loading) {
        tbody.innerHTML = `
            <tr>
              <td colspan="5" class="table-loading">
                Cargando clientes…
              </td>
            </tr>`;
    }
}

function _showTableError(msg) {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
          <td colspan="5" class="table-empty">
            <i data-lucide="alert-circle"></i>
            Error al cargar clientes: ${msg}
          </td>
        </tr>`;
}