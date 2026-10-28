import { CONFIG } from '../../core/config/app.config.js';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

export const RolesService = {
    getAllRoles: async () => {
        const response = await fetch(`${CONFIG.API_URL}/Roles`, { 
            method: 'GET', 
            headers: getHeaders() 
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        return await response.json();
    },

    createRole: async (roleData) => {
        const response = await fetch(`${CONFIG.API_URL}/Roles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(roleData)
        });

        let data;
        try { data = await response.json(); } catch (e) { throw new Error(`Fallo en el servidor (${response.status}).`); }

        if (!response.ok || data.success === false) {
            if (data.errors) throw new Error(Object.values(data.errors).flat().join('\n'));
            
            throw new Error(data.message || data.errorMessage || "Error al crear el rol.");
        }
        return data;
    },

    updateRole: async (roleData) => {
        const response = await fetch(`${CONFIG.API_URL}/Roles`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(roleData)
        });

        let data;
        try { data = await response.json(); } catch (e) { throw new Error(`Fallo en el servidor (${response.status}).`); }

        if (!response.ok || data.success === false) {
            if (data.errors) throw new Error(Object.values(data.errors).flat().join('\n'));
            
            throw new Error(data.message || data.errorMessage || "Error al actualizar el rol.");
        }
        return data;
    },

    toggleStatus: async (id) => {
        const response = await fetch(`${CONFIG.API_URL}/Roles/${id}/toggle-status`, {
            method: 'PATCH',
            headers: getHeaders()
        });
        
        let data;
        try { data = await response.json(); } catch (e) { throw new Error(`Fallo en el servidor (${response.status}).`); }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.errorMessage || "Error al cambiar el estado.");
        }
        return data;
    }
};