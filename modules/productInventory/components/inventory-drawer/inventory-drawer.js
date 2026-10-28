/**
 * Componente drawer de detalle de inventario.
 */

let _drawerProduct = null;
let _drawerBatches = null;
let _selectedBatchId = null;
let _selectedBatchDetail = null;
let _selectedDetailTab = 'stock';

const INVENTORY_API_ORIGIN = 'https://localhost:7035';
const INVENTORY_PRODUCT_IMAGE_FALLBACK = '../../assets/img/logo.jpg';

function initInventoryDrawer() {
    const placeholder = document.getElementById('inventory-drawer-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = _getDrawerTemplate();

    document.getElementById('inventoryDrawerOverlay')?.addEventListener('click', closeInventoryDrawer);
    document.getElementById('inventoryDrawerCloseBtn')?.addEventListener('click', closeInventoryDrawer);
    document.getElementById('inventoryDrawerCloseFooterBtn')?.addEventListener('click', closeInventoryDrawer);
    document.getElementById('inventoryMovementsBtn')?.addEventListener('click', _requestMovements);
}

async function openInventoryDrawer(product) {
    _drawerProduct = product;
    _drawerBatches = null;
    _selectedBatchId = null;
    _selectedBatchDetail = null;
    _selectedDetailTab = 'stock';

    document.getElementById('inventoryDrawerOverlay')?.classList.add('active');
    document.getElementById('inventoryDrawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';

    _renderProductSummary();
    _renderBatchesLoading();
    _renderBatchDetailEmpty();
    _refreshIcons();

    try {
        _drawerBatches = await InventoryService.getProductBatches(product.productId);
        _renderProductSummary();
        _renderBatches();
    } catch (error) {
        _renderBatchesError(error.message);
    } finally {
        _refreshIcons();
    }
}

function closeInventoryDrawer() {
    document.getElementById('inventoryDrawerOverlay')?.classList.remove('active');
    document.getElementById('inventoryDrawer')?.classList.remove('active');
    document.body.style.overflow = '';
}

function _renderProductSummary() {
    if (!_drawerProduct) return;

    const activeBatchCount = _drawerBatches?.activeBatchCount ?? 0;
    const availableForSale = _drawerProduct.availableForSale ?? (_drawerProduct.displayStock + _drawerProduct.warehouseStock);

    document.getElementById('drawerProductName').textContent = _drawerProduct.productName || 'Producto';
    document.getElementById('drawerProductSubtitle').textContent = [
        _drawerProduct.lineName,
        _drawerProduct.presentationName,
        _drawerProduct.flavorName,
    ].filter(Boolean).join(' / ');
    _setProductImage('drawerProductImage', _drawerProduct.imageUrl, _drawerProduct.productName, _drawerProduct.flavorName);

    _setText('drawerProductLine', _drawerProduct.lineName || '-');
    _setText('drawerProductPresentation', _drawerProduct.presentationName || '-');
    _setText('drawerProductFlavor', _drawerProduct.flavorName || '-');
    _setText('drawerProductBatchCount', activeBatchCount);
    _setText('drawerStockDisplay', _formatNumber(_drawerProduct.displayStock));
    _setText('drawerStockWarehouse', _formatNumber(_drawerProduct.warehouseStock));
    _setText('drawerStockReserved', _formatNumber(_drawerProduct.reservedStock));
    _setText('drawerStockTotal', _formatNumber(_drawerProduct.totalStock));
    _setText('drawerStockAvailable', _formatNumber(availableForSale));
}

function _renderBatchesLoading() {
    const body = document.getElementById('inventoryLotsBody');
    if (!body) return;

    body.innerHTML = `
        <tr>
          <td colspan="6" class="drawer-table-state">Cargando lotes del producto...</td>
        </tr>`;
    _setText('drawerLotsTitleCount', '-');
}

function _renderBatchesError(message) {
    const body = document.getElementById('inventoryLotsBody');
    if (!body) return;

    body.innerHTML = `
        <tr>
          <td colspan="6" class="drawer-table-state drawer-table-state--error">
            Error al cargar lotes: ${_escape(message)}
          </td>
        </tr>`;
    _setText('drawerLotsTitleCount', '0');
}

function _renderBatches() {
    const body = document.getElementById('inventoryLotsBody');
    if (!body) return;

    const batches = _drawerBatches?.batches ?? [];
    _setText('drawerLotsTitleCount', _drawerBatches?.activeBatchCount ?? batches.length);

    if (!batches.length) {
        body.innerHTML = `
            <tr>
              <td colspan="6" class="drawer-table-state">
                Este producto no tiene lotes disponibles por ahora.
              </td>
            </tr>`;
        return;
    }

    body.innerHTML = batches.map(batch => `
        <tr class="${Number(batch.batchId) === Number(_selectedBatchId) ? 'selected' : ''}">
          <td>
            <div class="inv-lot-code">${_escape(batch.batchCode || `Lote ${batch.batchId}`)}</div>
          </td>
          <td class="inv-lot-cell-num" style="text-align:center;">${_formatNumber(batch.stockDisplay)}</td>
          <td class="inv-lot-cell-num" style="text-align:center;">${_formatNumber(batch.stockWarehouse)}</td>
          <td class="inv-lot-cell-num" style="text-align:center;">${_formatNumber(batch.stockReserved)}</td>
          <td class="inv-lot-cell-num" style="text-align:center;font-weight:700;">${_formatNumber(batch.totalCurrentStock)}</td>
          <td><button class="inv-lot-view-btn" data-batch-id="${batch.batchId}" title="Ver detalle"><i data-lucide="eye"></i></button></td>
        </tr>
    `).join('');

    body.querySelectorAll('.inv-lot-view-btn[data-batch-id]').forEach(button => {
        button.addEventListener('click', () => _loadBatchDetail(Number(button.dataset.batchId)));
    });
}

function _renderBatchDetailEmpty() {
    const container = document.getElementById('selectedBatchDetail');
    if (!container) return;

    container.innerHTML = `
        <div class="drawer-empty-detail">
          <i data-lucide="box"></i>
          <span>Selecciona un lote para ver su detalle completo.</span>
        </div>`;
}

function _renderBatchDetailLoading() {
    const container = document.getElementById('selectedBatchDetail');
    if (!container) return;
    container.innerHTML = '<div class="drawer-empty-detail">Cargando detalle del lote...</div>';
}

function _renderBatchDetailError(message) {
    const container = document.getElementById('selectedBatchDetail');
    if (!container) return;
    container.innerHTML = `<div class="drawer-empty-detail drawer-table-state--error">Error al cargar detalle: ${_escape(message)}</div>`;
}

async function _loadBatchDetail(batchId) {
    _selectedBatchId = batchId;
    _selectedBatchDetail = null;
    _selectedDetailTab = 'stock';
    _renderBatches();
    _renderBatchDetailLoading();
    _refreshIcons();

    try {
        _selectedBatchDetail = await InventoryService.getBatchDetail(batchId);
        _renderBatchDetail();
    } catch (error) {
        _renderBatchDetailError(error.message);
    } finally {
        _refreshIcons();
    }
}

function _renderBatchDetail() {
    const container = document.getElementById('selectedBatchDetail');
    if (!container) return;
    if (!_selectedBatchDetail) {
        _renderBatchDetailEmpty();
        return;
    }

    container.innerHTML = `
        <div class="inv-selected-lot-header">
          <div>
            <span class="inv-selected-lot-code">${_escape(_selectedBatchDetail.batchCode || `Lote ${_selectedBatchDetail.batchId}`)}</span>
            <span class="inv-lot-status" style="margin-left: 8px;">
              <span class="status-dot"></span>
              ${_escape(_selectedBatchDetail.batchStatusName || 'Activo')}
            </span>
          </div>
          <span class="inv-selected-lot-date">Ingreso: ${_formatDate(_selectedBatchDetail.entryDate)}</span>
        </div>

        <div class="inv-tabs" role="tablist">
          ${_tabButton('stock', 'Stock')}
          ${_tabButton('costs', 'Costos')}
          ${_tabButton('info', 'Informacion adicional')}
        </div>

        <div id="selectedBatchTabPanel">
          ${_renderBatchDetailTab()}
        </div>`;

    container.querySelectorAll('.inv-tab[data-tab]').forEach(button => {
        button.addEventListener('click', () => {
            _selectedDetailTab = button.dataset.tab;
            _renderBatchDetail();
            _refreshIcons();
        });
    });
}

function _tabButton(tab, label) {
    return `
        <button class="inv-tab ${_selectedDetailTab === tab ? 'active' : ''}" type="button" data-tab="${tab}" role="tab" aria-selected="${_selectedDetailTab === tab}">
          ${_escape(label)}
        </button>`;
}

function _renderBatchDetailTab() {
    const detail = _selectedBatchDetail;
    if (!detail) return '';

    if (_selectedDetailTab === 'costs') {
        return `
            <div class="inv-stock-grid inv-stock-grid--compact">
              ${_detailItem('Costo unitario de produccion', _formatCurrency(detail.unitProductionCost))}
              ${_detailItem('Costo total estimado', _formatCurrency(detail.estimatedTotalCost))}
            </div>`;
    }

    if (_selectedDetailTab === 'info') {
        return `
            <div class="inv-stock-grid inv-stock-grid--compact">
              ${_detailItem('Fecha de ingreso', _formatDate(detail.entryDate))}
              ${_detailItem('Fecha de vencimiento', _formatDate(detail.expirationDate))}
            </div>`;
    }

    return `
        <div class="inv-stock-grid">
          ${_detailItem('Cantidad inicial', detail.initialQuantity)}
          ${_detailItem('Vendido al detalle', detail.soldDetail)}
          ${_detailItem('Vendido al mayoreo', detail.soldWholesale)}
          ${_detailItem('Vendido total', detail.totalSold)}
          ${_detailItem('Disponible en mostrador', detail.stockDisplay, 'var(--color-brand)')}
          ${_detailItem('Disponible en bodega', detail.stockWarehouse, '#4A90D9')}
          ${_detailItem('Reservado', detail.stockReserved, '#FA897B')}
          ${_detailItem('Disponible para venta', detail.availableForSale)}
        </div>`;
}

function _detailItem(label, value, color = '') {
    const style = color ? ` style="color:${color};"` : '';
    return `
        <div class="inv-stock-item">
          <span class="inv-stock-label">${_escape(label)}</span>
          <span class="inv-stock-value"${style}>${_escape(value)}</span>
        </div>`;
}

function _setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _setProductImage(id, imageUrl, productName, flavorName) {
    const element = document.getElementById(id);
    if (!element) return;

    const resolvedUrl = _resolveProductImageUrl(imageUrl);
    element.innerHTML = `
        <img src="${_escape(resolvedUrl)}" alt="${_escape(productName || 'Producto')}" onerror="this.remove();this.parentElement.textContent='${_escape(_getFlavorInitial(flavorName))}'" />`;
}

function _resolveProductImageUrl(imageUrl) {
    if (!imageUrl) return INVENTORY_PRODUCT_IMAGE_FALLBACK;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return `${INVENTORY_API_ORIGIN}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

function _getFlavorInitial(flavorName) {
    return String(flavorName || 'P').trim().charAt(0).toUpperCase() || 'P';
}

function _requestMovements() {
    document.dispatchEvent(new CustomEvent('inventory:movements-requested', {
        detail: {
            product: _drawerProduct,
            batchId: _selectedBatchId,
        },
    }));
}

function _formatNumber(value) {
    return new Intl.NumberFormat('es-NI').format(Number(value ?? 0));
}

function _formatCurrency(value) {
    return `${new Intl.NumberFormat('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))} C$`;
}

function _formatDate(value) {
    if (!value) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        const [year, month, day] = String(value).split('-');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-NI').format(date);
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

function _getDrawerTemplate() {
    return `
        <div class="inventory-drawer-overlay" id="inventoryDrawerOverlay"></div>
        <div class="inventory-drawer" id="inventoryDrawer">
          <div class="inventory-drawer-header">
            <div class="inventory-drawer-header-top">
              <div class="inventory-drawer-title">
                <i data-lucide="package"></i>
                Detalle del inventario
              </div>
              <button class="inventory-drawer-close" id="inventoryDrawerCloseBtn" type="button">
                <i data-lucide="x"></i>
              </button>
            </div>

            <div class="inv-product-header">
              <div class="inv-product-image" id="drawerProductImage"></div>
              <div class="inv-product-info">
                <div class="inv-product-name" id="drawerProductName">Producto</div>
                <div class="inv-product-sku" id="drawerProductSubtitle">-</div>
              </div>
            </div>
          </div>

          <div class="inventory-drawer-body">
            <div class="inv-overview-container">
              <div class="inv-product-meta">
                <div class="inv-meta-item">
                  <span class="inv-meta-label">Linea</span>
                  <span class="inv-meta-value" id="drawerProductLine">-</span>
                </div>
                <div class="inv-meta-item">
                  <span class="inv-meta-label">Presentacion</span>
                  <span class="inv-meta-value" id="drawerProductPresentation">-</span>
                </div>
                <div class="inv-meta-item">
                  <span class="inv-meta-label">Sabor</span>
                  <span class="inv-meta-value" id="drawerProductFlavor">-</span>
                </div>
                <div class="inv-meta-item">
                  <span class="inv-meta-label">Lotes disponibles</span>
                  <span class="inv-meta-value" id="drawerProductBatchCount">0</span>
                </div>
              </div>

              <div class="inv-summary-grid">
                <div class="inv-summary-card show">
                  <div class="inv-summary-icon"><i data-lucide="store"></i></div>
                  <div class="inv-summary-info">
                    <span class="inv-summary-label">Mostrador</span>
                    <span class="inv-summary-value" id="drawerStockDisplay">0</span>
                  </div>
                </div>
                <div class="inv-summary-card warehouse">
                  <div class="inv-summary-icon"><i data-lucide="warehouse"></i></div>
                  <div class="inv-summary-info">
                    <span class="inv-summary-label">Bodega</span>
                    <span class="inv-summary-value" id="drawerStockWarehouse">0</span>
                  </div>
                </div>
                <div class="inv-summary-card reserved">
                  <div class="inv-summary-icon"><i data-lucide="alert-circle"></i></div>
                  <div class="inv-summary-info">
                    <span class="inv-summary-label">Reservado</span>
                    <span class="inv-summary-value" id="drawerStockReserved">0</span>
                  </div>
                </div>
                <div class="inv-summary-card total">
                  <div class="inv-summary-icon"><i data-lucide="layers"></i></div>
                  <div class="inv-summary-info">
                    <span class="inv-summary-label">Total</span>
                    <span class="inv-summary-value" id="drawerStockTotal">0</span>
                  </div>
                </div>
                <div class="inv-summary-card total">
                  <div class="inv-summary-icon"><i data-lucide="shopping-cart"></i></div>
                  <div class="inv-summary-info">
                    <span class="inv-summary-label">Disponible venta</span>
                    <span class="inv-summary-value" id="drawerStockAvailable">0</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-title">
                <i data-lucide="list"></i>
                Lotes disponibles (<span id="drawerLotsTitleCount">0</span>)
              </div>
              <div class="drawer-table-scroll">
                <table class="inv-lots-table">
                  <thead>
                    <tr>
                      <th>Codigo de lote</th>
                      <th style="text-align:center;">Mostrador</th>
                      <th style="text-align:center;">Bodega</th>
                      <th style="text-align:center;">Reservado</th>
                      <th style="text-align:center;">Total</th>
                      <th style="width:40px;"></th>
                    </tr>
                  </thead>
                  <tbody id="inventoryLotsBody"></tbody>
                </table>
              </div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-title">
                <i data-lucide="box"></i>
                Detalle del lote seleccionado
              </div>
              <div id="selectedBatchDetail"></div>
            </div>
          </div>

          <div class="inventory-drawer-footer">
            <button class="drawer-btn drawer-btn-secondary" id="inventoryDrawerCloseFooterBtn" type="button">Cerrar</button>
            <div class="drawer-btn-spacer"></div>
            <button class="drawer-btn drawer-btn-primary" id="inventoryMovementsBtn" type="button">
              <i data-lucide="list"></i> Ver movimientos
            </button>
          </div>
        </div>`;
}
