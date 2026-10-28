function initRestockDetailDrawer() {
    document.getElementById('restockDrawerOverlay')?.addEventListener('click', closeRestockDrawer);
    document.getElementById('restockDrawerCloseBtn')?.addEventListener('click', closeRestockDrawer);
}

function openRestockDrawer() {
    document.getElementById('restockDrawerOverlay')?.classList.add('active');
    document.getElementById('restockDrawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    _refreshRestockDrawerIcons();
}

function closeRestockDrawer() {
    document.getElementById('restockDrawerOverlay')?.classList.remove('active');
    document.getElementById('restockDrawer')?.classList.remove('active');
    document.body.style.overflow = '';
}

function renderRestockDrawerLoading() {
    _setDrawerText('drawerRestockCode', 'Cargando...');
    _setDrawerText('drawerRestockDate', 'Cargando detalle');
    _setDrawerText('drawerRestockUser', '-');
    _setDrawerText('drawerMetricBatches', '-');
    _setDrawerText('drawerMetricUnits', '-');
    _setDrawerText('drawerMetricInvestment', '-');
    _setDrawerText('drawerMetricProducts', '-');
    _setDrawerText('drawerInfoCode', '-');
    _setDrawerText('drawerInfoDate', '-');
    _setDrawerText('drawerInfoUser', '-');
    _setDrawerText('drawerInfoBatches', '-');
    _setDrawerText('drawerInfoUnits', '-');
    _setDrawerText('drawerFinancialInvestment', '-');
    _setDrawerText('drawerAverageCost', '-');
    _setDrawerText('drawerViewAllLots', 'Cargando lotes...');

    const tbody = document.getElementById('drawerLotsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
              <td colspan="7" class="restock-drawer-state">Cargando lotes...</td>
            </tr>`;
    }
}

function renderRestockDrawerError(message) {
    _setDrawerText('drawerRestockCode', 'No disponible');
    _setDrawerText('drawerRestockDate', 'Error al cargar');
    _setDrawerText('drawerRestockUser', '-');

    const tbody = document.getElementById('drawerLotsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
              <td colspan="7" class="restock-drawer-state restock-drawer-state--error">
                ${_escapeRestockDrawer(message)}
              </td>
            </tr>`;
    }
}

function renderRestockDrawer(detail) {
    const averageCost = detail.totalUnits > 0 ? detail.totalInvestment / detail.totalUnits : 0;

    _setDrawerText('drawerRestockCode', detail.restockCode || '-');
    _setDrawerText('drawerRestockDate', _formatDateTime(detail.restockDate));
    _setDrawerText('drawerRestockUser', detail.userName || '-');
    _setDrawerText('drawerRestockUserAvatar', _getInitials(detail.userName));
    _setDrawerText('drawerMetricBatches', _formatNumber(detail.batchCount));
    _setDrawerText('drawerMetricUnits', _formatNumber(detail.totalUnits));
    _setDrawerText('drawerMetricInvestment', _formatCurrency(detail.totalInvestment));
    _setDrawerText('drawerMetricProducts', _formatNumber(detail.differentProductsCount));
    _setDrawerText('drawerInfoCode', detail.restockCode || '-');
    _setDrawerText('drawerInfoDate', _formatDateTime(detail.restockDate));
    _setDrawerText('drawerInfoUser', detail.userName || '-');
    _setDrawerText('drawerInfoBatches', `${_formatNumber(detail.batchCount)} lotes`);
    _setDrawerText('drawerInfoUnits', `${_formatNumber(detail.totalUnits)} unidades`);
    _setDrawerText('drawerFinancialInvestment', _formatCurrency(detail.totalInvestment));
    _setDrawerText('drawerAverageCost', _formatCurrency(averageCost));
    _setDrawerText('drawerViewAllLots', `Lotes creados (${_formatNumber(detail.batchCount)})`);

    const tbody = document.getElementById('drawerLotsTableBody');
    if (!tbody) return;

    if (!detail.batches.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="7" class="restock-drawer-state">Este reabastecimiento no tiene lotes asociados</td>
            </tr>`;
        return;
    }

    tbody.innerHTML = detail.batches.map(batch => `
        <tr>
          <td><span class="restock-lot-code">${_escapeRestockDrawer(batch.batchCode || '-')}</span></td>
          <td>
            <div class="restock-lot-product">
              <span class="restock-lot-dot ${_getProductDotClass(batch.productName)}"></span>
              ${_escapeRestockDrawer(batch.productName || '-')}
            </div>
          </td>
          <td><span class="restock-lot-status ${_getStatusClass(batch.batchStatusName)}">${_escapeRestockDrawer(batch.batchStatusName || '-')}</span></td>
          <td class="restock-lot-cell-num">${_formatNumber(batch.initialQuantity)}</td>
          <td class="restock-lot-cell-num">${_formatCurrency(batch.unitProductionCost)}</td>
          <td class="restock-lot-cell-num">${_formatCurrency(batch.totalCost)}</td>
          <td style="text-align: center">${_formatDateOnly(batch.expirationDate)}</td>
        </tr>
    `).join('');
}

function _setDrawerText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _getInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return '-';
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
}

function _getProductDotClass(productName) {
    const value = String(productName || '').toLowerCase();
    if (value.includes('fresa')) return 'strawberry';
    if (value.includes('chocolate')) return 'chocolate';
    if (value.includes('vainilla')) return 'vanilla';
    if (value.includes('coco')) return 'coconut';
    return 'default';
}

function _getStatusClass(statusName) {
    const value = String(statusName || '').toLowerCase();
    if (value.includes('vencer') || value.includes('revision') || value.includes('cuarentena')) return 'warning';
    return 'active';
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

function _formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-NI', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function _formatDateOnly(value) {
    if (!value) return '-';
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return '-';

    return new Intl.DateTimeFormat('es-NI', {
        dateStyle: 'short',
    }).format(new Date(year, month - 1, day));
}

function _escapeRestockDrawer(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function _refreshRestockDrawerIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
