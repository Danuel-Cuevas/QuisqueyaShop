import { Notification } from './index';

describe('NotificationsService', () => {
  describe('Notification interface', () => {
    it('should create a valid notification', () => {
      const notification: Notification = {
        userId: 'user123',
        type: 'email',
        title: 'Test Notification',
        message: 'This is a test message',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      expect(notification.userId).toBe('user123');
      expect(notification.type).toBe('email');
      expect(notification.status).toBe('pending');
    });

    it('should support all notification types', () => {
      const types: Notification['type'][] = ['email', 'sms', 'push', 'in_app'];
      types.forEach(type => {
        expect(['email', 'sms', 'push', 'in_app']).toContain(type);
      });
    });

    it('should support all notification statuses', () => {
      const statuses: Notification['status'][] = ['pending', 'sent', 'failed'];
      statuses.forEach(status => {
        expect(['pending', 'sent', 'failed']).toContain(status);
      });
    });

    it('should allow optional sentAt', () => {
      const notification: Notification = {
        userId: 'user123',
        type: 'email',
        title: 'Test',
        message: 'Test message',
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(notification.sentAt).toBeDefined();
    });

    it('should require title and message', () => {
      const notification: Notification = {
        userId: 'user123',
        type: 'email',
        title: 'Required Title',
        message: 'Required Message',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      expect(notification.title).toBeTruthy();
      expect(notification.message).toBeTruthy();
    });
  });
});

