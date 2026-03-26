import { useParams } from 'common'
import { InlineLink } from 'components/ui/InlineLink'
import { ReplicationPipelineStatusData } from 'data/replication/pipeline-status-query'
import { PipelineStatusRequestStatus } from 'state/replication-pipeline-request-status'
import type { ResponseError } from 'types'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'
import { StateBadge, type StateBadgeState } from 'ui-patterns/StateBadge'

import { getPipelineStateMessages } from './Pipeline.utils'
import { PipelineStatusName } from './Replication.constants'

interface PipelineStatusProps {
  pipelineStatus: ReplicationPipelineStatusData['status'] | undefined
  error: ResponseError | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  requestStatus?: PipelineStatusRequestStatus
  pipelineId?: number
}

export const PipelineStatus = ({
  pipelineStatus,
  error,
  isLoading,
  isError,
  isSuccess,
  requestStatus,
  pipelineId,
}: PipelineStatusProps) => {
  const { ref } = useParams()

  // Map backend statuses to UX-friendly display
  const getStatusConfig = (): {
    label: string
    state: StateBadgeState
    tooltip: string
  } => {
    const statusName =
      pipelineStatus && typeof pipelineStatus === 'object' && 'name' in pipelineStatus
        ? pipelineStatus.name
        : undefined

    // Get consistent tooltip message using the same logic as other components
    const stateMessages = getPipelineStateMessages(requestStatus, statusName)

    // Show optimistic request state while backend still reports steady states
    switch (requestStatus) {
      case PipelineStatusRequestStatus.RestartRequested:
        return { label: 'Restarting', state: 'pending', tooltip: stateMessages.message }
      case PipelineStatusRequestStatus.StartRequested:
        return { label: 'Starting', state: 'pending', tooltip: stateMessages.message }
      case PipelineStatusRequestStatus.StopRequested:
        return { label: 'Stopping', state: 'pending', tooltip: stateMessages.message }
    }

    if (pipelineStatus && typeof pipelineStatus === 'object' && 'name' in pipelineStatus) {
      switch (pipelineStatus.name) {
        case PipelineStatusName.FAILED:
          return { label: 'Failed', state: 'failure', tooltip: stateMessages.message }
        case PipelineStatusName.STARTING:
          return { label: 'Starting', state: 'pending', tooltip: stateMessages.message }
        case PipelineStatusName.STARTED:
          return { label: 'Running', state: 'success', tooltip: stateMessages.message }
        case PipelineStatusName.STOPPED:
          return { label: 'Stopped', state: 'disabled', tooltip: stateMessages.message }
        case PipelineStatusName.STOPPING:
          return { label: 'Stopping', state: 'pending', tooltip: stateMessages.message }
        default:
          return { label: 'Unknown', state: 'unknown', tooltip: stateMessages.message }
      }
    }

    // Fallback for undefined or invalid status
    return {
      label: 'Unknown',
      state: 'unknown',
      tooltip: 'Pipeline status is unclear - check logs for details',
    }
  }

  const { state, tooltip, label } = getStatusConfig()

  const pipelineLogsUrl = pipelineId
    ? `/project/${ref}/logs/replication-logs?f=${encodeURIComponent(
        JSON.stringify({ pipeline_id: pipelineId })
      )}`
    : `/project/${ref}/logs/replication-logs`

  return (
    <>
      {isLoading && <ShimmeringLoader />}

      {isError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <StateBadge state="unknown" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 text-center">
            Unable to retrieve status: {error?.message}
          </TooltipContent>
        </Tooltip>
      )}

      {isSuccess && (
        <Tooltip>
          <TooltipTrigger asChild>
            <StateBadge state={state}>{label}</StateBadge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {tooltip}{' '}
            {['unknown', 'failed'].includes(pipelineStatus?.name ?? '') && (
              <>
                Check the <InlineLink href={pipelineLogsUrl}>logs</InlineLink> for more information.
              </>
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
}
