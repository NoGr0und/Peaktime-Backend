import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export const NutritionService = {
  async searchFood(query: string) {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
    
    if (!response.ok) {
      throw new AppError(502, 'API_ERROR', 'Failed to fetch food data');
    }

    const data: any = await response.json();
    return data.products.map((p: any) => ({
      name: p.product_name,
      caloriesPer100g: p.nutriments?.['energy-kcal_100g'] || 0,
      proteinPer100g: p.nutriments?.proteins_100g || 0,
      carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
      fatPer100g: p.nutriments?.fat_100g || 0
    })).filter((p: any) => p.name);
  },

  async createMeal(studentId: string, data: any) {
    try {
      return await prisma.meal.create({
        data: {
          studentId,
          type: data.type,
          date: data.date,
          items: {
            create: data.items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat
            }))
          }
        },
        include: { items: true }
      });
    } catch (e) {
      throw new AppError(409, 'ALREADY_EXISTS', 'Meal error or duplicated info');
    }
  },

  async getMeals(studentId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.meal.findMany({
      where: {
        studentId,
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: { items: true }
    });
  },

  async deleteMeal(studentId: string, mealId: string) {
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw new AppError(404, 'NOT_FOUND', 'Meal not found');
    if (meal.studentId !== studentId) throw new AppError(403, 'FORBIDDEN', 'Not your meal');

    return prisma.meal.delete({ where: { id: mealId } });
  }
};
