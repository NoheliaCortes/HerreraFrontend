/**
 * customer-detail-modal.component.js
 *
 * Responsabilidades:
 * - Inyectar el HTML con el MISMO diseño exacto de cuadrícula que el formulario de agregar.
 * - Iniciar en modo "Solo Lectura" con los campos bloqueados.
 * - Permitir mutar a modo "Edición" reactivando campos, cargando ubicaciones dinámicas y alterando botones.
 * - Guardar cambios directos consumiendo `CustomerService.update` incluyendo el Estado.
 * - Emitir eventos globales correspondientes para mantener el Dashboard sincronizado.
 */

(function () {

    let _currentCustomer = null;
    let _onChangedCb     = null;
    let _departmentsLoaded = false;
    let _isEditingMode = false;

    // ─── Template HTML Unificado e Incrustado ───────────────────────────────────
    // Reutiliza exactamente tus clases CSS: .modal, .form-grid, .form-group, .form-group--full
    const TEMPLATE = `
        <div class="modal-overlay" id="modal-customer-detail">
          <div class="modal">
            
            <div class="modal-header">
              <h2 id="detail-modal-title">Detalles del Cliente</h2>
              <button class="btn-close-modal" id="btn-close-customer-detail" type="button">
                <i data-lucide="x"></i>
              </button>
            </div>

            <div class="form-section-label" id="detail-section-label">Modo Visualización (Lectura)</div>

            <form id="cd-form" autocomplete="off" onsubmit="return false;">
                <div class="form-grid">
                  
                  <div class="form-group">
                    <label for="cd-firstName">Nombre</label>
                    <input type="text" id="cd-firstName" placeholder="Ej: Carlos" maxlength="100" required disabled />
                  </div>

                  <div class="form-group">
                    <label for="cd-lastName">Apellido</label>
                    <input type="text" id="cd-lastName" placeholder="Ej: Herrera" maxlength="100" required disabled />
                  </div>

                  <div class="form-group">
                    <label for="cd-phone">Teléfono</label>
                    <input type="text" id="cd-phone" placeholder="Ej: 8888-0000" maxlength="20" disabled />
                  </div>

                  <div class="form-group">
                    <label for="cd-departmentId">Departamento</label>
                    <select id="cd-departmentId" required disabled>
                      <option value="">Seleccionar departamento</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="cd-municipalityId">Municipio</label>
                    <select id="cd-municipalityId" required disabled>
                      <option value="">Seleccionar municipio</option>
                    </select>
                  </div>

                  <div class="form-group form-group--full">
                    <label for="cd-pointOfSale">Punto de Venta</label>
                    <input type="text" id="cd-pointOfSale" placeholder="Ej: Distribuidora Central" maxlength="150" disabled />
                  </div>

                  <div class="form-group form-group--full">
                    <label for="cd-posaddress">Dirección del Punto de Venta</label>
                    <input type="text" id="cd-posaddress" placeholder="Ej: Del semáforo 2c al norte" maxlength="250" disabled />
                  </div>

                  <div class="form-group form-group--full" id="cd-status-group">
                    <label for="cd-isActive">Estado del Registro</label>
                    <select id="cd-isActive" disabled>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>

                </div>
            </form>

            <div class="form-api-error" id="cd-api-error" style="display:none;"></div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" id="btn-delete-customer" style="border-color: #FA897B; color: #c0392b;">
                <i data-lucide="trash-2" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Eliminar
              </button>

              <div style="display: flex; gap: 12px; margin-left: auto;">
                <button type="button" class="btn-cancel" id="btn-close-text-detail">Cerrar</button>
                <button type="button" class="btn-submit-modal" id="btn-enable-edit">
                  <i data-lucide="edit-2"></i> <span>Editar Datos</span>
                </button>

                <button type="button" class="btn-cancel" id="btn-cancel-edit" style="display: none;">Cancelar</button>
                <button type="button" class="btn-submit-modal" id="btn-save-edit" style="background: #04a598; display: none;">
                  <i data-lucide="save"></i> <span>Guardar Cambios</span>
                </button>
              </div>
            </div>

          </div>
        </div>`;

    // ─── Inyección del HTML ──────────────────────────────────────────────────────

    function _loadTemplate() {
        const placeholder = document.getElementById('customer-detail-modal-placeholder');
        if (!placeholder) {
            console.error('[CustomerDetailModal] Placeholder #customer-detail-modal-placeholder no encontrado.');
            return;
        }
        placeholder.innerHTML = TEMPLATE;
        _bindEvents();
    }

    // ─── Binding de Eventos del Ciclo de Vida ────────────────────────────────────

    function _bindEvents() {
        document.getElementById('btn-close-customer-detail').addEventListener('click', closeCustomerDetailModal);
        document.getElementById('btn-close-text-detail').addEventListener('click', closeCustomerDetailModal);
        
        // Disparadores del switch de Lectura / Edición
        document.getElementById('btn-enable-edit').addEventListener('click', () => _toggleFormMode(true));
        document.getElementById('btn-cancel-edit').addEventListener('click', () => {
            _toggleFormMode(false);
            if (_currentCustomer) _populateDetailFields(_currentCustomer); // Restaurar valores originales
        });

        // Eventos de Persistencia (Actualizar y Eliminar)
        document.getElementById('btn-save-edit').addEventListener('click', _handleUpdate);
        document.getElementById('btn-delete-customer').addEventListener('click', _handleDelete);

        // Cascada del selector geográfico interna de este componente
        document.getElementById('cd-departmentId').addEventListener('change', async (e) => {
            document.getElementById('cd-municipalityId').value = '';
            await _loadMunicipalities(e.target.value);
        });

        // Cerrar al hacer clic fuera de la tarjeta blanca
        document.getElementById('modal-customer-detail').addEventListener('click', (e) => {
            if (e.target.id === 'modal-customer-detail') closeCustomerDetailModal();
        });
    }

    // ─── Apertura del Modal (Siempre inicia en Solo Lectura) ─────────────────────

    async function openCustomerDetailModal(customer, onChanged) {
        _currentCustomer = customer;
        _onChangedCb     = onChanged || null;

        _clearApiError();
        _toggleFormMode(false); // Forzar modo lectura por defecto al abrir

        // Pre-cargar catálogos geográficos si es la primera vez
        if (!_departmentsLoaded) {
            await _loadDepartments();
        }

        // Rellenar datos en los campos deshabilitados
        await _populateDetailFields(customer);

        // Activar el Overlay agregando la clase activa configurada en tu CSS
        document.getElementById('modal-customer-detail').classList.add('active');
        lucide.createIcons();
    }

    // ─── Cierre del Modal ────────────────────────────────────────────────────────

    function closeCustomerDetailModal() {
        document.getElementById('modal-customer-detail').classList.remove('active');
        _currentCustomer = null;
        _isEditingMode = false;
    }

    // ─── Alternancia Dinámica entre Vista y Edición ──────────────────────────────

    function _toggleFormMode(enableEditing) {
        _isEditingMode = enableEditing;
        _clearApiError();

        // 1. Mutar Textos Informativos de Cabecera
        document.getElementById('detail-modal-title').textContent = enableEditing ? 'Modificar Información del Cliente' : 'Detalles del Cliente';
        document.getElementById('detail-section-label').textContent = enableEditing ? 'Modo Edición Activa' : 'Modo Visualización (Lectura)';

        // 2. Bloquear / Desbloquear Inputs y Selects del formulario
        const inputs = document.querySelectorAll('#cd-form input, #cd-form select');
        inputs.forEach(el => {
            el.disabled = !enableEditing;
            el.classList.remove('input-error');
        });

        // Control estricto de cascada del municipio al activar el modo edición
        if (enableEditing) {
            const currentDept = document.getElementById('cd-departmentId').value;
            document.getElementById('cd-municipalityId').disabled = !currentDept;
        }

        // 3. Intercambio de Visibilidad de Botones de Acción (Footer)
        document.getElementById('btn-delete-customer').style.display = enableEditing ? 'none' : '';
        document.getElementById('btn-close-text-detail').style.display = enableEditing ? 'none' : '';
        document.getElementById('btn-enable-edit').style.display     = enableEditing ? 'none' : '';

        document.getElementById('btn-cancel-edit').style.display = enableEditing ? '' : 'none';
        document.getElementById('btn-save-edit').style.display   = enableEditing ? '' : 'none';
    }

    // ─── Inyección Asíncrona de Valores a los Controles ──────────────────────────

    async function _populateDetailFields(customer) {
        document.getElementById('cd-firstName').value   = customer.firstName || '';
        document.getElementById('cd-lastName').value    = customer.lastName || '';
        document.getElementById('cd-phone').value       = customer.phone !== '—' ? (customer.phone || '') : '';
        document.getElementById('cd-pointOfSale').value = customer.pointOfSale !== '—' ? (customer.pointOfSale || '') : '';
        document.getElementById('cd-posaddress').value  = customer.posaddress !== '—' ? (customer.posaddress || '') : '';
        
        // Conversión estricta a string para sincronizar el selector del estado
        document.getElementById('cd-isActive').value    = String(customer.isActive);

        // Mapeo e inyección del departamento
        document.getElementById('cd-departmentId').value = customer.departmentId || '';

        // Cargar los municipios del departamento asignado y forzar la selección del ID correcto
        if (customer.departmentId) {
            await _loadMunicipalities(customer.departmentId);
            document.getElementById('cd-municipalityId').value = customer.municipalityId || '';
        } else {
            document.getElementById('cd-municipalityId').innerHTML = '<option value="">Seleccionar municipio</option>';
            document.getElementById('cd-municipalityId').disabled = true;
        }
    }

    // ─── Acción de Guardar Cambios (PUT) ─────────────────────────────────────────

    async function _handleUpdate() {
        _clearApiError();

        // Leer datos actuales de los inputs
        const formData = {
            municipalityId: document.getElementById('cd-municipalityId').value,
            firstName:      document.getElementById('cd-firstName').value,
            lastName:       document.getElementById('cd-lastName').value,
            phone:          document.getElementById('cd-phone').value,
            pointOfSale:    document.getElementById('cd-pointOfSale').value,
            posaddress:     document.getElementById('cd-posaddress').value,
            isActive:       document.getElementById('cd-isActive').value === 'true' // Parseo estricto a bool nativo C#
        };

        // Validar campos requeridos antes de despachar al Service
        let valid = true;
        if (!formData.firstName.trim()) { document.getElementById('cd-firstName').classList.add('input-error'); valid = false; }
        if (!formData.lastName.trim())  { document.getElementById('cd-lastName').classList.add('input-error');  valid = false; }
        if (!formData.municipalityId)   { document.getElementById('cd-municipalityId').classList.add('input-error'); valid = false; }
        if (!document.getElementById('cd-departmentId').value) { document.getElementById('cd-departmentId').classList.add('input-error'); valid = false; }

        if (!valid) {
            _showApiError('Por favor completá los campos requeridos marcados en rojo.');
            return;
        }

        // Animación de carga del botón
        const btnSave = document.getElementById('btn-save-edit');
        btnSave.disabled = true;
        btnSave.querySelector('span').textContent = 'Guardando…';

        try {
            // Despacho a la capa de datos (API REST vía Fetch)
            await CustomerService.update(_currentCustomer.id, formData);
            
            closeCustomerDetailModal();
            
            // Disparar callbacks y eventos globales para repintar instantáneamente la tabla y las Cards del Dashboard
            if (typeof _onChangedCb === 'function') _onChangedCb();
            document.dispatchEvent(new CustomEvent('customer:saved'));
            
        } catch (err) {
            _showApiError(err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.querySelector('span').textContent = 'Guardar Cambios';
        }
    }

    // ─── Acción de Eliminar Registro (DELETE) ────────────────────────────────────

    async function _handleDelete() {
        if (!_currentCustomer) return;

        const confirmed = confirm(
            `¿Estás seguro de que querés eliminar a "${_currentCustomer.fullName}"?\n\n` +
            `Si tiene órdenes o ventas asociadas, la operación no podrá completarse.`
        );
        if (!confirmed) return;

        const btnDelete = document.getElementById('btn-delete-customer');
        btnDelete.disabled = true;
        btnDelete.querySelector('span').textContent = 'Eliminando…';

        try {
            await CustomerService.remove(_currentCustomer.id);
            closeCustomerDetailModal();
            if (typeof _onChangedCb === 'function') _onChangedCb();
            document.dispatchEvent(new CustomEvent('customer:deleted'));
        } catch (err) {
            alert(`No se pudo eliminar el cliente:\n${err.message}`);
        } finally {
            btnDelete.disabled = false;
            btnDelete.querySelector('span').textContent = 'Eliminar';
        }
    }

    // ─── Helpers de Ubicación (Carga de Datos Remotos) ───────────────────────────

    async function _loadDepartments() {
        try {
            const departments = await LocationService.getDepartments();
            const select = document.getElementById('cd-departmentId');
            select.innerHTML = '<option value="">Seleccionar departamento</option>';

            departments.forEach(dep => {
                select.insertAdjacentHTML('beforeend', `<option value="${dep.id}">${dep.departmentName}</option>`);
            });
            _departmentsLoaded = true;
        } catch (err) {
            console.error('[DetailModal] Error loading departments:', err);
        }
    }

    async function _loadMunicipalities(departmentId) {
        const select = document.getElementById('cd-municipalityId');
        if (!departmentId) {
            select.innerHTML = '<option value="">Seleccionar municipio</option>';
            select.disabled = true;
            return;
        }

        try {
            const municipalities = await LocationService.getMunicipalitiesByDepartment(departmentId);
            select.innerHTML = '<option value="">Seleccionar municipio</option>';

            if (municipalities.length === 0) {
                select.innerHTML = '<option value="">No hay municipios disponibles</option>';
                select.disabled = true;
                return;
            }

            municipalities.forEach(m => {
                select.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.municipalityName}</option>`);
            });
            select.disabled = !_isEditingMode; // Mantener bloqueado si estamos en modo lectura
        } catch (err) {
            console.error('[DetailModal] Error loading municipalities:', err);
        }
    }

    // ─── Helpers Auxiliares de Interfaz ──────────────────────────────────────────

    function _showApiError(msg) {
        const el = document.getElementById('cd-api-error');
        if (!el) return;
        el.textContent   = msg;
        el.style.display = 'block';
    }

    function _clearApiError() {
        const el = document.getElementById('cd-api-error');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    function initCustomerDetailModal() {
        _loadTemplate();
    }

    // ─── Exposición Global de la API Pública del Componente ──────────────────────
    window.initCustomerDetailModal  = initCustomerDetailModal;
    window.openCustomerDetailModal  = openCustomerDetailModal;
    window.closeCustomerDetailModal = closeCustomerDetailModal;

})();