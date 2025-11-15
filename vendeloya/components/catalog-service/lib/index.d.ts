import * as functions from 'firebase-functions/v2';
export interface Product {
    id?: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    stock: number;
    sku: string;
    createdAt: string;
    updatedAt: string;
}
export declare const catalogService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map