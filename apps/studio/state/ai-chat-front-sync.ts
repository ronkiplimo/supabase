import {
  escalateConversationInFront,
  resolveConversationInFront,
  syncConversationMessagesToFront,
} from 'data/feedback/ai-chat-front-sync'
import type { AiSupportStatus } from 'data/feedback/ai-chat-front-sync'
import type { AiAssistantState } from 'state/ai-assistant-state'

/**
 * Extracts plain text content from AI SDK message parts.
 * Messages use a parts array where text content is in `part.type === 'text'`.
 */
function extractTextFromMessage(message: {
  parts?: Array<{ type: string; text?: string }>
}): string {
  if (!message.parts) return ''
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text ?? '')
    .join('\n')
}

type SyncableChatMessage = {
  id: string
  role: string
  content?: string
  parts?: Array<{ type: string; text?: string }>
}

/**
 * Syncs unsynced support chat messages to Front.
 *
 * Called from the AI assistant state `onFinish` callback (fire-and-forget).
 * Uses `isSyncing` flag to prevent concurrent syncs for the same chat.
 * Uses `lastSyncedMessageCount` to only send new (delta) messages.
 */
export async function syncSupportChatToFront(
  chatId: string,
  state: AiAssistantState
): Promise<void> {
  const chat = state.chats[chatId]
  if (!chat?.supportMetadata) return

  const { supportMetadata } = chat

  // Prevent concurrent syncs
  if (supportMetadata.isSyncing) return
  supportMetadata.isSyncing = true

  try {
    const allMessages = chat.messages
    const unsyncedMessages = allMessages.slice(supportMetadata.lastSyncedMessageCount)

    if (unsyncedMessages.length === 0) return

    // Convert AI SDK messages to plain text format for the sync API
    const messagesToSync = (unsyncedMessages as SyncableChatMessage[])
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: extractTextFromMessage(msg) || msg.content || '',
      }))
      .filter((msg) => msg.content.length > 0)

    if (messagesToSync.length === 0) return

    const isInitial = supportMetadata.lastSyncedMessageCount === 0

    const result = await syncConversationMessagesToFront({
      chatId,
      subject: supportMetadata.subject,
      messages: messagesToSync,
      isInitial,
      conversationId: supportMetadata.frontConversationId,
      ...(isInitial && {
        organizationSlug: supportMetadata.organizationSlug,
        projectRef: supportMetadata.projectRef,
        category: supportMetadata.category,
        severity: supportMetadata.severity,
        affectedServices: supportMetadata.affectedServices,
        library: supportMetadata.library,
        allowSupportAccess: supportMetadata.allowSupportAccess,
        browserInformation: supportMetadata.browserInformation,
      }),
    })

    if (result) {
      // Update sync tracking
      supportMetadata.lastSyncedMessageCount = allMessages.length

      if (result.conversationId && !supportMetadata.frontConversationId) {
        supportMetadata.frontConversationId = result.conversationId
      }
    }
  } finally {
    supportMetadata.isSyncing = false
  }
}

export async function syncSupportLifecycleToFront(
  chatId: string,
  state: AiAssistantState,
  aiSupportStatus: AiSupportStatus
): Promise<void> {
  const chat = state.chats[chatId]
  if (!chat?.supportMetadata) return

  const { supportMetadata } = chat
  if (!supportMetadata.frontConversationId) return
  if (supportMetadata.isSyncing) return

  supportMetadata.isSyncing = true

  try {
    let result = null

    if (aiSupportStatus === 'escalated') {
      result = await escalateConversationInFront({
        chatId,
        conversationId: supportMetadata.frontConversationId,
      })
    } else if (aiSupportStatus === 'user_resolved' || aiSupportStatus === 'bot_resolved') {
      result = await resolveConversationInFront({
        chatId,
        conversationId: supportMetadata.frontConversationId,
        aiSupportStatus,
      })
    }

    if (result?.aiSupportStatus) {
      supportMetadata.lifecycleStatus = result.aiSupportStatus
    }
  } finally {
    supportMetadata.isSyncing = false
  }
}
