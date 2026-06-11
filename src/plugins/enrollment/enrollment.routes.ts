import type { FastifyInstance } from 'fastify';
import { EnrollmentService } from './enrollment.service.js';
import { joinSchema } from './enrollment.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { AppError } from '../../lib/errors.js';

export async function enrollmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/invite', {
    schema: {
      tags: ['Enrollment'],
      summary: 'Gerar código de convite',
      description: 'Professor gera um código de 6 caracteres válido por 48h para vincular alunos.',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'A1B2C3' },
            professorId: { type: 'string', format: 'uuid' },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'PROFESSOR') throw new AppError(403, 'FORBIDDEN', 'Professors only');
    
    const result = await EnrollmentService.generateInviteCode(user.id);
    return reply.send(result);
  });

  fastify.post('/join', {
    schema: {
      tags: ['Enrollment'],
      summary: 'Entrar com código de convite',
      description: 'Aluno usa o código de convite para se vincular a um professor.',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: 6, maxLength: 6, example: 'A1B2C3' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            professorId: { type: 'string', format: 'uuid' },
            studentId: { type: 'string', format: 'uuid' },
            inviteCodeId: { type: 'string', format: 'uuid' },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'ALUNO') throw new AppError(403, 'FORBIDDEN', 'Students only');

    const { code } = joinSchema.parse(request.body);
    const result = await EnrollmentService.joinWithCode(user.id, code);
    return reply.send(result);
  });

  fastify.get('/students', {
    schema: {
      tags: ['Enrollment'],
      summary: 'Listar alunos do professor',
      description: 'Retorna todos os alunos ativamente vinculados ao professor autenticado.',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              professorId: { type: 'string', format: 'uuid' },
              studentId: { type: 'string', format: 'uuid' },
              active: { type: 'boolean' },
              student: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const result = await EnrollmentService.getStudents(user.id);
    return reply.send(result);
  });

  fastify.get('/professor', {
    schema: {
      tags: ['Enrollment'],
      summary: 'Ver professor vinculado',
      description: 'Retorna o professor vinculado ao aluno autenticado.',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            professorId: { type: 'string', format: 'uuid' },
            studentId: { type: 'string', format: 'uuid' },
            active: { type: 'boolean' },
            professor: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatarUrl: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const result = await EnrollmentService.getProfessor(user.id);
    return reply.send(result);
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Enrollment'],
      summary: 'Remover vínculo',
      description: 'Remove um vínculo entre professor e aluno. Professores podem remover seus alunos, e alunos podem remover seus professores.',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const { id } = request.params as { id: string };
    await EnrollmentService.unenroll(id, user.id, user.role);
    return reply.send({ success: true });
  });
}
