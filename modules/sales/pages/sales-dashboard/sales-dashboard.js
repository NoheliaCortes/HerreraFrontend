let _currentPage = 1;
let _pageSize = 10;
let _salesItems = [];
let _searchDebounce = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initSaleDetailDrawer();
    } catch (error) {
        console.error('Error inicializando drawer de ventas:', error.message);
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
    document.getElementById('rowsPerPage')?.addEventListener('change', event => {
        _pageSize = Number(event.target.value);
        _loadPage(1);
    });

    document.getElementById('searchInput')?.addEventListener('input', () => {
        clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(() => _renderTable(_getVisibleItems()), 250);
    });

    document.getElementById('dateFrom')?.addEventListener('change', applyFilters);
    document.getElementById('dateTo')?.addEventListener('change', applyFilters);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSaleDrawer();
    });
}

async function _loadStats() {
    _setText('statSalesThisMonth', '-');
    _setText('statIncomeThisMonth', '-');
    _setText('statProductsSoldThisMonth', '-');

    try {
        const stats = await SalesService.getStatistics();
        _setText('statSalesThisMonth', _formatNumber(stats.salesThisMonth));
        _setText('statIncomeThisMonth', _formatCurrency(stats.totalIncomeThisMonth));
        _setText('statProductsSoldThisMonth', _formatNumber(stats.productsSoldThisMonth));
    } catch (error) {
        console.error('Error cargando estadisticas de ventas:', error.message);
    }
}

async function _loadPage(pageNumber) {
    _showTableLoading();

    try {
        const result = await SalesService.getSales({
            page: pageNumber,
            pageSize: _pageSize,
            startDate: document.getElementById('dateFrom')?.value || '',
            endDate: document.getElementById('dateTo')?.value || '',
        });

        _salesItems = result.items;
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
    if (!search) return _salesItems;

    return _salesItems.filter(item =>
        String(item.saleCode || '').toLowerCase().includes(search)
        || String(item.customerName || '').toLowerCase().includes(search)
    );
}

function _renderTable(items) {
    const tbody = document.getElementById('ventasTableBody');
    if (!tbody) return;

    if (!items.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="7" class="table-empty">
                <i data-lucide="receipt-text"></i>
                No hay ventas en este periodo
              </td>
            </tr>`;
        _refreshIcons();
        return;
    }

    tbody.innerHTML = items.map((item, index) => `
        <tr>
          <td><span class="code-cell">${_escape(item.saleCode || '-')}</span></td>
          <td>
            <div class="date-cell">
              <span class="date-main">${_escape(_formatDate(item.saleDate))}</span>
              <span class="date-time">${_escape(_formatTime(item.saleDate))}</span>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="user-avatar bg-${(index % 4) + 1}">${_escape(_getInitials(item.customerName))}</div>
              <span class="user-name">${_escape(item.customerName || 'Sin informacion')}</span>
            </div>
          </td>
          <td style="text-align: center">
            <span class="sale-type-cell">${_escape(item.saleTypeName || 'Sin informacion')}</span>
          </td>
          <td style="text-align: center">
            <span class="payment-type-cell">${_escape(item.paymentTypeName || 'Sin informacion')}</span>
          </td>
          <td style="text-align: right">
            <span class="total-cell">${_formatCurrency(item.total)}</span>
          </td>
          <td style="text-align: center">
            <button
              class="detail-btn"
              data-sale-id="${item.id}"
              type="button"
              aria-label="Ver detalle"
              title="Ver detalle"
            >
              <i data-lucide="eye"></i>
            </button>
          </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.detail-btn[data-sale-id]').forEach(button => {
        button.addEventListener('click', () => _openDetail(Number(button.dataset.saleId)));
    });

    _refreshIcons();
}

async function _openDetail(saleId) {
    openSaleDrawer();
    renderSaleDrawerLoading();

    try {
        const detail = await SalesService.getCompleteDetail(saleId);
        renderSaleDrawer(detail);
    } catch (error) {
        renderSaleDrawerError(_getFriendlyError(error));
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
    const tbody = document.getElementById('ventasTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-loading">Cargando ventas...</td>
        </tr>`;
}

function _showTableError(message) {
    const tbody = document.getElementById('ventasTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty table-empty--error">
            <i data-lucide="alert-circle"></i>
            Error al cargar ventas: ${_escape(message)}
          </td>
        </tr>`;
}

function _getFriendlyError(error) {
    const message = error?.message || 'Error inesperado';
    if (message.includes('401')) {
        setTimeout(() => {
            window.location.href = '/modules/login/login.html';
        }, 1200);
        return 'Sesion expirada. Te redirigiremos al login.';
    }
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

function _formatCurrency(value) {
    return `C$${new Intl.NumberFormat('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0))}`;
}

function _formatDate(value) {
    if (!value) return '-';
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
    _loadPage(1);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    _loadPage(1);
}
