/**
 * Modelos del modulo de movimientos de inventario.
 * Mapean los DTOs documentados de /api/InventoryMovements.
 */

function _pick(dto, camelKey, pascalKey, fallback = undefined) {
    return dto?.[camelKey] ?? dto?.[pascalKey] ?? fallback;
}

class InventoryMovementStats {
    constructor(dto = {}) {
        this.movementsToday = Number(_pick(dto, 'movementsToday', 'MovementsToday', 0));
        this.restocksToday = Number(_pick(dto, 'restocksToday', 'RestocksToday', 0));
        this.transfersToday = Number(_pick(dto, 'transfersToday', 'TransfersToday', 0));
        this.positiveAdjustmentsToday = Number(_pick(dto, 'positiveAdjustmentsToday', 'PositiveAdjustmentsToday', 0));
        this.negativeAdjustmentsToday = Number(_pick(dto, 'negativeAdjustmentsToday', 'NegativeAdjustmentsToday', 0));
    }
}

class InventoryMovementListItem {
    constructor(dto = {}) {
        this.id = _pick(dto, 'id', 'Id');
        this.movementTypeId = _pick(dto, 'movementTypeId', 'MovementTypeId');
        this.movementTypeName = _pick(dto, 'movementTypeName', 'MovementTypeName', '');
        this.movementDate = _pick(dto, 'movementDate', 'MovementDate', null);
        this.createdByUserName = _pick(dto, 'createdByUserName', 'CreatedByUserName', '');
    }
}

class InventoryMovementHeader {
    constructor(dto = {}) {
        this.id = _pick(dto, 'id', 'Id');
        this.movementTypeId = _pick(dto, 'movementTypeId', 'MovementTypeId');
        this.movementTypeName = _pick(dto, 'movementTypeName', 'MovementTypeName', '');
        this.saleId = _pick(dto, 'saleId', 'SaleId', null);
        this.orderId = _pick(dto, 'orderId', 'OrderId', null);
        this.movementDate = _pick(dto, 'movementDate', 'MovementDate', null);
        this.notes = _pick(dto, 'notes', 'Notes', null);
        this.createdByUserName = _pick(dto, 'createdByUserName', 'CreatedByUserName', '');
    }
}

class InventoryMovementDetailItem {
    constructor(dto = {}) {
        this.id = _pick(dto, 'id', 'Id');
        this.batchId = _pick(dto, 'batchId', 'BatchId');
        this.batchCode = _pick(dto, 'batchCode', 'BatchCode', null);
        this.sourceLocationName = _pick(dto, 'sourceLocationName', 'SourceLocationName', null);
        this.destinationLocationName = _pick(dto, 'destinationLocationName', 'DestinationLocationName', null);
        this.quantity = Number(_pick(dto, 'quantity', 'Quantity', 0));
        this.unitCost = Number(_pick(dto, 'unitCost', 'UnitCost', 0));
        const unitPrice = _pick(dto, 'unitPrice', 'UnitPrice', null);
        this.unitPrice = unitPrice === null || unitPrice === undefined ? null : Number(unitPrice);
        this.createdByUserName = _pick(dto, 'createdByUserName', 'CreatedByUserName', '');
        this.createdAt = _pick(dto, 'createdAt', 'CreatedAt', null);
    }
}

class InventoryMovementProductOption {
    constructor(dto = {}) {
        this.productId = _pick(dto, 'productId', 'ProductId', _pick(dto, 'id', 'Id'));
        this.productName = _pick(dto, 'productName', 'ProductName', '');
        this.lineName = _pick(dto, 'lineName', 'LineName', '');
        this.presentationName = _pick(dto, 'presentationName', 'PresentationName', '');
        this.flavorName = _pick(dto, 'flavorName', 'FlavorName', '');
        this.displayStock = Number(_pick(dto, 'displayStock', 'DisplayStock', 0));
        this.warehouseStock = Number(_pick(dto, 'warehouseStock', 'WarehouseStock', 0));
        this.reservedStock = Number(_pick(dto, 'reservedStock', 'ReservedStock', 0));
        this.totalStock = Number(_pick(dto, 'totalStock', 'TotalStock', 0));
    }

    get displayName() {
        const details = [this.lineName, this.flavorName, this.presentationName]
            .filter(Boolean)
            .join(' - ');

        return details ? `${this.productName} (${details})` : this.productName;
    }
}

class InventoryMovementBatchOption {
    constructor(dto = {}) {
        this.batchId = _pick(dto, 'batchId', 'BatchId');
        this.batchCode = _pick(dto, 'batchCode', 'BatchCode', null);
        this.batchStatusName = _pick(dto, 'batchStatusName', 'BatchStatusName', '');
        this.expirationDate = _pick(dto, 'expirationDate', 'ExpirationDate', null);
        this.stockDisplay = Number(_pick(dto, 'stockDisplay', 'StockDisplay', 0));
        this.stockWarehouse = Number(_pick(dto, 'stockWarehouse', 'StockWarehouse', 0));
        this.stockReserved = Number(_pick(dto, 'stockReserved', 'StockReserved', 0));
        this.totalCurrentStock = Number(_pick(dto, 'totalCurrentStock', 'TotalCurrentStock', 0));
        this.availableForSale = Number(_pick(dto, 'availableForSale', 'AvailableForSale', 0));
    }

    get displayName() {
        return this.batchCode || `Lote ${this.batchId}`;
    }
}

class InventoryMovementBatchDetail {
    constructor(dto = {}) {
        this.batchId = _pick(dto, 'batchId', 'BatchId');
        this.batchCode = _pick(dto, 'batchCode', 'BatchCode', null);
        this.unitProductionCost = Number(_pick(dto, 'unitProductionCost', 'UnitProductionCost', 0));
        this.stockDisplay = Number(_pick(dto, 'stockDisplay', 'StockDisplay', 0));
        this.stockWarehouse = Number(_pick(dto, 'stockWarehouse', 'StockWarehouse', 0));
        this.stockReserved = Number(_pick(dto, 'stockReserved', 'StockReserved', 0));
        this.totalCurrentStock = Number(_pick(dto, 'totalCurrentStock', 'TotalCurrentStock', 0));
        this.availableForSale = Number(_pick(dto, 'availableForSale', 'AvailableForSale', 0));
    }
}

class InventoryMovementResult {
    constructor(dto = {}) {
        this.movementId = _pick(dto, 'id', 'Id', _pick(dto, 'movementId', 'MovementId', _pick(dto, 'inventoryMovementId', 'InventoryMovementId')));
        this.inventoryMovementId = this.movementId;
        this.movementTypeId = _pick(dto, 'movementTypeId', 'MovementTypeId');
        this.movementDate = _pick(dto, 'movementDate', 'MovementDate', null);
        this.message = _pick(dto, 'message', 'Message', '');
    }
}

class InventoryMovementCreateRequest {
    static getCurrentUserId() {
        const directId = Number(localStorage.getItem('userId'));
        if (directId > 0) return directId;

        const tokenId = InventoryMovementCreateRequest.readUserIdFromToken(localStorage.getItem('token'));
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

    static toTransferPayload(formData = {}) {
        return {
            notes: formData.notes?.trim() || null,
            createdBy: InventoryMovementCreateRequest.getCurrentUserId(),
            details: [{
                batchId: Number(formData.batchId),
                sourceLocationId: Number(formData.sourceLocationId),
                destinationLocationId: Number(formData.destinationLocationId),
                quantity: Number(formData.quantity),
            }],
        };
    }

    static toAdjustmentPayload(formData = {}) {
        return {
            notes: formData.notes?.trim() || null,
            createdBy: InventoryMovementCreateRequest.getCurrentUserId(),
            details: [{
                batchId: Number(formData.batchId),
                locationId: Number(formData.locationId),
                quantity: Number(formData.quantity),
            }],
        };
    }
}
