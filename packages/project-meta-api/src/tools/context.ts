export type ToolContext = {
  authHeader?: string | null
  conversationId?: string
  alertId?: string
  agentId?: string
  userId?: string
  projectRef?: string | null
  userToken?: string | null
}

let _ctx: ToolContext = {}

export function setToolContext(ctx: ToolContext) { _ctx = ctx }
export function clearToolContext() { _ctx = {} }
export function getToolContext(): ToolContext { return _ctx }
