import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRouter } from './routes/api.js'
import { chatRouter } from './routes/chat.js'
import { initScheduler } from './scheduler.js'

const app = new Hono()

app.onError((err, c) => {
  console.error('[project-meta-api error]', err)
  return c.json({ error: err.message }, 500)
})

app.use('*', cors())

app.route('/api', apiRouter)
app.route('/chat', chatRouter)

app.get('/health', (c) => c.json({ status: 'ok' }))

const PORT = Number(process.env.PORT ?? 3001)
console.log(`project-meta-api listening on :${PORT}`)

serve({ fetch: app.fetch, port: PORT }, () => {
  initScheduler().catch((err) => {
    console.error('[scheduler] failed to initialise:', err)
  })
})
