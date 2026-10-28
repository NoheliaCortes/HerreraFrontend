const INVENTORY_MOVEMENT_DRAWER_TEMPLATE_SRC = '/modules/inventory-movements/components/inventory-movement-detail-drawer/inventory-movement-detail-drawer.component.html';

async function initInventoryMovementDetailDrawer() {
    const placeholder = document.getElementById('inventory-movement-detail-drawer-placeholder');
    if (placeholder && !document.getElementById('inventoryMovementDrawer')) {
        const response = await fetch(INVENTORY_MOVEMENT_DRAWER_TEMPLATE_SRC);
        if (!response.ok) throw new Error('No se pudo cargar el drawer de movimientos');
        placeholder.innerHTML = await response.text();
    }

    document.getElementById('inventoryMovementDrawerOverlay')?.addEventListener('click', closeInventoryMovementDrawer);
    document.getElementById('inventoryMovementDrawerCloseBtn')?.addEventListener('click', closeInventoryMovementDrawer);
    document.getElementById('inventoryMovementDrawerFooterCloseBtn')?.addEventListener('click', closeInventoryMovementDrawer);
}

function openInventoryMovementDrawer() {
    document.getElementById('inventoryMovementDrawerOverlay')?.classList.add('active');
    document.getElementById('inventoryMovementDrawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    _refreshInventoryMovementDrawerIcons();
}

function closeInventoryMovementDrawer() {
    document.getElementById('inventoryMovementDrawerOverlay')?.classList.remove('active');
    document.getElementById('inventoryMovementDrawer')?.classList.remove('active');
    document.body.style.overflow = '';
}

function renderInventoryMovementDrawerLoading() {
    _setInventoryMovementDrawerText('drawerMovementTypeTitle', 'Cargando...');
    _setInventoryMovementDrawerText('drawerMovementType', 'Cargando');
    _setInventoryMovementDrawerText('drawerMovementDate', '-');
    _setInventoryMovementDrawerText('drawerInfoMovementType', '-');
    _setInventoryMovementDrawerText('drawerSaleCode', '-');
    _setInventoryMovementDrawerText('drawerOrderCode', '-');
    _setInventoryMovementDrawerText('drawerInfoMovementDate', '-');
    _setInventoryMovementDrawerText('drawerCreatedBy', '-');
    _setInventoryMovementDrawerText('drawerNotes', '-');
    _setInventoryMovementDrawerText('drawerMetaUser', '-');
    _setInventoryMovementDrawerText('drawerMetaDate', '-');
    _setInventoryMovementDrawerText('drawerMetaDocument', '-');
    _setInventoryMovementDrawerText('drawerMetaDocumentHint', 'Venta o pedido asociado');
    _setInventoryMovementDrawerText('drawerDetailsCount', 'Total detalles: 0');
    _setInventoryMovementDrawerText('drawerUnitsCount', 'Total unidades: 0');
    _setDetailsBody(`
        <tr>
          <td colspan="8" class="inventory-movement-drawer-state">Cargando detalles...</td>
        </tr>`);
}

function renderInventoryMovementDrawerError(message) {
    _setInventoryMovementDrawerText('drawerMovementTypeTitle', 'No disponible');
    _setInventoryMovementDrawerText('drawerMovementType', 'Error');
    _setDetailsBody(`
        <tr>
          <td colspan="8" class="inventory-movement-drawer-state inventory-movement-drawer-state--error">
            ${_escapeInventoryMovementDrawer(message)}
          </td>
        </tr>`);
}

function renderInventoryMovementDrawer(detail) {
    const header = detail.header;
    const details = detail.details ?? [];
    const saleCode = detail.sale?.saleCode || detail.sale?.SaleCode || null;
    const orderCode = detail.sale?.orderCode || detail.sale?.OrderCode || null;
    const relatedDocument = saleCode || orderCode || 'No aplica';

    _setInventoryMovementDrawerText('drawerMovementTypeTitle', _friendly(header.movementTypeName));
    _setInventoryMovementDrawerText('drawerMovementType', _friendly(header.movementTypeName));
    _setInventoryMovementDrawerText('drawerMovementDate', _formatDateTime(header.movementDate));
    _setInventoryMovementDrawerText('drawerInfoMovementType', _friendly(header.movementTypeName));
    _setInventoryMovementDrawerText('drawerSaleCode', saleCode || 'No aplica');
    _setInventoryMovementDrawerText('drawerOrderCode', orderCode || (header.orderId ? 'Sin informacion' : 'No aplica'));
    _setInventoryMovementDrawerText('drawerInfoMovementDate', _formatDateTime(header.movementDate));
    _setInventoryMovementDrawerText('drawerCreatedBy', _friendly(header.createdByUserName));
    _setInventoryMovementDrawerText('drawerNotes', header.notes || 'Sin informacion');
    _setInventoryMovementDrawerText('drawerMetaUser', _friendly(header.createdByUserName));
    _setInventoryMovementDrawerText('drawerMetaDate', _formatDateTime(header.movementDate));
    _setInventoryMovementDrawerText('drawerMetaDocument', relatedDocument);
    _setInventoryMovementDrawerText('drawerMetaDocumentHint', saleCode ? 'Codigo de venta' : (orderCode ? 'Codigo de pedido' : 'Sin documento relacionado'));

    _applyMovementTypeClass(header.movementTypeId);
    _renderDetails(details);
    _refreshInventoryMovementDrawerIcons();
}

function _renderDetails(details) {
    if (!details.length) {
        _setDetailsBody(`
            <tr>
              <td colspan="8" class="inventory-movement-drawer-state">Este movimiento no tiene detalles registrados</td>
            </tr>`);
        _setInventoryMovementDrawerText('drawerDetailsCount', 'Total detalles: 0');
        _setInventoryMovementDrawerText('drawerUnitsCount', 'Total unidades: 0');
        return;
    }

    const totalUnits = details.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    _setInventoryMovementDrawerText('drawerDetailsCount', `Total detalles: ${_formatNumber(details.length)}`);
    _setInventoryMovementDrawerText('drawerUnitsCount', `Total unidades: ${_formatNumber(totalUnits)}`);

    _setDetailsBody(details.map(item => `
        <tr>
          <td>
            <div class="movement-lot-cell">
              <span class="lot-cell">${_escapeInventoryMovementDrawer(item.batchCode || 'Sin informacion')}</span>
              <span class="movement-lot-sub">Lote registrado</span>
            </div>
          </td>
          <td>${_renderLocationBadge(item.sourceLocationName, 'source')}</td>
          <td>${_renderLocationBadge(item.destinationLocationName, 'destination')}</td>
          <td class="quantity-cell">${_formatNumber(item.quantity)}</td>
          <td class="money-cell">${_formatCurrency(item.unitCost)}</td>
          <td class="money-cell">${item.unitPrice === null ? 'No aplica' : _formatCurrency(item.unitPrice)}</td>
          <td>${_escapeInventoryMovementDrawer(_friendly(item.createdByUserName))}</td>
          <td>${_escapeInventoryMovementDrawer(_formatDateTime(item.createdAt))}</td>
        </tr>
    `).join(''));
}

function _renderLocationBadge(value, type) {
    if (!value) return '<span class="location-badge empty">No aplica</span>';
    return `<span class="location-badge ${type}">${_escapeInventoryMovementDrawer(value)}</span>`;
}

function _applyMovementTypeClass(movementTypeId) {
    const statusElement = document.getElementById('drawerMovementType');
    if (!statusElement) return;

    statusElement.classList.remove('is-restock', 'is-transfer', 'is-positive', 'is-negative');
    const id = Number(movementTypeId);
    if (id === 1) statusElement.classList.add('is-restock');
    if (id === 1002) statusElement.classList.add('is-transfer');
    if (id === 1003) statusElement.classList.add('is-positive');
    if (id === 1004) statusElement.classList.add('is-negative');
}

function _setInventoryMovementDrawerText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _setDetailsBody(html) {
    const tbody = document.getElementById('drawerMovementDetailsTableBody');
    if (tbody) tbody.innerHTML = html;
}

function _friendly(value) {
    return value === null || value === undefined || value === '' ? 'Sin informacion' : String(value);
}

function _notApplicable(value) {
    return value === null || value === undefined || value === '' ? 'No aplica' : String(value);
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
    if (!value) return 'Sin informacion';
    return new Intl.DateTimeFormat('es-NI', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function _escapeInventoryMovementDrawer(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function _refreshInventoryMovementDrawerIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
