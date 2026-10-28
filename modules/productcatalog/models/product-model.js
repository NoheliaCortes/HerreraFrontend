/**
 * Modelo y helpers del modulo de productos.
 */

class Product {
    constructor(dto = {}) {
        this.id = dto.id;
        this.linePresentationId = dto.linePresentationId;
        this.flavorId = dto.flavorId;
        this.productName = dto.productName || '';
        this.isActive = dto.isActive ?? true;
        this.createdBy = dto.createdBy;
        this.createdAt = dto.createdAt ?? null;
        this.imageUrl = dto.imageUrl ?? null;
        this.minimumStock = dto.minimumStock ?? 0;
    }

    static toCreateDto(formData) {
        return {
            linePresentationId: Number(formData.linePresentationId),
            flavorId: Number(formData.flavorId),
            productName: formData.productName.trim(),
            imageUrl: ProductImage.toApiUrl(formData.imageUrl),
            minimumStock: Number(formData.minimumStock || 0),
        };
    }

    static toUpdateDto(formData) {
        return {
            linePresentationId: Number(formData.linePresentationId),
            flavorId: Number(formData.flavorId),
            productName: formData.productName.trim(),
            isActive: Boolean(formData.isActive),
            imageUrl: ProductImage.toApiUrl(formData.imageUrl),
            minimumStock: Number(formData.minimumStock || 0),
        };
    }

    static getCurrentUserId() {
        const directId = Number(localStorage.getItem('userId'));
        if (directId > 0) return directId;

        const tokenId = Product.readUserIdFromToken(localStorage.getItem('token'));
        if (tokenId > 0) return tokenId;

        return 1;
    }

    static readUserIdFromToken(token) {
        if (!token || token.split('.').length < 2) return null;

        try {
            const payloadBase64 = token
                .split('.')[1]
                .replaceAll('-', '+')
                .replaceAll('_', '/');
            const payload = JSON.parse(atob(payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=')));

            return Number(
                payload.nameid ||
                payload.sub ||
                payload.userId ||
                payload.UserId ||
                payload.id
            );
        } catch {
            return null;
        }
    }
}

class ProductCatalogItem {
    constructor(dto = {}) {
        this.id = dto.id;
        this.productName = dto.productName || '';
        this.imageUrl = dto.imageUrl ?? null;
        this.isActive = dto.isActive ?? true;
        this.lineName = dto.lineName || '';
        this.flavorName = dto.flavorName || '';
        this.presentationName = dto.presentationName || '';
        this.wholesalePrice = dto.wholesalePrice ?? null;
        this.retailPrice = dto.retailPrice ?? null;
    }
}

const ProductImage = (() => {
    const FALLBACK_IMAGE = '../../../assets/img/logo.jpg';
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

    function isAllowedFile(file) {
        if (!file) return true;
        const lowerName = file.name.toLowerCase();
        return ALLOWED_EXTENSIONS.some(extension => lowerName.endsWith(extension));
    }

    function resolveUrl(imageUrl) {
        if (!imageUrl) return FALLBACK_IMAGE;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
        return `${ProductCatalogService.getApiOrigin()}${imageUrl}`;
    }

    function toApiUrl(imageUrl) {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
        return `${ProductCatalogService.getApiOrigin()}${imageUrl}`;
    }

    return {
        FALLBACK_IMAGE,
        ALLOWED_EXTENSIONS,
        isAllowedFile,
        resolveUrl,
        toApiUrl,
    };
})();
