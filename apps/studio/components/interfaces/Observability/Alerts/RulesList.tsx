import { useParams } from 'common'
import AlertError from 'components/ui/AlertError'
import { useRuleCreateMutation } from 'data/project-meta/rules-create-mutation'
import { useRuleDeleteMutation } from 'data/project-meta/rules-delete-mutation'
import { useRulesQuery } from 'data/project-meta/rules-query'
import { useRuleUpdateMutation } from 'data/project-meta/rules-update-mutation'
import type { Rule } from 'data/project-meta/types'
import { MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'
import { EmptyStatePresentational, TimestampInfo } from 'ui-patterns'
import { Input } from 'ui-patterns/DataInputs/Input'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { RuleSheet } from './RuleSheet'

export const RulesList = () => {
  const { ref: projectRef } = useParams()
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)

  const { data: rules, error, isPending } = useRulesQuery({ projectRef })
  const { mutate: createRule, isPending: isCreating } = useRuleCreateMutation()
  const { mutate: updateRule, isPending: isUpdating } = useRuleUpdateMutation()
  const { mutate: deleteRule, isPending: isDeleting } = useRuleDeleteMutation()

  const filteredRules = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return rules ?? []

    return (rules ?? []).filter((rule) =>
      [rule.title, rule.description, rule.sql_query, rule.edge_function_name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    )
  }, [rules, search])

  const isSaving = isCreating || isUpdating

  return (
    <>
      <div className="space-y-0">
        <div className="flex flex-col justify-between gap-3 pb-4 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rules"
            icon={<Search />}
            size="tiny"
            className="w-full sm:w-80"
          />
          <Button
            type="primary"
            icon={<Plus />}
            onClick={() => {
              setSelectedRule(null)
              setSheetOpen(true)
            }}
          >
            New rule
          </Button>
        </div>

        {error ? (
          <div className="p-6">
            <AlertError error={error} subject="Failed to retrieve alert rules" />
          </div>
        ) : isPending ? (
          <div className="p-4">
            <GenericSkeletonLoader />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-6">
            <EmptyStatePresentational
              title={rules?.length ? 'No matching rules' : 'No rules yet'}
              description={
                rules?.length
                  ? 'Try a different search term or create a new rule.'
                  : 'Create a rule to turn query or edge-function checks into alert threads.'
              }
            >
              <Button
                type="default"
                icon={<Plus />}
                onClick={() => {
                  setSelectedRule(null)
                  setSheetOpen(true)
                }}
              >
                Create rule
              </Button>
            </EmptyStatePresentational>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="max-w-[360px]">
                      <div className="space-y-1">
                        <p className="truncate font-medium text-sm">{rule.title}</p>
                        <p className="truncate text-xs text-foreground-light">
                          {rule.description || 'No description'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {rule.sql_query ? 'SQL query' : 'Edge function'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{rule.schedule}</TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? 'success' : 'default'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TimestampInfo className="text-xs" utcTimestamp={rule.updated_at} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="text" icon={<MoreVertical />} className="w-7" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => {
                              setSelectedRule(rule)
                              setSheetOpen(true)
                            }}
                          >
                            <Pencil size={14} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => setDeleteTarget(rule)}>
                            <Trash2 size={14} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <RuleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialValues={selectedRule}
        isSubmitting={isSaving}
        onSubmit={(values) => {
          if (!projectRef) return

          const onSuccess = () => {
            setSheetOpen(false)
            setSelectedRule(null)
          }

          if (selectedRule) {
            updateRule({ projectRef, id: selectedRule.id, ...values }, { onSuccess })
          } else {
            createRule({ projectRef, ...values }, { onSuccess })
          }
        }}
      />

      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Delete rule"
        description={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete rule"
        confirmLabelLoading="Deleting rule"
        variant="destructive"
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!projectRef || !deleteTarget) return

          deleteRule(
            { projectRef, id: deleteTarget.id },
            {
              onSuccess: () => {
                setDeleteTarget(null)
              },
            }
          )
        }}
      />
    </>
  )
}
