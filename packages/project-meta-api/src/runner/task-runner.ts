import { sql, PROJECT_REF } from '../db.js'

const PORT = process.env.PORT ?? 3001
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

type Task = {
  id: string
  agent_id: string
  name: string
  description: string
  schedule: string
  is_unique: boolean
  enabled: boolean
}

export async function runTask(taskId: string): Promise<void> {
  const [task] = (await sql`
    SELECT * FROM project_meta.agent_tasks WHERE id = ${taskId} AND enabled = true
  `) as Task[]

  if (!task) {
    console.warn(`[task-runner] task ${taskId} not found or disabled`)
    return
  }

  // Determine conversation ID:
  //   is_unique = true  → new conversation per execution (each run is standalone)
  //   is_unique = false → thread all executions under one persistent conversation
  let conversationId: string

  if (task.is_unique) {
    conversationId = crypto.randomUUID()
  } else {
    const [existing] = await sql`
      SELECT id FROM project_meta.conversations
      WHERE task_id = ${taskId}
      ORDER BY created_at ASC
      LIMIT 1
    `
    conversationId = existing?.id ?? crypto.randomUUID()
  }

  const messageId = `msg-${crypto.randomUUID().replace(/-/g, '')}`

  const payload = {
    message: {
      id: messageId,
      role: 'system',
      parts: [{ type: 'text', text: task.description }],
      createdAt: new Date().toISOString(),
    },
    conversation_id: conversationId,
    agent_id: task.agent_id,
    task_id: taskId,
    persist: true,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'X-User-Token': SERVICE_ROLE_KEY,
    'x-internal-no-stream': '1',
  }
  if (PROJECT_REF) headers['X-Project-Ref'] = PROJECT_REF

  const response = await fetch(`http://localhost:${PORT}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Chat request failed (${response.status}): ${text}`)
  }

  console.log(`[task-runner] task "${task.name}" executed → conversation ${conversationId}`)
}
