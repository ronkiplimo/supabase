import { useState } from 'react'
import Link from 'next/link'
import { Button, Input_Shadcn_, TextArea_Shadcn_ } from 'ui'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

type FormFieldType = 'text' | 'email' | 'textarea'

type FormField = {
  type: FormFieldType
  name: string
  label: string
  placeholder?: string
  required?: boolean
  half?: boolean
  rows?: number
}

const DEFAULT_FIELDS: FormField[] = [
  { type: 'text', name: 'first_name', label: 'First Name', placeholder: 'First Name', required: true, half: true },
  { type: 'text', name: 'last_name', label: 'Last Name', placeholder: 'Last Name', required: true, half: true },
  { type: 'email', name: 'email_address', label: 'Email', placeholder: 'Work email', required: true },
  { type: 'text', name: 'company_name', label: 'Company', placeholder: 'Company name' },
  { type: 'textarea', name: 'message', label: 'Tell us about your project', placeholder: 'I want to build...' },
]

const DEFAULT_FIELD_MAP: Record<string, string> = {
  first_name: 'firstname',
  last_name: 'lastname',
  email_address: 'email',
  company_name: 'name',
  message: 'what_are_you_currently_working_on_',
}

const DEFAULT_CONSENT =
  'By submitting this form, I confirm that I have read and understood the Privacy Policy.'

type HubSpotFormProps = {
  formId: string
  fields?: FormField[]
  fieldMap?: Record<string, string>
  submitLabel?: string
  successMessage?: string
  successRedirect?: string
  consent?: string
}

function renderField(field: FormField, value: string, onChange: (v: string) => void) {
  switch (field.type) {
    case 'textarea':
      return (
        <TextArea_Shadcn_
          placeholder={field.placeholder}
          required={field.required}
          rows={field.rows ?? 4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'text':
    case 'email':
    default:
      return (
        <Input_Shadcn_
          type={field.type}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function HubSpotForm({
  formId,
  fields = DEFAULT_FIELDS,
  fieldMap = DEFAULT_FIELD_MAP,
  submitLabel = 'Get in touch',
  successMessage = "We've received your details and will be in touch soon.",
  successRedirect,
  consent = DEFAULT_CONSENT,
}: HubSpotFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  )
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitState('loading')
    setErrorMessages([])

    try {
      const response = await fetch('/api/hubspot-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formGuid: formId,
          fields: values,
          fieldMap,
          consent,
          pageName: document.title,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (successRedirect) {
          window.location.href = successRedirect
          return
        }
        setSubmitState('success')
      } else {
        setSubmitState('error')
        setErrorMessages(result.errors ?? ['Something went wrong. Please try again.'])
      }
    } catch {
      setSubmitState('error')
      setErrorMessages(['Something went wrong. Please try again.'])
    }
  }

  if (submitState === 'success') {
    return (
      <div className="border border-muted rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-medium">Thank you!</p>
        <p className="text-foreground-light">{successMessage}</p>
      </div>
    )
  }

  // Group fields into rows: half-width fields pair up, full-width fields get their own row
  const rows: FormField[][] = []
  let pendingHalf: FormField | null = null

  for (const field of fields) {
    if (field.half) {
      if (pendingHalf) {
        rows.push([pendingHalf, field])
        pendingHalf = null
      } else {
        pendingHalf = field
      }
    } else {
      if (pendingHalf) {
        rows.push([pendingHalf])
        pendingHalf = null
      }
      rows.push([field])
    }
  }
  if (pendingHalf) {
    rows.push([pendingHalf])
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-muted rounded-2xl p-6 sm:p-8 flex flex-col gap-6 not-prose"
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={row.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : undefined}
        >
          {row.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <label className="text-sm text-foreground font-medium">{field.label}</label>
              {renderField(field, values[field.name] ?? '', (v) => handleChange(field.name, v))}
            </div>
          ))}
        </div>
      ))}

      {submitState === 'error' && errorMessages.length > 0 && (
        <div className="flex flex-col gap-1">
          {errorMessages.map((msg, i) => (
            <p key={i} className="text-sm text-destructive">
              {msg}
            </p>
          ))}
        </div>
      )}

      <hr className="border-muted" />

      <Button htmlType="submit" type="primary" size="large" block loading={submitState === 'loading'}>
        {submitLabel}
      </Button>

      <p className="text-xs text-foreground-lighter leading-relaxed">
        By submitting this form, I confirm that I have read and understood the{' '}
        <Link href="/privacy" className="text-brand-link decoration-brand-link">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  )
}
