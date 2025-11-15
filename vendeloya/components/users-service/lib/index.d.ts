import * as functions from 'firebase-functions/v2';
export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    role: 'user' | 'admin';
    createdAt: string;
    updatedAt: string;
}
export declare const usersService: functions.https.HttpsFunction;
//# sourceMappingURL=index.d.ts.map