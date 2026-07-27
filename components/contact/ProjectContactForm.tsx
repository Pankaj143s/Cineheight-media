'use client'

import { useRef, useState } from 'react'
import { contact, services } from '@/content/siteContent'

type FormVariant = 'compact' | 'full'
type FieldErrors = Record<string, string>

const fieldClass =
  'font-body mt-2 min-h-[48px] w-full border-0 border-b bg-white/[0.025] px-3 py-3 text-base text-text-100 outline-none transition-colors placeholder:text-text-500 focus:border-[var(--blue-500)]'
const labelClass =
  'font-display block text-[10px] font-medium uppercase text-text-400'

export default function ProjectContactForm({ variant }: { variant: FormVariant }) {
  const startedAt = useRef(Date.now())
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
      name: String(data.get('name') || ''),
      contact: String(data.get('contact') || ''),
      company: String(data.get('company') || ''),
      projectDetails: String(data.get('projectDetails') || ''),
      service: String(data.get('service') || ''),
      preferredContact: String(data.get('preferredContact') || ''),
      timeline: String(data.get('timeline') || ''),
      website: String(data.get('website') || ''),
      startedAt: startedAt.current,
    }
    const nextErrors: FieldErrors = {}
    if (payload.name.trim().length < 2) nextErrors.name = 'Enter your name.'
    if (payload.contact.trim().length < 5) nextErrors.contact = 'Enter your email address or phone number.'
    if (payload.company.trim().length < 2) nextErrors.company = 'Enter your brand or company.'
    if (payload.projectDetails.trim().length < 20) nextErrors.projectDetails = 'Add at least 20 characters.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setStatus('error')
      setMessage('Check the highlighted fields.')
      return
    }

    setErrors({})
    setStatus('submitting')
    setMessage('Sending your project brief…')
    try {
      const result = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await result.json()) as {
        ok?: boolean
        message?: string
        fields?: FieldErrors
      }
      if (!result.ok || !body.ok) {
        setErrors(body.fields ?? {})
        setStatus('error')
        setMessage(body.message || 'The message could not be sent.')
        return
      }
      setStatus('success')
      setMessage('Your brief reached Cineheight. A real person will reply shortly.')
      form.reset()
      startedAt.current = Date.now()
    } catch {
      setStatus('error')
      setMessage('The message could not be sent. Use one of the direct contact options below.')
    }
  }

  const errorFor = (name: string) => errors[name]

  if (status === 'success') {
    return (
      <div
        data-interaction-quiet
        className="relative min-h-[20rem] border-y py-10"
        style={{ borderColor: 'var(--border)' }}
        role="status"
      >
        <span className="block h-px w-28 origin-left bg-[var(--blue-500)] animate-[signal-complete_700ms_ease-out_both]" aria-hidden="true" />
        <p className="font-display mt-7 text-2xl font-bold uppercase text-text-100">Signal received.</p>
        <p className="font-body mt-4 max-w-md text-sm leading-relaxed text-text-300">{message}</p>
      </div>
    )
  }

  return (
    <form
      data-interaction-quiet
      data-contact-form={variant}
      noValidate
      onSubmit={submit}
      className="relative"
      aria-label={variant === 'compact' ? 'Quick project enquiry' : 'Project enquiry'}
    >
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <label className={labelClass}>
          Name <span aria-hidden="true">*</span>
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={Boolean(errorFor('name'))}
            aria-describedby={errorFor('name') ? `${variant}-name-error` : undefined}
            className={fieldClass}
          />
          {errorFor('name') && <span id={`${variant}-name-error`} className="font-body mt-1 block text-xs text-red-300">{errorFor('name')}</span>}
        </label>
        <label className={labelClass}>
          Email or phone <span aria-hidden="true">*</span>
          <input
            name="contact"
            autoComplete="email"
            required
            maxLength={160}
            aria-invalid={Boolean(errorFor('contact'))}
            aria-describedby={errorFor('contact') ? `${variant}-contact-error` : undefined}
            className={fieldClass}
          />
          {errorFor('contact') && <span id={`${variant}-contact-error`} className="font-body mt-1 block text-xs text-red-300">{errorFor('contact')}</span>}
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Brand / company <span aria-hidden="true">*</span>
          <input
            name="company"
            autoComplete="organization"
            required
            maxLength={120}
            aria-invalid={Boolean(errorFor('company'))}
            aria-describedby={errorFor('company') ? `${variant}-company-error` : undefined}
            className={fieldClass}
          />
          {errorFor('company') && <span id={`${variant}-company-error`} className="font-body mt-1 block text-xs text-red-300">{errorFor('company')}</span>}
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Service needed
          <select name="service" defaultValue="" className={fieldClass}>
            <option value="" className="bg-[#050609]">Not sure yet</option>
            {services.map((service) => (
              <option key={service.id} value={service.title} className="bg-[#050609]">{service.title}</option>
            ))}
          </select>
        </label>
        {variant === 'full' && (
          <>
            <label className={labelClass}>
              Preferred contact
              <select name="preferredContact" defaultValue="" className={fieldClass}>
                <option value="" className="bg-[#050609]">No preference</option>
                <option value="Email" className="bg-[#050609]">Email</option>
                <option value="Phone" className="bg-[#050609]">Phone</option>
                <option value="WhatsApp" className="bg-[#050609]">WhatsApp</option>
              </select>
            </label>
            <label className={labelClass}>
              Estimated timeline
              <select name="timeline" defaultValue="" className={fieldClass}>
                <option value="" className="bg-[#050609]">Open / not sure</option>
                <option value="Within 1 month" className="bg-[#050609]">Within 1 month</option>
                <option value="1–3 months" className="bg-[#050609]">1–3 months</option>
                <option value="3+ months" className="bg-[#050609]">3+ months</option>
              </select>
            </label>
          </>
        )}
        <label className={`${labelClass} sm:col-span-2`}>
          Project details <span aria-hidden="true">*</span>
          <textarea
            name="projectDetails"
            required
            maxLength={4000}
            rows={variant === 'compact' ? 5 : 7}
            placeholder="What are you building, and what should change?"
            aria-invalid={Boolean(errorFor('projectDetails'))}
            aria-describedby={errorFor('projectDetails') ? `${variant}-details-error` : undefined}
            className={`${fieldClass} resize-y`}
          />
          {errorFor('projectDetails') && <span id={`${variant}-details-error`} className="font-body mt-1 block text-xs text-red-300">{errorFor('projectDetails')}</span>}
        </label>
      </div>

      <label className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="group font-display inline-flex min-h-[52px] items-center gap-4 rounded-full border px-7 py-3 text-[12px] font-medium uppercase text-text-100 transition-colors hover:border-[var(--blue-400)] disabled:cursor-wait disabled:opacity-60"
          style={{ letterSpacing: '0.18em', borderColor: 'var(--blue-alpha-40)' }}
        >
          {status === 'submitting' ? 'Sending' : 'Send project brief'}
          <svg width="25" height="10" viewBox="0 0 25 10" fill="none" aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            <path d="M0 5h23M19 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <p aria-live="polite" className={`font-body max-w-sm text-xs leading-relaxed ${status === 'error' ? 'text-red-300' : 'text-text-500'}`}>
          {message}
        </p>
      </div>

      {status === 'error' && (
        <div className="font-body mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-300">
          <a href={`mailto:${contact.email}`} className="inline-flex min-h-11 items-center hover:text-[var(--blue-200)]">Email {contact.email}</a>
          <a href={contact.phoneHref} className="inline-flex min-h-11 items-center hover:text-[var(--blue-200)]">Call {contact.phone}</a>
          <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-[var(--blue-200)]">WhatsApp</a>
        </div>
      )}
    </form>
  )
}
