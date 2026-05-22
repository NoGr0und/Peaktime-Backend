import { app } from './app.js'

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server is running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
