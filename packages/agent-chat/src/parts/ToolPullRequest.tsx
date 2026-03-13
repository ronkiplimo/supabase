'use client'

import { ExternalLinkIcon, GitBranchIcon, GitPullRequestIcon } from 'lucide-react'

import type { AgentChatPullRequest } from '../types'
import {
  Badge,
  Button_Shadcn_ as Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'ui'

const STATUS_VARIANTS: Record<
  NonNullable<AgentChatPullRequest['status']>,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  open: 'default',
  draft: 'warning',
  merged: 'success',
  closed: 'secondary',
}

export const ToolPullRequest = ({
  title,
  url,
  number,
  repository,
  status,
  branch,
  baseBranch,
  summary,
}: AgentChatPullRequest) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-foreground-light">
              <GitPullRequestIcon className="h-3.5 w-3.5" />
              <span>{repository ?? 'Pull request'}</span>
              {number ? <span>#{number}</span> : null}
            </div>
            <CardTitle className="text-sm leading-5">{title}</CardTitle>
          </div>
          {status ? <Badge variant={STATUS_VARIANTS[status]}>{formatStatus(status)}</Badge> : null}
        </div>
        {summary ? <CardDescription>{summary}</CardDescription> : null}
      </CardHeader>
      {(branch || baseBranch) && (
        <CardContent className="pb-3">
          <div className="flex items-center gap-2 text-xs text-foreground-light">
            <GitBranchIcon className="h-3.5 w-3.5" />
            <span>{branch ?? 'unknown'}</span>
            {baseBranch ? <span>&rarr; {baseBranch}</span> : null}
          </div>
        </CardContent>
      )}
      <CardFooter>
        <Button asChild size="sm" type="default">
          <a href={url} rel="noreferrer" target="_blank">
            Open Pull Request
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

const formatStatus = (status: NonNullable<AgentChatPullRequest['status']>) =>
  status.charAt(0).toUpperCase() + status.slice(1)
