let _currentPage = 1;
const PAGE_SIZE = 10;
const API_ORIGIN = 'https://localhost:7035';
const PRODUCT_IMAGE_FALLBACK = '../../assets/img/logo.jpg';
let _inventoryItems = [];
let _linePresentations = [];

document.addEventListener('DOMContentLoaded', async () => {
    initInventoryDrawer();
    _bindEvents();

    await _loadFiltersData();
    await _loadStats();
    await _loadPage(1);
    _refreshIcons();
});

function _bindEvents() {
    document.getElementById('filterLine')?.addEventListener('change', _onFilterLineChange);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeInventoryDrawer();
    });
}

async function _loadStats() {
    try {
        const stats = await InventoryService.getStats('week');
        document.getElementById('stat-total-products').textContent = _formatNumber(stats.totalProducts);
        document.getElementById('stat-low-stock').textContent = _formatNumber(stats.lowStockProducts);
        document.getElementById('stat-best-flavor').textContent = stats.bestSellingFlavor?.flavorName || '-';
        document.getElementById('stat-inventory-value').textContent = _formatCurrency(stats.inventoryValue);
    } catch (error) {
        console.error('Error cargando estadisticas de inventario:', error.message);
        document.getElementById('stat-total-products').textContent = '-';
        document.getElementById('stat-low-stock').textContent = '-';
        document.getElementById('stat-best-flavor').textContent = '-';
        document.getElementById('stat-inventory-value').textContent = '-';
    }
}

async function _loadFiltersData() {
    await Promise.all([_loadLinesAndPresentations(), _loadFlavors()]);
}

async function _loadLinesAndPresentations() {
    try {
        _linePresentations = await InventoryService.getLinePresentations();
        const lines = _getUniqueLines(_linePresentations);
        _fillSelect('filterLine', lines, 'Todas las lineas', item => item.name || item.lineName || `Linea ${item.id}`);
    } catch (error) {
        console.error('Error cargando lineas:', error.message);
    }
}

async function _loadFlavors() {
    try {
        const flavors = (await InventoryService.getFlavors()).filter(flavor => flavor.isActive !== false);
        _fillSelect('filterFlavor', flavors, 'Todos los sabores', _getFlavorName);
    } catch (error) {
        console.error('Error cargando sabores:', error.message);
    }
}

function _fillSelect(id, items, defaultText, getLabel) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = `<option value="">${_escape(defaultText)}</option>`;
    items.forEach(item => {
        select.insertAdjacentHTML('beforeend', `<option value="${item.id}">${_escape(getLabel(item))}</option>`);
    });
}

async function _loadPage(pageNumber) {
    _showTableLoading();

    try {
        const result = await InventoryService.getInventory({
            page: pageNumber,
            pageSize: PAGE_SIZE,
            search: document.getElementById('searchInput')?.value || '',
            lineId: document.getElementById('filterLine')?.value || '',
            flavorId: document.getElementById('filterFlavor')?.value || '',
            presentationId: document.getElementById('filterPresentation')?.value || '',
        });

        _inventoryItems = result.items;
        _renderTable(result.items);
        _renderPagination(result);
        _updateFooterInfo(result);
        _updateResultCount(result.totalCount);
    } catch (error) {
        _showTableError(error.message);
    } finally {
        _refreshIcons();
    }
}

function _renderTable(items) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (!items.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="6" class="table-empty">
                <i data-lucide="package-search"></i>
                No se encontraron productos con los filtros aplicados
              </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
          <td>
            <div class="product-cell">
              <div class="product-icon">
                <img class="product-image" src="${_escape(_resolveProductImageUrl(item.imageUrl))}" alt="${_escape(item.productName)}" onerror="this.replaceWith(document.createTextNode('${_escape(_getFlavorInitial(item.flavorName))}'))" />
              </div>
              <div class="product-info">
                <span class="product-name">${_escape(item.productName)}</span>
              </div>
            </div>
          </td>
          <td style="text-align: center">${_formatNumber(item.displayStock)}</td>
          <td style="text-align: center">${_formatNumber(item.warehouseStock)}</td>
          <td style="text-align: center">${_formatNumber(item.reservedStock)}</td>
          <td style="text-align: center; font-weight: 600">${_formatNumber(item.totalStock)}</td>
          <td style="text-align: center">
            <button class="action-btn" data-product-id="${item.productId}" title="Ver detalle">
              <i data-lucide="eye"></i>
            </button>
          </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.action-btn[data-product-id]').forEach(button => {
        button.addEventListener('click', () => {
            const product = _inventoryItems.find(item => Number(item.productId) === Number(button.dataset.productId));
            if (product) openInventoryDrawer(product);
        });
    });
}

function _renderPagination(result) {
    const container = document.querySelector('.pagination');
    if (!container) return;

    _currentPage = result.pageNumber;
    const pages = _buildPageWindow(result.pageNumber, result.totalPages);

    container.innerHTML = `
        <button class="pagination-btn" id="btn-prev-page" ${!result.hasPreviousPage ? 'disabled' : ''}>
          <i data-lucide="chevron-left"></i>
        </button>
        ${pages.map(page => page === '...'
            ? '<button class="pagination-btn" disabled>...</button>'
            : `<button class="pagination-btn ${page === result.pageNumber ? 'active' : ''}" data-page="${page}">${page}</button>`
        ).join('')}
        <button class="pagination-btn" id="btn-next-page" ${!result.hasNextPage ? 'disabled' : ''}>
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

    document.getElementById('showingFrom').textContent = result.totalCount === 0 ? '0-0' : `${from}-${to}`;
    document.getElementById('showingTotal').textContent = result.totalCount;
}

function _updateResultCount(totalCount) {
    const badge = document.getElementById('resultCount');
    if (badge) badge.textContent = totalCount;
}

function _showTableLoading() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
          <td colspan="6" class="table-loading">Cargando inventario...</td>
        </tr>`;
}

function _showTableError(message) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">
            <i data-lucide="alert-circle"></i>
            Error al cargar inventario: ${_escape(message)}
          </td>
        </tr>`;
}

function _onFilterLineChange(event) {
    const select = document.getElementById('filterPresentation');
    if (!select) return;

    select.innerHTML = '<option value="">Todas</option>';
    select.disabled = true;

    if (!event.target.value) return;

    const presentations = _getPresentationOptionsByLine(event.target.value);
    presentations.forEach(item => {
        select.insertAdjacentHTML('beforeend', `<option value="${item.presentationId}">${_escape(item.presentationName)}</option>`);
    });
    select.disabled = presentations.length === 0;
}

function _getUniqueLines(relations) {
    const map = new Map();

    relations.forEach(relation => {
        const line = relation.line || {
            id: relation.lineId,
            name: relation.lineName,
            lineName: relation.lineName,
        };
        if (!line?.id || map.has(line.id)) return;
        map.set(line.id, line);
    });

    return Array.from(map.values())
        .sort((a, b) => String(a.name || a.lineName).localeCompare(String(b.name || b.lineName), 'es'));
}

function _getPresentationOptionsByLine(lineId) {
    const selectedLineId = Number(lineId);

    return _linePresentations
        .filter(relation => Number(relation.line?.id ?? relation.lineId) === selectedLineId)
        .map(relation => ({
            presentationId: relation.presentation?.id ?? relation.presentationId,
            presentationName: relation.presentation?.name || relation.presentation?.presentationName || relation.presentationName || `Presentacion ${relation.presentation?.id ?? relation.presentationId}`,
        }))
        .filter(item => item.presentationId)
        .sort((a, b) => String(a.presentationName).localeCompare(String(b.presentationName), 'es'));
}

function _getFlavorName(flavor) {
    return flavor.flavorName || flavor.name || flavor.nombre || `Sabor ${flavor.id}`;
}

function _getFlavorInitial(flavorName) {
    return String(flavorName || 'P').trim().charAt(0).toUpperCase() || 'P';
}

function _formatNumber(value) {
    return new Intl.NumberFormat('es-NI').format(Number(value ?? 0));
}

function _formatCurrency(value) {
    return `${new Intl.NumberFormat('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))} C$`;
}

function _escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function _resolveProductImageUrl(imageUrl) {
    if (!imageUrl) return PRODUCT_IMAGE_FALLBACK;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return `${API_ORIGIN}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

function _refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applyFilters() {
    _loadPage(1);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterLine').value = '';
    document.getElementById('filterFlavor').value = '';
    document.getElementById('filterPresentation').innerHTML = '<option value="">Todas</option>';
    document.getElementById('filterPresentation').disabled = true;
    _loadPage(1);
}
