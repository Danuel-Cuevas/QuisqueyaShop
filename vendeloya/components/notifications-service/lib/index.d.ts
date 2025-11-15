import * as functions from 'firebase-functions/v2';
export interface Notification {
    id?: string;
    userId: string;
    type: 'email' | 'sms' | 'push' | 'in_app';
    title: string;
    message: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: string;
    sentAt?: string;
}
export declare const notificationsService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map