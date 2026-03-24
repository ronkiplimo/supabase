import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useParams } from 'common'
import {
  ScaffoldContainer,
  ScaffoldSection,
  ScaffoldSectionContent,
  ScaffoldSectionDetail,
} from 'components/layouts/Scaffold'
import NoPermission from 'components/ui/NoPermission'
import { useGitHubConnectionsQuery } from 'data/integrations/github-connections-query'
import { useAsyncCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { BASE_PATH } from 'lib/constants'
import { useMemo } from 'react'
import { GenericSkeletonLoader } from 'ui-patterns'

import { GitHubIntegrationConnectionForm } from './GitHubIntegrationConnectionForm'

const IntegrationImageHandler = ({ title }: { title: 'vercel' | 'github' }) => {
  return (
    <img
      className="border rounded-lg shadow w-full sm:w-48 mt-6 border-body"
      src={`${BASE_PATH}/img/integrations/covers/${title}-cover.png`}
      alt={`${title} cover`}
    />
  )
}

export const GitHubSection = () => {
  const { ref: projectRef } = useParams()
  const { data: organization } = useSelectedOrganizationQuery()

  const { can: canReadGitHubConnection, isLoading: isLoadingPermissions } =
    useAsyncCheckPermissions(PermissionAction.READ, 'integrations.github_connections')

  const { data: connections } = useGitHubConnectionsQuery(
    { organizationId: organization?.id },
    { enabled: !!projectRef && !!organization?.id }
  )

  const existingConnection = useMemo(
    () => connections?.find((c) => c.project.ref === projectRef),
    [connections, projectRef]
  )

  const GitHubTitle = `GitHub Integration`

  return (
    <ScaffoldContainer>
      <ScaffoldSection className="py-12">
        <ScaffoldSectionDetail title={GitHubTitle}>
          <p>Connect any of your GitHub repositories to a project.</p>
          <IntegrationImageHandler title="github" />
        </ScaffoldSectionDetail>
        <ScaffoldSectionContent>
          {isLoadingPermissions ? (
            <GenericSkeletonLoader />
          ) : !canReadGitHubConnection ? (
            <NoPermission resourceText="view this organization's GitHub connections" />
          ) : (
            <div className="space-y-6">
              <h5 className="text-foreground">How does the GitHub integration work?</h5>
              <p className="text-foreground-light text-sm !mt-2">
                Connect GitHub to apply changes to your database when you merge to your production branch. If branching is enabled, each pull request gets its own preview database.
              </p>
              <GitHubIntegrationConnectionForm connection={existingConnection} />
            </div>
          )}
        </ScaffoldSectionContent>
      </ScaffoldSection>
    </ScaffoldContainer>
  )
}
