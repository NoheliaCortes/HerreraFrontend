import { UsersService } from './services/users.service.js';

let activeUserId = null;

async function loadUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando usuarios...</td></tr>';

    try {
        const response = await UsersService.getAllUsers();
        const usersList = response.data || []; 

        tbody.innerHTML = ''; 
        document.getElementById('users-count').textContent = usersList.length;
        document.getElementById('table-info-text').innerHTML = `Mostrando <strong>1-${usersList.length}</strong> de <strong>${usersList.length}</strong> usuarios`;

        let actives = 0, inactives = 0, admins = 0, sellers = 0;

        if (usersList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios registrados.</td></tr>';
            return;
        }

        usersList.forEach(user => {
            const userRole = (user.roles && user.roles.length > 0) ? user.roles[0] : 'Vendedor';
            const roleClass = (userRole === 'Administrador' || userRole === 'Admin') ? 'role-admin' : 'role-seller';
            const statusClass = user.isActive ? 'status-active' : 'status-inactive';
            const statusText = user.isActive ? 'Activo' : 'Inactivo';

            if (user.isActive) actives++; else inactives++;
            if (userRole === 'Administrador' || userRole === 'Admin') admins++; else sellers++;

            const fName = user.firstName || '';
            const lName = user.lastName || '';
            const initials = (fName.charAt(0) + lName.charAt(0)).toUpperCase() || 'U';

            const row = `
                <tr data-id="${user.id}" 
                    data-firstname="${fName}" 
                    data-lastname="${lName}" 
                    data-username="${user.userName || ''}" 
                    data-idnumber="${user.idNumber || 'N/A'}" 
                    data-email="${user.email || ''}" 
                    data-role="${userRole}" 
                    data-status="${user.isActive ? 'active' : 'inactive'}">
                    <td>
                        <div class="client-cell">
                            <div class="client-avatar avatar-1">${initials}</div>
                            <div class="client-info">
                                <span class="client-name">${fName} ${lName}</span>
                                <span class="client-sub">@ ${user.userName || 'N/A'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.idNumber || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="role-badge ${roleClass}">${userRole}</span></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="row-actions">
                            <button type="button" class="btn-detail btn-edit" title="Ver Detalles"><i data-lucide="eye"></i></button>
                            <button type="button" class="btn-detail btn-toggle-status" title="Cambiar Estado"><i data-lucide="refresh-cw"></i></button>
                            <button type="button" class="btn-detail btn-reset-pass" title="Resetear Contraseña"><i data-lucide="key"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        document.getElementById('count-active').textContent = actives;
        document.getElementById('count-inactive').textContent = inactives;
        document.getElementById('count-admins').textContent = admins;
        document.getElementById('count-sellers').textContent = sellers;

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al conectar con el servidor</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadUsersTable();
    loadRolesDropdowns();

    const overlay = document.getElementById('modal-user');
    document.getElementById('btn-open-modal')?.addEventListener('click', () => overlay.classList.add('active'));
    document.getElementById('btn-close-modal')?.addEventListener('click', () => overlay.classList.remove('active'));
    document.getElementById('btn-cancel')?.addEventListener('click', () => overlay.classList.remove('active'));

    const togglePass = document.querySelector('.btn-toggle-pass');
    const passInput = document.getElementById('password');

    if (togglePass && passInput) {
        togglePass.addEventListener('click', () => {
            const isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            togglePass.innerHTML = isHidden ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
            if (window.lucide) lucide.createIcons();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#users-table-body tr');

            rows.forEach(row => {
                const fName = (row.dataset.firstname || '').toLowerCase();
                const lName = (row.dataset.lastname || '').toLowerCase();
                const uName = (row.dataset.username || '').toLowerCase();
                const email = (row.dataset.email || '').toLowerCase();
                const fullName = `${fName} ${lName}`;

                if (fullName.includes(searchTerm) || uName.includes(searchTerm) || email.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    const formUser = document.getElementById('form-user');
    if (formUser) {
        formUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            
        
            const passValue = document.getElementById('password').value;
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
            
            if (!passwordRegex.test(passValue)) {
                Swal.fire({
                    title: 'Contraseña débil',
                    text: 'Usa una contraseña más segura. Intenta combinar letras, números y símbolos.',
                    icon: 'warning',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            const newUser = {
                userName: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                idNumber: document.getElementById('id-number').value.trim(), 
                password: passValue,
                firstName: document.getElementById('first-name').value.trim(),
                lastName: document.getElementById('last-name').value.trim(),
                roleName: document.getElementById('role').value,
            };
            try {
                await UsersService.createUser(newUser);
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Usuario registrado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                overlay.classList.remove('active');
                formUser.reset();
                loadUsersTable();
            } catch (error) {
                Swal.fire({
                    title: 'No se pudo registrar',
                    text: error.message,
                    icon: 'error',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    async function loadRolesDropdowns() {
        try {
            const response = await UsersService.getRoles();
            
            if (!response.success) {
                return;
            }

            const rolesList = response.data || []; 
            const selectCreate = document.getElementById('role');
            const selectEdit = document.getElementById('edit-role');

            if (!selectCreate || !selectEdit) return;

            selectCreate.innerHTML = '<option value="" disabled selected>Seleccione un rol</option>';
            selectEdit.innerHTML = '';

            rolesList.forEach(role => {
                if(role.isActive) {
                     const optionHTML = `<option value="${role.roleName}">${role.roleName}</option>`;
                     selectCreate.insertAdjacentHTML('beforeend', optionHTML);
                     selectEdit.insertAdjacentHTML('beforeend', optionHTML);
                }
            });

        } catch (error) {
        }
    }

    const overlayViewUser = document.getElementById('modal-view-user');
    const modalResetPass = document.getElementById('modal-reset-pass');
    
    document.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit');
        if (editButton) {
            const row = editButton.closest('tr');
            if (row) {
                const d = row.dataset;
                activeUserId = parseInt(d.id);

                document.getElementById('view-full-name').textContent = `${d.firstname} ${d.lastname}`;
                document.getElementById('view-username').textContent = `@${d.username}`;
                document.getElementById('view-first-name').textContent = d.firstname;
                document.getElementById('view-last-name').textContent = d.lastname;
                document.getElementById('view-id-number').textContent = d.idnumber;
                document.getElementById('view-email').textContent = d.email;
                document.getElementById('view-role').textContent = d.role;
                document.getElementById('view-status').textContent = d.status === 'active' ? 'Activo' : 'Inactivo';
                
                document.getElementById('edit-first-name').value = d.firstname;
                document.getElementById('edit-last-name').value = d.lastname;
                document.getElementById('edit-id-number').value = d.idnumber;
                document.getElementById('edit-email').value = d.email;
                document.getElementById('edit-username').value = d.username;
                document.getElementById('edit-role').value = d.role;
                document.getElementById('edit-status').value = d.status;
                
                switchToViewMode();
                overlayViewUser.classList.add('active');
            }
        }

        const statusButton = e.target.closest('.btn-toggle-status');
        if (statusButton) {
            const row = statusButton.closest('tr');
            if (row) {
                const id = row.dataset.id;
                try {
                    await UsersService.toggleStatus(id);
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 1000,
                        timerProgressBar: true
                    });
                    Toast.fire({
                        icon: 'success',
                        title: 'Estado actualizado'
                    });
                    loadUsersTable();
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: error.message,
                        icon: 'error',
                        confirmButtonColor: '#10b981'
                    });
                }
            }
        }

        const resetPassButton = e.target.closest('.btn-reset-pass');
        if (resetPassButton) {
            const row = resetPassButton.closest('tr');
            if (row) {
                const d = row.dataset;
                activeUserId = parseInt(d.id);
                document.getElementById('reset-user-name').textContent = `${d.firstname} ${d.lastname}`;
                document.getElementById('new-password').value = '';
                modalResetPass.classList.add('active');
            }
        }
    });

    const formViewUser = document.getElementById('form-view-user');
    if (formViewUser) {
        formViewUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeUserId) return;

            const updatedUser = {
                id: activeUserId,
                firstName: document.getElementById('edit-first-name').value.trim(),
                lastName: document.getElementById('edit-last-name').value.trim(),
                idNumber: document.getElementById('edit-id-number').value.trim(),
                email: document.getElementById('edit-email').value.trim(),
                userName: document.getElementById('edit-username').value.trim(),
                roleName: document.getElementById('edit-role').value,
                isActive: document.getElementById('edit-status').value === 'active'
            };

            try {
                await UsersService.updateUser(updatedUser);
                Swal.fire({
                    title: '¡Actualizado!',
                    text: 'Usuario actualizado con éxito.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                overlayViewUser.classList.remove('active');
                switchToViewMode();
                loadUsersTable();
            } catch (error) {
                Swal.fire({
                    title: 'Error al actualizar',
                    text: error.message,
                    icon: 'error',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    document.getElementById('btn-close-reset-modal')?.addEventListener('click', () => modalResetPass.classList.remove('active'));
    document.getElementById('btn-cancel-reset')?.addEventListener('click', () => modalResetPass.classList.remove('active'));

    const formResetPass = document.getElementById('form-reset-pass');
    if (formResetPass) {
        formResetPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeUserId) return;

            const newPass = document.getElementById('new-password').value.trim();

            
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
            
            if (!passwordRegex.test(newPass)) {
                Swal.fire({
                    title: 'Contraseña débil',
                    text: 'Usa una contraseña más segura. Intenta combinar letras, números y símbolos.',
                    icon: 'warning',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            try {
                await UsersService.resetPassword(activeUserId, newPass);
                Swal.fire({
                    title: '¡Clave actualizada!',
                    text: 'La contraseña fue forzada exitosamente.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                modalResetPass.classList.remove('active');
            } catch (error) {
                Swal.fire({
                    title: 'Error de reseteo',
                    text: error.message,
                    icon: 'error',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    function switchToViewMode() {
        document.getElementById('view-user-title').textContent = 'Ver Usuario';
        document.getElementById('view-mode').classList.remove('hidden');
        document.getElementById('edit-mode').classList.add('hidden');
        document.getElementById('btn-edit-toggle').classList.remove('hidden');
        document.getElementById('btn-cancel-edit').classList.add('hidden');
        document.getElementById('btn-cancel-view').classList.remove('hidden');
        document.getElementById('btn-save-user').classList.add('hidden');
    }

    function switchToEditMode() {
        document.getElementById('view-user-title').textContent = 'Editar Usuario';
        document.getElementById('view-mode').classList.add('hidden');
        document.getElementById('edit-mode').classList.remove('hidden');
        document.getElementById('btn-edit-toggle').classList.add('hidden');
        document.getElementById('btn-cancel-edit').classList.remove('hidden');
        document.getElementById('btn-cancel-view').classList.add('hidden');
        document.getElementById('btn-save-user').classList.remove('hidden');
    }

    document.getElementById('btn-edit-toggle')?.addEventListener('click', switchToEditMode);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', switchToViewMode);
    document.getElementById('btn-close-view-modal')?.addEventListener('click', () => { overlayViewUser.classList.remove('active'); switchToViewMode(); });
    document.getElementById('btn-cancel-view')?.addEventListener('click', () => { overlayViewUser.classList.remove('active'); switchToViewMode(); });
});