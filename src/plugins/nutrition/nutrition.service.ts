import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export const NutritionService = {
  async searchFood(query: string) {
    const fallbackFoods = [
      { name: 'Banana Nanica', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3 },
      { name: 'Ovo Cozido', caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
      { name: 'Pão Integral', caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.4 },
      { name: 'Peito de Frango Grelhado', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
      { name: 'Arroz Branco Cozido', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
      { name: 'Feijão Carioca Cozido', caloriesPer100g: 76, proteinPer100g: 4.8, carbsPer100g: 14, fatPer100g: 0.5 },
      { name: 'Whey Protein Concentrado', caloriesPer100g: 390, proteinPer100g: 80, carbsPer100g: 6, fatPer100g: 6 },
      { name: 'Leite Desnatado', caloriesPer100g: 35, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 0.1 },
      { name: 'Leite Integral', caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3 },
      { name: 'Maçã Fuji', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
      { name: 'Azeite de Oliva Extra Virgem', caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
      { name: 'Tapioca Pronta', caloriesPer100g: 358, proteinPer100g: 0.2, carbsPer100g: 89, fatPer100g: 0.2 },
      { name: 'Batata Doce Cozida', caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1 },
      { name: 'Aveia em Flocos', caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.3, fatPer100g: 6.9 },
      { name: 'Pasta de Amendoim', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
    ];

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`, {
        signal: controller.signal
      });
      clearTimeout(fetchTimeout);
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          return data.products.map((p: any) => ({
            name: p.product_name,
            caloriesPer100g: p.nutriments?.['energy-kcal_100g'] || 0,
            proteinPer100g: p.nutriments?.proteins_100g || 0,
            carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
            fatPer100g: p.nutriments?.fat_100g || 0
          })).filter((p: any) => p.name);
        }
      }
      console.warn(`Open Food Facts search returned status ${response.status}. Using fallback food list.`);
    } catch (e: any) {
      clearTimeout(fetchTimeout);
      console.error('Error fetching from Open Food Facts, using fallback food list:', e.message || e);
    }

    const normalizedQuery = query.toLowerCase();
    return fallbackFoods.filter(f => f.name.toLowerCase().includes(normalizedQuery));
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
