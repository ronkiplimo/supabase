import { LOCAL_STORAGE_KEYS } from 'common'
import { useParams } from 'common/hooks'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { useTrack } from 'lib/telemetry/track'
import Link from 'next/link'
import { Button } from 'ui'
import { ComputeBadge } from 'ui-patterns/ComputeBadge'

import { BannerCard } from '../BannerCard'
import { useBannerStack } from '../BannerStackProvider'

const ChevronsUpAnimated = () => (
  <svg
    width={10}
    height={10}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline
      points="17 18 12 13 7 18"
      className="animate-chevron-up"
      style={{ animationDelay: '0s' }}
    />
    <polyline
      points="17 11 12 6 7 11"
      className="animate-chevron-up"
      style={{ animationDelay: '0.3s' }}
    />
  </svg>
)

export const BannerFreeMicroUpgrade = () => {
  const { ref } = useParams()
  const track = useTrack()
  const { dismissBanner } = useBannerStack()
  const [, setIsDismissed] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.FREE_MICRO_UPGRADE_BANNER_DISMISSED(ref ?? ''),
    false
  )

  return (
    <BannerCard
      onDismiss={() => {
        setIsDismissed(true)
        dismissBanner('free-micro-upgrade-banner')
        track('free_micro_upgrade_banner_dismissed')
      }}
    >
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2 items-start">
          <div className="animate-badge-pulse">
            <div className="relative inline-flex overflow-hidden rounded">
              <ComputeBadge
                infraComputeSize="nano"
                icon={<ChevronsUpAnimated />}
                className="text-brand-600 border-brand-500 bg-brand/10 gap-1"
              />
              <span className="animate-badge-shimmer pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-brand/20 to-transparent blur-md" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-y-1 mb-2">
          <p className="text-sm font-medium">Free upgrade to Micro available</p>
          <p className="text-xs text-foreground-lighter text-balance">
            Your Pro plan includes a free upgrade from Nano to Micro — double the memory at no extra
            cost.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="primary"
            size="tiny"
            asChild
            onClick={() => {
              setIsDismissed(true)
              dismissBanner('free-micro-upgrade-banner')
              track('free_micro_upgrade_banner_cta_clicked')
            }}
          >
            <Link href={`/project/${ref}/settings/compute-and-disk?upgrade=micro`}>
              Upgrade for free
            </Link>
          </Button>
        </div>
      </div>
    </BannerCard>
  )
}
