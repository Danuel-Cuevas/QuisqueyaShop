import { Cart, CartItem } from './index';

describe('CartService', () => {
  describe('Cart interface', () => {
    it('should create a valid cart', () => {
      const cart: Cart = {
        userId: 'user123',
        items: [],
        total: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(cart.userId).toBe('user123');
      expect(cart.items).toEqual([]);
      expect(cart.total).toBe(0);
    });

    it('should calculate total correctly', () => {
      const items: CartItem[] = [
        { productId: 'prod1', quantity: 2, price: 10.0 },
        { productId: 'prod2', quantity: 1, price: 20.0 },
      ];

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(total).toBe(40.0);
    });

    it('should handle empty cart', () => {
      const cart: Cart = {
        userId: 'user123',
        items: [],
        total: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(cart.items.length).toBe(0);
      expect(cart.total).toBe(0);
    });

    it('should validate cart item structure', () => {
      const item: CartItem = {
        productId: 'prod1',
        quantity: 2,
        price: 10.0,
      };

      expect(item.productId).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.price).toBeGreaterThan(0);
    });

    it('should reject invalid quantity', () => {
      const invalidQuantities = [0, -1, -10];
      invalidQuantities.forEach(qty => {
        expect(qty).toBeLessThanOrEqual(0);
      });
    });
  });
});

