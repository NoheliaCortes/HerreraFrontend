let _currentPage = 1;
let _pageSize = 12;
let _catalogItems = [];
let _linesLoaded = false;
let _flavorsLoaded = false;
let _linePresentations = [];

document.addEventListener('DOMContentLoaded', async () => {
    initProductFormModal();
    initProductDetailModal();
    _bindEvents();

    await _loadFiltersData();
    await _loadStats();
    await _loadPage(1);
    lucide.createIcons();
});

function _bindEvents() {
    document.getElementById('btn-new-product')?.addEventListener('click', () => {
        openProductCreateModal();
    });

    document.getElementById('filterLine')?.addEventListener('change', _onFilterLineChange);
    document.getElementById('filterPresentation')?.addEventListener('change', () => _loadPage(1));
    document.getElementById('filterFlavor')?.addEventListener('change', () => _loadPage(1));
    document.getElementById('filterStatus')?.addEventListener('change', () => _loadPage(1));
    document.getElementById('rowsPerPage')?.addEventListener('change', (event) => {
        _pageSize = Number(event.target.value);
        _loadPage(1);
    });

    document.addEventListener('product:saved', _reloadCurrentPage);
    document.addEventListener('product:deleted', _reloadCurrentPage);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProductFormModal();
            closeProductDetailModal();
        }
    });
}

async function _loadFiltersData() {
    await Promise.all([_loadLines(), _loadFlavors()]);
}

async function _loadLines() {
    if (_linesLoaded) return;

    try {
        _linePresentations = await ProductCatalogService.getLinePresentations();
        const lines = _getUniqueLines(_linePresentations);
        _fillSelect('filterLine', lines, 'Todas las lineas', item => item.name || `Linea ${item.id}`);
        _populatePresentationFilter();
        _linesLoaded = true;
    } catch (error) {
        console.error('Error cargando lineas:', error.message);
    }
}

async function _loadFlavors() {
    if (_flavorsLoaded) return;

    try {
        const flavors = (await ProductCatalogService.getFlavors())
            .filter(flavor => flavor.isActive === true);
        _fillSelect('filterFlavor', flavors, 'Todos los sabores', _getFlavorName);
        _flavorsLoaded = true;
    } catch (error) {
        console.error('Error cargando sabores:', error.message);
    }
}

function _fillSelect(id, items, defaultText, getLabel) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = `<option value="">${defaultText}</option>`;
    items.forEach(item => {
        select.insertAdjacentHTML('beforeend', `<option value="${item.id}">${_escape(getLabel(item))}</option>`);
    });
}

async function _loadPage(pageNumber) {
    _showCatalogLoading();

    try {
        const result = await ProductCatalogService.getCatalog({
            page: pageNumber,
            pageSize: _pageSize,
            search: document.getElementById('searchInput')?.value || '',
            lineId: document.getElementById('filterLine')?.value || '',
            presentationId: document.getElementById('filterPresentation')?.value || '',
            flavorId: document.getElementById('filterFlavor')?.value || '',
            active: document.getElementById('filterStatus')?.value || '',
        });

        _catalogItems = result.items;
        _renderProducts(_catalogItems);
        _renderPagination(result);
        _updateResultCount(result.totalCount);
        _updateFooterInfo(result, _catalogItems.length);
    } catch (error) {
        _showCatalogError(error.message);
    } finally {
        lucide.createIcons();
    }
}

function _renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = `
            <div class="catalog-empty">
              <i data-lucide="package-search"></i>
              <span>No se encontraron productos con los filtros aplicados</span>
            </div>`;
        return;
    }

    grid.innerHTML = products.map(product => createProductCard(product)).join('');
    grid.querySelectorAll('.btn-view[data-product-id]').forEach(button => {
        button.addEventListener('click', () => {
            const product = _catalogItems.find(item => Number(item.id) === Number(button.dataset.productId));
            if (product) openProductDetailModal(product);
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
        </button>
    `;

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

async function _loadStats() {
    _showStatsLoading();

    try {
        const stats = await ProductCatalogService.getStats();
        document.getElementById('stat-total').textContent = stats.totalProducts ?? 0;
        document.getElementById('stat-active').textContent = stats.activeProducts ?? 0;
        document.getElementById('stat-inactive').textContent = stats.inactiveProducts ?? 0;
    } catch (error) {
        console.error('Error cargando estadisticas de productos:', error.message);
        _showStatsError();
    }
}

function _updateResultCount(totalCount) {
    document.getElementById('resultCount').textContent = totalCount;
}

function _showStatsLoading() {
    document.getElementById('stat-total').textContent = '-';
    document.getElementById('stat-active').textContent = '-';
    document.getElementById('stat-inactive').textContent = '-';
}

function _showStatsError() {
    document.getElementById('stat-total').textContent = '-';
    document.getElementById('stat-active').textContent = '-';
    document.getElementById('stat-inactive').textContent = '-';
}

function _updateFooterInfo(result, visibleCount) {
    const from = result.totalCount === 0 ? 0 : ((result.pageNumber - 1) * result.pageSize) + 1;
    const to = result.totalCount === 0 ? 0 : Math.min(result.pageNumber * result.pageSize, result.totalCount);

    document.getElementById('showingFrom').textContent = visibleCount === 0 ? '0-0' : `${from}-${to}`;
    document.getElementById('showingTotal').textContent = result.totalCount;
}

function _showCatalogLoading() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="catalog-empty">
          <span>Cargando productos...</span>
        </div>`;
}

function _showCatalogError(message) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="catalog-empty catalog-empty--error">
          <i data-lucide="alert-circle"></i>
          <span>Error al cargar productos: ${_escape(message)}</span>
        </div>`;
}

async function _onFilterLineChange(event) {
    _populatePresentationFilter(event.target.value);
    await _loadPage(1);
}

function _populatePresentationFilter(lineId = '') {
    const select = document.getElementById('filterPresentation');
    select.innerHTML = '<option value="">Todas</option>';
    select.disabled = false;

    try {
        const presentations = lineId
            ? _getPresentationOptionsByLine(lineId)
            : _getUniquePresentations(_linePresentations);

        presentations.forEach(item => {
            select.insertAdjacentHTML('beforeend', `<option value="${item.presentationId}">${_escape(item.presentationName)}</option>`);
        });
        select.disabled = presentations.length === 0;
    } catch (error) {
        console.error('Error cargando presentaciones:', error.message);
    }
}

function _reloadCurrentPage() {
    _loadPage(_currentPage);
    _loadStats();
}

function _getLineName(line) {
    return line.lineName || line.name || line.nombre || line.description || `Linea ${line.id}`;
}

function _getUniqueLines(relations) {
    const map = new Map();

    relations.forEach(relation => {
        const line = relation.line;
        if (!line?.id || map.has(line.id)) return;
        map.set(line.id, line);
    });

    return Array.from(map.values())
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
}

function _getPresentationOptionsByLine(lineId) {
    const selectedLineId = Number(lineId);

    return _linePresentations
        .filter(relation => Number(relation.line?.id) === selectedLineId)
        .map(relation => ({
            linePresentationId: relation.id,
            presentationId: relation.presentation?.id,
            presentationName: relation.presentation?.name || `Presentacion ${relation.presentation?.id || relation.id}`,
        }))
        .sort((a, b) => String(a.presentationName).localeCompare(String(b.presentationName), 'es'));
}

function _getUniquePresentations(relations) {
    const map = new Map();

    relations.forEach(relation => {
        const presentation = relation.presentation;
        if (!presentation?.id || map.has(presentation.id)) return;
        map.set(presentation.id, {
            presentationId: presentation.id,
            presentationName: presentation.name || `Presentacion ${presentation.id}`,
        });
    });

    return Array.from(map.values())
        .sort((a, b) => String(a.presentationName).localeCompare(String(b.presentationName), 'es'));
}

function _getFlavorName(flavor) {
    return flavor.flavorName || flavor.name || flavor.nombre || `Sabor ${flavor.id}`;
}

function _escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function applyFilters() {
    _loadPage(1);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterLine').value = '';
    document.getElementById('filterFlavor').value = '';
    document.getElementById('filterStatus').value = '';
    _populatePresentationFilter();
    _loadPage(1);
}
