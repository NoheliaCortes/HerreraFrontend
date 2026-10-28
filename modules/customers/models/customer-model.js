/**
 * customer.model.js
 * Modelo de datos para el módulo de Clientes.
 * Mapea directamente el CustomerDto que devuelve la API.
 */

class Customer {
    /**
     * @param {Object} dto - Objeto CustomerDto de la API
     */
   constructor(dto) {
    this.id               = dto.id;

    this.municipalityId   = dto.municipalityId;
    this.municipalityName = dto.municipalityName;

    this.departmentId     = dto.departmentId;
    this.departmentName   = dto.departmentName;

    this.firstName        = dto.firstName;
    this.lastName         = dto.lastName;
    this.phone            = dto.phone ?? '—';
    this.pointOfSale      = dto.pointOfSale ?? '—';
    this.posaddress       = dto.posaddress ?? '—';
    this.isActive         = dto.isActive ?? true;
}

    /** Nombre completo del cliente */
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    /** Iniciales para el avatar (máx. 2 letras) */
    get initials() {
        return [this.firstName, this.lastName]
            .filter(Boolean)
            .map(n => n[0].toUpperCase())
            .join('');
    }

    /** Construye el body para POST /api/customers */
    static toCreateDto(formData) {
        return {
            municipalityId: Number(formData.municipalityId),
            firstName:      formData.firstName.trim(),
            lastName:       formData.lastName.trim(),
            phone:          formData.phone?.trim()       || null,
            pointOfSale:    formData.pointOfSale?.trim() || null,
            posaddress:     formData.posaddress?.trim()  || null,
        };
    }

    /** Construye el body para PUT /api/customers/{id} (requiere todos los campos) */
    static toUpdateDto(formData) {
        return {
            municipalityId: Number(formData.municipalityId),
            firstName:      formData.firstName.trim(),
            lastName:       formData.lastName.trim(),
            isActive:       formData.isActive ?? true,
            phone:          formData.phone?.trim()       || null,
            pointOfSale:    formData.pointOfSale?.trim() || null,
            posaddress:     formData.posaddress?.trim()  || null,
        };
    }
}