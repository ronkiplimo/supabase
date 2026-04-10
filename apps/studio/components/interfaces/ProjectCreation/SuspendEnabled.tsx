import { UseFormReturn } from 'react-hook-form'
import { FormControl_Shadcn_, FormField_Shadcn_, Switch } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import { CreateProjectForm } from './ProjectCreation.schema'
import Panel from '@/components/ui/Panel'

interface SuspendAndWakeEnabledInputProps {
  form: UseFormReturn<CreateProjectForm>
}

export const SuspendAndWakeEnabledInput = ({ form }: SuspendAndWakeEnabledInputProps) => {
  return (
    <Panel.Content>
      <FormField_Shadcn_
        control={form.control}
        name="suspendAndWake"
        render={({ field }) => (
          <FormItemLayout label="Enable Suspend & Wake" layout="horizontal">
            <FormControl_Shadcn_>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl_Shadcn_>
          </FormItemLayout>
        )}
      />
    </Panel.Content>
  )
}
