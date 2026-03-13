import { AgentOverview } from 'components/interfaces/Observability/Agents/AgentOverview'
import { SIDEBAR_KEYS } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { AgentDetailsLayout } from 'components/layouts/ObservabilityLayout/AgentDetailsLayout'
import { ObservabilityLayout } from 'components/layouts/ObservabilityLayout/ObservabilityLayout'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import type { NextPageWithLayout } from 'types'

const AgentOverviewPage: NextPageWithLayout = () => {
  const { closeSidebar } = useSidebarManagerSnapshot()
  const [conversationId, setConversationId] = useQueryState(
    'conversationId',
    parseAsString.withOptions({ history: 'push', clearOnDefault: true })
  )

  useEffect(() => {
    closeSidebar(SIDEBAR_KEYS.AI_ASSISTANT)
  }, [closeSidebar])

  return (
    <AgentOverview
      conversationId={conversationId}
      onConversationChange={setConversationId}
    />
  )
}

AgentOverviewPage.getLayout = (page) => (
  <DefaultLayout>
    <ObservabilityLayout>
      <AgentDetailsLayout>{page}</AgentDetailsLayout>
    </ObservabilityLayout>
  </DefaultLayout>
)

export default AgentOverviewPage
