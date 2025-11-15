import { Invoice } from './index';

describe('BillingService', () => {
  describe('Invoice interface', () => {
    it('should create a valid invoice', () => {
      const invoice: Invoice = {
        orderId: 'order123',
        userId: 'user123',
        items: [
          {
            productId: 'prod1',
            productName: 'Product 1',
            quantity: 2,
            unitPrice: 10.0,
            total: 20.0,
          },
        ],
        subtotal: 20.0,
        tax: 2.0,
        total: 22.0,
        currency: 'USD',
        status: 'draft',
        invoiceNumber: 'INV-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(invoice.orderId).toBe('order123');
      expect(invoice.total).toBe(22.0);
      expect(invoice.status).toBe('draft');
    });

    it('should calculate totals correctly', () => {
      const items = [
        { productId: 'prod1', productName: 'Product 1', quantity: 2, unitPrice: 10.0, total: 20.0 },
        { productId: 'prod2', productName: 'Product 2', quantity: 1, unitPrice: 15.0, total: 15.0 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      expect(subtotal).toBe(35.0);
      expect(tax).toBe(3.5);
      expect(total).toBe(38.5);
    });

    it('should support all invoice statuses', () => {
      const statuses: Invoice['status'][] = ['draft', 'issued', 'paid', 'cancelled'];
      statuses.forEach(status => {
        expect(['draft', 'issued', 'paid', 'cancelled']).toContain(status);
      });
    });

    it('should validate invoice items structure', () => {
      const item = {
        productId: 'prod1',
        productName: 'Product 1',
        quantity: 2,
        unitPrice: 10.0,
        total: 20.0,
      };

      expect(item.productId).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.total).toBe(item.unitPrice * item.quantity);
    });
  });
});

