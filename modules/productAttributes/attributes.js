import { LineService } from './services/line.service.js';
import { PresentationService } from './services/presentation.service.js';
import { LinePresentationService } from './services/line-presentation.service.js';

let currentType = 'lines';
let currentEditId = null;
let currentLineForPresentations = null;
let currentPage = 1;
const pageSize = 10;

const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  setViewMeta();
  renderTable();
  if (window.lucide) lucide.createIcons();
});

function showToast(icon, title) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1600,
    timerProgressBar: true
  });

  Toast.fire({ icon, title });
}

function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScrollIfNeeded() {
  const hasOpenModal = document.querySelector('.modal-overlay.is-open, .modal-overlay.active');
  if (!hasOpenModal) {
    document.body.classList.remove('modal-open');
  }
}

function openModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('is-open', 'active');
  lockBodyScroll();
}

function closeModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('is-open', 'active');
  unlockBodyScrollIfNeeded();
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      currentPage = 1;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setViewMeta();
      renderTable();
    });
  });

  document.getElementById('btn-open-modal')?.addEventListener('click', openCreateModal);
  document.getElementById('btn-close-modal')?.addEventListener('click', closeAttributeModal);
  document.getElementById('btn-cancel')?.addEventListener('click', closeAttributeModal);
  document.getElementById('form-attribute')?.addEventListener('submit', handleAttributeSubmit);

  document.getElementById('btn-close-line-presentations')?.addEventListener('click', closeLinePresentationsModal);
  document.getElementById('btn-add-presentation-to-line')?.addEventListener('click', addPresentationToLine);

  document.getElementById('attributes-table-body')?.addEventListener('click', handleTableActions);
  document.getElementById('line-presentations-table-body')?.addEventListener('click', handleLinePresentationActions);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('is-open', 'active');
        unlockBodyScrollIfNeeded();
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.is-open, .modal-overlay.active').forEach(modal => {
        modal.classList.remove('is-open', 'active');
      });
      unlockBodyScrollIfNeeded();
    }
  });
}

function setViewMeta() {
  const isLines = currentType === 'lines';
  const btnAddLabel = document.getElementById('btn-add-label');
  const pageSubtitle = document.getElementById('page-subtitle');
  const tableTitle = document.getElementById('table-title');

  if (btnAddLabel) btnAddLabel.textContent = isLines ? 'Nueva Línea' : 'Nueva Presentación';
  if (pageSubtitle) {
    pageSubtitle.textContent = isLines
      ? 'Administra las líneas del sistema'
      : 'Administra las presentaciones del sistema';
  }
  if (tableTitle) {
    tableTitle.innerHTML = `
      ${isLines ? 'Lista de Líneas' : 'Lista de Presentaciones'}
      <span class="count-badge" id="attributes-count">0</span>
    `;
  }
}

async function renderTable() {
  const tbody = document.getElementById('attributes-table-body');
  const tableInfo = document.getElementById('table-info-text');

  if (!tbody || !tableInfo) return;

  tbody.innerHTML = `<tr><td colspan="3">Cargando...</td></tr>`;
  tableInfo.textContent = 'Cargando...';

  try {
    const service = currentType === 'lines' ? LineService : PresentationService;
    const res = await service.getAll(token, currentPage, pageSize);
   const paged = res?.data ?? {};
const items = paged.data ?? [];
const totalRecords = paged.totalRecords ?? items.length;
const totalPages = paged.totalPages ?? 1;
const current = paged.currentPage ?? currentPage;

await updateStats(totalRecords);

    const countEl = document.getElementById('attributes-count');
    if (countEl) countEl.textContent = totalRecords;

    tableInfo.textContent = `Página ${current} de ${totalPages} · ${totalRecords} registro(s) en total.`;

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state-row">No hay registros disponibles.</td></tr>`;
      renderPagination(totalPages, current);
      return;
    }

    tbody.innerHTML = items.map(item => {
      const id = item.id;
      const name = item.lineName || item.presentationName || item.name || 'Sin nombre';
      const isActive = item.isActive === true;

      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>
            <span class="status-pill ${isActive ? 'active' : 'inactive'}">
              ${isActive ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td>
            <div class="col-actions">
              ${currentType === 'lines' ? `
                <button class="btn-action" data-action="manage-presentations" data-id="${id}" data-name="${escapeHtml(name)}" title="Gestionar presentaciones">
                  <i data-lucide="layers-3"></i>
                </button>
              ` : ''}
              <button class="btn-action" data-action="edit" data-id="${id}" title="Editar">
                <i data-lucide="pencil"></i>
              </button>
              <button class="btn-action" data-action="toggle-status" data-id="${id}" data-active="${isActive}" title="Cambiar estado">
                <i data-lucide="refresh-cw"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(totalPages, current);
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state-row">Error al cargar datos.</td></tr>`;
    tableInfo.textContent = 'No fue posible cargar la información.';
    renderPagination(1, 1);
  }
}

function renderPagination(totalPages, current) {
  const container = document.getElementById('table-pagination');
  if (!container) return;

  if (!totalPages || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="btn-page" ${current <= 1 ? 'disabled' : ''} data-page="prev">Anterior</button>
    <span class="page-indicator">Página ${current} de ${totalPages}</span>
    <button class="btn-page" ${current >= totalPages ? 'disabled' : ''} data-page="next">Siguiente</button>
  `;

  container.querySelector('[data-page="prev"]')?.addEventListener('click', async () => {
    if (currentPage > 1) {
      currentPage--;
      await renderTable();
    }
  });

  container.querySelector('[data-page="next"]')?.addEventListener('click', async () => {
    if (currentPage < totalPages) {
      currentPage++;
      await renderTable();
    }
  });
}

async function updateStats(totalRecords) {
  try {
    const service = currentType === 'lines' ? LineService : PresentationService;
    const res = await service.getAll(token, 1, 1000);
    const allItems = normalizeArrayResponse(res);

    const active = allItems.filter(x => x.isActive === true).length;
    const inactive = allItems.filter(x => x.isActive !== true).length;

    const totalEl = document.getElementById('card-total');
    const activeEl = document.getElementById('card-active');
    const inactiveEl = document.getElementById('card-inactive');

    if (totalEl) totalEl.textContent = totalRecords;
    if (activeEl) activeEl.textContent = active;
    if (inactiveEl) inactiveEl.textContent = inactive;
  } catch (error) {
    console.error('Error al calcular estadísticas globales:', error);
  }
}

async function openCreateModal() {
  currentEditId = null;

  const idEl = document.getElementById('attribute-id');
  const nameEl = document.getElementById('attribute-name');
  const statusEl = document.getElementById('attribute-status');
  const titleEl = document.getElementById('modal-title');

  if (idEl) idEl.value = '';
  if (nameEl) nameEl.value = '';
  if (statusEl) statusEl.value = 'true';
  if (titleEl) {
    titleEl.textContent = currentType === 'lines'
      ? 'Agregar Línea'
      : 'Agregar Presentación';
  }

  const lineGroup = document.getElementById('line-presentations-group');
  if (lineGroup) {
    if (currentType === 'lines') {
      lineGroup.style.display = 'flex';
      await loadPresentationCheckboxes();
    } else {
      lineGroup.style.display = 'none';
    }
  }

  openModalById('modal-attribute');
}

function closeAttributeModal() {
  closeModalById('modal-attribute');
}

async function loadPresentationCheckboxes(selectedIds = []) {
  const container = document.getElementById('line-presentations-checkboxes');
  if (!container) return;

  container.innerHTML = `<div class="checkbox-empty">Cargando presentaciones...</div>`;

  try {
    const res = await PresentationService.getAll(token, 1, 100);
    const items = normalizeArrayResponse(res).filter(x => x.isActive === true);

    if (!items.length) {
      container.innerHTML = `<div class="checkbox-empty">No hay presentaciones activas</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <label class="checkbox-card">
        <input
          type="checkbox"
          class="presentation-checkbox"
          value="${item.id}"
          ${selectedIds.includes(item.id) ? 'checked' : ''}
        />
        <span>${escapeHtml(item.presentationName || item.name || 'Sin nombre')}</span>
      </label>
    `).join('');
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="checkbox-empty">Error al cargar presentaciones</div>`;
  }
}

async function handleAttributeSubmit(e) {
  e.preventDefault();

  const nameValue = document.getElementById('attribute-name')?.value.trim() || '';
  const isActiveValue = document.getElementById('attribute-status')?.value === 'true';

  if (!nameValue || nameValue.length < 3) {
    Swal.fire('Campo inválido', 'El nombre debe tener al menos 3 caracteres.', 'warning');
    return;
  }

  if (currentType === 'lines') {
    const selectedPresentations = getSelectedPresentationCheckboxes();
    if (selectedPresentations.length === 0) {
      Swal.fire('Selección requerida', 'Debes seleccionar al menos una presentación para esta línea.', 'warning');
      return;
    }
  }

  try {
    if (currentType === 'lines') {
      const dto = { lineName: nameValue, isActive: isActiveValue };

      if (currentEditId) {
        const response = await LineService.update(token, currentEditId, dto);
        if (!response.ok || response.data?.success === false) {
          throw new Error(response.data?.message || response.data?.errorMessage || 'No se pudo actualizar la línea');
        }
        await syncLinePresentations(currentEditId);
      } else {
        const createResponse = await LineService.create(token, dto);
        if (!createResponse.ok || createResponse.data?.success === false) {
          throw new Error(createResponse.data?.message || createResponse.data?.errorMessage || 'No se pudo crear la línea');
        }
        const newLineId = createResponse.data?.data?.id || createResponse.data?.id;
        if (!newLineId) throw new Error('No se obtuvo el id de la línea creada');
        await syncLinePresentations(newLineId);
      }
    } else {
      const dto = { presentationName: nameValue, isActive: isActiveValue };

      if (currentEditId) {
        const response = await PresentationService.update(token, currentEditId, dto);
        if (!response.ok || response.data?.success === false) {
          throw new Error(response.data?.message || response.data?.errorMessage || 'No se pudo actualizar la presentación');
        }
      } else {
        const response = await PresentationService.create(token, dto);
        if (!response.ok || response.data?.success === false) {
          throw new Error(response.data?.message || response.data?.errorMessage || 'No se pudo crear la presentación');
        }
      }
    }

    closeAttributeModal();
    await renderTable();
    showToast('success', 'Registro guardado correctamente');
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message || 'Ocurrió un error al guardar.', 'error');
  }
}

async function syncLinePresentations(lineId) {
  const selectedPresentationIds = getSelectedPresentationCheckboxes();
  const relationsRes = await LinePresentationService.getAll(token);
  const relations = normalizeArrayResponse(relationsRes);
  const currentRelations = relations.filter(rel => rel.line?.id === lineId);

  const currentPresentationIds = currentRelations
    .map(rel => rel.presentation?.id)
    .filter(Boolean);

  const idsToAdd = selectedPresentationIds.filter(id => !currentPresentationIds.includes(id));
  const relationsToRemove = currentRelations.filter(rel => !selectedPresentationIds.includes(rel.presentation?.id));

  for (const relation of relationsToRemove) {
    await LinePresentationService.delete(token, relation.id);
  }

  for (const presentationId of idsToAdd) {
    await LinePresentationService.create(token, {
      lineId,
      presentationId
    });
  }
}

async function handleTableActions(e) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const isActive = button.dataset.active === 'true';
  const row = button.closest('tr');
  const name = row?.children?.[0]?.textContent?.trim() || '';

  if (action === 'edit') {
    await openEditModal(id);
    return;
  }

  if (action === 'toggle-status') {
    await toggleStatusInstant(id, isActive);
    return;
  }

  if (action === 'manage-presentations') {
    await openLinePresentationsModal(id, name);
  }
}

async function openEditModal(id) {
  try {
    const service = currentType === 'lines' ? LineService : PresentationService;
    const res = await service.getById(token, id);
    const item = res?.data?.data || res?.data || res;

    currentEditId = id;

    const idEl = document.getElementById('attribute-id');
    const nameEl = document.getElementById('attribute-name');
    const statusEl = document.getElementById('attribute-status');
    const titleEl = document.getElementById('modal-title');
    const lineGroup = document.getElementById('line-presentations-group');

    if (idEl) idEl.value = id;
    if (nameEl) nameEl.value = item.lineName || item.presentationName || '';
    if (statusEl) statusEl.value = item.isActive === true ? 'true' : 'false';
    if (titleEl) {
      titleEl.textContent = currentType === 'lines'
        ? 'Editar Línea'
        : 'Editar Presentación';
    }

    if (lineGroup) {
      if (currentType === 'lines') {
        lineGroup.style.display = 'flex';
        const relationsRes = await LinePresentationService.getAll(token);
        const relations = normalizeArrayResponse(relationsRes);
        const selectedIds = relations
          .filter(rel => rel.line?.id === id)
          .map(rel => rel.presentation?.id)
          .filter(Boolean);

        await loadPresentationCheckboxes(selectedIds);
      } else {
        lineGroup.style.display = 'none';
      }
    }

    openModalById('modal-attribute');
  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'No se pudo cargar el registro.', 'error');
  }
}

async function toggleStatusInstant(id, currentStatus) {
  try {
    if (currentType === 'lines') {
      const lineDetail = await LineService.getById(token, id);
      const line = lineDetail?.data?.data || lineDetail?.data || lineDetail;
      const dto = {
        lineName: line.lineName,
        isActive: !currentStatus
      };
      const response = await LineService.updateStatus(token, id, dto);
      if (!response.ok || response.data?.success === false) {
        throw new Error(response.data?.message || response.data?.errorMessage || 'No se pudo cambiar el estado de la línea');
      }
    } else {
      const presDetail = await PresentationService.getById(token, id);
      const presentation = presDetail?.data?.data || presDetail?.data || presDetail;
      const dto = {
        presentationName: presentation.presentationName,
        isActive: !currentStatus
      };
      const response = await PresentationService.updateStatus(token, id, dto);
      if (!response.ok || response.data?.success === false) {
        throw new Error(response.data?.message || response.data?.errorMessage || 'No se pudo cambiar el estado de la presentación');
      }
    }

    await renderTable();
    showToast('success', 'Estado actualizado');
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message || 'No fue posible cambiar el estado.', 'error');
  }
}

async function openLinePresentationsModal(lineId, lineName) {
  currentLineForPresentations = { id: lineId, name: lineName };
  document.getElementById('line-presentations-title').textContent = 'Presentaciones por línea';
  document.getElementById('line-presentations-subtitle').textContent = `Línea: ${lineName}`;

  openModalById('modal-line-presentations');

  await Promise.all([
    loadAssignedPresentations(lineId),
    loadPresentationOptions(lineId)
  ]);

  if (window.lucide) lucide.createIcons();
}

function closeLinePresentationsModal() {
  closeModalById('modal-line-presentations');
  currentLineForPresentations = null;
}

async function loadAssignedPresentations(lineId) {
  const tbody = document.getElementById('line-presentations-table-body');
  const info = document.getElementById('line-presentations-info-text');

  if (!tbody || !info) return;

  tbody.innerHTML = `<tr><td colspan="2">Cargando...</td></tr>`;
  info.textContent = 'Cargando...';

  try {
    const relationsRes = await LinePresentationService.getAll(token);
    const relations = normalizeArrayResponse(relationsRes);
    const relationsForLine = relations.filter(rel => rel.line?.id === lineId);

    const countEl = document.getElementById('line-presentations-count');
    if (countEl) countEl.textContent = relationsForLine.length;
    info.textContent = `${relationsForLine.length} presentación(es) asignada(s).`;

    if (!relationsForLine.length) {
      tbody.innerHTML = `<tr><td colspan="2" class="empty-state-row">Esta línea aún no tiene presentaciones asignadas.</td></tr>`;
      return;
    }

    tbody.innerHTML = relationsForLine.map(rel => `
      <tr>
        <td>${escapeHtml(rel.presentation?.presentationName || rel.presentation?.name || 'Sin nombre')}</td>
        <td>
          <div class="col-actions">
            <button class="btn-action btn-action-danger" data-action="remove-line-presentation" data-id="${rel.id}" title="Eliminar">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="2" class="empty-state-row">No fue posible cargar las presentaciones asignadas.</td></tr>`;
    info.textContent = 'Error al cargar.';
  }
}

async function loadPresentationOptions(lineId) {
  const select = document.getElementById('presentation-select');
  if (!select) return;

  try {
    const [allPresentationsRes, relationsRes] = await Promise.all([
      PresentationService.getAll(token, 1, 100),
      LinePresentationService.getAll(token)
    ]);

    const allPresentations = normalizeArrayResponse(allPresentationsRes).filter(p => p.isActive === true);
    const allRelations = normalizeArrayResponse(relationsRes);

    const assignedIds = new Set(
      allRelations
        .filter(rel => rel.line?.id === lineId)
        .map(rel => rel.presentation?.id)
        .filter(Boolean)
    );

    const available = allPresentations.filter(p => !assignedIds.has(p.id));

    if (!available.length) {
      select.innerHTML = `<option value="">No hay presentaciones disponibles</option>`;
      return;
    }

    select.innerHTML = `
      <option value="">Seleccione una presentación</option>
      ${available.map(p => `<option value="${p.id}">${escapeHtml(p.presentationName || p.name || 'Sin nombre')}</option>`).join('')}
    `;
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Error al cargar opciones</option>`;
  }
}

async function addPresentationToLine() {
  if (!currentLineForPresentations) return;

  const select = document.getElementById('presentation-select');
  const presentationId = Number(select?.value);

  if (!presentationId) {
    Swal.fire('Campo requerido', 'Debes seleccionar una presentación.', 'warning');
    return;
  }

  try {
    const res = await LinePresentationService.create(token, {
      lineId: currentLineForPresentations.id,
      presentationId
    });

    if (res.success === false || res.data?.success === false) {
      throw new Error(res.message || res.data?.message || 'No se pudo crear la relación');
    }

    await loadAssignedPresentations(currentLineForPresentations.id);
    await loadPresentationOptions(currentLineForPresentations.id);
    showToast('success', 'Presentación asignada');
  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message || 'No fue posible asignar la presentación.', 'error');
  }
}

async function handleLinePresentationActions(e) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  if (action === 'remove-line-presentation') {
    try {
      const res = await LinePresentationService.delete(token, id);
      if (res.success === false || res.data?.success === false) {
        throw new Error(res.message || res.data?.message || 'No se pudo eliminar la relación');
      }

      await loadAssignedPresentations(currentLineForPresentations.id);
      await loadPresentationOptions(currentLineForPresentations.id);
      showToast('success', 'Presentación removida');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.message || 'No fue posible eliminar la relación.', 'error');
    }
  }
}

function getSelectedPresentationCheckboxes() {
  return Array.from(document.querySelectorAll('.presentation-checkbox:checked'))
    .map(input => Number(input.value))
    .filter(Boolean);
}

function normalizeArrayResponse(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}