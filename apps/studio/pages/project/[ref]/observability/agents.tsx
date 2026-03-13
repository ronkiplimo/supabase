import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { NextPageWithLayout } from 'types'

const AgentsRedirectPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref } = useParams()

  useEffect(() => {
    if (ref) {
      router.replace(`/project/${ref}/agents`)
    }
  }, [ref, router])

  return null
}

AgentsRedirectPage.getLayout = (page) => page

export default AgentsRedirectPage
