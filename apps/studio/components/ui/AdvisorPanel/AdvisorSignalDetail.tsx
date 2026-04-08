import { FilesBucket as FilesBucketIcon } from 'icons'
import { EyeOff, Globe } from 'lucide-react'
import Link from 'next/link'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { SIDEBAR_KEYS } from '@/components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { AiAssistantDropdown } from '@/components/ui/AiAssistantDropdown'
import { InlineLink } from '@/components/ui/InlineLink'
import { useAiAssistantStateSnapshot } from '@/state/ai-assistant-state'
import { useSidebarManagerSnapshot } from '@/state/sidebar-manager-state'

import type { AdvisorSignalItem } from './AdvisorPanel.types'

interface AdvisorSignalDetailProps {
  item: AdvisorSignalItem
  onDismiss: (fingerprint: string) => void
}

const buildSignalAssistantPrompt = (item: AdvisorSignalItem) => {
  if (item.sourceData.type === 'public-bucket-listing') {
    return [
      `I'm reviewing an Advisor signal for a public storage bucket named "${item.sourceData.bucketName}".`,
      item.detailDescription ?? item.description,
      'Help me assess whether these SELECT policies should exist, what risks object listing introduces, and the safest remediation options.',
      'Please suggest the clearest next step and when it is reasonable to dismiss this signal.',
    ].join('\n\n')
  }

  return [
    `I'm reviewing an Advisor signal for a banned IP address: ${item.sourceData.ip}.`,
    item.detailDescription ?? item.description,
    'Help me assess whether this ban should remain in place, what I should investigate before removing it, and what the safest next step is.',
    'Please include when it is reasonable to dismiss this signal versus remove the ban.',
  ].join('\n\n')
}

export const AdvisorSignalDetail = ({ item, onDismiss }: AdvisorSignalDetailProps) => {
  const snap = useAiAssistantStateSnapshot()
  const { openSidebar } = useSidebarManagerSnapshot()

  const entityIcon =
    item.sourceData.type === 'banned-ip' ? (
      <Globe size={15} className="text-foreground-muted" />
    ) : (
      <FilesBucketIcon size={15} className="text-foreground-muted" />
    )
  const entityValue =
    item.sourceData.type === 'banned-ip' ? item.sourceData.ip : item.sourceData.bucketName
  const entityTooltip =
    item.sourceData.type === 'banned-ip'
      ? 'IP address currently blocked by network bans'
      : 'File storage bucket'
  const issueDescription =
    item.sourceData.type === 'banned-ip' ? (
      <>
        The IP address <code className="text-code-inline">{item.sourceData.ip}</code> is temporarily
        blocked because of suspicious traffic or repeated failed password attempts. If this block is
        expected, you can dismiss this signal or remove the ban.
      </>
    ) : (
      <>
        The bucket <code className="text-code-inline">{item.sourceData.bucketName}</code> is public,
        and{' '}
        {item.sourceData.policyCount === 1
          ? '1 SELECT policy'
          : `${item.sourceData.policyCount} SELECT policies`}{' '}
        on <code className="text-code-inline">storage.objects</code>{' '}
        {item.sourceData.policyCount === 1 ? 'makes' : 'make'} its contents listable. Public buckets
        do not require SELECT policies for object access by URL, so this is often unintentional.
      </>
    )

  const handleAskAssistant = () => {
    openSidebar(SIDEBAR_KEYS.AI_ASSISTANT)
    snap.newChat({
      name: `Review ${item.title.toLowerCase()}`,
      initialMessage: buildSignalAssistantPrompt(item),
    })
  }

  return (
    <div>
      <h3 className="text-sm mb-2">Entity</h3>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-surface-200 border rounded-lg text-sm mb-6 w-fit">
            <span className="flex items-center text-foreground-muted" aria-hidden="true">
              {entityIcon}
            </span>
            <span>{entityValue}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{entityTooltip}</TooltipContent>
      </Tooltip>

      <h3 className="text-sm mb-2">Issue</h3>
      <p className="text-sm text-foreground-light mb-6">
        {issueDescription}{' '}
        {item.learnMoreHref !== undefined && (
          <>
            <InlineLink href={item.learnMoreHref}>Learn more</InlineLink>.
          </>
        )}
      </p>

      <h3 className="text-sm mb-2">Resolve</h3>
      <div className="flex items-center gap-2">
        <AiAssistantDropdown
          label="Ask Assistant"
          buildPrompt={() => buildSignalAssistantPrompt(item)}
          onOpenAssistant={handleAskAssistant}
        />
        {item.actions.map((action) => (
          <Button key={`${item.fingerprint}-${action.href}`} type="default" asChild>
            <Link href={action.href}>
              <span className="flex items-center gap-2">{action.label}</span>
            </Link>
          </Button>
        ))}
        <Button
          type="default"
          icon={<EyeOff size={14} strokeWidth={1.5} />}
          onClick={() => onDismiss(item.fingerprint)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
