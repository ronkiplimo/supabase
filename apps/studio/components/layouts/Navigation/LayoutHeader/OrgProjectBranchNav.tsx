import { IS_PLATFORM, useParams } from 'common'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'lucide-react'
import { useMemo } from 'react'
import { Badge, cn } from 'ui'

import { LayoutHeaderDivider } from './LayoutHeader'
import { BranchDropdown } from '@/components/layouts/AppLayout/BranchDropdown'
import { OrganizationDropdown } from '@/components/layouts/AppLayout/OrganizationDropdown'
import { ProjectDropdown } from '@/components/layouts/AppLayout/ProjectDropdown'
import { getResourcesExceededLimitsOrg } from '@/components/ui/OveragesBanner/OveragesBanner.utils'
import { useOrgUsageQuery } from '@/data/usage/org-usage-query'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

const OrgProjectBranchNav = ({ className }: { className?: string }) => {
  const { ref: projectRef, slug } = useParams()
  const { data: selectedProject } = useSelectedProjectQuery()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()

  // We only want to query the org usage and check for possible over-ages for plans without usage billing enabled (free or pro with spend cap)
  const { data: orgUsage } = useOrgUsageQuery(
    { orgSlug: selectedOrganization?.slug },
    { enabled: selectedOrganization?.usage_billing_enabled === false }
  )

  const exceedingLimits = useMemo(() => {
    if (orgUsage) {
      return getResourcesExceededLimitsOrg(orgUsage?.usages || []).length > 0
    } else {
      return false
    }
  }, [orgUsage])

  // show org selection if we are on a project page or on a explicit org route
  const showOrgSelection = slug || (selectedOrganization && projectRef)

  return (
    <div className={cn('flex items-center', className)}>
      {showOrgSelection && IS_PLATFORM ? (
        <>
          <LayoutHeaderDivider />
          <OrganizationDropdown />
        </>
      ) : null}
      <AnimatePresence>
        {projectRef && (
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
          >
            {IS_PLATFORM && <LayoutHeaderDivider />}
            <ProjectDropdown />

            {exceedingLimits && (
              <div className="ml-2">
                <Link href={`/org/${selectedOrganization?.slug}/usage`}>
                  <Badge variant="destructive">Exceeding usage limits</Badge>
                </Link>
              </div>
            )}

            {selectedProject && IS_PLATFORM && (
              <>
                <LayoutHeaderDivider />
                <BranchDropdown />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OrgProjectBranchNav
