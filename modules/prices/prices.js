let _generalPrices = [];
let _linePresentations = [];
let _selectedLineId = '';
let _editingPrice = null;
let _isSaving = false;

document.addEventListener('DOMContentLoaded', async () => {
    _bindEvents();
    await _loadInitialData();
    lucide.createIcons();
});

function _bindEvents() {
    document.getElementById('btn-new-general-price')?.addEventListener('click', openCreateGeneralPriceModal);
    document.getElementById('btn-close-edit-modal')?.addEventListener('click', closeEditModal);
    document.getElementById('btn-cancel-edit-modal')?.addEventListener('click', closeEditModal);
    document.getElementById('btn-save-price')?.addEventListener('click', savePriceEdit);
    document.getElementById('editLine')?.addEventListener('change', _onModalLineChange);

    document.getElementById('editModal')?.addEventListener('click', event => {
        if (event.target === event.currentTarget) closeEditModal();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeEditModal();
    });
}

async function _loadInitialData() {
    _showTableLoading();
    _setStatsLoading();

    try {
        await Promise.all([
            _loadLinePresentations(),
            _loadStatistics(),
        ]);
        await _loadGeneralPrices();
    } catch (error) {
        _showTableError(error.message);
    } finally {
        lucide.createIcons();
    }
}

async function _loadLinePresentations() {
    try {
        _linePresentations = await PricesService.getLinePresentations();
        _renderLineTabs();
        _fillLineSelect();
    } catch (error) {
        console.error('Error cargando lineas y presentaciones:', error.message);
        _linePresentations = [];
        _renderLineTabs();
        _fillLineSelect();
    }
}

async function _loadStatistics() {
    try {
        const stats = await PricesService.getPriceStatistics();
        document.getElementById('stat-products-with-price').textContent = stats.productsWithPrice;
        document.getElementById('stat-active-special-prices').textContent = stats.activeSpecialPrices;
        document.getElementById('stat-promotions-expiring').textContent = stats.promotionsExpiringSoon;
        document.getElementById('stat-last-update').textContent = PriceFormat.dateTime(stats.lastUpdate);
    } catch (error) {
        _setStatsError();
        console.error('Error cargando estadisticas de precios:', error.message);
    }
}

async function _loadGeneralPrices() {
    _showTableLoading();

    try {
        _generalPrices = await PricesService.getGeneralPrices({ lineId: _selectedLineId });
        _renderGeneralPrices();
    } catch (error) {
        _showTableError(error.message);
    } finally {
        lucide.createIcons();
    }
}

function _renderLineTabs() {
    const container = document.getElementById('line-tabs');
    if (!container) return;

    const lines = _getUniqueLines(_linePresentations);
    container.innerHTML = `
        <button class="category-tab ${_selectedLineId === '' ? 'active' : ''}" type="button" data-line-id="">Todas</button>
        ${lines.map(line => `
            <button class="category-tab ${String(_getLineId(line)) === String(_selectedLineId) ? 'active' : ''}" type="button" data-line-id="${_getLineId(line)}">
              ${_escape(_getLineName(line))}
            </button>
        `).join('')}
    `;

    container.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            _selectedLineId = tab.dataset.lineId || '';
            _renderLineTabs();
            _loadGeneralPrices();
        });
    });
}

function _renderGeneralPrices() {
    const tbody = document.getElementById('general-prices-body');
    if (!tbody) return;

    if (!_generalPrices.length) {
        tbody.innerHTML = `
            <tr>
              <td colspan="5" class="prices-state-cell">
                <i data-lucide="tag"></i>
                <span>No hay precios generales para mostrar</span>
              </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = _generalPrices.map((price, index) => `
        <tr>
          <td>
            <div class="presentation-cell">
              <div class="presentation-icon ${_getPresentationIconClass(index)}">${_getPresentationInitial(price.presentationName)}</div>
              <div class="presentation-info">
                <span class="presentation-name">${_escape(price.presentationName)}</span>
                ${_selectedLineId ? '' : `<span class="presentation-line">${_escape(price.lineName)}</span>`}
              </div>
            </div>
          </td>
          <td style="text-align: center">
            <span class="price-value detail ${price.hasRetailPrice ? '' : 'price-value-empty'}">${PriceFormat.currency(price.retailPrice)}</span>
          </td>
          <td style="text-align: center">
            <span class="price-value wholesale ${price.hasWholesalePrice ? '' : 'price-value-empty'}">${PriceFormat.currency(price.wholesalePrice)}</span>
          </td>
          <td style="text-align: center">
            <span class="products-badge">${price.productsCount}</span>
          </td>
          <td style="text-align: center">
            <button class="edit-btn" type="button" data-line-presentation-id="${price.linePresentationId}">
              <i data-lucide="${price.hasRetailPrice ? 'pencil' : 'plus'}"></i>
            </button>
          </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.edit-btn[data-line-presentation-id]').forEach(button => {
        button.addEventListener('click', () => {
            const price = _generalPrices.find(item => Number(item.linePresentationId) === Number(button.dataset.linePresentationId));
            if (price) openEditModal(price);
        });
    });
}

function openCreateGeneralPriceModal() {
    _editingPrice = null;
    _resetModal();
    _setModalSelectsLocked(false);
    document.getElementById('editModalHelper').textContent = 'Seleccione una linea y presentacion. El Id interno se resolvera automaticamente.';
    document.getElementById('editModal').classList.add('active');
    lucide.createIcons();
}

function openEditModal(price) {
    _editingPrice = price;
    _resetModal();

    const relation = _linePresentations.find(item => Number(_getRelationId(item)) === Number(price.linePresentationId));
    const lineId = _getLineId(relation?.line ?? relation?.Line);

    document.getElementById('editLine').value = lineId;
    _fillPresentationSelect(lineId, price.linePresentationId);
    document.getElementById('editPriceDetail').value = price.retailPrice ?? '';
    document.getElementById('editPriceWholesale').value = price.wholesalePrice ?? '';
    document.getElementById('editValidFrom').value = PriceFormat.todayForInput();
    document.getElementById('editModalHelper').textContent = 'El cambio cerrara el precio vigente y creara un nuevo registro historico.';

    _setModalSelectsLocked(true);
    document.getElementById('editModal').classList.add('active');
    lucide.createIcons();
}

function closeEditModal() {
    document.getElementById('editModal')?.classList.remove('active');
    _isSaving = false;
    _setSaveButtonLoading(false);
}

async function savePriceEdit() {
    if (_isSaving) return;

    const validation = _readAndValidateModal();
    if (!validation.ok) {
        _showModalError(validation.message);
        return;
    }

    _isSaving = true;
    _showModalError('');
    _setSaveButtonLoading(true);

    try {
        await _persistPriceChanges(validation.formData);
        closeEditModal();
        await Promise.all([_loadGeneralPrices(), _loadStatistics()]);
    } catch (error) {
        _showModalError(error.message);
    } finally {
        _isSaving = false;
        _setSaveButtonLoading(false);
        lucide.createIcons();
    }
}

async function _persistPriceChanges(formData) {
    const tasks = [];
    const existing = _editingPrice;

    if (formData.retailPrice !== '' && _shouldPersistPrice(existing?.retailPrice, formData.retailPrice)) {
        const payload = existing?.hasRetailPrice
            ? GeneralPriceForm.toChangeDto({ ...formData, price: formData.retailPrice }, PRICE_TYPE.retail)
            : GeneralPriceForm.toCreateDto({ ...formData, price: formData.retailPrice }, PRICE_TYPE.retail);

        tasks.push(existing?.hasRetailPrice
            ? PricesService.changeGeneralPrice(formData.linePresentationId, payload)
            : PricesService.createGeneralPrice(payload));
    }

    if (formData.wholesalePrice !== '' && _shouldPersistPrice(existing?.wholesalePrice, formData.wholesalePrice)) {
        const payload = GeneralPriceForm.toChangeDto({ ...formData, price: formData.wholesalePrice }, PRICE_TYPE.wholesale);
        tasks.push(PricesService.changeGeneralPrice(formData.linePresentationId, payload));
    }

    if (!tasks.length) throw new Error(existing ? 'No hay cambios para guardar.' : 'Ingrese al menos un precio.');
    await Promise.all(tasks);
}

function _shouldPersistPrice(currentPrice, nextPrice) {
    if (currentPrice === null || currentPrice === undefined) return true;
    return Number(currentPrice) !== Number(nextPrice);
}

function _readAndValidateModal() {
    const formData = {
        linePresentationId: document.getElementById('editPresentation')?.value || '',
        retailPrice: document.getElementById('editPriceDetail')?.value || '',
        wholesalePrice: document.getElementById('editPriceWholesale')?.value || '',
        validFrom: document.getElementById('editValidFrom')?.value || '',
        validTo: document.getElementById('editValidTo')?.value || '',
    };

    if (!formData.linePresentationId) {
        return { ok: false, message: 'Seleccione una linea y una presentacion.' };
    }

    if (!formData.validFrom) {
        return { ok: false, message: 'Seleccione la fecha inicial de vigencia.' };
    }

    if (formData.validTo && formData.validTo < formData.validFrom) {
        return { ok: false, message: 'La fecha final no puede ser menor que la fecha inicial.' };
    }

    const retail = Number(formData.retailPrice);
    const wholesale = Number(formData.wholesalePrice);

    if (formData.retailPrice !== '' && retail <= 0) {
        return { ok: false, message: 'El precio detalle debe ser mayor que cero.' };
    }

    if (formData.wholesalePrice !== '' && wholesale <= 0) {
        return { ok: false, message: 'El precio mayoreo debe ser mayor que cero.' };
    }

    return { ok: true, formData };
}

function _resetModal() {
    _fillLineSelect();
    document.getElementById('editPresentation').innerHTML = '<option value="">Seleccione una presentacion</option>';
    document.getElementById('editPresentation').disabled = true;
    document.getElementById('editPriceDetail').value = '';
    document.getElementById('editPriceWholesale').value = '';
    document.getElementById('editValidFrom').value = PriceFormat.todayForInput();
    document.getElementById('editValidTo').value = '';
    _showModalError('');
    _setSaveButtonLoading(false);
}

function _fillLineSelect() {
    const select = document.getElementById('editLine');
    if (!select) return;

    const lines = _getUniqueLines(_linePresentations);
    select.innerHTML = '<option value="">Seleccione una linea</option>';
    lines.forEach(line => {
        select.insertAdjacentHTML('beforeend', `<option value="${_getLineId(line)}">${_escape(_getLineName(line))}</option>`);
    });
}

function _onModalLineChange(event) {
    _fillPresentationSelect(event.target.value);
}

function _fillPresentationSelect(lineId, selectedLinePresentationId = '') {
    const select = document.getElementById('editPresentation');
    if (!select) return;

    const presentations = _getPresentationOptionsByLine(lineId);
    select.innerHTML = '<option value="">Seleccione una presentacion</option>';
    presentations.forEach(item => {
        select.insertAdjacentHTML(
            'beforeend',
            `<option value="${item.linePresentationId}">${_escape(item.presentationName)}</option>`
        );
    });

    select.disabled = presentations.length === 0;
    if (selectedLinePresentationId) select.value = selectedLinePresentationId;
}

function _setModalSelectsLocked(isLocked) {
    document.getElementById('editLine').disabled = isLocked;
    document.getElementById('editPresentation').disabled = isLocked;
}

function _showTableLoading() {
    const tbody = document.getElementById('general-prices-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="5" class="prices-state-cell">Cargando precios...</td>
        </tr>`;
}

function _showTableError(message) {
    const tbody = document.getElementById('general-prices-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
          <td colspan="5" class="prices-state-cell prices-state-cell--error">
            <i data-lucide="alert-circle"></i>
            <span>Error al cargar precios: ${_escape(message)}</span>
          </td>
        </tr>`;
}

function _setStatsLoading() {
    ['stat-products-with-price', 'stat-active-special-prices', 'stat-promotions-expiring', 'stat-last-update']
        .forEach(id => { document.getElementById(id).textContent = '-'; });
}

function _setStatsError() {
    ['stat-products-with-price', 'stat-active-special-prices', 'stat-promotions-expiring', 'stat-last-update']
        .forEach(id => { document.getElementById(id).textContent = 'Error'; });
}

function _showModalError(message) {
    const element = document.getElementById('editModalError');
    if (!element) return;

    element.textContent = message || '';
    element.classList.toggle('active', Boolean(message));
}

function _setSaveButtonLoading(isLoading) {
    const button = document.getElementById('btn-save-price');
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? 'Guardando...'
        : '<i data-lucide="check" style="width: 16px; height: 16px"></i> Guardar cambios';
}

function _getUniqueLines(relations) {
    const map = new Map();

    relations.forEach(relation => {
        const line = relation.line ?? relation.Line;
        const lineId = _getLineId(line);
        if (!lineId || map.has(lineId)) return;
        map.set(lineId, line);
    });

    return Array.from(map.values())
        .sort((a, b) => String(_getLineName(a)).localeCompare(String(_getLineName(b)), 'es'));
}

function _getPresentationOptionsByLine(lineId) {
    const selectedLineId = Number(lineId);

    return _linePresentations
        .filter(relation => Number(_getLineId(relation.line ?? relation.Line)) === selectedLineId)
        .map(relation => ({
            linePresentationId: _getRelationId(relation),
            presentationName: _getPresentationName(relation.presentation ?? relation.Presentation),
        }))
        .sort((a, b) => String(a.presentationName).localeCompare(String(b.presentationName), 'es'));
}

function _getLineName(line) {
    return line?.lineName || line?.LineName || line?.name || line?.Name || line?.nombre || line?.description || `Linea ${_getLineId(line)}`;
}

function _getPresentationName(presentation) {
    return presentation?.presentationName || presentation?.PresentationName || presentation?.name || presentation?.Name || presentation?.nombre || presentation?.description || `Presentacion ${presentation?.id || presentation?.Id || ''}`;
}

function _getLineId(line) {
    return line?.id ?? line?.Id ?? '';
}

function _getRelationId(relation) {
    return relation?.id ?? relation?.Id ?? '';
}

function _getPresentationIconClass(index) {
    return ['oz4', 'oz8', 'galon4', 'galon2'][index % 4];
}

function _getPresentationInitial(name) {
    const cleaned = String(name || '').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() : '#';
}

function _escape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
