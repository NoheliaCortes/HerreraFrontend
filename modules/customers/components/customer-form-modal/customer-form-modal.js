/**
 * customer-form-modal.component.js
 *
 * Responsabilidades:
 *  - Inyectar el HTML del modal directamente (sin fetch externo)
 *  - Manejar apertura / cierre
 *  - Modo CREAR  → POST /api/Customers
 *  - Modo EDITAR → GET  /api/Customers/{id} para precargar + PUT /api/Customers/{id}
 *  - Emitir evento 'customer:saved' cuando se guarda exitosamente
 */

(function () {

    let _editingId = null;
    let _onSavedCb = null;
    let _departmentsLoaded = false;

    // ─── Template HTML incrustado ────────────────────────────────────────────────

    const TEMPLATE = `
        <div class="modal-overlay" id="modal-customer-form">
          <div class="modal">
            <div class="modal-header">
              <h2 id="modal-form-title">Nuevo Cliente</h2>
              <button class="btn-close-modal" id="btn-close-customer-form" type="button">
                <i data-lucide="x"></i>
              </button>
            </div>

            <div class="form-section-label">Datos del cliente</div>

            <div class="form-grid">
              <div class="form-group">
                <label for="cf-firstName">Nombre</label>
                <input type="text" id="cf-firstName" placeholder="Ej: Carlos" maxlength="100" required />
              </div>
              <div class="form-group">
                <label for="cf-lastName">Apellido</label>
                <input type="text" id="cf-lastName" placeholder="Ej: Herrera" maxlength="100" required />
              </div>
              <div class="form-group">
                <label for="cf-phone">Teléfono</label>
                <input type="text" id="cf-phone" placeholder="Ej: 8888-0000" maxlength="20" />
              </div>
              <div class="form-group">
                <label for="cf-departmentId">Departamento</label>
                <select id="cf-departmentId" required>
                <option value="">Seleccionar departamento</option>
                </select>
                </div>

                <div class="form-group">
                <label for="cf-municipalityId">Municipio</label>
                <select id="cf-municipalityId" required disabled>
                <option value="">Seleccionar municipio</option>
                </select>
                </div>
              <div class="form-group form-group--full">
                <label for="cf-pointOfSale">Punto de Venta</label>
                <input type="text" id="cf-pointOfSale" placeholder="Ej: Distribuidora Central" maxlength="150" />
              </div>
              <div class="form-group form-group--full">
                <label for="cf-posaddress">Dirección del Punto de Venta</label>
                <input type="text" id="cf-posaddress" placeholder="Ej: Del semáforo 2c al norte" maxlength="250" />
              </div>
              <div class="form-group form-group--full" id="cf-status-group" style="display:none;">
                <label for="cf-isActive">Estado</label>
                <select id="cf-isActive">
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div class="form-api-error" id="cf-api-error" style="display:none;"></div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" id="btn-cancel-customer-form">Cancelar</button>
              <button type="button" class="btn-submit-modal" id="btn-submit-customer-form">
                <i data-lucide="plus" id="btn-submit-icon"></i>
                <span id="btn-submit-label">Registrar</span>
              </button>
            </div>
          </div>
        </div>`;

    // ─── Inyección del HTML ──────────────────────────────────────────────────────

    function _loadTemplate() {
        const placeholder = document.getElementById('customer-form-modal-placeholder');
        if (!placeholder) {
            console.error('[CustomerFormModal] Placeholder #customer-form-modal-placeholder no encontrado.');
            return;
        }
        placeholder.innerHTML = TEMPLATE;
        _bindEvents();
    }

    // ─── Binding de eventos ──────────────────────────────────────────────────────

    function _bindEvents() {
        document.getElementById('btn-close-customer-form').addEventListener('click', closeCustomerFormModal);
        document.getElementById('btn-cancel-customer-form').addEventListener('click', closeCustomerFormModal);
        document.getElementById('btn-submit-customer-form').addEventListener('click', _handleSubmit);

        document.getElementById('modal-customer-form').addEventListener('click', (e) => {
            if (e.target.id === 'modal-customer-form') closeCustomerFormModal();
        });
        document.getElementById('cf-departmentId').addEventListener('change', _onDepartmentChange);
    }

    // ─── Apertura modo CREAR ─────────────────────────────────────────────────────

    async function openCustomerFormModal(onSaved) {
        _editingId = null;
        _onSavedCb = onSaved || null;

        document.getElementById('modal-form-title').textContent  = 'Nuevo Cliente';
        document.getElementById('btn-submit-label').textContent  = 'Registrar';
        document.getElementById('btn-submit-icon').setAttribute('data-lucide', 'plus');
        document.getElementById('cf-status-group').style.display = 'none';

        _clearForm();
        if (!_departmentsLoaded) {
            await _loadDepartments();
        }
        _showOverlay();
        lucide.createIcons();
    }

    // ─── Apertura modo EDITAR ────────────────────────────────────────────────────

    async function openCustomerEditModal(id, onSaved) {
        _editingId = id;
        _onSavedCb = onSaved || null;

        document.getElementById('modal-form-title').textContent  = 'Editar Cliente';
        document.getElementById('btn-submit-label').textContent  = 'Guardar cambios';
        document.getElementById('btn-submit-icon').setAttribute('data-lucide', 'save');
        document.getElementById('cf-status-group').style.display = '';

        _clearForm();
        _setSubmitLoading(true);
        _showOverlay();

        try {
            if (!_departmentsLoaded) {
            await _loadDepartments();
        }
            const customer = await CustomerService.getById(id);
            await _populateForm(customer);
        } catch (err) {
            _showApiError(err.message);
        } finally {
            _setSubmitLoading(false);
            lucide.createIcons();
        }
    }

    // ─── Cierre ──────────────────────────────────────────────────────────────────

    function closeCustomerFormModal() {
        document.getElementById('modal-customer-form').classList.remove('active');
        _clearForm();
        _editingId = null;
    }

    // ─── Submit ──────────────────────────────────────────────────────────────────

    async function _handleSubmit() {
        _clearApiError();

        const formData = _readForm();
        if (!_validateForm(formData)) return;

        _setSubmitLoading(true);

        try {
            if (_editingId === null) {
                await CustomerService.create(formData);
            } else {
                await CustomerService.update(_editingId, formData);
            }

            closeCustomerFormModal();
            if (typeof _onSavedCb === 'function') _onSavedCb();
            document.dispatchEvent(new CustomEvent('customer:saved'));

        } catch (err) {
            _showApiError(err.message);
        } finally {
            _setSubmitLoading(false);
        }
    }

    // ─── Helpers de formulario ───────────────────────────────────────────────────

    function _readForm() {
        return {
            municipalityId: document.getElementById('cf-municipalityId').value,
            firstName:      document.getElementById('cf-firstName').value,
            lastName:       document.getElementById('cf-lastName').value,
            phone:          document.getElementById('cf-phone').value,
            pointOfSale:    document.getElementById('cf-pointOfSale').value,
            posaddress:     document.getElementById('cf-posaddress').value,
            isActive:       document.getElementById('cf-isActive').value === 'true',
        };
    }

    async function _populateForm(customer) {
        document.getElementById('cf-firstName').value = customer.firstName;
    document.getElementById('cf-lastName').value = customer.lastName;
    document.getElementById('cf-phone').value =
        customer.phone !== '—' ? customer.phone : '';

    document.getElementById('cf-pointOfSale').value =
        customer.pointOfSale !== '—' ? customer.pointOfSale : '';

    document.getElementById('cf-posaddress').value =
        customer.posaddress !== '—' ? customer.posaddress : '';

    document.getElementById('cf-isActive').value =
        String(customer.isActive);

    document.getElementById('cf-departmentId').value =
        customer.departmentId;

    await _loadMunicipalities(customer.departmentId);

    document.getElementById('cf-municipalityId').value =
        customer.municipalityId;
    }

    

    function _clearForm() {
        ['cf-firstName', 'cf-lastName', 'cf-phone', 'cf-pointOfSale', 'cf-posaddress'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('input-error'); }
        });
        const sel = document.getElementById('cf-municipalityId');
        if (sel) { sel.value = ''; sel.classList.remove('input-error'); }
        _clearApiError();
        const dep =
            document.getElementById('cf-departmentId');

        if (dep) {
            dep.value = '';
            dep.classList.remove('input-error');
        }

        const mun =
            document.getElementById('cf-municipalityId');

        if (mun) {
            mun.value = '';
            mun.classList.remove('input-error');
        }
    }

    function _validateForm(data) {
        let valid = true;
        if (!data.firstName.trim()) { document.getElementById('cf-firstName').classList.add('input-error'); valid = false; }
        if (!data.lastName.trim())  { document.getElementById('cf-lastName').classList.add('input-error');  valid = false; }
        if (!data.municipalityId)   { document.getElementById('cf-municipalityId').classList.add('input-error'); valid = false; }
        if (!valid) _showApiError('Por favor completá los campos requeridos.');
        if (!document.getElementById('cf-departmentId').value) {
            document
                .getElementById('cf-departmentId')
                .classList.add('input-error');

            valid = false;
        }
        return valid;
    }

     async function _loadDepartments() {

        const departments =
            await LocationService.getDepartments();

        const select =
            document.getElementById('cf-departmentId');

        select.innerHTML =
            '<option value="">Seleccionar departamento</option>';

        departments.forEach(dep => {

            select.insertAdjacentHTML(
                'beforeend',
                `
                <option value="${dep.id}">
                    ${dep.departmentName}
                </option>
                `
            );

        });

        _departmentsLoaded = true;
        }

            async function _loadMunicipalities(departmentId) {

            const select =
                document.getElementById('cf-municipalityId');

            if (!departmentId) {

                select.innerHTML =
                    '<option value="">Seleccionar municipio</option>';

                select.disabled = true;
                return;
            }

            const municipalities =
                await LocationService
                    .getMunicipalitiesByDepartment(departmentId);

            select.innerHTML =
                '<option value="">Seleccionar municipio</option>';

            if (municipalities.length === 0) {

                select.innerHTML =
                    '<option value="">No hay municipios disponibles</option>';

                select.disabled = true;
                return;
            }

            municipalities.forEach(m => {

                select.insertAdjacentHTML(
                    'beforeend',
                    `
                    <option value="${m.id}">
                        ${m.municipalityName}
                    </option>
                    `
                );

            });

            select.disabled = false;
        }

        async function _onDepartmentChange(event) {

            const departmentId =
                event.target.value;

            const municipalitySelect =
                document.getElementById('cf-municipalityId');

            municipalitySelect.value = '';

            await _loadMunicipalities(departmentId);
        }

    // ─── UI helpers ──────────────────────────────────────────────────────────────

    function _showOverlay() {
        document.getElementById('modal-customer-form').classList.add('active');
    }

    function _setSubmitLoading(loading) {
        const btn = document.getElementById('btn-submit-customer-form');
        if (!btn) return;
        btn.disabled = loading;
        document.getElementById('btn-submit-label').textContent = loading ? 'Guardando…'
            : (_editingId === null ? 'Registrar' : 'Guardar cambios');
    }

    function _showApiError(msg) {
        const el = document.getElementById('cf-api-error');
        if (!el) return;
        el.textContent   = msg;
        el.style.display = 'block';
    }

    function _clearApiError() {
        const el = document.getElementById('cf-api-error');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    // ─── Init (síncrono, sin fetch) ──────────────────────────────────────────────

    function initCustomerFormModal() {
        _loadTemplate();
    }

    // ─── API pública ─────────────────────────────────────────────────────────────

    window.initCustomerFormModal  = initCustomerFormModal;
    window.openCustomerFormModal  = openCustomerFormModal;
    window.openCustomerEditModal  = openCustomerEditModal;
    window.closeCustomerFormModal = closeCustomerFormModal;

})();