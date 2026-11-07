const LocationService = (() => {
    const CONFIG_PROMISE = import('../../core/config/app.config.js');

    async function _getBaseUrl() {
        const { CONFIG } = await CONFIG_PROMISE;
        return CONFIG.API_URL;
    }

    function _buildHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }

    async function _handleResponse(res) {

        let envelope;
        try {
            envelope = await res.json();
        } catch {
            throw new Error(`Error HTTP ${res.status}`);
        }

        const success = envelope.success ?? envelope.Success;
        if (!res.ok || success === false) {
            throw new Error(envelope.message ?? envelope.Message ?? `Error HTTP ${res.status}`);
        }

        return envelope.data ?? envelope.Data;
    }

    async function getDepartments() {

        const res = await fetch(
            `${await _getBaseUrl()}/departments`,
            {
                method: 'GET',
                headers: _buildHeaders()
            }
        );

        return await _handleResponse(res);
    }

    async function getMunicipalitiesByDepartment(departmentId) {

        const res = await fetch(
            `${await _getBaseUrl()}/municipalities/by-department/${departmentId}`,
            {
                method: 'GET',
                headers: _buildHeaders()
            }
        );

        return await _handleResponse(res);
    }

    return {
        getDepartments,
        getMunicipalitiesByDepartment
    };

  
})();
