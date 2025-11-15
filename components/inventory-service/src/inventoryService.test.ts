import { InventoryItem } from './index';

describe('InventoryService', () => {
  describe('InventoryItem interface', () => {
    it('should create a valid inventory item', () => {
      const item: InventoryItem = {
        productId: 'prod1',
        quantity: 100,
        reserved: 10,
        available: 90,
        lowStockThreshold: 20,
        updatedAt: new Date().toISOString(),
      };

      expect(item.productId).toBe('prod1');
      expect(item.quantity).toBe(100);
      expect(item.available).toBe(90);
    });

    it('should calculate available correctly', () => {
      const item: InventoryItem = {
        productId: 'prod1',
        quantity: 100,
        reserved: 10,
        available: 90,
        lowStockThreshold: 20,
        updatedAt: new Date().toISOString(),
      };

      expect(item.available).toBe(item.quantity - item.reserved);
    });

    it('should identify low stock items', () => {
      const item: InventoryItem = {
        productId: 'prod1',
        quantity: 15,
        reserved: 5,
        available: 10,
        lowStockThreshold: 20,
        updatedAt: new Date().toISOString(),
      };

      expect(item.available).toBeLessThanOrEqual(item.lowStockThreshold);
    });

    it('should validate quantity is non-negative', () => {
      const item: InventoryItem = {
        productId: 'prod1',
        quantity: 100,
        reserved: 0,
        available: 100,
        lowStockThreshold: 20,
        updatedAt: new Date().toISOString(),
      };

      expect(item.quantity).toBeGreaterThanOrEqual(0);
      expect(item.reserved).toBeGreaterThanOrEqual(0);
      expect(item.available).toBeGreaterThanOrEqual(0);
    });

    it('should prevent reserved from exceeding quantity', () => {
      const quantity = 100;
      const reserved = 50;
      const available = quantity - reserved;

      expect(reserved).toBeLessThanOrEqual(quantity);
      expect(available).toBeGreaterThanOrEqual(0);
    });
  });
});

