import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { NextPageWithLayout } from 'types'

const AlertsInboxRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref } = useParams()

  useEffect(() => {
    if (ref) {
      router.replace(`/project/${ref}/alerts/inbox`)
    }
  }, [ref, router])

  return null
}

AlertsInboxRedirectPage.getLayout = (page) => page

export default AlertsInboxRedirectPage
