import { FlavorService } from './services/flavors.services.js';

let currentPage = 1;
const pageSize = 8;
const PLACEHOLDER_IMAGE = '../../../assets/img/placeholder.png';
const API_FILE_BASE = 'https://localhost:7035';

let allFlavors = [];
let filteredFlavors = [];
let selectedImageFile = null;
let editingFlavorId = null;
let currentFlavorDetail = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();

    setupEventListeners();
    resetUploadArea();
    await loadFlavors();
});

function setupEventListeners() {
    const btnOpenCreate = document.querySelector('.page-header-actions .btn-primary');
    if (btnOpenCreate) btnOpenCreate.addEventListener('click', openCreateFlavorModal);

    const btnCloseCreate = document.querySelector('.create-flavor-close');
    const btnCancelCreate = document.querySelector('.create-flavor-footer .btn-outline');
    if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateFlavorModal);
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateFlavorModal);

    const btnCloseDetail = document.querySelector('.flavor-modal-close');
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeDetailFlavorModal);

    const btnSave = document.getElementById('btn-save-flavor');
    if (btnSave) btnSave.addEventListener('click', saveFlavor);

    const btnSearch = document.getElementById('btn-search');
    if (btnSearch) btnSearch.addEventListener('click', () => applyFiltersAndRender(1));

    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            const searchInput = document.getElementById('search-flavor');
            const statusInput = document.getElementById('filter-status');

            if (searchInput) searchInput.value = '';
            if (statusInput) statusInput.value = '';

            applyFiltersAndRender(1);
        });
    }

    const searchInput = document.getElementById('search-flavor');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyFiltersAndRender(1);
        });
    }

    const statusInput = document.getElementById('filter-status');
    if (statusInput) {
        statusInput.addEventListener('change', () => applyFiltersAndRender(1));
    }

    const colorInput = document.getElementById('flavor-color');
    const colorText = document.getElementById('flavor-color-text');
    if (colorInput && colorText) {
        colorInput.addEventListener('input', (e) => {
            colorText.value = normalizeHex(e.target.value);
        });

        colorText.addEventListener('input', (e) => {
            const value = normalizeHex(e.target.value, false);
            if (value) colorInput.value = value;
        });
    }

    const btnStatusActive = document.getElementById('btn-status-active');
    const btnStatusInactive = document.getElementById('btn-status-inactive');
    if (btnStatusActive) btnStatusActive.addEventListener('click', () => toggleStatusUI(true));
    if (btnStatusInactive) btnStatusInactive.addEventListener('click', () => toggleStatusUI(false));

    const grid = document.getElementById('flavors-grid');
    if (grid) {
        grid.addEventListener('click', async (e) => {
            const btnView = e.target.closest('.btn-view');
            if (btnView) {
                const id = btnView.getAttribute('data-id');
                await viewFlavorDetail(id);
            }
        });
    }

    const btnEditDetail = document.getElementById('btn-edit-detail-flavor');
    if (btnEditDetail) {
        btnEditDetail.addEventListener('click', () => {
            if (currentFlavorDetail) openEditFlavorModal(currentFlavorDetail);
        });
    }
}

window.openCreateFlavorModal = function () {
    editingFlavorId = null;
    currentFlavorDetail = null;
    selectedImageFile = null;

    const nameInput = document.getElementById('flavor-name');
    const colorInput = document.getElementById('flavor-color');
    const colorTextInput = document.getElementById('flavor-color-text');

    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = '#FF6B6B';
    if (colorTextInput) colorTextInput.value = '#FF6B6B';

    const modalTitle = document.getElementById('create-modal-title');
    const modalSubtitle = document.getElementById('create-modal-subtitle');

    if (modalTitle) modalTitle.textContent = 'Nuevo sabor';
    if (modalSubtitle) modalSubtitle.textContent = 'Completa los datos del sabor';

    resetUploadArea();
    toggleStatusUI(true);

    document.getElementById('createFlavorModal')?.classList.add('is-open');
    if (window.lucide) lucide.createIcons();
};

window.closeCreateFlavorModal = function () {
    document.getElementById('createFlavorModal')?.classList.remove('is-open');
};

window.closeDetailFlavorModal = function () {
    document.getElementById('detailFlavorModal')?.classList.remove('is-open');
};

window.toggleStatusUI = function (isActive) {
    const btnActive = document.getElementById('btn-status-active');
    const btnInactive = document.getElementById('btn-status-inactive');
    const inputHidden = document.getElementById('flavor-is-active');

    if (!btnActive || !btnInactive || !inputHidden) return;

    if (isActive) {
        btnActive.classList.add('active');
        btnInactive.classList.remove('active');
        inputHidden.value = 'true';
    } else {
        btnInactive.classList.add('active');
        btnActive.classList.remove('active');
        inputHidden.value = 'false';
    }
};

function resetUploadArea(imageUrl = '') {
    const uploadArea = document.getElementById('flavor-image-preview-wrapper');
    if (!uploadArea) return;

    uploadArea.classList.remove('has-image');
    uploadArea.style.backgroundImage = 'none';

    uploadArea.innerHTML = `
        <input type="file" id="flavor-image-input" accept="image/png, image/jpeg" hidden />
        <div class="create-flavor-upload-icon"><i data-lucide="image-plus"></i></div>
        <p class="upload-title">Subir imagen del sabor</p>
        <p class="upload-subtitle">PNG, JPG · Máx. 2 MB</p>
    `;

    if (imageUrl) {
        uploadArea.classList.add('has-image');
        uploadArea.style.backgroundImage = `url('${imageUrl}')`;
    }

    if (window.lucide) lucide.createIcons();
    attachImageUploadEvent();
}

function attachImageUploadEvent() {
    const imagePreview = document.getElementById('flavor-image-preview-wrapper');
    const imageInput = document.getElementById('flavor-image-input');

    if (!imagePreview || !imageInput) return;

    imagePreview.onclick = () => {
        imageInput.click();
    };

    imageInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        selectedImageFile = file;

        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.classList.add('has-image');
            imagePreview.style.backgroundImage = `url('${event.target.result}')`;
        };
        reader.readAsDataURL(file);
    };
}
async function loadFlavors() {
    const grid = document.getElementById('flavors-grid');
    if (grid) {
        grid.innerHTML = '<p style="padding:20px;">Cargando sabores...</p>';
    }

    try {
        const result = await FlavorService.getAll(1, 1000);
        const payload = result?.data ?? result ?? {};
        const rawFlavors = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
            ? payload
            : [];

        allFlavors = dedupeById(rawFlavors.map(normalizeFlavor));
        applyFiltersAndRender(1);
    } catch (error) {
        console.error('Error al obtener sabores:', error);

        if (grid) {
            grid.innerHTML = '<p style="padding:20px;">No se pudieron cargar los sabores. Verifica la conexión con el servidor.</p>';
        }

        showErrorAlert(
            'No se pudieron cargar los sabores',
            'Verifica la conexión con el servidor e intenta nuevamente.'
        );
    }

    if (window.lucide) lucide.createIcons();
}

function applyFiltersAndRender(page = 1) {
    const searchTerm = normalizeText(document.getElementById('search-flavor')?.value || '');
    const statusFilter = document.getElementById('filter-status')?.value ?? '';

    filteredFlavors = allFlavors.filter((flavor) => {
        const haystack = [
            flavor.name,
            flavor.code,
            flavor.color,
            flavor.category,
            flavor.raw?.categoryName
        ]
            .filter(Boolean)
            .map(normalizeText)
            .join(' ');

        const matchesSearch = !searchTerm || haystack.includes(searchTerm);
        const matchesStatus = statusFilter === '' || String(flavor.isActive) === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalRecords = filteredFlavors.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    currentPage = Math.min(Math.max(page, 1), totalPages);

    const start = (currentPage - 1) * pageSize;
    const pagedFlavors = filteredFlavors.slice(start, start + pageSize);

    renderGrid(pagedFlavors);
    updateStats(allFlavors, filteredFlavors);
    renderPagination({
        pageNumber: currentPage,
        totalPages,
        totalRecords,
        data: pagedFlavors
    });

    if (window.lucide) lucide.createIcons();
}

function renderPagination(response) {
    const pageNumber = response.pageNumber || 1;
    const totalPages = response.totalPages || 1;
    const totalRecords = response.totalRecords || 0;
    const currentCount = response.data?.length || 0;

    currentPage = pageNumber;

    const startItem = totalRecords === 0 ? 0 : ((pageNumber - 1) * pageSize) + 1;
    const endItem = totalRecords === 0 ? 0 : Math.min(startItem + currentCount - 1, totalRecords);

    const info = document.getElementById('pagination-info-text');
    if (info) {
        info.innerHTML = `Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalRecords}</strong> sabores`;
    }

    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const numbers = document.getElementById('pagination-numbers');

    if (btnPrev) {
        btnPrev.disabled = pageNumber <= 1;
        btnPrev.onclick = () => {
            if (pageNumber > 1) applyFiltersAndRender(pageNumber - 1);
        };
    }

    if (btnNext) {
        btnNext.disabled = pageNumber >= totalPages;
        btnNext.onclick = () => {
            if (pageNumber < totalPages) applyFiltersAndRender(pageNumber + 1);
        };
    }

    if (numbers) {
        numbers.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `pagination-number ${i === pageNumber ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => applyFiltersAndRender(i));
            numbers.appendChild(btn);
        }
    }
}

function renderGrid(flavors) {
    const grid = document.getElementById('flavors-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!flavors.length) {
        grid.innerHTML = `
            <div class="flavors-empty-state">
                <i data-lucide="search-x"></i>
                <h3>No hay sabores registrados</h3>
                <p>No encontramos resultados con los filtros actuales.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    flavors.forEach((flavor) => {
        const statusClass = flavor.isActive ? 'active' : 'inactive';
        const statusText = flavor.isActive ? 'Activo' : 'Inactivo';

        const cardHTML = `
            <div class="product-card">
                <span class="product-card-status ${statusClass}">${statusText}</span>

                <div class="product-card-image flavor-image-wrap">
                    <img src="${escapeHtml(flavor.imageSrc)}" alt="Sabor ${escapeHtml(flavor.name)}" onerror="this.src='${PLACEHOLDER_IMAGE}'" />
                </div>

                <div class="product-card-body">
                    <h3 class="product-card-name">${escapeHtml(flavor.name)}</h3>

                    <div class="product-card-meta">
                        <span class="meta-tag" style="background: ${flavor.color}20; color: ${flavor.color};">
                            <i data-lucide="droplet"></i>
                            ${escapeHtml(flavor.color)}
                        </span>
                    </div>

                    <div class="product-card-code">${escapeHtml(flavor.code)}</div>
                </div>

                <button class="btn-view" type="button" data-id="${flavor.id}" aria-label="Ver detalle del sabor ${escapeHtml(flavor.name)}">
                    <i data-lucide="eye"></i>
                </button>
            </div>
        `;

        grid.insertAdjacentHTML('beforeend', cardHTML);
    });

    if (window.lucide) lucide.createIcons();
}

function updateStats(allItems = [], visibleItems = []) {
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statInactive = document.getElementById('stat-inactive');
    const resultsCount = document.getElementById('results-count');

    const total = allItems.length;
    const active = allItems.filter((x) => x.isActive).length;
    const inactive = allItems.filter((x) => !x.isActive).length;

    if (statTotal) statTotal.textContent = total;
    if (statActive) statActive.textContent = active;
    if (statInactive) statInactive.textContent = inactive;
    if (resultsCount) resultsCount.textContent = visibleItems.length;
}

async function saveFlavor() {
    const nameInput = document.getElementById('flavor-name');
    const colorInput = document.getElementById('flavor-color');
    const isActiveInput = document.getElementById('flavor-is-active');

    const name = nameInput?.value?.trim();
    const color = normalizeHex(colorInput?.value || '#FF6B6B');
    const isActive = isActiveInput?.value || 'true';

    if (!name) {
        showWarningAlert('Campo requerido', 'Debes ingresar el nombre del sabor.');
        return;
    }

    const formData = new FormData();
    formData.append('FlavorName', name);
    formData.append('FlavorColor', color);
    formData.append('IsActive', isActive);

    if (selectedImageFile) {
    formData.append('Image', selectedImageFile, selectedImageFile.name);
}

    if (editingFlavorId) {
        formData.append('Id', String(editingFlavorId));
    }

    try {
        if (editingFlavorId && typeof FlavorService.update === 'function') {
            await FlavorService.update(editingFlavorId, formData);

            showSuccessAlert(
                'Sabor actualizado',
                'Los cambios del sabor se guardaron correctamente.'
            );
        } else {
            await FlavorService.create(formData);

            showSuccessAlert(
                'Sabor creado',
                'El sabor se registró correctamente.'
            );
        }

        selectedImageFile = null;
        editingFlavorId = null;
        currentFlavorDetail = null;

        closeCreateFlavorModal();
        await loadFlavors();
        applyFiltersAndRender(1);
    } catch (error) {
        console.error('Error al guardar sabor:', error);

        const message = String(error.message || '').toLowerCase();
        const isEditing = Boolean(editingFlavorId);

        let title = isEditing ? 'No se pudo actualizar' : 'No se pudo crear';
        let text = isEditing
            ? 'Ocurrió un error al actualizar el sabor.'
            : 'Ocurrió un error al crear el sabor.';

        if (message.includes('ya existe')) {
            text = isEditing
                ? 'No se pudo actualizar porque ya existe otro sabor con ese nombre.'
                : 'Ya existe un sabor con ese nombre. Usa otro nombre o edita el existente.';
        } else if (
            message.includes('image') ||
            message.includes('imagen') ||
            message.includes('file') ||
            message.includes('archivo')
        ) {
            text = 'No se pudo procesar la imagen del sabor. Verifica el archivo e intenta nuevamente.';
        } else if (
            message.includes('400')
        ) {
            text = isEditing
                ? 'La información enviada para actualizar el sabor no es válida.'
                : 'La información enviada para crear el sabor no es válida.';
        } else if (
            message.includes('404')
        ) {
            text = 'No se encontró el servicio de sabores en el servidor.';
        } else if (
            message.includes('500')
        ) {
            text = 'El servidor presentó un error al procesar la solicitud.';
        }

        showErrorAlert(title, text);
    }
}

async function viewFlavorDetail(id) {
    try {
        let flavor = allFlavors.find((x) => String(x.id) === String(id))?.raw ?? null;

        if (typeof FlavorService.getById === 'function') {
            const result = await FlavorService.getById(id);
            flavor = result?.data ?? result ?? flavor;
        }

        if (!flavor) {
            showWarningAlert(
                'Sabor no encontrado',
                'No fue posible cargar el detalle del sabor seleccionado.'
            );
            return;
        }

        const normalized = normalizeFlavor(flavor);
        currentFlavorDetail = normalized.raw;

        const detailName = document.getElementById('detail-name');
        if (detailName) detailName.textContent = normalized.name;

        const statusEl = document.getElementById('detail-status');
        if (statusEl) {
            statusEl.textContent = normalized.isActive ? 'Activo' : 'Inactivo';
            statusEl.className = `flavor-status-badge ${normalized.isActive ? 'active' : 'inactive'}`;
        }

        const detailCode = document.getElementById('detail-code');
        if (detailCode) detailCode.textContent = normalized.code;

        const detailCategory = document.getElementById('detail-category');
        if (detailCategory) detailCategory.textContent = normalized.category || 'Sin categoría';

        const imgEl = document.getElementById('detail-image');
        if (imgEl) imgEl.src = normalized.imageSrc;

        const colorDot = document.getElementById('detail-color-dot');
        const colorText = document.getElementById('detail-color-text');
        if (colorDot) colorDot.style.background = normalized.color;
        if (colorText) colorText.textContent = normalized.color;

        document.getElementById('detailFlavorModal')?.classList.add('is-open');
    } catch (error) {
        console.error(error);
        showErrorAlert(
            'No se pudo cargar el detalle',
            'Ocurrió un error al obtener la información del sabor seleccionado.'
        );
    }
}
function openEditFlavorModal(flavor) {
    if (!flavor) return;

    const normalized = normalizeFlavor(flavor);

    editingFlavorId = normalized.id;
    currentFlavorDetail = normalized.raw;
    selectedImageFile = null;

    const nameInput = document.getElementById('flavor-name');
    const colorInput = document.getElementById('flavor-color');
    const colorTextInput = document.getElementById('flavor-color-text');

    if (nameInput) nameInput.value = normalized.name;
    if (colorInput) colorInput.value = normalized.color;
    if (colorTextInput) colorTextInput.value = normalized.color;

    const modalTitle = document.getElementById('create-modal-title');
    const modalSubtitle = document.getElementById('create-modal-subtitle');

    if (modalTitle) modalTitle.textContent = 'Editar sabor';
    if (modalSubtitle) modalSubtitle.textContent = 'Actualiza la información del sabor';

    const hasRealImage = normalized.imageSrc && !normalized.imageSrc.includes('ui-avatars.com');
    resetUploadArea(hasRealImage ? normalized.imageSrc : '');

    toggleStatusUI(normalized.isActive);

    closeDetailFlavorModal();
    document.getElementById('createFlavorModal')?.classList.add('is-open');
}
function normalizeFlavor(flavor) {
    const id = flavor.id ?? flavor.flavorId ?? 0;
    const name = flavor.flavorName ?? flavor.name ?? 'Sin nombre';
    const color = normalizeHex(flavor.flavorColor ?? flavor.color ?? '#CBD5E1');
    const code = flavor.code ?? flavor.flavorCode ?? `SAB-${id}`;
    const category = flavor.categoryName ?? flavor.category ?? 'Sin categoría';

    const isActive =
        typeof flavor.isActive === 'boolean'
            ? flavor.isActive
            : String(flavor.isActive).toLowerCase() === 'true';

    const rawImage = flavor.imageUrl ?? flavor.image ?? '';
    const imageSrc = rawImage
        ? (String(rawImage).startsWith('http') ? rawImage : `${API_FILE_BASE}${rawImage}`)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EEF2F6&color=94A3B8&size=150`;

    return {
        id,
        name,
        color,
        code,
        category,
        isActive,
        imageSrc,
        raw: flavor
    };
}

function dedupeById(items) {
    const map = new Map();

    items.forEach((item) => {
        map.set(String(item.id), item);
    });

    return [...map.values()];
}

function normalizeHex(value, fallback = true) {
    const raw = String(value || '').trim().toUpperCase();
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    const valid = /^#[0-9A-F]{6}$/.test(normalized);

    if (valid) return normalized;
    return fallback ? '#FF6B6B' : '';
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function showSuccessAlert(title, text) {
    Swal.fire({
        title,
        text,
        icon: 'success',
        confirmButtonColor: '#10b981'
    });
}

function showWarningAlert(title, text) {
    Swal.fire({
        title,
        text,
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
    });
}

function showErrorAlert(title, text) {
    Swal.fire({
        title,
        text,
        icon: 'error',
        confirmButtonColor: '#ef4444'
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}