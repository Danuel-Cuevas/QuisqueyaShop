import * as functions from 'firebase-functions/v2';
export interface Order {
    id?: string;
    userId: string;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
    total: number;
    currency: string;
    status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress?: any;
    createdAt: string;
    updatedAt: string;
}
export declare const ordersService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map