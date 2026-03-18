import { LOCAL_STORAGE_KEYS } from 'common'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import Link from 'next/link'
import { Button } from 'ui'
import { ComputeBadge } from 'ui-patterns/ComputeBadge'

import { BannerCard } from '../BannerCard'
import { useBannerStack } from '../BannerStackProvider'

const BANNER_ID = 'micro-upgrade-banner'

interface BannerMicroUpgradeProps {
  slug: string
  isFreePlan: boolean
}

export const BannerMicroUpgrade = ({ slug, isFreePlan }: BannerMicroUpgradeProps) => {
  const { dismissBanner } = useBannerStack()
  const [, setIsDismissed] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.MICRO_UPGRADE_BANNER_DISMISSED(slug),
    false
  )

  const onDismiss = () => {
    setIsDismissed(true)
    dismissBanner(BANNER_ID)
  }

  return (
    <BannerCard onDismiss={onDismiss}>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2 items-start">
          <div className="relative inline-flex overflow-hidden rounded">
            <ComputeBadge
              infraComputeSize="nano"
              className="text-brand-600 border-brand-500 bg-brand/10"
            />
            <span className="animate-badge-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
          </div>
        </div>
        <div className="flex flex-col gap-y-1 mb-2">
          <p className="text-sm font-medium">
            {isFreePlan ? 'Double your memory for free' : 'Free Micro upgrade available'}
          </p>
          <p className="text-xs text-foreground-lighter text-balance">
            {isFreePlan
              ? 'Upgrade to Pro and get a free Micro compute upgrade — double the memory at no extra cost.'
              : 'If you spot the glowing Nano badge on your projects, your Pro plan includes a free upgrade from Nano to Micro compute.'}
          </p>
        </div>
        {isFreePlan && (
          <div className="flex gap-2">
            <Button type="primary" size="tiny" asChild>
              <Link
                href={`/org/${slug}/billing?panel=subscriptionPlan&source=micro_upgrade_banner`}
              >
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        )}
      </div>
    </BannerCard>
  )
}
