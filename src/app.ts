import fastify from 'fastify'

const app = fastify({
  logger: true
})

app.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

export { app }