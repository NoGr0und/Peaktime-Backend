import { test, expect, vi, beforeEach } from 'vitest';
import { NutritionService } from '../../../src/plugins/nutrition/nutrition.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    meal: { create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

test('searchFood returns parsed results from Open Food Facts', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      products: [
        { product_name: 'Arroz', nutriments: { 'energy-kcal_100g': 130, proteins_100g: 2.7, carbohydrates_100g: 28, fat_100g: 0.3 } }
      ]
    })
  } as any);

  const results = await NutritionService.searchFood('Arroz');
  expect(results[0].name).toBe('Arroz');
  expect(results[0].caloriesPer100g).toBe(130);
});

test('createMeal creates a meal with items', async () => {
  vi.mocked(prisma.meal.create).mockResolvedValue({ id: 'meal-1' } as any);

  const result = await NutritionService.createMeal('stu-1', {
    type: 'LUNCH',
    date: new Date('2026-05-13'),
    items: [{ name: 'Arroz', quantity: 100, unit: 'g' }]
  });

  expect(result.id).toBe('meal-1');
  expect(prisma.meal.create).toHaveBeenCalled();
});
