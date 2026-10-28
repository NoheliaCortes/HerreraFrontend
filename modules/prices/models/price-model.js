/**
 * Modelos y helpers del modulo de precios.
 */

const PRICE_TYPE = {
    retail: 1,
    wholesale: 2,
};

class GeneralPrice {
    constructor(dto = {}) {
        this.linePresentationId = Number(dto.linePresentationId ?? dto.LinePresentationId ?? 0);
        this.lineName = dto.lineName ?? dto.LineName ?? '';
        this.presentationName = dto.presentationName ?? dto.PresentationName ?? '';
        this.retailPrice = dto.retailPrice ?? dto.RetailPrice ?? null;
        this.wholesalePrice = dto.wholesalePrice ?? dto.WholesalePrice ?? null;
        this.productsCount = Number(dto.productsCount ?? dto.ProductsCount ?? 0);
    }

    get hasRetailPrice() {
        return this.retailPrice !== null && this.retailPrice !== undefined;
    }

    get hasWholesalePrice() {
        return this.wholesalePrice !== null && this.wholesalePrice !== undefined;
    }
}

class PriceStatistics {
    constructor(dto = {}) {
        this.productsWithPrice = Number(dto.productsWithPrice ?? dto.ProductsWithPrice ?? 0);
        this.activeSpecialPrices = Number(dto.activeSpecialPrices ?? dto.ActiveSpecialPrices ?? 0);
        this.promotionsExpiringSoon = Number(dto.promotionsExpiringSoon ?? dto.PromotionsExpiringSoon ?? 0);
        this.lastUpdate = dto.lastUpdate ?? dto.LastUpdate ?? null;
    }
}

class GeneralPriceForm {
    static toCreateDto(formData, priceTypeId = PRICE_TYPE.retail) {
        return {
            linePresentationId: Number(formData.linePresentationId),
            priceTypeId,
            price: Number(formData.price),
            validFrom: PriceFormat.toApiDate(formData.validFrom),
            validTo: PriceFormat.toNullableApiDate(formData.validTo),
            createdBy: GeneralPriceForm.getCurrentUserId(),
        };
    }

    static toChangeDto(formData, priceTypeId) {
        return {
            priceTypeId,
            price: Number(formData.price),
            validFrom: PriceFormat.toApiDate(formData.validFrom),
            validTo: PriceFormat.toNullableApiDate(formData.validTo),
            createdBy: GeneralPriceForm.getCurrentUserId(),
        };
    }

    static getCurrentUserId() {
        const directId = Number(localStorage.getItem('userId'));
        if (directId > 0) return directId;

        const tokenId = GeneralPriceForm.readUserIdFromToken(localStorage.getItem('token'));
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

const PriceFormat = (() => {
    function currency(value) {
        if (value === null || value === undefined) return 'Sin precio';

        return new Intl.NumberFormat('es-NI', {
            style: 'currency',
            currency: 'NIO',
            minimumFractionDigits: 2,
        }).format(Number(value));
    }

    function dateTime(value) {
        if (!value) return 'Sin actualizaciones';

        return new Intl.DateTimeFormat('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    }

    function todayForInput() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${today.getFullYear()}-${month}-${day}`;
    }

    function toApiDate(value) {
        return `${value}T00:00:00`;
    }

    function toNullableApiDate(value) {
        return value ? toApiDate(value) : null;
    }

    return {
        currency,
        dateTime,
        todayForInput,
        toApiDate,
        toNullableApiDate,
    };
})();
