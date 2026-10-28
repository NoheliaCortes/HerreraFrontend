let _lines = [];
let _linePresentations = [];
let _products = [];
let _batches = [];
let _editingIndex = null;
let _saving = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!_hasToken()) {
        _redirectToLogin();
        return;
    }

    _bindEvents();
    _renderLoggedUser();
    _renderBatches();
    _refreshSummary();

    await _loadProductSelectionBaseData();
    _refreshIcons();
});

function _bindEvents() {
    document.getElementById('btnAddBatch')?.addEventListener('click', () => openLotModal());
    document.getElementById('btnCancelRestock')?.addEventListener('click', _resetForm);
    document.getElementById('btnSaveRestock')?.addEventListener('click', _saveRestock);
    document.getElementById('formReabastecimiento')?.addEventListener('submit', _saveBatchFromModal);
    document.getElementById('modalLine')?.addEventListener('change', _onLineChange);
    document.getElementById('modalLinePresentation')?.addEventListener('change', _onLinePresentationChange);
    document.getElementById('modalFlavor')?.addEventListener('change', _onFlavorChange);
    document.getElementById('modalCantidad')?.addEventListener('input', _previewBatchCost);
    document.getElementById('modalCosto')?.addEventListener('input', _previewBatchCost);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeModal();
    });
}

async function _loadProductSelectionBaseData() {
    try {
        const [lines, linePresentations] = await Promise.all([
            RestockService.getLines(),
            RestockService.getLinePresentations(),
        ]);

        _lines = lines;
        _linePresentations = linePresentations;
        _fillLineSelect();
    } catch (error) {
        _setSelectOptions('modalLine', [], 'No se pudieron cargar las lineas');
        _showMessage(`Error al cargar lineas y presentaciones: ${error.message}`, 'error');
    }
}

function _saveBatchFromModal(event) {
    event.preventDefault();
    _clearModalError();

    const batch = {
        lineId: Number(document.getElementById('modalLine')?.value),
        linePresentationId: Number(document.getElementById('modalLinePresentation')?.value),
        flavorId: Number(document.getElementById('modalFlavor')?.value),
        productId: Number(document.getElementById('modalProductId')?.value),
        productName: document.getElementById('modalProductName')?.value || '',
        quantity: Number(document.getElementById('modalCantidad')?.value),
        unitProductionCost: Number(document.getElementById('modalCosto')?.value),
        expirationDate: document.getElementById('modalVencimiento')?.value || '',
    };

    const error = _validateBatch(batch);
    if (error) {
        _showModalError(error);
        return;
    }

    if (_editingIndex === null) {
        _batches.push(batch);
    } else {
        _batches[_editingIndex] = batch;
    }

    _renderBatches();
    _refreshSummary();
    closeModal();
}

async function _saveRestock() {
    if (_saving) return;
    _hideMessage();

    if (!_hasToken()) {
        _redirectToLogin();
        return;
    }

    const formData = {
        notes: document.getElementById('restockNotes')?.value || '',
        batches: _batches,
    };

    const error = _validateRestock(formData);
    if (error) {
        _showMessage(error, 'error');
        return;
    }

    _setSaving(true);

    try {
        const response = await RestockService.createRestock(formData);
        const codeText = response.restockCode ? ` Código generado: ${response.restockCode}.` : '';
        _showMessage(`Reabastecimiento guardado correctamente.${codeText}`, 'success');
        _resetForm({ keepMessage: true });
    } catch (error) {
        if (_isUnauthorizedError(error)) {
            _showMessage('Tu sesión expiró o no está autorizada. Te redirigiremos al login.', 'error');
            setTimeout(_redirectToLogin, 1200);
            return;
        }

        _showMessage(error.message || 'No se pudo guardar el reabastecimiento.', 'error');
    } finally {
        _setSaving(false);
    }
}

function _validateRestock(formData) {
    if (!formData.batches.length) return 'Debes agregar al menos un lote antes de guardar.';

    for (const batch of formData.batches) {
        const error = _validateBatch(batch);
        if (error) return error;
    }

    return null;
}

function _validateBatch(batch) {
    if (!batch.lineId) return 'Selecciona una linea.';
    if (!batch.linePresentationId) return 'Selecciona una presentacion valida para la linea.';
    if (!batch.flavorId) return 'Selecciona un sabor disponible.';
    if (!batch.productId) return 'La combinacion seleccionada no corresponde a un producto activo.';
    if (!Number.isFinite(batch.quantity) || batch.quantity <= 0) return 'La cantidad debe ser mayor a 0.';
    if (!Number.isFinite(batch.unitProductionCost) || batch.unitProductionCost <= 0) return 'El costo unitario debe ser mayor a 0.';
    if (!batch.expirationDate) return 'Selecciona la fecha de vencimiento.';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = _parseDateOnly(batch.expirationDate);
    if (!expiration || expiration <= today) return 'La fecha de vencimiento debe ser futura.';

    return null;
}

function _renderBatches() {
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    if (!_batches.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="8" class="empty-state-cell">
                <i data-lucide="boxes"></i>
                Agrega al menos un lote para publicar el reabastecimiento
              </td>
            </tr>`;
        _refreshIcons();
        return;
    }

    tbody.innerHTML = _batches.map((batch, index) => {
        const total = batch.quantity * batch.unitProductionCost;

        return `
            <tr>
              <td>${index + 1}</td>
              <td>
                <span class="auto-code-pill">Automático</span>
              </td>
              <td>
                <div class="product-cell">
                  <div class="product-dot"></div>
                  <span>${_escape(batch.productName || 'Producto')}</span>
                </div>
              </td>
              <td>${_formatNumber(batch.quantity)} <span class="muted-small">unidades</span></td>
              <td>${_formatCurrency(batch.unitProductionCost)}</td>
              <td>${_formatCurrency(total)}</td>
              <td>${_formatDateOnly(batch.expirationDate)}</td>
              <td style="text-align: center">
                <div class="row-actions">
                  <button class="action-btn" type="button" data-action="edit" data-index="${index}" aria-label="Editar lote">
                    <i data-lucide="edit-2"></i>
                  </button>
                  <button class="action-btn delete" type="button" data-action="delete" data-index="${index}" aria-label="Eliminar lote">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
              </td>
            </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="edit"]').forEach(button => {
        button.addEventListener('click', () => _editBatch(Number(button.dataset.index)));
    });
    tbody.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', () => _deleteBatch(Number(button.dataset.index)));
    });

    _refreshIcons();
}

function _refreshSummary() {
    const totalBatches = _batches.length;
    const totalUnits = _batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalInvestment = _batches.reduce((sum, batch) => sum + (batch.quantity * batch.unitProductionCost), 0);
    const averageCost = totalUnits > 0 ? totalInvestment / totalUnits : 0;

    _setText('summaryBatches', _formatNumber(totalBatches));
    _setText('summaryUnits', _formatNumber(totalUnits));
    _setText('summaryInvestment', _formatCurrency(totalInvestment));
    _setText('summaryAverageCost', _formatCurrency(averageCost));
}

async function _editBatch(index) {
    const batch = _batches[index];
    if (!batch) return;

    _editingIndex = index;
    _setText('modalTitle', 'Editar lote');
    _setText('modalSubtitle', 'Actualiza los datos del lote antes de guardar');
    document.getElementById('modalLine').value = batch.lineId;
    await _loadPresentationsForLine(batch.lineId);
    document.getElementById('modalLinePresentation').value = batch.linePresentationId;
    await _loadProductsForLinePresentation(batch.linePresentationId);
    document.getElementById('modalFlavor').value = batch.flavorId;
    _selectProductFromFlavor(batch.flavorId);
    document.getElementById('modalCantidad').value = batch.quantity;
    document.getElementById('modalCosto').value = batch.unitProductionCost;
    document.getElementById('modalVencimiento').value = batch.expirationDate;
    _previewBatchCost();
    _openModal();
}

function _deleteBatch(index) {
    _batches.splice(index, 1);
    _renderBatches();
    _refreshSummary();
}

function _resetForm(options = {}) {
    _batches = [];
    _editingIndex = null;
    document.getElementById('restockNotes').value = '';
    document.getElementById('formReabastecimiento')?.reset();
    _resetProductSelection();
    _renderBatches();
    _refreshSummary();
    _clearModalError();
    if (!options.keepMessage) _hideMessage();
}

function openLotModal() {
    _editingIndex = null;
    _setText('modalTitle', 'Agregar lote');
    _setText('modalSubtitle', 'Registra los datos del lote a crear');
    document.getElementById('formReabastecimiento')?.reset();
    _resetProductSelection();
    _setText('modalTotalCost', _formatCurrency(0));
    _clearModalError();
    _openModal();
}

function _openModal() {
    document.getElementById('modalReabastecimiento')?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _refreshIcons();
}

function closeModal() {
    document.getElementById('modalReabastecimiento')?.classList.remove('is-open');
    document.body.style.overflow = '';
}

function closeModalOnOverlay(event) {
    if (event.target === document.getElementById('modalReabastecimiento')) closeModal();
}

function _previewBatchCost() {
    const quantity = Number(document.getElementById('modalCantidad')?.value || 0);
    const cost = Number(document.getElementById('modalCosto')?.value || 0);
    _setText('modalTotalCost', _formatCurrency(quantity * cost));
}

function _fillLineSelect() {
    const select = document.getElementById('modalLine');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona una linea</option>';
    _lines
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'))
        .forEach(line => {
            select.insertAdjacentHTML('beforeend', `<option value="${line.id}">${_escape(line.name)}</option>`);
        });

    select.disabled = _lines.length === 0;
}

async function _onLineChange(event) {
    await _loadPresentationsForLine(event.target.value);
}

async function _loadPresentationsForLine(lineId) {
    _products = [];
    _clearSelectedProduct();
    _setSelectOptions('modalFlavor', [], 'Selecciona una presentacion primero', true);

    if (!lineId) {
        _setSelectOptions('modalLinePresentation', [], 'Selecciona una linea primero', true);
        return;
    }

    const presentations = _linePresentations
        .filter(item => Number(item.lineId) === Number(lineId))
        .sort((a, b) => String(a.presentationName).localeCompare(String(b.presentationName), 'es'));

    _setSelectOptions(
        'modalLinePresentation',
        presentations.map(item => ({ value: item.id, label: item.presentationName })),
        presentations.length ? 'Selecciona una presentacion' : 'No hay presentaciones para esta linea',
        presentations.length === 0
    );
}

async function _onLinePresentationChange(event) {
    await _loadProductsForLinePresentation(event.target.value);
}

async function _loadProductsForLinePresentation(linePresentationId) {
    _products = [];
    _clearSelectedProduct();
    _setSelectOptions('modalFlavor', [], 'Cargando sabores...', true);

    if (!linePresentationId) {
        _setSelectOptions('modalFlavor', [], 'Selecciona una presentacion primero', true);
        return;
    }

    try {
        _products = await RestockService.getProductsByLinePresentation(linePresentationId);
        const flavorMap = new Map();
        _products.forEach(product => {
            if (product.flavorId && !flavorMap.has(product.flavorId)) {
                flavorMap.set(product.flavorId, { value: product.flavorId, label: product.flavorName });
            }
        });
        const flavors = Array.from(flavorMap.values())
            .sort((a, b) => String(a.label).localeCompare(String(b.label), 'es'));

        _setSelectOptions(
            'modalFlavor',
            flavors,
            flavors.length ? 'Selecciona un sabor' : 'No hay productos activos para esta combinacion',
            flavors.length === 0
        );

        if (!flavors.length) {
            _showModalError('No existen productos activos para la linea y presentacion seleccionadas.');
        } else {
            _clearModalError();
        }
    } catch (error) {
        _setSelectOptions('modalFlavor', [], 'No se pudieron cargar sabores', true);
        _showModalError(`Error al cargar productos: ${error.message}`);
    }
}

function _onFlavorChange(event) {
    _selectProductFromFlavor(event.target.value);
}

function _selectProductFromFlavor(flavorId) {
    const product = _products.find(item => Number(item.flavorId) === Number(flavorId));

    if (!product) {
        _clearSelectedProduct();
        if (flavorId) _showModalError('El sabor seleccionado no corresponde a un producto activo.');
        return;
    }

    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').value = product.productName;
    _clearModalError();
}

function _resetProductSelection() {
    _products = [];
    _clearSelectedProduct();
    _fillLineSelect();
    _setSelectOptions('modalLinePresentation', [], 'Selecciona una linea primero', true);
    _setSelectOptions('modalFlavor', [], 'Selecciona una presentacion primero', true);
}

function _clearSelectedProduct() {
    document.getElementById('modalProductId').value = '';
    document.getElementById('modalProductName').value = '';
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
    const button = document.getElementById('btnSaveRestock');
    if (!button) return;

    button.disabled = isSaving;
    button.innerHTML = isSaving
        ? '<i data-lucide="loader-circle"></i> Guardando...'
        : '<i data-lucide="check-circle"></i> Guardar reabastecimiento';
    _refreshIcons();
}

function _renderLoggedUser() {
    const user = _getLoggedUser();
    _setText('loggedUserName', user.name);
    _setText('loggedUserMeta', user.role ? `Rol: ${user.role}` : 'Usuario autenticado');
}

function _getLoggedUser() {
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    const storedName = `${firstName} ${lastName}`.trim();
    const username = localStorage.getItem('username') || '';
    const role = localStorage.getItem('rol') || '';
    const tokenUser = _readUserFromToken(localStorage.getItem('token'));

    return {
        name: storedName || tokenUser.fullName || username || tokenUser.username || 'Usuario autenticado',
        role: role || tokenUser.role || '',
    };
}

function _readUserFromToken(token) {
    if (!token || token.split('.').length < 2) return {};

    try {
        const payloadBase64 = token
            .split('.')[1]
            .replaceAll('-', '+')
            .replaceAll('_', '/');
        const payload = JSON.parse(atob(payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=')));

        return {
            fullName: payload.FullName || payload.fullName || '',
            username: payload.username || payload.unique_name || payload.name || '',
            role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || '',
        };
    } catch {
        return {};
    }
}

function _hasToken() {
    return Boolean(localStorage.getItem('token'));
}

function _redirectToLogin() {
    window.location.href = '/modules/login/login.html';
}

function _isUnauthorizedError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('401') || message.includes('no autorizado') || message.includes('unauthorized');
}

function _showMessage(message, type) {
    const box = document.getElementById('formMessage');
    if (!box) return;

    box.textContent = message;
    box.className = `form-message ${type === 'success' ? 'success' : 'error'}`;
    box.hidden = false;
}

function _hideMessage() {
    const box = document.getElementById('formMessage');
    if (!box) return;
    box.hidden = true;
}

function _showModalError(message) {
    const box = document.getElementById('modalError');
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
}

function _clearModalError() {
    const box = document.getElementById('modalError');
    if (!box) return;
    box.hidden = true;
    box.textContent = '';
}

function _parseDateOnly(value) {
    const [year, month, day] = String(value || '').split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function _formatNumber(value) {
    return new Intl.NumberFormat('es-NI').format(Number(value ?? 0));
}

function _formatCurrency(value) {
    return `C$ ${new Intl.NumberFormat('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0))}`;
}

function _formatDateOnly(value) {
    const date = _parseDateOnly(value);
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-NI', { dateStyle: 'short' }).format(date);
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
