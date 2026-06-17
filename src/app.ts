import fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import authPlugin from './plugins/auth/auth.plugin.js'
import enrollmentPlugin from './plugins/enrollment/enrollment.plugin.js'
import workoutsPlugin from './plugins/workouts/workouts.plugin.js'
import nutritionPlugin from './plugins/nutrition/nutrition.plugin.js'
import settingsPlugin from './plugins/settings/settings.plugin.js'
import occupancyPlugin from './plugins/occupancy/occupancy.plugin.js'

// Importa o cliente do Prisma (Ajusta o caminho se o teu ficheiro estiver noutro local dentro de src/lib)
import { prisma } from './lib/prisma.js'

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
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'bypass-tunnel-reminder'],
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
      { name: 'Occupancy', description: 'Monitoramento em tempo real da ocupação' },
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
}, async () => {
  return { status: 'ok' }
})
app.post('/api/occupancy/hardware', {
  schema: {
    tags: ['Occupancy'],
    summary: 'Atualiza a lotação via hardware (botões ESP32/Wokwi)',
    body: {
      type: 'object',
      required: ['change'],
      properties: {
        change: { type: 'number', description: '1 para somar (entrada), -1 para subtrair (saída)' }
      }
    },
    // ... (o resto do schema do swagger continua igual)
  }
}, async (request, reply) => {
  const { change } = request.body as { change: number }

  try {
    // 1. Busca a leitura mais recente no banco de dados
    const lastReading = await prisma.occupancyReading.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    // 2. Define os valores base (se não houver leitura anterior, começa do zero)
    const currentCount = lastReading ? lastReading.count : 0
    const capacity = lastReading ? lastReading.capacity : 100 // Capacidade padrão

    // 3. Calcula o novo valor garantindo que não fica negativo
    const newCount = Math.max(0, currentCount + change)

    // 4. Cria um novo registo de ocupação com o timestamp atual
    const newReading = await prisma.occupancyReading.create({
      data: {
        count: newCount,
        capacity: capacity
      }
    })

    return reply.status(200).send({ 
      success: true, 
      newOccupancy: newReading.count 
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({ error: "Erro ao atualizar a lotação via hardware" })
  }
})

app.register(authPlugin)
app.register(enrollmentPlugin)
app.register(workoutsPlugin)
app.register(nutritionPlugin)
app.register(settingsPlugin)
app.register(occupancyPlugin)

export { app }