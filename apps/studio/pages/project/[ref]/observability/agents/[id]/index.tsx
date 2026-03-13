import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { NextPageWithLayout } from 'types'

const AgentOverviewRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref, id } = useParams()

  useEffect(() => {
    if (ref && id) {
      router.replace(`/project/${ref}/agents/${id}`)
    }
  }, [ref, id, router])

  return null
}

AgentOverviewRedirectPage.getLayout = (page) => page

export default AgentOverviewRedirectPage
