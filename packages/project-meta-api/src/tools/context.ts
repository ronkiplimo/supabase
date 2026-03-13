import { AsyncLocalStorage } from 'node:async_hooks'

export type ToolContext = {
  authHeader?: string | null
  conversationId?: string
  alertId?: string
  agentId?: string
  userId?: string
  projectRef?: string | null
  userToken?: string | null
}

const toolContextStorage = new AsyncLocalStorage<ToolContext>()
let fallbackCtx: ToolContext = {}

export function setToolContext(ctx: ToolContext) {
  fallbackCtx = ctx
  toolContextStorage.enterWith(ctx)
}

export function clearToolContext() {
  fallbackCtx = {}
}

export function getToolContext(): ToolContext {
  return toolContextStorage.getStore() ?? fallbackCtx
}
