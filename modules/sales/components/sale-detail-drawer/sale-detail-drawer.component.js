const SALE_DRAWER_TEMPLATE_SRC = '/modules/sales/components/sale-detail-drawer/sale-detail-drawer.component.html';

async function initSaleDetailDrawer() {
    const placeholder = document.getElementById('sale-detail-drawer-placeholder');
    if (placeholder && !document.getElementById('saleDrawer')) {
        const response = await fetch(SALE_DRAWER_TEMPLATE_SRC);
        if (!response.ok) throw new Error('No se pudo cargar el drawer de ventas');
        placeholder.innerHTML = await response.text();
    }

    document.getElementById('saleDrawerOverlay')?.addEventListener('click', closeSaleDrawer);
    document.getElementById('saleDrawerCloseBtn')?.addEventListener('click', closeSaleDrawer);
    document.getElementById('saleDrawerFooterCloseBtn')?.addEventListener('click', closeSaleDrawer);
}

function openSaleDrawer() {
    document.getElementById('saleDrawerOverlay')?.classList.add('active');
    document.getElementById('saleDrawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    _refreshSaleDrawerIcons();
}

function closeSaleDrawer() {
    document.getElementById('saleDrawerOverlay')?.classList.remove('active');
    document.getElementById('saleDrawer')?.classList.remove('active');
    document.body.style.overflow = '';
}

function renderSaleDrawerLoading() {
    _setSaleDrawerText('drawerSaleCode', 'Cargando...');
    _setSaleDrawerText('drawerSaleTotal', '-');
    _setSaleDrawerText('drawerPaymentStatus', 'Cargando');
    _setSaleDrawerText('drawerInfoSaleCode', '-');
    _setSaleDrawerText('drawerOrderCode', '-');
    _setSaleDrawerText('drawerSaleDate', '-');
    _setSaleDrawerText('drawerPaymentType', '-');
    _setSaleDrawerText('drawerCreatedBy', '-');
    _setSaleDrawerText('drawerPendingBalance', '-');
    _setSaleDrawerText('drawerCustomerName', '-');
    _setSaleDrawerText('drawerCustomerLocation', '-');
    _setSaleDrawerText('drawerPointOfSale', '-');
    _setSaleDrawerText('drawerSaleType', '-');
    _setSaleDrawerText('drawerPaymentStatusText', '-');
    _setSaleDrawerText('drawerProductsCount', 'Total productos: 0');
    _setSaleDrawerText('drawerUnitsCount', 'Total unidades: 0');
    _setSaleDrawerText('drawerProductsSubtotal', 'Subtotal: C$0.00');

    _setProductsBody(`
        <tr>
          <td colspan="5" class="sale-drawer-state">Cargando productos...</td>
        </tr>`);
    _setPaymentsList('<div class="sale-drawer-state">Cargando pagos...</div>');
}

function renderSaleDrawerError(message) {
    _setSaleDrawerText('drawerSaleCode', 'No disponible');
    _setSaleDrawerText('drawerPaymentStatus', 'Error');
    _setSaleDrawerText('drawerSaleTotal', '-');
    _setProductsBody(`
        <tr>
          <td colspan="5" class="sale-drawer-state sale-drawer-state--error">
            ${_escapeSaleDrawer(message)}
          </td>
        </tr>`);
    _setPaymentsList(`<div class="sale-drawer-state sale-drawer-state--error">${_escapeSaleDrawer(message)}</div>`);
}

function renderSaleDrawer(detail) {
    const header = detail.header;
    const details = detail.details ?? [];
    const payments = detail.payments ?? [];
    const paymentStatus = _friendly(header.paymentStatusName);
    const pendingBalance = header.pendingBalance === null ? 'No aplica' : _formatCurrency(header.pendingBalance);
    const location = [header.customer.departmentName, header.customer.municipalityName]
        .filter(Boolean)
        .join(', ');

    _setSaleDrawerText('drawerSaleCode', _friendly(header.saleCode));
    _setSaleDrawerText('drawerSaleTotal', _formatCurrency(header.total));
    _setSaleDrawerText('drawerPaymentStatus', paymentStatus);
    _setSaleDrawerText('drawerInfoSaleCode', _friendly(header.saleCode));
    _setSaleDrawerText('drawerOrderCode', header.orderCode || 'No aplica');
    _setSaleDrawerText('drawerSaleDate', _formatDateTime(header.saleDate));
    _setSaleDrawerText('drawerPaymentType', _friendly(header.paymentTypeName));
    _setSaleDrawerText('drawerCreatedBy', _friendly(header.createdByUserName));
    _setSaleDrawerText('drawerPendingBalance', pendingBalance);
    _setSaleDrawerText('drawerCustomerName', _friendly(header.customer.fullName));
    _setSaleDrawerText('drawerCustomerLocation', location || 'Sin informacion');
    _setSaleDrawerText('drawerPointOfSale', header.customer.pointOfSale || 'Sin informacion');
    _setSaleDrawerText('drawerSaleType', _friendly(header.saleTypeName));
    _setSaleDrawerText('drawerPaymentStatusText', `Estado de pago: ${paymentStatus}`);

    _applyPaymentStatusClass(paymentStatus);
    _renderProducts(details);
    _renderPayments(payments);
    _refreshSaleDrawerIcons();
}

function _renderProducts(details) {
    if (!details.length) {
        _setProductsBody(`
            <tr>
              <td colspan="5" class="sale-drawer-state">Esta venta no tiene productos registrados</td>
            </tr>`);
        return;
    }

    const totalUnits = details.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = details.reduce((sum, item) => sum + item.lineSubtotal, 0);

    _setSaleDrawerText('drawerProductsCount', `Total productos: ${_formatNumber(details.length)}`);
    _setSaleDrawerText('drawerUnitsCount', `Total unidades: ${_formatNumber(totalUnits)}`);
    _setSaleDrawerText('drawerProductsSubtotal', `Subtotal: ${_formatCurrency(subtotal)}`);

    _setProductsBody(details.map(item => `
        <tr>
          <td>
            <div class="product-cell">
              <div class="product-thumb"><i data-lucide="package"></i></div>
              <div>
                <div class="product-name">${_escapeSaleDrawer(_friendly(item.productName))}</div>
                <div class="product-sku">Producto ${_escapeSaleDrawer(item.productId ?? 'Sin informacion')}</div>
              </div>
            </div>
          </td>
          <td class="quantity-cell">${_formatNumber(item.quantity)}</td>
          <td class="price-cell">${_formatCurrency(item.unitPrice)}</td>
          <td class="price-total-cell">${_formatCurrency(item.lineSubtotal)}</td>
          <td><span class="lot-cell">${_escapeSaleDrawer(item.batchCode || 'No aplica')}</span></td>
        </tr>
    `).join(''));
}

function _renderPayments(payments) {
    if (!payments.length) {
        _setPaymentsList('<div class="sale-drawer-state">Sin pagos registrados</div>');
        return;
    }

    _setPaymentsList(payments.map(payment => `
        <div class="payment-card">
          <div class="payment-header">
            <div class="payment-method">
              <i data-lucide="banknote"></i>
              <span class="payment-method-name">${_escapeSaleDrawer(_friendly(payment.paymentMethodName))}</span>
            </div>
            <span class="payment-amount">${_formatCurrency(payment.amount)}</span>
          </div>
          <div class="payment-details">
            <div class="payment-detail">
              <span class="payment-detail-label">Fecha del pago</span>
              <span class="payment-detail-value">${_escapeSaleDrawer(_formatDateTime(payment.paymentDate))}</span>
            </div>
            <div class="payment-detail">
              <span class="payment-detail-label">Referencia</span>
              <span class="payment-detail-value">${_escapeSaleDrawer(payment.transactionReference || 'No aplica')}</span>
            </div>
            <div class="payment-detail">
              <span class="payment-detail-label">Registrado por</span>
              <span class="payment-detail-value">${_escapeSaleDrawer(_friendly(payment.registeredByUserName))}</span>
            </div>
          </div>
        </div>
    `).join(''));
}

function _applyPaymentStatusClass(status) {
    const statusElement = document.getElementById('drawerPaymentStatus');
    if (!statusElement) return;

    const normalized = String(status || '').toLowerCase();
    statusElement.classList.toggle('is-pending', normalized.includes('pendiente'));
    statusElement.classList.toggle('is-empty', normalized.includes('sin informacion'));
}

function _setSaleDrawerText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _setProductsBody(html) {
    const tbody = document.getElementById('drawerProductsTableBody');
    if (tbody) tbody.innerHTML = html;
}

function _setPaymentsList(html) {
    const container = document.getElementById('drawerPaymentsList');
    if (container) container.innerHTML = html;
}

function _friendly(value) {
    return value === null || value === undefined || value === '' ? 'Sin informacion' : String(value);
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

function _escapeSaleDrawer(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function _refreshSaleDrawerIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
