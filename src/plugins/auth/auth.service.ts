import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export const AuthService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AppError(401, 'AUTH_FAILED', error.message);
    }

    if (!data.session) {
      throw new AppError(401, 'AUTH_FAILED', 'No session returned');
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: data.user.id }
    });

    if (!dbUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not synced in database');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        birthDate: dbUser.birthDate,
        phone: dbUser.phone,
        avatarUrl: dbUser.avatarUrl,
      }
    };
  },

  async register(data: {
    email: string;
    password?: string;
    name: string;
    birthDate: string;
    phone?: string;
    avatarUrl?: string;
    role: 'PROFESSOR' | 'ALUNO';
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new AppError(400, 'USER_ALREADY_EXISTS', 'Email is already registered');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password!,
    });

    if (authError || !authData.user) {
      throw new AppError(400, 'REGISTRATION_FAILED', authError?.message || 'Failed to sign up in Supabase');
    }

    try {
      const dbUser = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: data.email,
          name: data.name,
          birthDate: new Date(data.birthDate),
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          role: data.role,
        }
      });

      return {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          birthDate: dbUser.birthDate,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
        },
        session: authData.session ? {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        } : null,
      };
    } catch (dbError: any) {
      throw new AppError(500, 'DATABASE_ERROR', dbError.message || 'Failed to create user in database');
    }
  }
};

