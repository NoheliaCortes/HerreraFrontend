const INVENTORY_MOVEMENT_FORM_MODAL_TEMPLATE_SRC = '/modules/inventory-movements/components/inventory-movement-form-modal/inventory-movement-form-modal.component.html';

const InventoryMovementFormModal = (() => {
    const MOVEMENT_CONFIG = {
        transfer: {
            title: 'Registrar transferencia',
            subtitle: 'Mueve unidades de un lote entre ubicaciones.',
            eyebrow: 'Transferencia',
            submitLabel: 'Registrar transferencia',
            icon: 'arrow-left-right',
        },
        positive: {
            title: 'Registrar ajuste positivo',
            subtitle: 'Aumenta el stock de un lote en una ubicacion.',
            eyebrow: 'Ajuste positivo',
            submitLabel: 'Registrar ajuste positivo',
            icon: 'plus-circle',
        },
        negative: {
            title: 'Registrar ajuste negativo',
            subtitle: 'Disminuye el stock de un lote en una ubicacion.',
            eyebrow: 'Ajuste negativo',
            submitLabel: 'Registrar ajuste negativo',
            icon: 'minus-circle',
        },
    };

    const LOCATIONS = [
        { id: 1, name: 'Bodega' },
        { id: 2, name: 'Mostrador' },
        { id: 3, name: 'Reservado' },
    ];

    let _movementType = 'transfer';
    let _products = [];
    let _batches = [];
    let _selectedBatchDetail = null;
    let _onSaved = null;
    let _saving = false;

    async function init({ onSaved } = {}) {
        _onSaved = onSaved;
        const placeholder = document.getElementById('inventory-movement-form-modal-placeholder');
        if (placeholder && !document.getElementById('inventoryMovementModalPreview')) {
            const response = await fetch(INVENTORY_MOVEMENT_FORM_MODAL_TEMPLATE_SRC);
            if (!response.ok) throw new Error('No se pudo cargar el modal de movimientos');
            placeholder.innerHTML = await response.text();
        }

        _bindEvents();
        _fillLocationSelects();
    }

    function _bindEvents() {
        document.getElementById('inventoryMovementModalPreview')?.addEventListener('click', event => {
            if (event.target?.id === 'inventoryMovementModalPreview') close();
        });
        document.getElementById('movementModalCloseBtn')?.addEventListener('click', close);
        document.getElementById('movementModalCancelBtn')?.addEventListener('click', close);
        document.getElementById('inventoryMovementForm')?.addEventListener('submit', _handleSubmit);
        document.getElementById('movementProduct')?.addEventListener('change', _handleProductChange);
        document.getElementById('movementBatch')?.addEventListener('change', _handleBatchChange);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') close();
        });
    }

    async function open(type) {
        _movementType = type || 'transfer';
        _resetForm();
        _applyConfig();
        document.getElementById('inventoryMovementModalPreview')?.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        await _ensureProductsLoaded();
        _refreshIcons();
    }

    function close() {
        document.getElementById('inventoryMovementModalPreview')?.classList.remove('is-open');
        document.body.style.overflow = '';
        _setSaving(false);
    }

    async function _ensureProductsLoaded() {
        if (_products.length) {
            _fillProducts();
            return;
        }

        _setSelectOptions('movementProduct', [], 'Cargando productos...', true);

        try {
            _products = await InventoryMovementsService.getAllInventoryProducts();
            _fillProducts();
        } catch (error) {
            _setSelectOptions('movementProduct', [], 'No se pudieron cargar productos', true);
            _showMessage(_friendlyError(error), 'error');
        }
    }

    function _fillProducts() {
        const options = _products
            .filter(product => Number(product.totalStock) > 0)
            .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), 'es'))
            .map(product => ({ value: product.productId, label: product.displayName }));

        _setSelectOptions(
            'movementProduct',
            options,
            options.length ? 'Selecciona un producto' : 'No hay productos con stock',
            options.length === 0
        );
    }

    async function _handleProductChange(event) {
        const productId = Number(event.target.value);
        _batches = [];
        _selectedBatchDetail = null;
        _resetBatchSummary();

        if (!productId) {
            _setSelectOptions('movementBatch', [], 'Selecciona un producto primero', true);
            return;
        }

        _setSelectOptions('movementBatch', [], 'Cargando lotes...', true);

        try {
            _batches = await InventoryMovementsService.getProductBatches(productId);
            const options = _batches
                .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), 'es'))
                .map(batch => ({
                    value: batch.batchId,
                    label: `${batch.displayName} - Stock total: ${_formatNumber(batch.totalCurrentStock)}`,
                }));

            _setSelectOptions(
                'movementBatch',
                options,
                options.length ? 'Selecciona un lote' : 'No hay lotes disponibles para este producto',
                options.length === 0
            );
        } catch (error) {
            _setSelectOptions('movementBatch', [], 'No se pudieron cargar lotes', true);
            _showMessage(_friendlyError(error), 'error');
        }
    }

    async function _handleBatchChange(event) {
        const batchId = Number(event.target.value);
        _selectedBatchDetail = null;
        _resetBatchSummary();

        if (!batchId) return;

        try {
            _selectedBatchDetail = await InventoryMovementsService.getBatchDetail(batchId);
            _renderBatchSummary(_selectedBatchDetail);
        } catch (error) {
            _showMessage(_friendlyError(error), 'error');
        }
    }

    async function _handleSubmit(event) {
        event.preventDefault();
        if (_saving) return;
        _clearMessage();

        const formData = _readForm();
        const error = _validate(formData);
        if (error) {
            _showMessage(error, 'error');
            return;
        }

        _setSaving(true);

        try {
            let response = null;
            if (_movementType === 'transfer') response = await InventoryMovementsService.createTransfer(formData);
            if (_movementType === 'positive') response = await InventoryMovementsService.createPositiveAdjustment(formData);
            if (_movementType === 'negative') response = await InventoryMovementsService.createNegativeAdjustment(formData);

            close();
            _resetForm();
            _products = [];
            _onSaved?.({
                type: _movementType,
                response,
                message: `${MOVEMENT_CONFIG[_movementType].eyebrow} registrado correctamente.`,
            });
        } catch (error) {
            _showMessage(_friendlyError(error), 'error');
        } finally {
            _setSaving(false);
        }
    }

    function _readForm() {
        const sourceLocationId = Number(document.getElementById('movementSourceLocation')?.value);
        const destinationLocationId = Number(document.getElementById('movementDestinationLocation')?.value);
        const locationId = Number(document.getElementById('movementLocation')?.value);

        return {
            batchId: Number(document.getElementById('movementBatch')?.value),
            sourceLocationId,
            destinationLocationId,
            locationId,
            quantity: Number(document.getElementById('movementQuantity')?.value),
            notes: document.getElementById('movementNotes')?.value || '',
        };
    }

    function _validate(formData) {
        if (!formData.batchId) return 'Selecciona un lote.';
        if (!Number.isFinite(formData.quantity) || formData.quantity <= 0) return 'La cantidad debe ser mayor que cero.';

        if (_movementType === 'transfer') {
            if (!formData.sourceLocationId) return 'Selecciona la ubicacion origen.';
            if (!formData.destinationLocationId) return 'Selecciona la ubicacion destino.';
            if (formData.sourceLocationId === formData.destinationLocationId) return 'La ubicacion origen y destino no pueden ser iguales.';
            return null;
        }

        if (!formData.locationId) return _movementType === 'positive'
            ? 'Selecciona la ubicacion destino o afectada.'
            : 'Selecciona la ubicacion origen o afectada.';

        return null;
    }

    function _applyConfig() {
        const config = MOVEMENT_CONFIG[_movementType];
        const isTransfer = _movementType === 'transfer';
        const isPositive = _movementType === 'positive';

        _setText('movementModalEyebrow', config.eyebrow);
        _setText('movementModalTitle', config.title);
        _setText('movementModalSubtitle', config.subtitle);
        document.getElementById('movementSourceField').hidden = !isTransfer;
        document.getElementById('movementDestinationField').hidden = !isTransfer;
        document.getElementById('movementLocationField').hidden = isTransfer;
        _setText('movementLocationLabel', isPositive ? 'Ubicacion destino' : 'Ubicacion origen');

        const submit = document.getElementById('movementModalSubmitBtn');
        if (submit) {
            submit.innerHTML = `<i data-lucide="${config.icon}"></i> ${config.submitLabel}`;
        }
    }

    function _resetForm() {
        document.getElementById('inventoryMovementForm')?.reset();
        _batches = [];
        _selectedBatchDetail = null;
        _clearMessage();
        _resetBatchSummary();
        _setSelectOptions('movementBatch', [], 'Selecciona un producto primero', true);
        _fillLocationSelects();
    }

    function _fillLocationSelects() {
        const options = LOCATIONS.map(location => ({ value: location.id, label: location.name }));
        _setSelectOptions('movementSourceLocation', options, 'Selecciona origen');
        _setSelectOptions('movementDestinationLocation', options, 'Selecciona destino');
        _setSelectOptions('movementLocation', options, 'Selecciona ubicacion');
    }

    function _renderBatchSummary(batch) {
        document.getElementById('movementBatchSummary').hidden = false;
        _setText('movementStockWarehouse', _formatNumber(batch.stockWarehouse));
        _setText('movementStockDisplay', _formatNumber(batch.stockDisplay));
        _setText('movementStockReserved', _formatNumber(batch.stockReserved));
        _setText('movementStockTotal', _formatNumber(batch.totalCurrentStock));
    }

    function _resetBatchSummary() {
        document.getElementById('movementBatchSummary').hidden = true;
        _setText('movementStockWarehouse', '0');
        _setText('movementStockDisplay', '0');
        _setText('movementStockReserved', '0');
        _setText('movementStockTotal', '0');
    }

    function _setSelectOptions(id, options, placeholder, disabled = false) {
        const select = document.getElementById(id);
        if (!select) return;

        select.innerHTML = `<option value="">${_escape(placeholder)}</option>`;
        options.forEach(option => {
            select.insertAdjacentHTML('beforeend', `<option value="${option.value}">${_escape(option.label)}</option>`);
        });
        select.disabled = disabled;
    }

    function _setSaving(isSaving) {
        _saving = isSaving;
        const submit = document.getElementById('movementModalSubmitBtn');
        if (!submit) return;

        const config = MOVEMENT_CONFIG[_movementType];
        submit.disabled = isSaving;
        submit.innerHTML = isSaving
            ? '<i data-lucide="loader-circle"></i> Guardando...'
            : `<i data-lucide="${config.icon}"></i> ${config.submitLabel}`;
        _refreshIcons();
    }

    function _showMessage(message, type = 'error') {
        const box = document.getElementById('movementModalMessage');
        if (!box) return;

        box.textContent = message;
        box.className = `movement-modal-message ${type === 'success' ? 'success' : 'error'}`;
        box.hidden = false;
    }

    function _clearMessage() {
        const box = document.getElementById('movementModalMessage');
        if (!box) return;

        box.hidden = true;
        box.textContent = '';
        box.className = 'movement-modal-message';
    }

    function _friendlyError(error) {
        const message = error?.message || 'Error inesperado';
        if (message.includes('401')) {
            setTimeout(() => {
                window.location.href = '/modules/login/login.html';
            }, 1200);
            return 'Sesion expirada. Te redirigiremos al login.';
        }
        if (message.includes('404')) return 'No se encontro el recurso solicitado.';
        if (message.includes('500')) return 'El servidor no pudo completar la operacion. Intenta nuevamente.';
        return message;
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

    return {
        init,
        open,
        close,
    };
})();

async function initInventoryMovementFormModal(options) {
    await InventoryMovementFormModal.init(options);
}

function openInventoryMovementFormModal(type) {
    InventoryMovementFormModal.open(type);
}
