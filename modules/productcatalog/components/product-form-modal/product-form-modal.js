(function () {
    let _editingId = null;
    let _onSavedCb = null;
    let _linesLoaded = false;
    let _flavorsLoaded = false;
    let _linePresentations = [];
    let _selectedImageFile = null;
    let _currentImageUrl = null;
    let _previewObjectUrl = null;

    const TEMPLATE = `
        <div class="modal-overlay" id="modal-product-form">
          <div class="modal">
            <div class="modal-header">
              <div class="modal-header-icon">
                <i data-lucide="package-plus" id="product-form-icon"></i>
              </div>
              <div>
                <h2 class="modal-title" id="product-form-title">Nuevo Producto</h2>
                <p class="modal-subtitle" id="product-form-subtitle">Completa los datos del producto</p>
              </div>
              <button class="modal-close" type="button" id="btn-close-product-form">
                <i data-lucide="x"></i>
              </button>
            </div>

            <form class="modal-body" id="form-product">
              <button class="modal-image-upload" id="imageUploadArea" type="button">
                <div class="image-upload-preview" id="imagePreview">
                  <i data-lucide="image-plus"></i>
                  <span>Seleccionar imagen del producto</span>
                  <small>JPG, PNG o WEBP</small>
                </div>
              </button>
              <input
                type="file"
                id="inputImagenArchivo"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                hidden
              />

              <div class="modal-row">
                <div class="modal-field">
                  <label class="modal-label" for="inputNombre">
                    <i data-lucide="type"></i> Nombre del producto <span class="required">*</span>
                  </label>
                  <input class="modal-input" type="text" id="inputNombre" placeholder="Ej. Helado de Fresa Premium" maxlength="150" required />
                </div>
                <div class="modal-field modal-field--sm">
                  <label class="modal-label" for="inputCantidad">Minimo Stock</label>
                  <input class="modal-input" type="number" min="0" step="1" id="inputCantidad" placeholder="Ej. 10" value="0" />
                </div>
              </div>

              <div class="modal-row modal-row--3">
                <div class="modal-field">
                  <label class="modal-label" for="inputLinea">
                    <i data-lucide="tag"></i> Linea <span class="required">*</span>
                  </label>
                  <select class="modal-input modal-select" id="inputLinea" required>
                    <option value="">Seleccionar linea</option>
                  </select>
                </div>
                <div class="modal-field">
                  <label class="modal-label" for="inputPresentacion">
                    <i data-lucide="package"></i> Presentacion <span class="required">*</span>
                  </label>
                  <select class="modal-input modal-select" id="inputPresentacion" required disabled>
                    <option value="">Seleccionar presentacion</option>
                  </select>
                </div>
                <div class="modal-field">
                  <label class="modal-label" for="inputSabor">
                    <i data-lucide="cherry"></i> Sabor <span class="required">*</span>
                  </label>
                  <select class="modal-input modal-select" id="inputSabor" required>
                    <option value="">Seleccionar sabor</option>
                  </select>
                </div>
              </div>

              <div class="modal-field" id="product-status-field" style="display:none;">
                <label class="modal-label">
                  <i data-lucide="toggle-right"></i> Estado
                </label>
                <div class="modal-toggle-group">
                  <label class="modal-toggle-option active-opt">
                    <input type="radio" name="estado" value="Activo" checked />
                    <span class="toggle-pill toggle-pill--active">Activo</span>
                  </label>
                  <label class="modal-toggle-option inactive-opt">
                    <input type="radio" name="estado" value="Inactivo" />
                    <span class="toggle-pill toggle-pill--inactive">Inactivo</span>
                  </label>
                </div>
              </div>
            </form>

            <div class="form-api-error" id="product-form-error" style="display:none;"></div>

            <div class="modal-footer">
              <button class="btn btn-outline" type="button" id="btn-cancel-product-form">Cancelar</button>
              <button class="btn btn-primary" type="submit" form="form-product" id="btn-submit-product">
                <i data-lucide="save"></i>
                <span id="product-submit-label">Guardar Producto</span>
              </button>
            </div>
          </div>
        </div>`;

    function initProductFormModal() {
        const placeholder = document.getElementById('product-form-modal-placeholder');
        if (!placeholder) return;

        placeholder.innerHTML = TEMPLATE;
        _bindEvents();
    }

    function _bindEvents() {
        document.getElementById('btn-close-product-form').addEventListener('click', closeProductFormModal);
        document.getElementById('btn-cancel-product-form').addEventListener('click', closeProductFormModal);
        document.getElementById('form-product').addEventListener('submit', _handleSubmit);
        document.getElementById('inputLinea').addEventListener('change', (event) => _loadPresentations(event.target.value));
        document.getElementById('imageUploadArea').addEventListener('click', () => document.getElementById('inputImagenArchivo').click());
        document.getElementById('inputImagenArchivo').addEventListener('change', _handleImageSelection);
        document.getElementById('modal-product-form').addEventListener('click', (event) => {
            if (event.target.id === 'modal-product-form') closeProductFormModal();
        });
    }

    async function openProductCreateModal(onSaved) {
        _editingId = null;
        _onSavedCb = onSaved || null;
        _currentImageUrl = null;
        _selectedImageFile = null;

        await _loadCatalogData();
        _clearForm();
        _setFormMode('create');
        _showOverlay();
    }

    async function openProductEditModal(id, onSaved) {
        _editingId = id;
        _onSavedCb = onSaved || null;
        _selectedImageFile = null;
        _currentImageUrl = null;

        await _loadCatalogData();
        _clearForm();
        _setFormMode('edit');
        _showOverlay();
        _setSubmitLoading(true);

        try {
            const product = await ProductCatalogService.getById(id);
            await _populateForm(product);
        } catch (error) {
            _showApiError(error.message);
        } finally {
            _setSubmitLoading(false);
            lucide.createIcons();
        }
    }

    function closeProductFormModal() {
        document.getElementById('modal-product-form')?.classList.remove('is-open');
        document.body.style.overflow = '';
        _editingId = null;
        _revokePreviewUrl();
    }

    async function _loadCatalogData() {
        await Promise.all([_loadLines(), _loadFlavors()]);
    }

    async function _loadLines() {
        if (_linesLoaded) return;

        _linePresentations = await ProductCatalogService.getLinePresentations();
        const lines = _getUniqueActiveLines(_linePresentations);
        _fillSelect('inputLinea', lines, 'Seleccionar linea', item => item.name || `Linea ${item.id}`);
        _linesLoaded = true;
    }

    async function _loadFlavors() {
        if (_flavorsLoaded) return;

        const flavors = await ProductCatalogService.getFlavors();
        _fillSelect('inputSabor', flavors, 'Seleccionar sabor', item => {
            const name = item.flavorName || item.name || item.nombre || `Sabor ${item.id}`;
            return item.isActive === false ? `${name} (Inactivo)` : name;
        });
        _flavorsLoaded = true;
    }

    function _fillSelect(id, items, defaultText, getLabel) {
        const select = document.getElementById(id);
        select.innerHTML = `<option value="">${defaultText}</option>`;
        items.forEach(item => {
            select.insertAdjacentHTML('beforeend', `<option value="${item.id}">${_escape(getLabel(item))}</option>`);
        });
    }

    async function _loadPresentations(lineId) {
        const select = document.getElementById('inputPresentacion');
        select.innerHTML = '<option value="">Seleccionar presentacion</option>';
        select.disabled = true;

        if (!lineId) return;

        const presentations = _getPresentationOptionsByLine(lineId);
        presentations.forEach(item => {
            select.insertAdjacentHTML('beforeend', `<option value="${item.linePresentationId}">${_escape(item.presentationName)}</option>`);
        });

        select.disabled = presentations.length === 0;
    }

    async function _populateForm(product) {
        document.getElementById('inputNombre').value = product.productName || '';
        document.getElementById('inputCantidad').value = product.minimumStock ?? 0;
        document.getElementById('inputSabor').value = product.flavorId || '';
        document.querySelector(`input[name="estado"][value="${product.isActive ? 'Activo' : 'Inactivo'}"]`).checked = true;

        _currentImageUrl = product.imageUrl || null;
        _renderPreview(ProductImage.resolveUrl(_currentImageUrl), _currentImageUrl ? 'Imagen actual del producto' : null);

        const match = await _findLinePresentation(product.linePresentationId);
        if (!match) {
            _showApiError('No se encontro la combinacion linea-presentacion del producto.');
            return;
        }

        document.getElementById('inputLinea').value = match.lineId;
        await _loadPresentations(match.lineId);
        document.getElementById('inputPresentacion').value = product.linePresentationId;
    }

    async function _findLinePresentation(linePresentationId) {
        if (_linePresentations.length === 0) {
            _linePresentations = await ProductCatalogService.getLinePresentations();
        }

        const match = _linePresentations.find(item => Number(item.id) === Number(linePresentationId));
        if (!match) return null;

        return {
            lineId: match.line?.id,
            linePresentationId: match.id,
            presentationId: match.presentation?.id,
        };
    }

    function _handleImageSelection(event) {
        const file = event.target.files?.[0] ?? null;
        _selectedImageFile = null;
        _clearApiError();
        document.getElementById('inputImagenArchivo').classList.remove('input-error');

        if (!file) {
            _renderEmptyPreview();
            return;
        }

        if (!ProductImage.isAllowedFile(file)) {
            document.getElementById('inputImagenArchivo').classList.add('input-error');
            _showApiError('Selecciona una imagen JPG, PNG o WEBP.');
            event.target.value = '';
            _renderEmptyPreview();
            return;
        }

        _selectedImageFile = file;
        _revokePreviewUrl();
        _previewObjectUrl = URL.createObjectURL(file);
        _renderPreview(_previewObjectUrl, file.name);
    }

    async function _handleSubmit(event) {
        event.preventDefault();
        _clearApiError();

        const formData = _readForm();
        if (!_validateForm(formData)) return;

        _setSubmitLoading(true);

        try {
            if (_selectedImageFile) {
                const uploadResult = await ProductCatalogService.uploadProductImage(_selectedImageFile);
                formData.imageUrl = ProductImage.toApiUrl(uploadResult.imageUrl);
            }

            if (_editingId === null) {
                await ProductCatalogService.create(formData);
            } else {
                if (!_selectedImageFile) formData.imageUrl = _currentImageUrl;
                await ProductCatalogService.update(_editingId, formData);
            }

            closeProductFormModal();
            if (typeof _onSavedCb === 'function') _onSavedCb();
            document.dispatchEvent(new CustomEvent('product:saved'));
        } catch (error) {
            _showApiError(error.message);
        } finally {
            _setSubmitLoading(false);
        }
    }

    function _readForm() {
        return {
            productName: document.getElementById('inputNombre').value,
            minimumStock: document.getElementById('inputCantidad').value,
            linePresentationId: document.getElementById('inputPresentacion').value,
            flavorId: document.getElementById('inputSabor').value,
            imageUrl: _currentImageUrl,
            imageFile: _selectedImageFile,
            isActive: document.querySelector('input[name="estado"]:checked')?.value === 'Activo',
        };
    }

    function _validateForm(data) {
        let valid = true;
        ['inputNombre', 'inputLinea', 'inputPresentacion', 'inputSabor', 'inputCantidad'].forEach(id => {
            document.getElementById(id)?.classList.remove('input-error');
        });

        if (!data.productName.trim() || data.productName.trim().length > 150) {
            document.getElementById('inputNombre').classList.add('input-error');
            valid = false;
        }
        if (!document.getElementById('inputLinea').value) {
            document.getElementById('inputLinea').classList.add('input-error');
            valid = false;
        }
        if (!data.linePresentationId) {
            document.getElementById('inputPresentacion').classList.add('input-error');
            valid = false;
        }
        if (!data.flavorId) {
            document.getElementById('inputSabor').classList.add('input-error');
            valid = false;
        }
        if (Number(data.minimumStock) < 0 || !Number.isInteger(Number(data.minimumStock))) {
            document.getElementById('inputCantidad').classList.add('input-error');
            valid = false;
        }
        if (data.imageFile && !ProductImage.isAllowedFile(data.imageFile)) {
            valid = false;
        }

        if (!valid) _showApiError('Completa los campos requeridos con valores validos.');
        return valid;
    }

    function _setFormMode(mode) {
        const editing = mode === 'edit';
        document.getElementById('product-form-title').textContent = editing ? 'Editar Producto' : 'Nuevo Producto';
        document.getElementById('product-form-subtitle').textContent = editing ? 'Actualiza los datos del producto' : 'Completa los datos del producto';
        document.getElementById('product-submit-label').textContent = editing ? 'Guardar Cambios' : 'Guardar Producto';
        document.getElementById('product-form-icon')?.setAttribute('data-lucide', editing ? 'package-check' : 'package-plus');
        document.getElementById('product-status-field').style.display = editing ? '' : 'none';
        lucide.createIcons();
    }

    function _getUniqueActiveLines(relations) {
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

    function _clearForm() {
        document.getElementById('form-product').reset();
        document.getElementById('inputPresentacion').innerHTML = '<option value="">Seleccionar presentacion</option>';
        document.getElementById('inputPresentacion').disabled = true;
        document.querySelector('input[name="estado"][value="Activo"]').checked = true;
        document.querySelectorAll('.input-error').forEach(element => element.classList.remove('input-error'));
        _selectedImageFile = null;
        _currentImageUrl = null;
        _renderEmptyPreview();
        _clearApiError();
    }

    function _renderEmptyPreview() {
        _revokePreviewUrl();
        document.getElementById('imagePreview').innerHTML = `
            <i data-lucide="image-plus"></i>
            <span>Seleccionar imagen del producto</span>
            <small>JPG, PNG o WEBP</small>`;
        lucide.createIcons();
    }

    function _renderPreview(src, label) {
        if (!src) {
            _renderEmptyPreview();
            return;
        }

        document.getElementById('imagePreview').innerHTML = `
            <img src="${_escape(src)}" alt="Vista previa del producto">
            <small class="image-upload-filename">${_escape(label || 'Imagen seleccionada')}</small>`;
    }

    function _revokePreviewUrl() {
        if (_previewObjectUrl) URL.revokeObjectURL(_previewObjectUrl);
        _previewObjectUrl = null;
    }

    function _setSubmitLoading(loading) {
        const button = document.getElementById('btn-submit-product');
        button.disabled = loading;
        document.getElementById('product-submit-label').textContent = loading
            ? (_selectedImageFile ? 'Subiendo imagen...' : 'Guardando...')
            : (_editingId === null ? 'Guardar Producto' : 'Guardar Cambios');
    }

    function _showOverlay() {
        document.getElementById('modal-product-form').classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function _showApiError(message) {
        const error = document.getElementById('product-form-error');
        error.textContent = message;
        error.style.display = 'block';
    }

    function _clearApiError() {
        const error = document.getElementById('product-form-error');
        error.textContent = '';
        error.style.display = 'none';
    }

    function _escape(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    window.initProductFormModal = initProductFormModal;
    window.openProductCreateModal = openProductCreateModal;
    window.openProductEditModal = openProductEditModal;
    window.closeProductFormModal = closeProductFormModal;
})();
