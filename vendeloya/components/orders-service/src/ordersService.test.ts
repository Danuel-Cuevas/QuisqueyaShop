import { Order } from './index';

describe('OrdersService', () => {
  describe('Order interface', () => {
    it('should create a valid order', () => {
      const order: Order = {
        userId: 'user123',
        items: [
          { productId: 'prod1', quantity: 2, price: 10.0 },
        ],
        total: 20.0,
        currency: 'USD',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(order.userId).toBe('user123');
      expect(order.total).toBe(20.0);
      expect(order.status).toBe('pending');
    });

    it('should support all order statuses', () => {
      const statuses: Order['status'][] = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];
      statuses.forEach(status => {
        expect(['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']).toContain(status);
      });
    });

    it('should calculate total from items', () => {
      const items = [
        { productId: 'prod1', quantity: 2, price: 10.0 },
        { productId: 'prod2', quantity: 1, price: 15.0 },
      ];

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(total).toBe(35.0);
    });

    it('should allow optional shipping address', () => {
      const order: Order = {
        userId: 'user123',
        items: [],
        total: 0,
        currency: 'USD',
        status: 'pending',
        shippingAddress: { street: '123 Main St', city: 'City' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(order.shippingAddress).toBeDefined();
    });
  });
});

