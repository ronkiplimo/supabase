import { AgentLogsList } from 'components/interfaces/Observability/Agents/AgentLogsList'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { AgentDetailsLayout } from 'components/layouts/ObservabilityLayout/AgentDetailsLayout'
import { ProjectLayout } from 'components/layouts/ProjectLayout'
import type { NextPageWithLayout } from 'types'

const AgentLogsPage: NextPageWithLayout = () => {
  return <AgentLogsList />
}

AgentLogsPage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayout>
      <AgentDetailsLayout>{page}</AgentDetailsLayout>
    </ProjectLayout>
  </DefaultLayout>
)

export default AgentLogsPage
