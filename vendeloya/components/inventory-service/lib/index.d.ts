import * as functions from 'firebase-functions/v2';
export interface InventoryItem {
    productId: string;
    quantity: number;
    reserved: number;
    available: number;
    lowStockThreshold: number;
    updatedAt: string;
}
export declare const inventoryService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map