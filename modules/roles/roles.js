import { RolesService } from './services/roles.service.js';

let activeRoleId = null;

async function loadRolesTable() {
    const tbody = document.getElementById('roles-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando roles...</td></tr>';

    try {
        const response = await RolesService.getAllRoles();
        const rolesList = response.data || []; 

        tbody.innerHTML = ''; 
        document.getElementById('roles-count').textContent = rolesList.length;
        document.getElementById('count-total').textContent = rolesList.length;

        let actives = 0, inactives = 0;

        if (rolesList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay roles registrados.</td></tr>';
            return;
        }

        rolesList.forEach(role => {
            const statusClass = role.isActive ? 'status-active' : 'status-inactive';
            const statusText = role.isActive ? 'Activo' : 'Inactivo';
            if (role.isActive) actives++; else inactives++;

            const row = `
                <tr data-id="${role.id}" 
                    data-rolename="${role.roleName || ''}" 
                    data-desc="${role.roleDescription || ''}" 
                    data-status="${role.isActive ? 'active' : 'inactive'}">
                    <td><span style="color: var(--text-muted); font-weight: 500;">#${role.id}</span></td>
                    <td>
                        <span class="role-badge ${role.roleName === 'Admin' || role.roleName === 'Administrador' ? 'role-admin' : 'role-seller'}">
                            ${role.roleName}
                        </span>
                    </td>
                    <td style="color: var(--text-secondary); max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${role.roleDescription || 'Sin descripción'}
                    </td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="row-actions">
                            <button type="button" class="btn-detail btn-edit" title="Ver Detalles"><i data-lucide="eye"></i></button>
                            <button type="button" class="btn-detail btn-toggle-status" title="Cambiar Estado"><i data-lucide="refresh-cw"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        document.getElementById('count-active').textContent = actives;
        document.getElementById('count-inactive').textContent = inactives;
        document.getElementById('table-info-text').innerHTML = `Mostrando <strong>1-${rolesList.length}</strong> de <strong>${rolesList.length}</strong> roles`;

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error al conectar con el servidor</td></tr>';
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadRolesTable();

    const overlayRole = document.getElementById('modal-role');
    document.getElementById('btn-open-modal')?.addEventListener('click', () => overlayRole.classList.add('active'));
    document.getElementById('btn-close-modal')?.addEventListener('click', () => overlayRole.classList.remove('active'));
    document.getElementById('btn-cancel')?.addEventListener('click', () => overlayRole.classList.remove('active'));

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#roles-table-body tr');

            rows.forEach(row => {
                const rName = (row.dataset.rolename || '').toLowerCase();
                const desc = (row.dataset.desc || '').toLowerCase();

                if (rName.includes(searchTerm) || desc.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    const formRole = document.getElementById('form-role');
    if (formRole) {
        formRole.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newRole = {
                roleName: document.getElementById('role-name').value.trim(),
                roleDescription: document.getElementById('role-desc').value.trim(),
                isActive: document.getElementById('status').value === 'active'
            };

            try {
                await RolesService.createRole(newRole);
                Swal.fire({ title: '¡Éxito!', text: 'Rol registrado correctamente.', icon: 'success', confirmButtonColor: '#10b981' });
                overlayRole.classList.remove('active');
                formRole.reset();
                loadRolesTable();
            } catch (error) {
                Swal.fire({ title: 'No se pudo registrar', text: error.message, icon: 'error', confirmButtonColor: '#10b981' });
            }
        });
    }

    const overlayViewRole = document.getElementById('modal-view-role');
    
    document.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit');
        if (editButton) {
            const row = editButton.closest('tr');
            if (row) {
                const d = row.dataset;
                activeRoleId = parseInt(d.id);

                document.getElementById('view-role-name').textContent = d.rolename;
                document.getElementById('view-role-desc').textContent = d.desc;
                document.getElementById('view-role-status').textContent = d.status === 'active' ? 'Activo' : 'Inactivo';
                
                document.getElementById('edit-role-name').value = d.rolename;
                document.getElementById('edit-role-desc').value = d.desc;
                document.getElementById('edit-status').value = d.status;
                
                switchToViewMode();
                overlayViewRole.classList.add('active');
            }
        }

        const statusButton = e.target.closest('.btn-toggle-status');
        if (statusButton) {
            const row = statusButton.closest('tr');
            if (row) {
                const id = row.dataset.id;
                try {
                    await RolesService.toggleStatus(id);
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true });
                    Toast.fire({ icon: 'success', title: 'Estado actualizado' });
                    loadRolesTable();
                } catch (error) {
                    Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#10b981' });
                }
            }
        }
    });

   
    const formViewRole = document.getElementById('form-view-role');
    if (formViewRole) {
        formViewRole.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeRoleId) return;

            const updatedRole = {
                id: activeRoleId,
                roleName: document.getElementById('edit-role-name').value.trim(),
                roleDescription: document.getElementById('edit-role-desc').value.trim(),
                isActive: document.getElementById('edit-status').value === 'active'
            };

            try {
                await RolesService.updateRole(updatedRole);
                Swal.fire({ title: '¡Actualizado!', text: 'Rol actualizado con éxito.', icon: 'success', confirmButtonColor: '#10b981' });
                overlayViewRole.classList.remove('active');
                switchToViewMode();
                loadRolesTable();
            } catch (error) {
                Swal.fire({ title: 'Error al actualizar', text: error.message, icon: 'error', confirmButtonColor: '#10b981' });
            }
        });
    }

    function switchToViewMode() {
        document.getElementById('view-role-title').textContent = 'Ver Rol';
        document.getElementById('view-mode').classList.remove('hidden');
        document.getElementById('edit-mode').classList.add('hidden');
        document.getElementById('btn-edit-toggle').classList.remove('hidden');
        document.getElementById('btn-cancel-edit').classList.add('hidden');
        document.getElementById('btn-cancel-view').classList.remove('hidden');
        document.getElementById('btn-save-role').classList.add('hidden');
    }

    function switchToEditMode() {
        document.getElementById('view-role-title').textContent = 'Editar Rol';
        document.getElementById('view-mode').classList.add('hidden');
        document.getElementById('edit-mode').classList.remove('hidden');
        document.getElementById('btn-edit-toggle').classList.add('hidden');
        document.getElementById('btn-cancel-edit').classList.remove('hidden');
        document.getElementById('btn-cancel-view').classList.add('hidden');
        document.getElementById('btn-save-role').classList.remove('hidden');
    }

    document.getElementById('btn-edit-toggle')?.addEventListener('click', switchToEditMode);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', switchToViewMode);
    document.getElementById('btn-close-view-modal')?.addEventListener('click', () => { overlayViewRole.classList.remove('active'); switchToViewMode(); });
    document.getElementById('btn-cancel-view')?.addEventListener('click', () => { overlayViewRole.classList.remove('active'); switchToViewMode(); });
});