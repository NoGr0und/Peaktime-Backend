import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(), // optional if creating without password, but recommended
  name: z.string().min(2),
  birthDate: z.string().datetime(), // ISO 8601
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['PROFESSOR', 'ALUNO'])
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  birthDate: z.string().datetime().optional(), // ISO 8601
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
