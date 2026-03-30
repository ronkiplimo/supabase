import { zodResolver } from '@hookform/resolvers/zod'
import { LOCAL_STORAGE_KEYS } from 'common'
import { useSendEventMutation } from 'data/telemetry/send-event-mutation'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { useForm } from 'react-hook-form'
import {
  Card,
  CardContent,
  Form_Shadcn_,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  Separator,
  Switch,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'
import * as z from 'zod'

const DashboardSettingsSchema = z.object({
  inlineEditorEnabled: z.boolean(),
  queueOperationsEnabled: z.boolean(),
})

export const useIsInlineEditorEnabled = () => {
  const [inlineEditorEnabled] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.UI_PREVIEW_INLINE_EDITOR,
    false
  )

  return inlineEditorEnabled ?? false
}

export const InlineEditorSettings = () => {
  const [inlineEditorEnabled, setInlineEditorEnabled] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.UI_PREVIEW_INLINE_EDITOR,
    false
  )
  const [queueOperationsEnabled, setQueueOperationsEnabled] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.UI_PREVIEW_QUEUE_OPERATIONS,
    false
  )
  const { data: org } = useSelectedOrganizationQuery()

  const { mutate: sendEvent } = useSendEventMutation()

  const form = useForm<z.infer<typeof DashboardSettingsSchema>>({
    resolver: zodResolver(DashboardSettingsSchema),
    values: {
      inlineEditorEnabled: inlineEditorEnabled ?? false,
      queueOperationsEnabled: queueOperationsEnabled ?? false,
    },
  })

  const handleInlineEditorToggle = (value: boolean) => {
    setInlineEditorEnabled(value)
    form.setValue('inlineEditorEnabled', value)

    sendEvent({
      action: 'inline_editor_setting_clicked',
      properties: {
        enabled: value,
      },
      groups: {
        organization: org?.slug,
      },
    })
  }

  const handleQueueOperationsToggle = (value: boolean) => {
    setQueueOperationsEnabled(value)
    form.setValue('queueOperationsEnabled', value)

    sendEvent({
      action: 'queue_operations_setting_clicked',
      properties: {
        enabled: value,
      },
      groups: {
        organization: org?.slug,
      },
    })
  }

  return (
    <PageSection>
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle id="inline-editor">Dashboard</PageSectionTitle>
          <PageSectionDescription>
            Customize your dashboard editing experience.
          </PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <Form_Shadcn_ {...form}>
          <Card>
            <CardContent>
              <FormField_Shadcn_
                control={form.control}
                name="inlineEditorEnabled"
                render={({ field }) => (
                  <FormItemLayout
                    layout="flex-row-reverse"
                    label="Edit entities in SQL"
                    description="When enabled, view and edit policies, triggers, and functions directly in the SQL editor instead of a more beginner-friendly UI panel. Ideal for those comfortable with SQL."
                  >
                    <FormControl_Shadcn_>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(value) => {
                          field.onChange(value)
                          handleInlineEditorToggle(value)
                        }}
                      />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </CardContent>
            <CardContent>
              <FormField_Shadcn_
                control={form.control}
                name="queueOperationsEnabled"
                render={({ field }) => (
                  <FormItemLayout
                    layout="flex-row-reverse"
                    label="Queue table operations"
                    description="When enabled, table edits in the Table Editor are queued for review before saving to your database, allowing you to batch multiple changes and commit them together."
                  >
                    <FormControl_Shadcn_>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(value) => {
                          field.onChange(value)
                          handleQueueOperationsToggle(value)
                        }}
                      />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </CardContent>
          </Card>
        </Form_Shadcn_>
      </PageSectionContent>
    </PageSection>
  )
}
