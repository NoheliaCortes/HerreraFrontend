/**
 * Modelos del modulo de reabastecimientos.
 * Mapean los DTOs documentados de /api/restocks.
 */

class RestockListItem {
    constructor(dto = {}) {
        this.restockId = dto.restockId;
        this.restockCode = dto.restockCode || '';
        this.restockDate = dto.restockDate ?? null;
        this.userName = dto.userName || '';
        this.batchCount = Number(dto.batchCount ?? 0);
        this.totalUnits = Number(dto.totalUnits ?? 0);
        this.totalInvestment = Number(dto.totalInvestment ?? 0);
    }
}

class RestockStatistics {
    constructor(dto = {}) {
        this.restocksThisMonth = Number(dto.restocksThisMonth ?? 0);
        this.totalInvestmentThisMonth = Number(dto.totalInvestmentThisMonth ?? 0);
        this.batchesCreatedThisMonth = Number(dto.batchesCreatedThisMonth ?? 0);
    }
}

class RestockDetail {
    constructor(dto = {}) {
        this.restockId = dto.restockId;
        this.restockCode = dto.restockCode || '';
        this.restockDate = dto.restockDate ?? null;
        this.userName = dto.userName || '';
        this.batchCount = Number(dto.batchCount ?? 0);
        this.totalUnits = Number(dto.totalUnits ?? 0);
        this.totalInvestment = Number(dto.totalInvestment ?? 0);
        this.differentProductsCount = Number(dto.differentProductsCount ?? 0);
        this.batches = (dto.batches ?? []).map(batch => new RestockDetailBatch(batch));
    }
}

class RestockDetailBatch {
    constructor(dto = {}) {
        this.batchId = dto.batchId;
        this.batchCode = dto.batchCode ?? null;
        this.productName = dto.productName || '';
        this.batchStatusName = dto.batchStatusName || '';
        this.initialQuantity = Number(dto.initialQuantity ?? 0);
        this.unitProductionCost = Number(dto.unitProductionCost ?? 0);
        this.totalCost = Number(dto.totalCost ?? 0);
        this.expirationDate = dto.expirationDate ?? null;
    }
}

class RestockProductOption {
    constructor(dto = {}) {
        this.id = dto.productId ?? dto.id;
        this.productName = dto.productName || '';
        this.linePresentationId = dto.linePresentationId;
        this.flavorId = dto.flavorId;
        this.lineName = dto.lineName || '';
        this.flavorName = dto.flavorName || '';
        this.presentationName = dto.presentationName || '';
    }

    get displayName() {
        const details = [this.lineName, this.flavorName, this.presentationName]
            .filter(Boolean)
            .join(' - ');

        return details ? `${this.productName} (${details})` : this.productName;
    }
}

class RestockLineOption {
    constructor(dto = {}) {
        this.id = dto.id ?? dto.lineId;
        this.name = dto.name || dto.lineName || dto.description || `Linea ${this.id}`;
    }
}

class RestockLinePresentationOption {
    constructor(dto = {}) {
        this.id = dto.id ?? dto.linePresentationId;
        this.lineId = dto.line?.id ?? dto.lineId;
        this.presentationId = dto.presentation?.id ?? dto.presentationId;
        this.presentationName = dto.presentation?.name
            || dto.presentation?.presentationName
            || dto.presentationName
            || dto.name
            || `Presentacion ${this.presentationId ?? this.id}`;
    }
}

class RestockCreateRequest {
    static toApiPayload(formData = {}) {
        return {
            notes: formData.notes?.trim() || null,
            batches: (formData.batches ?? []).map(batch => ({
                productId: Number(batch.productId),
                quantity: Number(batch.quantity),
                unitProductionCost: Number(batch.unitProductionCost),
                expirationDate: batch.expirationDate,
            })),
        };
    }
}

class RestockResponse {
    constructor(dto = {}) {
        this.restockId = dto.restockId;
        this.restockCode = dto.restockCode || '';
        this.inventoryMovementId = dto.inventoryMovementId;
        this.restockDate = dto.restockDate ?? null;
        this.batches = (dto.batches ?? []).map(batch => new RestockBatchResponse(batch));
    }
}

class RestockBatchResponse {
    constructor(dto = {}) {
        this.batchId = dto.batchId;
        this.batchCode = dto.batchCode || '';
        this.productName = dto.productName || '';
        this.quantity = Number(dto.quantity ?? 0);
        this.unitProductionCost = Number(dto.unitProductionCost ?? 0);
        this.expirationDate = dto.expirationDate ?? null;
    }
}
