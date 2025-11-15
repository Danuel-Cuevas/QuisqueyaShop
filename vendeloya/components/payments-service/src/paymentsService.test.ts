import { Payment } from './index';

describe('PaymentsService', () => {
  describe('Payment interface', () => {
    it('should create a valid payment', () => {
      const payment: Payment = {
        orderId: 'order123',
        userId: 'user123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(payment.orderId).toBe('order123');
      expect(payment.amount).toBe(99.99);
      expect(payment.status).toBe('pending');
    });

    it('should support all payment methods', () => {
      const methods: Payment['paymentMethod'][] = ['credit_card', 'debit_card', 'paypal', 'bank_transfer'];
      methods.forEach(method => {
        expect(['credit_card', 'debit_card', 'paypal', 'bank_transfer']).toContain(method);
      });
    });

    it('should support all payment statuses', () => {
      const statuses: Payment['status'][] = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      statuses.forEach(status => {
        expect(['pending', 'processing', 'completed', 'failed', 'refunded']).toContain(status);
      });
    });

    it('should validate amount is positive', () => {
      const payment: Payment = {
        orderId: 'order123',
        userId: 'user123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(payment.amount).toBeGreaterThan(0);
    });

    it('should allow optional transactionId', () => {
      const payment: Payment = {
        orderId: 'order123',
        userId: 'user123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'completed',
        transactionId: 'TXN-123456',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(payment.transactionId).toBe('TXN-123456');
    });
  });
});

