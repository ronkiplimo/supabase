import { zodResolver } from '@hookform/resolvers/zod'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useParams } from 'common'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Form_Shadcn_,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  Input_Shadcn_,
  Switch,
  useWatch_Shadcn_,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import * as z from 'zod'

import { InlineLink } from '@/components/ui/InlineLink'
import NoPermission from '@/components/ui/NoPermission'
import type { components } from '@/data/api'
import { useAuthConfigQuery } from '@/data/auth/auth-config-query'
import { useAuthConfigUpdateMutation } from '@/data/auth/auth-config-update-mutation'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { DOCS_URL } from '@/lib/constants'

type GoTrueConfig = components['schemas']['GoTrueConfigResponse']

function validWebAuthnOrigins(value: string): boolean {
  const origins = value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (origins.length === 0) return false
  return origins.every((origin) => {
    try {
      const url = new URL(origin)
      if (url.protocol === 'https:') return true
      if (
        url.protocol === 'http:' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        return true
      }
      return false
    } catch {
      return false
    }
  })
}

const schema = z
  .object({
    PASSKEY_ENABLED: z.boolean(),
    WEBAUTHN_RP_ID: z.string().trim(),
    WEBAUTHN_RP_DISPLAY_NAME: z.string().trim(),
    WEBAUTHN_RP_ORIGINS: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (!data.PASSKEY_ENABLED) return
    if (!data.WEBAUTHN_RP_ID) {
      ctx.addIssue({
        path: ['WEBAUTHN_RP_ID'],
        code: z.ZodIssueCode.custom,
        message: 'Relying Party ID is required when Passkey is enabled',
      })
    }
    if (!data.WEBAUTHN_RP_DISPLAY_NAME) {
      ctx.addIssue({
        path: ['WEBAUTHN_RP_DISPLAY_NAME'],
        code: z.ZodIssueCode.custom,
        message: 'Relying Party Display Name is required when Passkey is enabled',
      })
    }
    const origins = data.WEBAUTHN_RP_ORIGINS
    if (!origins) {
      ctx.addIssue({
        path: ['WEBAUTHN_RP_ORIGINS'],
        code: z.ZodIssueCode.custom,
        message: 'Relying Party Origins is required when Passkey is enabled',
      })
      return
    }
    if (!validWebAuthnOrigins(origins)) {
      ctx.addIssue({
        path: ['WEBAUTHN_RP_ORIGINS'],
        code: z.ZodIssueCode.custom,
        message:
          'Each origin must be a valid HTTPS URL (HTTP only allowed for localhost/127.0.0.1)',
      })
    }
  })

type PasskeysSettings = z.infer<typeof schema>

function getPasskeyDefault(
  key: keyof Pick<
    PasskeysSettings,
    'WEBAUTHN_RP_ID' | 'WEBAUTHN_RP_ORIGINS' | 'WEBAUTHN_RP_DISPLAY_NAME'
  >,
  config: GoTrueConfig,
  project: { name: string } | undefined
): string {
  const siteUrl = config.SITE_URL
  switch (key) {
    case 'WEBAUTHN_RP_ID': {
      if (!siteUrl) return ''
      try {
        return new URL(siteUrl).hostname
      } catch {
        return ''
      }
    }
    case 'WEBAUTHN_RP_ORIGINS': {
      if (!siteUrl) return ''
      try {
        return new URL(siteUrl).origin
      } catch {
        return ''
      }
    }
    case 'WEBAUTHN_RP_DISPLAY_NAME': {
      return project?.name ?? ''
    }
    default:
      return ''
  }
}

function buildPasskeysFormValues(
  config: GoTrueConfig,
  project: { name: string } | undefined
): PasskeysSettings {
  const values: PasskeysSettings = {
    PASSKEY_ENABLED: config.PASSKEY_ENABLED ?? false,
    WEBAUTHN_RP_ID: config.WEBAUTHN_RP_ID || getPasskeyDefault('WEBAUTHN_RP_ID', config, project),
    WEBAUTHN_RP_DISPLAY_NAME:
      config.WEBAUTHN_RP_DISPLAY_NAME ||
      getPasskeyDefault('WEBAUTHN_RP_DISPLAY_NAME', config, project),
    WEBAUTHN_RP_ORIGINS:
      config.WEBAUTHN_RP_ORIGINS || getPasskeyDefault('WEBAUTHN_RP_ORIGINS', config, project),
  }

  return values
}

export const PasskeysSettingsForm = () => {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const {
    data: authConfig,
    isPending: isAuthConfigLoading,
    isSuccess,
  } = useAuthConfigQuery({ projectRef })

  const { mutate: updateAuthConfig, isPending } = useAuthConfigUpdateMutation({
    onSuccess: () => {
      toast.success('Passkey settings updated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to update passkey settings: ${error?.message}`)
    },
  })

  const {
    can: canReadConfig,
    isLoading: isLoadingPermissions,
    isSuccess: isPermissionsLoaded,
  } = useAsyncCheckPermissions(PermissionAction.READ, 'custom_config_gotrue')

  const { can: canUpdateConfig } = useAsyncCheckPermissions(
    PermissionAction.UPDATE,
    'custom_config_gotrue'
  )

  const form = useForm<PasskeysSettings>({
    resolver: zodResolver(schema),
    defaultValues: {
      PASSKEY_ENABLED: false,
      WEBAUTHN_RP_ID: '',
      WEBAUTHN_RP_DISPLAY_NAME: '',
      WEBAUTHN_RP_ORIGINS: '',
    },
  })

  useEffect(() => {
    if (isSuccess && authConfig) {
      form.reset(buildPasskeysFormValues(authConfig, project))
    }
    // form.reset is stable; authConfig/project drive when to sync from server
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, authConfig, project])

  const onSubmit = (values: PasskeysSettings) => {
    if (!projectRef) return

    const payload: Record<string, string | boolean | null> = {
      PASSKEY_ENABLED: values.PASSKEY_ENABLED,
      WEBAUTHN_RP_ID: values.WEBAUTHN_RP_ID.trim() || null,
      WEBAUTHN_RP_DISPLAY_NAME: values.WEBAUTHN_RP_DISPLAY_NAME.trim() || null,
      WEBAUTHN_RP_ORIGINS: values.WEBAUTHN_RP_ORIGINS.trim() || null,
    }

    updateAuthConfig({ projectRef, config: payload })
  }

  const passKeysEnabled = useWatch_Shadcn_({ control: form.control, name: 'PASSKEY_ENABLED' })

  if (isPermissionsLoaded && !canReadConfig) {
    return <NoPermission resourceText="view passkey settings" />
  }

  if (isAuthConfigLoading || isLoadingPermissions || !authConfig) {
    return <GenericSkeletonLoader />
  }

  return (
    <Form_Shadcn_ {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent>
            <FormField_Shadcn_
              control={form.control}
              name="PASSKEY_ENABLED"
              render={({ field }) => (
                <FormItemLayout
                  layout="flex-row-reverse"
                  label="Enable Passkey authentication"
                  description={
                    <>
                      Allow users to sign in using passkeys (WebAuthn) with biometrics, security
                      keys, or platform authenticators.{' '}
                      <InlineLink href={`${DOCS_URL}/guides/auth/passkeys`}>Learn more</InlineLink>
                    </>
                  }
                >
                  <FormControl_Shadcn_>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canUpdateConfig}
                    />
                  </FormControl_Shadcn_>
                </FormItemLayout>
              )}
            />
          </CardContent>

          {passKeysEnabled && (
            <>
              <CardContent>
                <FormField_Shadcn_
                  control={form.control}
                  name="WEBAUTHN_RP_DISPLAY_NAME"
                  render={({ field }) => (
                    <FormItemLayout
                      layout="flex-row-reverse"
                      label="Relying Party Display Name"
                      description="A human-readable name for your application shown during passkey registration."
                    >
                      <FormControl_Shadcn_>
                        <Input_Shadcn_ {...field} placeholder="My project" />
                      </FormControl_Shadcn_>
                    </FormItemLayout>
                  )}
                />
              </CardContent>
              <CardContent>
                <FormField_Shadcn_
                  control={form.control}
                  name="WEBAUTHN_RP_ID"
                  render={({ field }) => (
                    <FormItemLayout
                      layout="flex-row-reverse"
                      label="Relying Party ID"
                      description='The domain name for your application (e.g. "example.com"). This determines which passkeys can be used.'
                    >
                      <FormControl_Shadcn_>
                        <Input_Shadcn_ {...field} placeholder="example.com" />
                      </FormControl_Shadcn_>
                    </FormItemLayout>
                  )}
                />
              </CardContent>
              <CardContent>
                <FormField_Shadcn_
                  control={form.control}
                  name="WEBAUTHN_RP_ORIGINS"
                  render={({ field }) => (
                    <FormItemLayout
                      layout="flex-row-reverse"
                      label="Relying Party Origins"
                      description='Comma-separated list of allowed origins (e.g. "https://example.com"). HTTPS is required except for localhost.'
                    >
                      <FormControl_Shadcn_>
                        <Input_Shadcn_ {...field} placeholder="https://example.com" />
                      </FormControl_Shadcn_>
                    </FormItemLayout>
                  )}
                />
              </CardContent>
            </>
          )}

          <CardFooter className="justify-end space-x-2">
            <Button
              type="default"
              onClick={() => form.reset(buildPasskeysFormValues(authConfig, project))}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={!canUpdateConfig || !form.formState.isDirty}
              loading={isPending}
            >
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form_Shadcn_>
  )
}
