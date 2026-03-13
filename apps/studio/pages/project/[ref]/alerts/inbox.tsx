import { AlertsInbox } from 'components/interfaces/Observability/Alerts/AlertsInbox'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { ProjectLayout } from 'components/layouts/ProjectLayout'
import type { NextPageWithLayout } from 'types'

const AlertsInboxPage: NextPageWithLayout = () => {
  return <AlertsInbox />
}

AlertsInboxPage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayout>{page}</ProjectLayout>
  </DefaultLayout>
)

export default AlertsInboxPage
