import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useRouter } from 'next/router'

import { useParams } from 'common'
import { ButtonTooltip } from 'components/ui/ButtonTooltip'
import { InlineLink } from 'components/ui/InlineLink'
import { useProjectSettingsV2Query } from 'data/config/project-settings-v2-query'
import { useAsyncCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useIsProjectActive, useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { DOCS_URL } from 'lib/constants'
import { Button, cn } from 'ui'
import { CodeBlock } from 'ui-patterns/CodeBlock'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

const DB_PASSWORD_PLACEHOLDER = '[YOUR-PASSWORD]'

function buildDirectPostgresConnectionUri(settings: {
  db_user: string
  db_host: string
  db_port: number
  db_name: string
}) {
  return `postgresql://${settings.db_user}:${DB_PASSWORD_PLACEHOLDER}@${settings.db_host}:${settings.db_port}/${settings.db_name}`
}

function buildLogicalBackupShellScript(connectionUri: string) {
  return [
    'npx supabase login',
    `npx supabase db dump --db-url "${connectionUri}" -f roles.sql --role-only`,
    `npx supabase db dump --db-url "${connectionUri}" -f schema.sql`,
    `npx supabase db dump --db-url "${connectionUri}" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"`,
  ].join('\n')
}

export type LogicalBackupCliInstructionsProps = {
  enabled?: boolean
  className?: string
}

export const LogicalBackupCliInstructions = ({
  enabled = true,
  className,
}: LogicalBackupCliInstructionsProps) => {
  const router = useRouter()
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const isProjectActive = useIsProjectActive()

  const { can: canResetDbPassword } = useAsyncCheckPermissions(
    PermissionAction.UPDATE,
    'projects',
    {
      resource: {
        project_id: project?.id,
      },
    }
  )

  const { data: settings, isSuccess, isError } = useProjectSettingsV2Query(
    { projectRef: ref },
    { enabled: enabled && Boolean(ref) }
  )

  const connectionUri =
    isSuccess && settings
      ? buildDirectPostgresConnectionUri({
          db_user: settings.db_user,
          db_host: settings.db_host,
          db_port: settings.db_port,
          db_name: settings.db_name,
        })
      : null

  const shellScript = connectionUri ? buildLogicalBackupShellScript(connectionUri) : ''

  const resetPasswordHref = ref ? `/project/${ref}/database/settings#database-password` : '#'
  const resetDisabled = !canResetDbPassword || !isProjectActive

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h4 className="text-sm font-medium">Back up your database with the Supabase CLI</h4>
        <p className="text-sm text-foreground-light mt-1">
          Use your direct connection string (replace {DB_PASSWORD_PLACEHOLDER} with your database
          password).{' '}
          <InlineLink href={`${DOCS_URL}/guides/platform/backups`}>Backup documentation</InlineLink>
          .
        </p>
      </div>

      <ButtonTooltip
        type="default"
        disabled={resetDisabled}
        onClick={() => {
          if (!resetDisabled && ref) {
            void router.push(`/project/${ref}/database/settings#database-password`)
          }
        }}
        tooltip={{
          content: {
            side: 'bottom',
            text: !canResetDbPassword
              ? 'You need additional permissions to reset the database password'
              : !isProjectActive
                ? 'Reset database password is only available while the project is active'
                : undefined,
          },
        }}
      >
        Reset database password
      </ButtonTooltip>

      {isError && (
        <p className="text-sm text-foreground-light">
          Could not load connection details. Open{' '}
          <InlineLink href={resetPasswordHref}>Database settings</InlineLink> to copy your
          connection string, then run the commands below.
        </p>
      )}

      {!isError && !connectionUri && <ShimmeringLoader className="py-4" />}

      {connectionUri ? (
        <CodeBlock
          language="bash"
          value={shellScript}
          hideLineNumbers
          className="[&_code]:text-[12px] [&_code]:text-foreground"
          wrapperClassName="[&_pre]:px-4 [&_pre]:py-3"
        />
      ) : null}
    </div>
  )
}
