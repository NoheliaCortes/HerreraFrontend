let _currentPage = 1;
let _pageSize = 10;
let _movementItems = [];
let _searchDebounce = null;
let _dashboardMessageTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initInventoryMovementDetailDrawer();
        await initInventoryMovementFormModal({ onSaved: _handleMovementSaved });
    } catch (error) {
        console.error('Error inicializando componentes de movimientos:', error.message);
    }

    _bindEvents();

    await Promise.all([
        _loadStats(),
        _loadPage(1),
    ]);

    _refreshIcons();
});

function _bindEvents() {
    document.getElementById('btnApplyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);
    document.getElementById('btnRefresh')?.addEventListener('click', () => {
        _loadStats();
        _loadPage(_currentPage);
    });
    document.getElementById('rowsPerPage')?.addEventListener('change', event => {
        _pageSize = Number(event.target.value);
        _loadPage(1);
    });

    document.getElementById('searchInput')?.addEventListener('input', () => {
        clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(() => _renderTable(_getVisibleItems()), 250);
    });

    document.querySelectorAll('.movement-action[data-movement-action]').forEach(button => {
        button.addEventListener('click', () => openInventoryMovementFormModal(button.dataset.movementAction));
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeInventoryMovementDrawer();
    });
}

async function _handleMovementSaved(result = {}) {
    _showDashboardMessage(result.message || 'Movimiento registrado correctamente.', 'success');
    await Promise.all([
        _loadStats(),
        _loadPage(1),
    ]);
}

async function _loadStats() {
    _setStatsLoading();

    try {
        const stats = await InventoryMovementsService.getStatistics();
        _clearStatsError();
        _setText('statMovementsToday', _formatNumber(stats.movementsToday));
        _setText('statRestocksToday', _formatNumber(stats.restocksToday));
        _setText('statTransfersToday', _formatNumber(stats.transfersToday));
        _setText('statPositiveAdjustmentsToday', _formatNumber(stats.positiveAdjustmentsToday));
        _setText('statNegativeAdjustmentsToday', _formatNumber(stats.negativeAdjustmentsToday));
    } catch (error) {
        console.error('Error cargando estadisticas de movimientos:', error.message);
        _setStatsError(_getFriendlyError(error));
    }
}

async function _loadPage(pageNumber) {
    _showTableLoading();

    try {
        const result = await InventoryMovementsService.getMovements({
            page: pageNumber,
            pageSize: _pageSize,
        });

        _movementItems = result.items;
        _renderTable(_getVisibleItems());
        _renderPagination(result);
        _updateFooterInfo(result);
        _setText('resultCount', _formatNumber(result.totalCount));
    } catch (error) {
        _showTableError(_getFriendlyError(error));
    } finally {
        _refreshIcons();
    }
}

function _getVisibleItems() {
    const search = String(document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (!search) return _movementItems;

    return _movementItems.filter(item =>
        String(item.movementTypeName || '').toLowerCase().includes(search)
        || String(item.createdByUserName || '').toLowerCase().includes(search)
        || String(item.id || '').includes(search)
    );
}

function _renderTable(items) {
    const tbody = document.getElementById('inventoryMovementsTableBody');
    if (!tbody) return;

    if (!items.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="4" class="table-empty">
                <i data-lucide="archive-restore"></i>
                No hay movimientos de inventario registrados
              </td>
            </tr>`;
        _refreshIcons();
        return;
    }

    tbody.innerHTML = items.map((item, index) => `
        <tr>
          <td>${_renderMovementType(item)}</td>
          <td>
            <div class="date-cell">
              <span class="date-main">${_escape(_formatDate(item.movementDate))}</span>
              <span class="date-time">${_escape(_formatTime(item.movementDate))}</span>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="user-avatar bg-${(index % 8) + 1}">${_escape(_getInitials(item.createdByUserName))}</div>
              <span class="user-name">${_escape(item.createdByUserName || 'Sin informacion')}</span>
            </div>
          </td>
          <td style="text-align: center">
            <button
              class="detail-btn"
              data-movement-id="${item.id}"
              type="button"
              aria-label="Ver detalle"
              title="Ver detalle"
            >
              <i data-lucide="eye"></i>
            </button>
          </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.detail-btn[data-movement-id]').forEach(button => {
        button.addEventListener('click', () => _openDetail(Number(button.dataset.movementId)));
    });

    _refreshIcons();
}

function _renderMovementType(item) {
    const meta = _getMovementTypeMeta(item.movementTypeId);
    return `
        <span class="movement-type-cell ${meta.className}">
          <i data-lucide="${meta.icon}"></i>
          ${_escape(item.movementTypeName || 'Sin informacion')}
        </span>`;
}

async function _openDetail(movementId) {
    openInventoryMovementDrawer();
    renderInventoryMovementDrawerLoading();

    try {
        const detail = await InventoryMovementsService.getCompleteDetail(movementId);
        renderInventoryMovementDrawer(detail);
    } catch (error) {
        renderInventoryMovementDrawerError(_getFriendlyError(error));
    } finally {
        _refreshIcons();
    }
}

function _renderPagination(result) {
    const container = document.querySelector('.pagination');
    if (!container) return;

    _currentPage = result.pageNumber;
    const pages = _buildPageWindow(result.pageNumber, result.totalPages);

    container.innerHTML = `
        <button class="pagination-btn" id="btn-prev-page" type="button" ${!result.hasPreviousPage ? 'disabled' : ''}>
          <i data-lucide="chevron-left"></i>
        </button>
        ${pages.map(page => page === '...'
            ? '<button class="pagination-btn" type="button" disabled>...</button>'
            : `<button class="pagination-btn ${page === result.pageNumber ? 'active' : ''}" type="button" data-page="${page}">${page}</button>`
        ).join('')}
        <button class="pagination-btn" id="btn-next-page" type="button" ${!result.hasNextPage ? 'disabled' : ''}>
          <i data-lucide="chevron-right"></i>
        </button>`;

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (result.hasPreviousPage) _loadPage(_currentPage - 1);
    });
    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        if (result.hasNextPage) _loadPage(_currentPage + 1);
    });
    container.querySelectorAll('.pagination-btn[data-page]').forEach(button => {
        button.addEventListener('click', () => _loadPage(Number(button.dataset.page)));
    });
}

function _buildPageWindow(current, total) {
    if (total <= 7) return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);

    const pages = [1];
    if (current > 3) pages.push('...');
    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) {
        pages.push(page);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

function _updateFooterInfo(result) {
    const from = result.totalCount === 0 ? 0 : ((result.pageNumber - 1) * result.pageSize) + 1;
    const to = result.totalCount === 0 ? 0 : Math.min(result.pageNumber * result.pageSize, result.totalCount);

    _setText('showingFrom', `${from}-${to}`);
    _setText('showingTotal', _formatNumber(result.totalCount));
}

function _showTableLoading() {
    const tbody = document.getElementById('inventoryMovementsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="4" class="table-loading">Cargando movimientos...</td>
        </tr>`;
}

function _showTableError(message) {
    const tbody = document.getElementById('inventoryMovementsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty table-empty--error">
            <i data-lucide="alert-circle"></i>
            Error al cargar movimientos: ${_escape(message)}
          </td>
        </tr>`;
}

function _setStatsLoading() {
    ['statMovementsToday', 'statRestocksToday', 'statTransfersToday', 'statPositiveAdjustmentsToday', 'statNegativeAdjustmentsToday']
        .forEach(id => _setText(id, '-'));
}

function _setStatsError(message) {
    document.querySelectorAll('.stats-row .stat-card').forEach(card => card.classList.add('is-error'));
    _setText('statMovementsToday', message || 'Error');
    ['statRestocksToday', 'statTransfersToday', 'statPositiveAdjustmentsToday', 'statNegativeAdjustmentsToday']
        .forEach(id => _setText(id, '-'));
}

function _clearStatsError() {
    document.querySelectorAll('.stats-row .stat-card').forEach(card => card.classList.remove('is-error'));
}

function _showDashboardMessage(message, type = 'success') {
    const alert = document.getElementById('dashboardMessage');
    if (!alert) return;

    alert.textContent = message;
    alert.classList.toggle('error', type === 'error');
    alert.classList.add('active');
    clearTimeout(_dashboardMessageTimeout);
    _dashboardMessageTimeout = setTimeout(() => alert.classList.remove('active'), 4500);
}

function _getMovementTypeMeta(movementTypeId) {
    const id = Number(movementTypeId);
    if (id === 1) return { icon: 'package-plus', className: 'restock' };
    if (id === 1002) return { icon: 'arrow-left-right', className: 'transfer' };
    if (id === 1003) return { icon: 'plus-circle', className: 'positive' };
    if (id === 1004) return { icon: 'minus-circle', className: 'negative' };
    return { icon: 'circle-dot', className: 'neutral' };
}

function _getFriendlyError(error) {
    const message = error?.message || 'Error inesperado';
    if (message.includes('401')) {
        setTimeout(() => {
            window.location.href = '/modules/login/login.html';
        }, 1200);
        return 'Sesion expirada. Te redirigiremos al login.';
    }
    if (message.includes('400')) return 'La solicitud no pudo procesarse. Revisa los parametros e intenta nuevamente.';
    if (message.includes('500')) return 'El servidor no pudo completar la operacion. Intenta nuevamente.';
    return message;
}

function _getInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return '-';
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
}

function _formatNumber(value) {
    return new Intl.NumberFormat('es-NI').format(Number(value ?? 0));
}

function _formatDate(value) {
    if (!value) return 'Sin informacion';
    return new Intl.DateTimeFormat('es-NI', {
        dateStyle: 'short',
    }).format(new Date(value));
}

function _formatTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-NI', {
        timeStyle: 'short',
    }).format(new Date(value));
}

function _setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function _refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applyFilters() {
    _renderTable(_getVisibleItems());
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    _renderTable(_movementItems);
}
