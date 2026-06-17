import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema, updateProfileSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/authenticate.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: any, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.validation
      });
    }
    return reply.status(error.statusCode || 500).send({ error: error.message });
  });

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login com email e senha',
      description: 'Autentica o usuário via Supabase e retorna tokens JWT.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aluno@email.com' },
          password: { type: 'string', minLength: 6, example: 'senha123' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                birthDate: { type: 'string' },
                phone: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', nullable: true },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const result = await AuthService.login(email, password);
      return reply.send(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation Error', details: err.errors });
      }
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Registro de novo usuário',
      description: 'Cadastra um novo aluno ou professor no Supabase e no banco de dados local.',
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'birthDate', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aluno@email.com' },
          password: { type: 'string', minLength: 6, example: 'senha123' },
          name: { type: 'string', example: 'João Silva' },
          birthDate: { type: 'string', example: '1995-10-25T00:00:00.000Z' },
          role: { type: 'string', enum: ['PROFESSOR', 'ALUNO'], example: 'ALUNO' },
          phone: { type: 'string', example: '11999999999' },
          avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                birthDate: { type: 'string' },
                phone: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', nullable: true },
              },
            },
            session: {
              type: 'object',
              nullable: true,
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        500: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await AuthService.register(data);
      return reply.send(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation Error', details: err.errors });
      }
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Obter perfil do usuário logado',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            birthDate: { type: 'string' },
            phone: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preValidation: [authenticate],
  }, async (request, reply) => {
    return reply.send((request as any).user);
  });

  fastify.put('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Atualizar perfil do usuário logado',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          birthDate: { type: 'string' },
          phone: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            birthDate: { type: 'string' },
            phone: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preValidation: [authenticate],
  }, async (request, reply) => {
    try {
      const data = updateProfileSchema.parse(request.body);
      const user: any = (request as any).user;
      const updatedUser = await AuthService.updateProfile(user.id, data);
      return reply.send(updatedUser || user);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation Error', details: err.errors });
      }
      throw err;
    }
  });
}
