/**
 * Modelos del modulo de inventario.
 * Mapean los DTOs documentados de /api/Inventory.
 */

class InventoryProduct {
    constructor(dto = {}) {
        this.productId = dto.productId;
        this.productName = dto.productName || '';
        this.imageUrl = dto.imageUrl ?? null;
        this.lineName = dto.lineName || '';
        this.presentationName = dto.presentationName || '';
        this.flavorName = dto.flavorName || '';
        this.displayStock = Number(dto.displayStock ?? 0);
        this.warehouseStock = Number(dto.warehouseStock ?? 0);
        this.reservedStock = Number(dto.reservedStock ?? 0);
        this.totalStock = Number(dto.totalStock ?? 0);
    }

    get availableForSale() {
        return this.displayStock + this.warehouseStock;
    }
}

class InventoryStats {
    constructor(dto = {}) {
        this.totalProducts = Number(dto.totalProducts ?? 0);
        this.lowStockProducts = Number(dto.lowStockProducts ?? 0);
        this.bestSellingFlavor = dto.bestSellingFlavor ?? null;
        this.inventoryValue = Number(dto.inventoryValue ?? 0);
    }
}

class InventoryProductBatches {
    constructor(dto = {}) {
        this.productId = dto.productId;
        this.productName = dto.productName || '';
        this.activeBatchCount = Number(dto.activeBatchCount ?? 0);
        this.batches = (dto.batches ?? []).map(batch => new InventoryProductBatch(batch));
    }
}

class InventoryProductBatch {
    constructor(dto = {}) {
        this.batchId = dto.batchId;
        this.batchCode = dto.batchCode ?? null;
        this.batchStatusName = dto.batchStatusName || '';
        this.entryDate = dto.entryDate ?? null;
        this.expirationDate = dto.expirationDate ?? null;
        this.stockDisplay = Number(dto.stockDisplay ?? 0);
        this.stockWarehouse = Number(dto.stockWarehouse ?? 0);
        this.stockReserved = Number(dto.stockReserved ?? 0);
        this.totalCurrentStock = Number(dto.totalCurrentStock ?? 0);
        this.availableForSale = Number(dto.availableForSale ?? 0);
    }
}

class InventoryBatchDetail {
    constructor(dto = {}) {
        this.batchId = dto.batchId;
        this.batchCode = dto.batchCode ?? null;
        this.productId = dto.productId;
        this.restockId = dto.restockId;
        this.batchStatusName = dto.batchStatusName || '';
        this.entryDate = dto.entryDate ?? null;
        this.expirationDate = dto.expirationDate ?? null;
        this.initialQuantity = Number(dto.initialQuantity ?? 0);
        this.unitProductionCost = Number(dto.unitProductionCost ?? 0);
        this.estimatedTotalCost = Number(dto.estimatedTotalCost ?? 0);
        this.stockDisplay = Number(dto.stockDisplay ?? 0);
        this.stockWarehouse = Number(dto.stockWarehouse ?? 0);
        this.stockReserved = Number(dto.stockReserved ?? 0);
        this.totalCurrentStock = Number(dto.totalCurrentStock ?? 0);
        this.availableForSale = Number(dto.availableForSale ?? 0);
        this.soldDetail = Number(dto.soldDetail ?? 0);
        this.soldWholesale = Number(dto.soldWholesale ?? 0);
        this.totalSold = Number(dto.totalSold ?? 0);
    }
}
