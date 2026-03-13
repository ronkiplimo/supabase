import { AgentTasksList } from 'components/interfaces/Observability/Agents/AgentTasksList'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { AgentDetailsLayout } from 'components/layouts/ObservabilityLayout/AgentDetailsLayout'
import { ProjectLayout } from 'components/layouts/ProjectLayout'
import type { NextPageWithLayout } from 'types'

const AgentTasksPage: NextPageWithLayout = () => {
  return <AgentTasksList />
}

AgentTasksPage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayout>
      <AgentDetailsLayout>{page}</AgentDetailsLayout>
    </ProjectLayout>
  </DefaultLayout>
)

export default AgentTasksPage
