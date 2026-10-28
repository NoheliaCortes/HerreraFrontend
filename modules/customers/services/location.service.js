const LocationService = (() => {

    const BASE_URL = 'https://localhost:7035/api';

    function _buildHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }

    async function _handleResponse(res) {

        const envelope = await res.json();

        if (!envelope.success) {
            throw new Error(envelope.message);
        }

        return envelope.data;
    }

    async function getDepartments() {

        const res = await fetch(
            `${BASE_URL}/departments`,
            {
                method: 'GET',
                headers: _buildHeaders()
            }
        );

        return await _handleResponse(res);
    }

    async function getMunicipalitiesByDepartment(departmentId) {

        const res = await fetch(
            `${BASE_URL}/municipalities/by-department/${departmentId}`,
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