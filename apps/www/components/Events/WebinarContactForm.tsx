import { useState } from 'react'
import Link from 'next/link'
import { Button, Input_Shadcn_, TextArea_Shadcn_ } from 'ui'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

const FIELD_MAP: Record<string, string> = {
  first_name: 'firstname',
  last_name: 'lastname',
  email_address: 'email',
  company_name: 'name',
  message: 'what_are_you_currently_working_on_',
}

const CONSENT_TEXT =
  'By submitting this form, I confirm that I have read and understood the Privacy Policy.'

type WebinarContactFormProps = {
  formId: string
  successMessage?: string
  successRedirect?: string
}

export default function WebinarContactForm({
  formId,
  successMessage = "We've received your details and will be in touch soon.",
  successRedirect,
}: WebinarContactFormProps) {
  const [values, setValues] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    company_name: '',
    message: '',
  })
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
          fieldMap: FIELD_MAP,
          consent: CONSENT_TEXT,
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

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-muted rounded-2xl p-6 sm:p-8 flex flex-col gap-6 not-prose"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-foreground font-medium">First Name</label>
          <Input_Shadcn_
            type="text"
            placeholder="First Name"
            required
            value={values.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-foreground font-medium">Last Name</label>
          <Input_Shadcn_
            type="text"
            placeholder="Last Name"
            required
            value={values.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-foreground font-medium">Email</label>
        <Input_Shadcn_
          type="email"
          placeholder="Work email"
          required
          value={values.email_address}
          onChange={(e) => handleChange('email_address', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-foreground font-medium">Company</label>
        <Input_Shadcn_
          type="text"
          placeholder="Company name"
          value={values.company_name}
          onChange={(e) => handleChange('company_name', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-foreground font-medium">Tell us about your project</label>
        <TextArea_Shadcn_
          placeholder="I want to build..."
          rows={4}
          value={values.message}
          onChange={(e) => handleChange('message', e.target.value)}
        />
      </div>

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
        Get in touch
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
