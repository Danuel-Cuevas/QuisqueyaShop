import * as functions from 'firebase-functions/v2';
export interface Invoice {
    id?: string;
    orderId: string;
    userId: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: 'draft' | 'issued' | 'paid' | 'cancelled';
    invoiceNumber: string;
    issuedAt?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
}
export declare const billingService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map