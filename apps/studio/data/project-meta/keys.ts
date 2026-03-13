export const projectMetaKeys = {
  list: (projectRef: string | undefined) => ['projects', projectRef, 'agents'] as const,
  agent: (projectRef: string | undefined, id: string | undefined) =>
    ['projects', projectRef, 'agents', id] as const,
  agentTasks: (projectRef: string | undefined, id: string | undefined) =>
    ['projects', projectRef, 'agents', id, 'tasks'] as const,
  agentLogs: (projectRef: string | undefined, id: string | undefined) =>
    ['projects', projectRef, 'agents', id, 'logs'] as const,
  tasks: (projectRef: string | undefined) => ['projects', projectRef, 'agent-tasks'] as const,
  rules: (projectRef: string | undefined) => ['projects', projectRef, 'agent-rules'] as const,
  alerts: (projectRef: string | undefined, resolved?: boolean | 'all') =>
    ['projects', projectRef, 'alerts', resolved ?? 'all'] as const,
  alertMessages: (projectRef: string | undefined, alertId: string | undefined) =>
    ['projects', projectRef, 'alerts', alertId, 'messages'] as const,
  conversations: (projectRef: string | undefined, agentId?: string | undefined) =>
    ['projects', projectRef, 'agent-conversations', agentId ?? 'all'] as const,
  conversationMessages: (projectRef: string | undefined, conversationId: string | undefined) =>
    ['projects', projectRef, 'agent-conversations', conversationId, 'messages'] as const,
}
