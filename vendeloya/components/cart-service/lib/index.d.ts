import * as functions from 'firebase-functions/v2';
export interface CartItem {
    productId: string;
    quantity: number;
    price: number;
}
export interface Cart {
    id?: string;
    userId: string;
    items: CartItem[];
    total: number;
    createdAt: string;
    updatedAt: string;
}
export declare const cartService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map