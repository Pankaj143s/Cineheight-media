export interface ContactLeadInput {
  name?: unknown
  contact?: unknown
  company?: unknown
  projectDetails?: unknown
  service?: unknown
  preferredContact?: unknown
  timeline?: unknown
  startedAt?: unknown
  website?: unknown
}

export interface ContactLead {
  name: string
  contact: string
  company: string
  projectDetails: string
  service?: string
  preferredContact?: string
  timeline?: string
}

export type ContactValidationResult =
  | { ok: true; lead: ContactLead }
  | { ok: false; code: string; message: string; fields?: Record<string, string> }

const LIMITS = {
  name: 100,
  contact: 160,
  company: 120,
  projectDetails: 4000,
  service: 100,
  preferredContact: 50,
  timeline: 100,
} as const

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : ''
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 7
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[character]
  })
}

export function validateContactLead(
  input: ContactLeadInput,
  now = Date.now()
): ContactValidationResult {
  if (text(input.website)) {
    return { ok: false, code: 'spam_detected', message: 'Submission could not be accepted.' }
  }

  const startedAt = Number(input.startedAt)
  if (!Number.isFinite(startedAt) || now - startedAt < 3000) {
    return {
      ok: false,
      code: 'too_fast',
      message: 'Please take a moment to review your project details and try again.',
    }
  }
  if (startedAt > now || now - startedAt > 2 * 60 * 60 * 1000) {
    return { ok: false, code: 'expired', message: 'This form session expired. Please refresh and try again.' }
  }

  const lead: ContactLead = {
    name: text(input.name),
    contact: text(input.contact),
    company: text(input.company),
    projectDetails: text(input.projectDetails),
    service: text(input.service) || undefined,
    preferredContact: text(input.preferredContact) || undefined,
    timeline: text(input.timeline) || undefined,
  }
  const fields: Record<string, string> = {}
  if (lead.name.length < 2) fields.name = 'Enter your name.'
  if (!isEmail(lead.contact) && !isPhone(lead.contact)) {
    fields.contact = 'Enter a valid email address or phone number.'
  }
  if (lead.company.length < 2) fields.company = 'Enter your brand or company.'
  if (lead.projectDetails.length < 20) {
    fields.projectDetails = 'Tell us a little more about the project (at least 20 characters).'
  }

  for (const [key, limit] of Object.entries(LIMITS)) {
    const value = lead[key as keyof ContactLead]
    if (typeof value === 'string' && value.length > limit) {
      fields[key] = `Keep this field under ${limit} characters.`
    }
  }
  if (Object.keys(fields).length) {
    return { ok: false, code: 'validation_error', message: 'Check the highlighted fields.', fields }
  }
  return { ok: true, lead }
}

export interface ContactProviderEnvironment {
  RESEND_API_KEY?: string
  CONTACT_FROM_EMAIL?: string
  CONTACT_TO_EMAIL?: string
  CONTACT_ACKNOWLEDGEMENT?: string
}

export type ContactSendResult =
  | { ok: true; id: string }
  | { ok: false; code: 'not_configured' | 'provider_error'; message: string }

type FetchLike = typeof fetch

export async function sendContactLead(
  lead: ContactLead,
  environment: ContactProviderEnvironment = process.env as ContactProviderEnvironment,
  fetchImpl: FetchLike = fetch
): Promise<ContactSendResult> {
  const apiKey = environment.RESEND_API_KEY?.trim()
  const from = environment.CONTACT_FROM_EMAIL?.trim()
  const to = environment.CONTACT_TO_EMAIL?.trim() || 'grow@cineheight.com'
  if (!apiKey || !from) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'The project inbox is not configured yet.',
    }
  }

  const optionalRows = [
    lead.service ? `Service: ${lead.service}` : '',
    lead.preferredContact ? `Preferred contact: ${lead.preferredContact}` : '',
    lead.timeline ? `Timeline: ${lead.timeline}` : '',
  ].filter(Boolean)
  const plainText = [
    `Name: ${lead.name}`,
    `Contact: ${lead.contact}`,
    `Brand / company: ${lead.company}`,
    ...optionalRows,
    '',
    'Project details:',
    lead.projectDetails,
  ].join('\n')
  const htmlRows = [
    ['Name', lead.name],
    ['Contact', lead.contact],
    ['Brand / company', lead.company],
    ...(lead.service ? [['Service', lead.service]] : []),
    ...(lead.preferredContact ? [['Preferred contact', lead.preferredContact]] : []),
    ...(lead.timeline ? [['Timeline', lead.timeline]] : []),
  ]
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
    .join('')
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: isEmail(lead.contact) ? lead.contact : undefined,
      subject: `New Cineheight project enquiry — ${lead.company}`,
      text: plainText,
      html: `${htmlRows}<hr><p><strong>Project details</strong></p><p>${escapeHtml(lead.projectDetails).replace(/\n/g, '<br>')}</p>`,
    }),
  })
  const result = (await response.json().catch(() => null)) as { id?: unknown } | null
  if (!response.ok || typeof result?.id !== 'string') {
    return {
      ok: false,
      code: 'provider_error',
      message: 'The project inbox did not accept the message.',
    }
  }

  if (environment.CONTACT_ACKNOWLEDGEMENT?.toLowerCase() === 'true' && isEmail(lead.contact)) {
    await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [lead.contact],
        subject: 'We received your Cineheight project brief',
        text: `Hi ${lead.name},\n\nThanks for sharing your project with Cineheight. A real person will review it and reply shortly.\n\nCineheight Media`,
      }),
    }).catch(() => undefined)
  }

  return { ok: true, id: result.id }
}
