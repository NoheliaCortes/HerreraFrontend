let productsCache = [];
let selectedProduct = null;
let saleItems = [];
let registeredPayment = null;
let currentTotals = { subtotal: 0, discount: 0, total: 0 };

document.addEventListener('DOMContentLoaded', async () => {
    _setInitialHeaderValues();
    _bindEvents();
    SalePaymentModal.init({ onConfirm: _confirmPayment });
    SaleProductsTable.render(_tableBody(), saleItems, _formatCurrency, _escape);
    await _loadProducts();
    _refreshIcons();
});

function _bindEvents() {
    document.getElementById('saleTypeWholesale')?.addEventListener('change', event => {
        if (!event.target.checked) return;
        _showAlert('La venta al mayoreo aun no esta conectada. Por ahora puedes registrar ventas al detalle.', 'error');
        document.getElementById('saleTypeRetail').checked = true;
    });

    document.getElementById('productSearch')?.addEventListener('input', _handleProductSearch);
    document.getElementById('productSearch')?.addEventListener('blur', () => {
        setTimeout(_closeAutocomplete, 160);
    });
    document.getElementById('btnAddProduct')?.addEventListener('click', _addSelectedProduct);
    document.getElementById('btnOpenPaymentModal')?.addEventListener('click', _openPaymentModal);
    document.getElementById('btnRegisterSale')?.addEventListener('click', _submitRetailSale);
    document.getElementById('btnCancelSale')?.addEventListener('click', _resetForm);
    document.getElementById('paymentAmount')?.addEventListener('input', event => {
        SalePaymentModal.updateChange(currentTotals.total, _parseAmount(event.target.value));
    });
}

function _setInitialHeaderValues() {
    const userName = [
        localStorage.getItem('firstName'),
        localStorage.getItem('lastName'),
    ].filter(Boolean).join(' ') || localStorage.getItem('username') || 'Usuario actual';

    document.getElementById('saleUser').value = userName;
    document.getElementById('saleDate').value = _toLocalDateTimeValue(new Date());
}

async function _loadProducts() {
    _setText('productsLoadState', 'Cargando...');

    try {
        productsCache = await SalesService.getActiveRetailProducts();
        _setText('productsLoadState', `${_formatNumber(productsCache.length)} activos`);
    } catch (error) {
        _setText('productsLoadState', 'Sin cargar');
        _showAlert(_friendlyError(error), 'error');
    }
}

function _handleProductSearch(event) {
    selectedProduct = null;
    const query = event.target.value.trim().toLowerCase();
    const list = document.getElementById('productAutocomplete');

    if (!list) return;
    if (query.length < 2) {
        _closeAutocomplete();
        return;
    }

    const matches = productsCache
        .filter(product => product.productName.toLowerCase().includes(query))
        .slice(0, 8);

    if (!matches.length) {
        list.innerHTML = '<div class="autocomplete-empty">No se encontraron productos</div>';
        list.classList.add('is-open');
        return;
    }

    list.innerHTML = matches.map(product => `
        <button class="autocomplete-option" type="button" data-product-id="${product.productId}">
          ${_escape(product.productName)}
        </button>
    `).join('');

    list.querySelectorAll('[data-product-id]').forEach(button => {
        button.addEventListener('mousedown', () => _selectProduct(Number(button.dataset.productId)));
    });

    list.classList.add('is-open');
}

function _selectProduct(productId) {
    selectedProduct = productsCache.find(product => Number(product.productId) === Number(productId)) || null;
    document.getElementById('productSearch').value = selectedProduct?.productName || '';
    _closeAutocomplete();
}

function _addSelectedProduct() {
    _clearAlert();

    if (!selectedProduct) {
        _showAlert('Selecciona un producto desde el autocomplete antes de agregarlo.', 'error');
        return;
    }

    const quantity = Number(document.getElementById('productQuantity')?.value || 0);
    if (quantity <= 0) {
        _showAlert('La cantidad debe ser mayor que cero.', 'error');
        return;
    }

    if (!selectedProduct.hasValidRetailPrice) {
        _showAlert(`El producto "${selectedProduct.productName}" no tiene precio de detalle valido.`, 'error');
        return;
    }

    const existing = saleItems.find(item => Number(item.productId) === Number(selectedProduct.productId));
    if (existing) {
        existing.quantity += quantity;
        existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
        saleItems.push({
            productId: selectedProduct.productId,
            productName: selectedProduct.productName,
            quantity,
            unitPrice: selectedProduct.retailPrice,
            subtotal: quantity * selectedProduct.retailPrice,
        });
    }

    selectedProduct = null;
    registeredPayment = null;
    document.getElementById('productSearch').value = '';
    document.getElementById('productQuantity').value = '1';
    _renderSale();
}

function _removeProduct(productId) {
    saleItems = saleItems.filter(item => Number(item.productId) !== Number(productId));
    registeredPayment = null;
    _renderSale();
}

function _renderSale() {
    currentTotals = _calculateTotals();
    SaleProductsTable.render(_tableBody(), saleItems, _formatCurrency, _escape);
    SaleProductsTable.bindRemove(_tableBody(), _removeProduct);

    _setText('saleSubtotal', _formatCurrency(currentTotals.subtotal));
    _setText('saleDiscount', _formatCurrency(currentTotals.discount));
    _setText('saleTotal', _formatCurrency(currentTotals.total));
    _renderPaymentState();
    _refreshIcons();
}

function _calculateTotals() {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    return {
        subtotal,
        discount: 0,
        total: subtotal,
    };
}

function _openPaymentModal() {
    const errors = _validateSaleBeforePayment();
    if (errors.length) {
        _showErrors(errors);
        return;
    }

    SalePaymentModal.open({
        total: currentTotals.total,
        payment: registeredPayment,
    });
}

function _confirmPayment(payment) {
    const errors = [];

    if (!payment.amountReceived || Number.isNaN(payment.amountReceived)) {
        errors.push('Ingresa el monto recibido.');
    } else if (payment.amountReceived < currentTotals.total) {
        errors.push('El monto recibido debe ser mayor o igual al total.');
    }

    if (errors.length) {
        SalePaymentModal.showMessage(errors.join(' '));
        return;
    }

    registeredPayment = {
        ...payment,
        change: payment.amountReceived - currentTotals.total,
    };

    SalePaymentModal.close();
    _renderPaymentState();
    _showAlert(`Pago registrado. Cambio: ${_formatCurrency(registeredPayment.change)}.`, 'success');
}

async function _submitRetailSale() {
    const errors = _validateBeforeSubmit();
    if (errors.length) {
        _showErrors(errors);
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        _showAlert('No hay sesion activa. Inicia sesion nuevamente.', 'error');
        return;
    }

    const button = document.getElementById('btnRegisterSale');
    _setButtonLoading(button, true, 'Registrando...');

    try {
        const response = await SalesService.createRetailSale({
            paymentMethodId: registeredPayment.paymentMethodId,
            transactionReference: registeredPayment.transactionReference,
            notes: null,
            items: saleItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
            })),
        });

        _showAlert(`Venta registrada exitosamente. Codigo: ${response.saleCode || 'Sin codigo'}.`, 'success');
        _resetForm({ keepMessage: true });
    } catch (error) {
        _handleSubmitError(error);
    } finally {
        _setButtonLoading(button, false, 'Registrar venta');
        _renderPaymentState();
    }
}

function _validateSaleBeforePayment() {
    const errors = [];

    if (!saleItems.length) errors.push('Debes agregar al menos un producto.');
    saleItems.forEach(item => {
        if (item.quantity <= 0) errors.push(`La cantidad de ${item.productName} debe ser mayor que cero.`);
        if (item.unitPrice <= 0) errors.push(`El producto ${item.productName} no tiene precio valido.`);
    });
    if (currentTotals.total <= 0) errors.push('El total debe ser mayor que cero.');

    return errors;
}

function _validateBeforeSubmit() {
    const errors = _validateSaleBeforePayment();

    if (!registeredPayment) {
        errors.push('Debes registrar el pago antes de registrar la venta.');
    } else if (registeredPayment.amountReceived < currentTotals.total) {
        errors.push('El monto recibido debe ser mayor o igual al total.');
    }

    return errors;
}

function _renderPaymentState() {
    const status = document.querySelector('.payment-status');
    const statusText = document.getElementById('paymentStatusText');
    const registerButton = document.getElementById('btnRegisterSale');

    status?.classList.toggle('is-paid', Boolean(registeredPayment));
    if (registeredPayment) {
        statusText.textContent = `${registeredPayment.paymentMethodName} registrado (${_formatCurrency(registeredPayment.amountReceived)})`;
        registerButton.disabled = false;
        registerButton.classList.remove('btn-disabled');
        registerButton.classList.add('btn-primary');
    } else {
        statusText.textContent = 'Pendiente de registrar';
        registerButton.disabled = true;
        registerButton.classList.add('btn-disabled');
        registerButton.classList.remove('btn-primary');
    }
}

function _handleSubmitError(error) {
    const message = error?.message || 'Error inesperado';

    if (message.includes('401')) {
        _showAlert('Sesion expirada. Te redirigiremos al login.', 'error');
        setTimeout(() => {
            window.location.href = '/modules/login/login.html';
        }, 1200);
        return;
    }

    if (message.includes('500') && message.startsWith('Error HTTP')) {
        _showAlert('Ocurrio un error inesperado al registrar la venta. Intenta nuevamente.', 'error');
        return;
    }

    _showErrors(_splitErrorMessage(message));
}

function _friendlyError(error) {
    const message = error?.message || 'Error inesperado';
    if (message.includes('401')) return 'Sesion expirada. Inicia sesion nuevamente.';
    if (message.includes('500') && message.startsWith('Error HTTP')) {
        return 'Ocurrio un error inesperado. Intenta nuevamente.';
    }
    return message;
}

function _splitErrorMessage(message) {
    return String(message || '')
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
}

function _showErrors(errors) {
    if (!errors.length) return;
    _showAlert(`<strong>Revisa lo siguiente:</strong><ul>${errors.map(error => `<li>${_escape(error)}</li>`).join('')}</ul>`, 'error', true);
}

function _showAlert(message, type = 'error', isHtml = false) {
    const alert = document.getElementById('saleAlert');
    if (!alert) return;

    alert.className = `sale-alert is-visible is-${type}`;
    if (isHtml) {
        alert.innerHTML = message;
    } else {
        alert.textContent = message;
    }
}

function _clearAlert() {
    const alert = document.getElementById('saleAlert');
    if (!alert) return;
    alert.className = 'sale-alert';
    alert.textContent = '';
}

function _resetForm({ keepMessage = false } = {}) {
    saleItems = [];
    selectedProduct = null;
    registeredPayment = null;
    document.getElementById('productSearch').value = '';
    document.getElementById('productQuantity').value = '1';
    document.getElementById('saleDate').value = _toLocalDateTimeValue(new Date());
    if (!keepMessage) _clearAlert();
    _renderSale();
}

function _closeAutocomplete() {
    document.getElementById('productAutocomplete')?.classList.remove('is-open');
}

function _tableBody() {
    return document.getElementById('saleProductsTableBody');
}

function _parseAmount(value) {
    const normalized = String(value || '')
        .replaceAll('C$', '')
        .replaceAll(',', '')
        .trim();
    return Number(normalized);
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

function _toLocalDateTimeValue(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
}

function _setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function _setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? text
        : `<i data-lucide="check-circle" style="width: 18px; height: 18px"></i>${text}`;
    _refreshIcons();
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
