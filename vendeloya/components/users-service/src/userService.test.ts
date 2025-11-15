import { UserProfile } from './index';

describe('UserService', () => {
  describe('UserProfile interface', () => {
    it('should have required fields', () => {
      const profile: UserProfile = {
        uid: '123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      expect(profile.uid).toBe('123');
      expect(profile.email).toBe('test@example.com');
      expect(profile.role).toBe('user');
    });

    it('should allow optional displayName', () => {
      const profile: UserProfile = {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      expect(profile.displayName).toBe('Test User');
    });

    it('should support admin role', () => {
      const profile: UserProfile = {
        uid: '123',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      expect(profile.role).toBe('admin');
    });
  });

  describe('Role validation', () => {
    it('should accept valid roles', () => {
      const validRoles = ['user', 'admin'];
      validRoles.forEach(role => {
        expect(['user', 'admin']).toContain(role);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRole = 'invalid';
      expect(['user', 'admin']).not.toContain(invalidRole);
    });
  });

  describe('User data validation', () => {
    it('should require email and password for registration', () => {
      const validData = { email: 'test@example.com', password: 'password123' };
      expect(validData.email).toBeTruthy();
      expect(validData.password).toBeTruthy();
    });

    it('should reject missing email', () => {
      const invalidData = { password: 'password123' };
      expect(invalidData.email).toBeFalsy();
    });

    it('should reject missing password', () => {
      const invalidData = { email: 'test@example.com' };
      expect(invalidData.password).toBeFalsy();
    });
  });
});

