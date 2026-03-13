import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { NextPageWithLayout } from 'types'

const AgentLogsRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref, id } = useParams()

  useEffect(() => {
    if (ref && id) {
      router.replace(`/project/${ref}/agents/${id}/logs`)
    }
  }, [ref, id, router])

  return null
}

AgentLogsRedirectPage.getLayout = (page) => page

export default AgentLogsRedirectPage
