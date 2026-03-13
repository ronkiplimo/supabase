import { useEffect, useState } from 'react'

import {
  Button,
  Input,
  Input_Shadcn_ as InputField,
  Label_Shadcn_ as Label,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetSection,
  SheetTitle,
  Switch,
} from 'ui'

import type { AgentTask } from 'data/project-meta/types'

type TaskValues = {
  name: string
  description: string
  schedule: string
  enabled: boolean
  is_unique: boolean
}

interface TaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TaskValues) => void
  isSubmitting: boolean
  agentName?: string
  initialValues?: AgentTask | null
}

export const TaskSheet = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  agentName,
  initialValues,
}: TaskSheetProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [isUnique, setIsUnique] = useState(false)

  useEffect(() => {
    if (!open) return

    setName(initialValues?.name ?? '')
    setDescription(initialValues?.description ?? '')
    setSchedule(initialValues?.schedule ?? '')
    setEnabled(initialValues?.enabled ?? true)
    setIsUnique(initialValues?.is_unique ?? false)
  }, [initialValues, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{initialValues ? 'Edit task' : `Create task${agentName ? ` for ${agentName}` : ''}`}</SheetTitle>
        </SheetHeader>

        <SheetSection className="flex flex-1 flex-col gap-4 overflow-auto px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-name">Name</Label>
            <InputField
              id="task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Morning health check"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Input.TextArea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should be sent to the agent when this task runs?"
              className="[&>div>div>div>textarea]:min-h-32 [&>div>div>div>textarea]:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-schedule">Schedule</Label>
            <InputField
              id="task-schedule"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              placeholder="0 9 * * *"
            />
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="text-sm">Unique run</p>
              <p className="text-xs text-foreground-light">
                Prevent overlapping runs for this task.
              </p>
            </div>
            <Switch checked={isUnique} onCheckedChange={setIsUnique} />
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="text-sm">Enabled</p>
              <p className="text-xs text-foreground-light">
                Disabled tasks remain attached to the agent but won&apos;t be scheduled.
              </p>
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
            disabled={!name.trim() || !description.trim() || !schedule.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim(),
                schedule: schedule.trim(),
                enabled,
                is_unique: isUnique,
              })
            }
          >
            {initialValues ? 'Save changes' : 'Create task'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
