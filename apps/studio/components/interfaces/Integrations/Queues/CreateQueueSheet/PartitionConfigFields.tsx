import { UseFormReturn } from 'react-hook-form'
import { FormField_Shadcn_, Input, Separator, SheetSection } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import { CreateQueueForm } from './CreateQueueSheet.schema'

export function PartitionConfigFields({ form }: { form: UseFormReturn<CreateQueueForm> }) {
  const queueType = form.watch('values.type')

  if (queueType !== 'partitioned') return null

  return (
    <>
      <SheetSection className="flex flex-col gap-3">
        <FormField_Shadcn_
          control={form.control}
          name="values.partitionInterval"
          render={({ field: { ref, ...rest } }) => (
            <FormItemLayout label="Partition interval" className="gap-1">
              <Input
                {...rest}
                type="number"
                placeholder="1000"
                actions={<p className="text-foreground-light pr-2">ms</p>}
              />
            </FormItemLayout>
          )}
        />
        <FormField_Shadcn_
          control={form.control}
          name="values.retentionInterval"
          render={({ field: { ref, ...rest } }) => (
            <FormItemLayout label="Retention interval" className="gap-1">
              <Input
                {...rest}
                type="number"
                placeholder="1000"
                actions={<p className="text-foreground-light pr-2">ms</p>}
              />
            </FormItemLayout>
          )}
        />
      </SheetSection>
      <Separator />
    </>
  )
}
