import type { FastifyInstance } from 'fastify';
import { SettingsService } from './settings.service.js';
import { pushTokenSchema } from './settings.schema.js';
import { authenticate } from '../../middleware/authenticate.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/push-token', {
    schema: {
      tags: ['Settings'],
      summary: 'Registrar token de push notification',
      description: 'Salva ou atualiza o Expo Push Token do dispositivo do usuário para envio de notificações.',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 1, example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const { token } = pushTokenSchema.parse(request.body);
    
    await SettingsService.registerPushToken(user.id, token);
    return reply.send({ success: true });
  });
}
