import fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import authPlugin from './plugins/auth/auth.plugin.js'
import enrollmentPlugin from './plugins/enrollment/enrollment.plugin.js'
import workoutsPlugin from './plugins/workouts/workouts.plugin.js'
import nutritionPlugin from './plugins/nutrition/nutrition.plugin.js'
import settingsPlugin from './plugins/settings/settings.plugin.js'

const app = fastify({
  logger: true,
  ajv: {
    customOptions: {
      keywords: ['example']
    }
  }
})

// Enable CORS
app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
})

app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Peaktime API',
      description: 'API para gerenciamento de treinos, nutrição e acompanhamento de alunos por professores.',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3333', description: 'Local Development' }
    ],
    tags: [
      { name: 'Auth', description: 'Autenticação via Supabase' },
      { name: 'Enrollment', description: 'Vínculo Professor ↔ Aluno via código de convite' },
      { name: 'Workouts', description: 'Planos semanais de treino e acompanhamento diário' },
      { name: 'Nutrition', description: 'Registro de refeições e busca de alimentos' },
      { name: 'Settings', description: 'Configurações e notificações push (Expo)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT retornado pelo Supabase Auth'
        }
      }
    }
  }
})

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
})

app.get('/health', {
  schema: {
    tags: ['Health'],
    summary: 'Health check',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' }
        }
      }
    }
  }
}, async (request, reply) => {
  return { status: 'ok' }
})

app.register(authPlugin)
app.register(enrollmentPlugin)
app.register(workoutsPlugin)
app.register(nutritionPlugin)
app.register(settingsPlugin)

export { app }