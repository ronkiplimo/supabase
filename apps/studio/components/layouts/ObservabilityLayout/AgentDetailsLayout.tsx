import { useParams } from 'common'
import { AgentSheet } from 'components/interfaces/Observability/Agents/AgentSheet'
import AlertError from 'components/ui/AlertError'
import { useAgentQuery } from 'data/project-meta/agent-query'
import { useAgentDeleteMutation } from 'data/project-meta/agents-delete-mutation'
import { useAgentUpdateMutation } from 'data/project-meta/agents-update-mutation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/router'
import { useEffect, useState, type PropsWithChildren } from 'react'
import { toast } from 'sonner'
import type { ResponseError } from 'types'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  NavMenu,
  NavMenuItem,
} from 'ui'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import {
  PageHeader,
  PageHeaderAside,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderNavigationTabs,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

interface AgentDetailsLayoutProps {
  title?: string
}

export const AgentDetailsLayout = ({
  title,
  children,
}: PropsWithChildren<AgentDetailsLayoutProps>) => {
  const pathname = usePathname()
  const router = useRouter()
  const { ref: projectRef, id } = useParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const {
    data: agent,
    error,
    isError,
    isPending,
  } = useAgentQuery({
    projectRef,
    id,
  })
  const { mutate: updateAgent, isPending: isUpdating } = useAgentUpdateMutation()
  const { mutate: deleteAgent, isPending: isDeleting } = useAgentDeleteMutation()
  const responseError = error as ResponseError | null

  const listPath = `/project/${projectRef}/observability/agents`
  const navigationItems = [
    { label: 'Overview', href: `/project/${projectRef}/observability/agents/${id}` },
    { label: 'Tasks', href: `/project/${projectRef}/observability/agents/${id}/tasks` },
    { label: 'Logs', href: `/project/${projectRef}/observability/agents/${id}/logs` },
  ]
  const breadcrumbItems = [
    { label: 'Agents', href: listPath },
    { label: agent?.name ?? 'Agent', href: `/project/${projectRef}/observability/agents/${id}` },
  ]

  useEffect(() => {
    if (!isError || responseError?.code !== 404) return

    toast('Agent cannot be found')
    router.push(listPath)
  }, [isError, listPath, responseError?.code, router])

  if (isPending || (!agent && !isError)) return null

  if (responseError && responseError.code !== 404) {
    return (
      <div className="px-6 py-6 xl:px-10">
        <AlertError error={responseError} subject="Failed to retrieve agent" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <>
      <PageHeader size="full" className="sticky top-0 z-10">
        {/* <PageHeaderBreadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <Fragment key={item.href}>
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </PageHeaderBreadcrumb> */}

        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>{title || agent.name}</PageHeaderTitle>
            {agent.summary && <PageHeaderDescription>{agent.summary}</PageHeaderDescription>}
          </PageHeaderSummary>

          <PageHeaderAside>
            <div className="flex items-center gap-2">
              <Button type="default" icon={<Pencil size={14} />} onClick={() => setSheetOpen(true)}>
                Edit
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="text" icon={<MoreVertical />} className="w-7" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="gap-2" onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={14} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </PageHeaderAside>
        </PageHeaderMeta>

        <PageHeaderNavigationTabs>
          <NavMenu>
            {navigationItems.map((item) => (
              <NavMenuItem key={item.href} active={pathname === item.href}>
                <Link href={item.href}>{item.label}</Link>
              </NavMenuItem>
            ))}
          </NavMenu>
        </PageHeaderNavigationTabs>
      </PageHeader>

      {children}

      <AgentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialValues={agent}
        isSubmitting={isUpdating}
        onSubmit={(values) => {
          if (!projectRef || !id) return

          updateAgent(
            {
              projectRef,
              id,
              ...values,
            },
            {
              onSuccess: () => {
                setSheetOpen(false)
              },
            }
          )
        }}
      />

      <ConfirmationModal
        visible={deleteOpen}
        title="Delete agent"
        description={`Delete "${agent.name}" and its scheduled tasks?`}
        confirmLabel="Delete agent"
        confirmLabelLoading="Deleting agent"
        variant="destructive"
        loading={isDeleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!projectRef || !id) return

          deleteAgent(
            { projectRef, id },
            {
              onSuccess: () => {
                setDeleteOpen(false)
                router.push(listPath)
              },
            }
          )
        }}
      />
    </>
  )
}
