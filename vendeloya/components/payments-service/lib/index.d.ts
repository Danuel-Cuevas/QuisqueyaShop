import * as functions from 'firebase-functions/v2';
export interface Payment {
    id?: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    createdAt: string;
    updatedAt: string;
}
export declare const paymentsService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map