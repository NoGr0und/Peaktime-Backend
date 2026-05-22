import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['PROFESSOR', 'ALUNO']),
});
