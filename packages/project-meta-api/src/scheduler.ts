import { Cron } from 'croner'
import { sql } from './db.js'
import { runTask } from './runner/task-runner.js'
import { runRule } from './runner/rule-runner.js'

type ScheduledItem = { id: string; schedule: string; enabled: boolean }

const taskJobs = new Map<string, Cron>()
const ruleJobs = new Map<string, Cron>()

function upsertJob(
  map: Map<string, Cron>,
  item: ScheduledItem,
  fn: (id: string) => Promise<void>
): void {
  map.get(item.id)?.stop()
  map.delete(item.id)

  if (!item.enabled) return

  const job = new Cron(item.schedule, () => {
    fn(item.id).catch((err) => {
      console.error(`[scheduler] job ${item.id} error:`, err)
    })
  })

  map.set(item.id, job)
}

function removeJob(map: Map<string, Cron>, id: string): void {
  map.get(id)?.stop()
  map.delete(id)
}

async function refreshTask(id: string): Promise<void> {
  const [task] = await sql`SELECT id, schedule, enabled FROM project_meta.agent_tasks WHERE id = ${id}`
  if (task) {
    upsertJob(taskJobs, task as ScheduledItem, runTask)
    console.log(`[scheduler] (re)scheduled task ${id} (${task.schedule})`)
  } else {
    removeJob(taskJobs, id)
    console.log(`[scheduler] removed task ${id}`)
  }
}

async function refreshRule(id: string): Promise<void> {
  const [rule] = await sql`SELECT id, schedule, enabled FROM project_meta.rules WHERE id = ${id}`
  if (rule) {
    upsertJob(ruleJobs, rule as ScheduledItem, runRule)
    console.log(`[scheduler] (re)scheduled rule ${id} (${rule.schedule})`)
  } else {
    removeJob(ruleJobs, id)
    console.log(`[scheduler] removed rule ${id}`)
  }
}

export async function initScheduler(): Promise<void> {
  // Load all tasks and rules on startup
  const [tasks, rules] = await Promise.all([
    sql`SELECT id, schedule, enabled FROM project_meta.agent_tasks`,
    sql`SELECT id, schedule, enabled FROM project_meta.rules`,
  ])

  for (const task of tasks) upsertJob(taskJobs, task as ScheduledItem, runTask)
  for (const rule of rules) upsertJob(ruleJobs, rule as ScheduledItem, runRule)

  console.log(`[scheduler] loaded ${tasks.length} task(s), ${rules.length} rule(s)`)

  // Listen for INSERT/UPDATE/DELETE changes via pg_notify triggers.
  // Payload format: "<type>:<id>:<op>" e.g. "task:uuid:upsert" or "rule:uuid:delete"
  await sql.listen('project_meta_scheduler', (payload) => {
    if (!payload) return
    const [type, id, op] = payload.split(':')

    if (type === 'task') {
      if (op === 'delete') {
        removeJob(taskJobs, id)
        console.log(`[scheduler] removed task ${id}`)
      } else {
        refreshTask(id).catch(console.error)
      }
    } else if (type === 'rule') {
      if (op === 'delete') {
        removeJob(ruleJobs, id)
        console.log(`[scheduler] removed rule ${id}`)
      } else {
        refreshRule(id).catch(console.error)
      }
    }
  })

  console.log('[scheduler] listening on project_meta_scheduler channel')
}
