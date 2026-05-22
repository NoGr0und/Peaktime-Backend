import z from 'zod';

const mealItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable()
});

export const createMealSchema = z.object({
  type: z.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']),
  date: z.string().datetime(),
  items: z.array(mealItemSchema)
});
