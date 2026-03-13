import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { NextPageWithLayout } from 'types'

const AgentTasksRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref, id } = useParams()

  useEffect(() => {
    if (ref && id) {
      router.replace(`/project/${ref}/agents/${id}/tasks`)
    }
  }, [ref, id, router])

  return null
}

AgentTasksRedirectPage.getLayout = (page) => page

export default AgentTasksRedirectPage
