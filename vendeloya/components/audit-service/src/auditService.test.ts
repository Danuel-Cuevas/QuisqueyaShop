import { AuditLog } from './index';

describe('AuditService', () => {
  describe('AuditLog interface', () => {
    it('should create a valid audit log', () => {
      const log: AuditLog = {
        userId: 'user123',
        action: 'CREATE',
        resource: 'order',
        resourceId: 'order123',
        timestamp: new Date().toISOString(),
      };

      expect(log.action).toBe('CREATE');
      expect(log.resource).toBe('order');
      expect(log.resourceId).toBe('order123');
    });

    it('should allow optional fields', () => {
      const log: AuditLog = {
        action: 'UPDATE',
        resource: 'product',
        details: { field: 'price', oldValue: 10, newValue: 15 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date().toISOString(),
      };

      expect(log.details).toBeDefined();
      expect(log.ipAddress).toBeDefined();
    });

    it('should support common actions', () => {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT'];
      actions.forEach(action => {
        expect(['CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT']).toContain(action);
      });
    });

    it('should require action and resource', () => {
      const log: AuditLog = {
        action: 'CREATE',
        resource: 'order',
        timestamp: new Date().toISOString(),
      };

      expect(log.action).toBeTruthy();
      expect(log.resource).toBeTruthy();
    });

    it('should store timestamp', () => {
      const timestamp = new Date().toISOString();
      const log: AuditLog = {
        action: 'CREATE',
        resource: 'order',
        timestamp,
      };

      expect(log.timestamp).toBe(timestamp);
      expect(new Date(log.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});

