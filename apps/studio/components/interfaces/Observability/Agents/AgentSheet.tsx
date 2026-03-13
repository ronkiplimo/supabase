import { useEffect, useState } from 'react'

import { Button, Input, Input_Shadcn_ as InputField, Label_Shadcn_ as Label, Sheet, SheetContent, SheetFooter, SheetHeader, SheetSection, SheetTitle } from 'ui'

import type { Agent } from 'data/project-meta/types'

type AgentValues = {
  name: string
  summary?: string
  system_prompt?: string
  tools?: string[]
}

interface AgentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AgentValues) => void
  isSubmitting: boolean
  initialValues?: Agent | null
}

function sanitizeTools(input: string) {
  return Array.from(
    new Set(
      input
        .split(',')
        .map((tool) => tool.trim())
        .filter(Boolean)
    )
  )
}

export const AgentSheet = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
}: AgentSheetProps) => {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [toolsInput, setToolsInput] = useState('')

  useEffect(() => {
    if (!open) return

    setName(initialValues?.name ?? '')
    setSummary(initialValues?.summary ?? '')
    setSystemPrompt(initialValues?.system_prompt ?? '')
    setToolsInput(initialValues?.tools.join(', ') ?? '')
  }, [initialValues, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{initialValues ? 'Edit agent' : 'Create an agent'}</SheetTitle>
        </SheetHeader>

        <SheetSection className="flex flex-1 flex-col gap-4 overflow-auto px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Name</Label>
            <InputField
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Daily reporter"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-summary">Summary</Label>
            <Input.TextArea
              id="agent-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What this agent is responsible for"
              className="[&>div>div>div>textarea]:min-h-24 [&>div>div>div>textarea]:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-system-prompt">System prompt</Label>
            <Input.TextArea
              id="agent-system-prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="Instructions that shape how this agent behaves"
              className="[&>div>div>div>textarea]:min-h-40 [&>div>div>div>textarea]:text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-tools">Allowed tools</Label>
            <InputField
              id="agent-tools"
              value={toolsInput}
              onChange={(event) => setToolsInput(event.target.value)}
              placeholder="read_logs, query_metrics, notify_slack"
            />
            <p className="text-xs text-foreground-light">
              Use a comma-separated list. Leave blank to create an agent with no explicit tool
              allowlist yet.
            </p>
          </div>
        </SheetSection>

        <SheetFooter>
          <Button type="default" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                summary: summary.trim() || undefined,
                system_prompt: systemPrompt.trim() || undefined,
                tools: sanitizeTools(toolsInput),
              })
            }
          >
            {initialValues ? 'Save changes' : 'Create agent'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
