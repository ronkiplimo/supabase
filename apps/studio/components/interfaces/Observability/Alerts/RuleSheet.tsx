import { useEffect, useState } from 'react'

import {
  Button,
  Input,
  Input_Shadcn_ as InputField,
  Label_Shadcn_ as Label,
  SelectContent_Shadcn_ as SelectContent,
  SelectItem_Shadcn_ as SelectItem,
  SelectTrigger_Shadcn_ as SelectTrigger,
  SelectValue_Shadcn_ as SelectValue,
  Select_Shadcn_ as Select,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetSection,
  SheetTitle,
  Switch,
} from 'ui'

import type { Rule } from 'data/project-meta/types'

type RuleValues = {
  title: string
  description?: string
  default_message?: string
  sql_query?: string | null
  edge_function_name?: string | null
  schedule: string
  enabled: boolean
}

interface RuleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RuleValues) => void
  isSubmitting: boolean
  initialValues?: Rule | null
}

export const RuleSheet = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
}: RuleSheetProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [defaultMessage, setDefaultMessage] = useState('')
  const [sourceType, setSourceType] = useState<'sql' | 'edge_function'>('sql')
  const [sqlQuery, setSqlQuery] = useState('')
  const [edgeFunctionName, setEdgeFunctionName] = useState('')
  const [schedule, setSchedule] = useState('')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!open) return

    setTitle(initialValues?.title ?? '')
    setDescription(initialValues?.description ?? '')
    setDefaultMessage(initialValues?.default_message ?? '')
    setSourceType(initialValues?.sql_query ? 'sql' : 'edge_function')
    setSqlQuery(initialValues?.sql_query ?? '')
    setEdgeFunctionName(initialValues?.edge_function_name ?? '')
    setSchedule(initialValues?.schedule ?? '')
    setEnabled(initialValues?.enabled ?? true)
  }, [initialValues, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{initialValues ? 'Edit rule' : 'Create a rule'}</SheetTitle>
        </SheetHeader>

        <SheetSection className="flex flex-1 flex-col gap-4 overflow-auto px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rule-title">Title</Label>
            <InputField
              id="rule-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="High error rate check"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rule-description">Description</Label>
            <Input.TextArea
              id="rule-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this rule monitors"
              className="[&>div>div>div>textarea]:min-h-24 [&>div>div>div>textarea]:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rule-default-message">Default message</Label>
            <Input.TextArea
              id="rule-default-message"
              value={defaultMessage}
              onChange={(event) => setDefaultMessage(event.target.value)}
              placeholder="Optional context to include when an alert is created"
              className="[&>div>div>div>textarea]:min-h-24 [&>div>div>div>textarea]:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rule-source-type">Source</Label>
            <Select value={sourceType} onValueChange={(value) => setSourceType(value as 'sql' | 'edge_function')}>
              <SelectTrigger id="rule-source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL Query</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceType === 'sql' ? (
            <div className="grid gap-2">
              <Label htmlFor="rule-sql-query">SQL query</Label>
              <Input.TextArea
                id="rule-sql-query"
                value={sqlQuery}
                onChange={(event) => setSqlQuery(event.target.value)}
                placeholder="select * from logs where level = 'error'"
                className="[&>div>div>div>textarea]:min-h-40 [&>div>div>div>textarea]:font-mono [&>div>div>div>textarea]:text-sm"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="rule-edge-function">Edge function name</Label>
              <InputField
                id="rule-edge-function"
                value={edgeFunctionName}
                onChange={(event) => setEdgeFunctionName(event.target.value)}
                placeholder="check-error-rate"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="rule-schedule">Schedule</Label>
            <InputField
              id="rule-schedule"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              placeholder="*/5 * * * *"
            />
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="text-sm">Enabled</p>
              <p className="text-xs text-foreground-light">Disabled rules stop generating alerts.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </SheetSection>

        <SheetFooter>
          <Button type="default" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            disabled={
              !title.trim() ||
              !schedule.trim() ||
              (sourceType === 'sql' ? !sqlQuery.trim() : !edgeFunctionName.trim())
            }
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                default_message: defaultMessage.trim() || undefined,
                sql_query: sourceType === 'sql' ? sqlQuery.trim() : null,
                edge_function_name:
                  sourceType === 'edge_function' ? edgeFunctionName.trim() : null,
                schedule: schedule.trim(),
                enabled,
              })
            }
          >
            {initialValues ? 'Save changes' : 'Create rule'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
