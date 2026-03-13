export type Agent = {
  id: string
  name: string
  summary: string | null
  system_prompt: string | null
  tools: string[]
  created_at: string
  updated_at: string
}

export type AgentDetails = Agent & {
  message_count: number
  task_count: number
  alert_count: number
  conversation_count: number
}

export type AgentTask = {
  id: string
  user_id: string
  agent_id: string
  name: string
  description: string
  schedule: string
  is_unique: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export type Rule = {
  id: string
  user_id: string
  title: string
  description: string
  default_message: string | null
  sql_query: string | null
  edge_function_name: string | null
  schedule: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export type Alert = {
  id: string
  parent_alert_id: string | null
  agent_id: string | null
  user_id: string | null
  conversation_message_id: string | null
  rule_id: string | null
  severity: AlertSeverity
  title: string
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
  resolved_at: string | null
}

export type AlertMessage = {
  id: string
  alert_id: string
  user_id: string | null
  agent_id: string | null
  role: 'user' | 'assistant'
  parts: unknown
  created_at: string
}

export type AgentLogRow = {
  id: string
  source: 'conversation' | 'alert'
  source_id: string
  role: 'user' | 'assistant'
  task_name: string | null
  thread_label: string | null
  content: string
  created_at: string
}
