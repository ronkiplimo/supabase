import { Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { useParams } from 'common'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { AlertDescription_Shadcn_, AlertTitle_Shadcn_, Alert_Shadcn_, Button, cn } from 'ui'

export const NanoInstanceUpgradeBanner = () => {
  const { ref } = useParams()
  const router = useRouter()

  const { data: org } = useSelectedOrganizationQuery()
  const { data: project } = useSelectedProjectQuery()

  const isOnNano = project?.infra_compute_size === 'nano'
  const isOnPaidPlan = org?.plan?.id !== undefined && org.plan.id !== 'free'
  const isOnComputeSettingsPage = router.pathname.endsWith('/settings/compute-and-disk')

  if (!isOnNano || !isOnPaidPlan || isOnComputeSettingsPage) {
    return null
  }

  return (
    <Alert_Shadcn_
      variant="warning"
      className={cn(
        'flex items-center justify-between',
        'border-0 border-r-0 rounded-none [&>svg]:left-6 px-6 [&>svg]:w-[26px] [&>svg]:h-[26px]'
      )}
    >
      <Zap />
      <div className="">
        <AlertTitle_Shadcn_>Free upgrade to Micro compute available</AlertTitle_Shadcn_>
        <AlertDescription_Shadcn_>
          Your project is on a Nano instance which has limited resources. This can cause backups to
          fail, connection timeouts, and slow performance. Micro compute is included in your plan at
          no additional cost.
        </AlertDescription_Shadcn_>
      </div>
      <div className="flex items-center gap-x-2">
        <Button asChild type="default">
          <Link href={`/project/${ref}/settings/compute-and-disk`}>Upgrade to Micro</Link>
        </Button>
      </div>
    </Alert_Shadcn_>
  )
}
