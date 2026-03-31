import CopyButton from 'components/ui/CopyButton'
import { Check, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button, Separator } from 'ui'

interface AiSupportChatSuccessProps {
  status: 'escalated' | 'user_resolved' | 'bot_resolved'
  ticketRef: string
  projectRef?: string
}

export function AiSupportChatSuccess({ status, ticketRef, projectRef }: AiSupportChatSuccessProps) {
  const isEscalated = status === 'escalated'

  return (
    <div className="mt-10 max-w-[620px] flex flex-col items-center space-y-4">
      <div className="relative">
        <Mail strokeWidth={1.5} size={60} className="text-brand" />
        <div className="h-6 w-6 rounded-full bg-brand absolute bottom-1 -right-1.5 flex items-center justify-center">
          <Check strokeWidth={4} size={16} className="text-contrast" />
        </div>
      </div>
      <div className="flex items-center flex-col space-y-2 text-center p-4">
        <h3 className="text-xl">
          {isEscalated ? 'Support request escalated' : 'Support request resolved'}
        </h3>
        <p className="text-sm text-foreground-light text-balance">
          {isEscalated
            ? 'Your request has been escalated to a human support agent. You’ll receive an email update once an agent responds.'
            : 'This conversation has been marked as resolved. If you still need help, you can submit a new support request at any time.'}
        </p>
      </div>

      <div className="!my-6 w-full">
        <Separator />
      </div>

      <div className="w-full px-4 space-y-2">
        <p className="text-sm text-foreground-light">Ticket reference</p>
        <div className="flex items-center justify-between gap-2 rounded border bg-surface-100 px-3 py-2">
          <code className="text-xs text-foreground">{ticketRef}</code>
          <CopyButton iconOnly type="text" text={ticketRef} />
        </div>
        {projectRef && (
          <p className="text-xs text-foreground-light">
            Project: <span className="text-foreground">{projectRef}</span>
          </p>
        )}
      </div>

      <div className="!mt-10 w-full">
        <Separator />
      </div>
      <div className="w-full pb-4 px-4 flex items-center justify-end gap-2">
        <Button asChild type="default">
          <Link href="/">Finish</Link>
        </Button>
      </div>
    </div>
  )
}
