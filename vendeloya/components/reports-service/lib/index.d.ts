import * as functions from 'firebase-functions/v2';
export interface Report {
    id?: string;
    type: 'sales' | 'inventory' | 'users' | 'products';
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'current';
    startDate: string;
    endDate: string;
    data: any;
    generatedAt: string;
    generatedBy?: string;
}
export declare const reportsService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map