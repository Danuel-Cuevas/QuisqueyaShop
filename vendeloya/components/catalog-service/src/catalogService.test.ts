import { Product } from './index';

describe('CatalogService', () => {
  describe('Product interface', () => {
    it('should create a valid product', () => {
      const product: Product = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'Electronics',
        sku: 'SKU-001',
        stock: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(99.99);
      expect(product.category).toBe('Electronics');
    });

    it('should allow optional imageUrl', () => {
      const product: Product = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/image.jpg',
        sku: 'SKU-001',
        stock: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(product.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should validate required fields', () => {
      const requiredFields = ['name', 'description', 'price', 'category', 'sku'];
      const product: any = {
        name: 'Test',
        description: 'Test',
        price: 10,
        category: 'Test',
        sku: 'SKU-001',
      };

      requiredFields.forEach(field => {
        expect(product[field]).toBeDefined();
      });
    });

    it('should validate price is a number', () => {
      const product: Product = {
        name: 'Test',
        description: 'Test',
        price: 99.99,
        category: 'Test',
        sku: 'SKU-001',
        stock: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(typeof product.price).toBe('number');
      expect(product.price).toBeGreaterThan(0);
    });

    it('should validate stock is a number', () => {
      const product: Product = {
        name: 'Test',
        description: 'Test',
        price: 99.99,
        category: 'Test',
        sku: 'SKU-001',
        stock: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(typeof product.stock).toBe('number');
      expect(product.stock).toBeGreaterThanOrEqual(0);
    });
  });
});

