import * as functions from 'firebase-functions/v2';
export interface AuditLog {
    id?: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}
export declare const auditService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map