import { Report } from './index';

describe('ReportsService', () => {
  describe('Report interface', () => {
    it('should create a valid report', () => {
      const report: Report = {
        type: 'sales',
        period: 'monthly',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        data: { totalSales: 1000, totalOrders: 10 },
        generatedAt: new Date().toISOString(),
      };

      expect(report.type).toBe('sales');
      expect(report.period).toBe('monthly');
      expect(report.data).toBeDefined();
    });

    it('should support all report types', () => {
      const types: Report['type'][] = ['sales', 'inventory', 'users', 'products'];
      types.forEach(type => {
        expect(['sales', 'inventory', 'users', 'products']).toContain(type);
      });
    });

    it('should support all periods', () => {
      const periods: Report['period'][] = ['daily', 'weekly', 'monthly', 'yearly'];
      periods.forEach(period => {
        expect(['daily', 'weekly', 'monthly', 'yearly']).toContain(period);
      });
    });

    it('should require start and end dates', () => {
      const report: Report = {
        type: 'sales',
        period: 'monthly',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        data: {},
        generatedAt: new Date().toISOString(),
      };

      expect(report.startDate).toBeTruthy();
      expect(report.endDate).toBeTruthy();
    });

    it('should allow optional generatedBy', () => {
      const report: Report = {
        type: 'sales',
        period: 'monthly',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        data: {},
        generatedAt: new Date().toISOString(),
        generatedBy: 'user123',
      };

      expect(report.generatedBy).toBe('user123');
    });
  });
});

