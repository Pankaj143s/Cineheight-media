import { NextResponse } from 'next/server'
import {
  sendContactLead,
  validateContactLead,
  type ContactLeadInput,
} from '@/lib/server/contactLead'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 20 * 1024
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 5
const buckets = new Map<string, { count: number; resetAt: number }>()

function response(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'local'
}

function isRateLimited(ip: string, now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  const current = buckets.get(ip)
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_REQUESTS
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return response({ ok: false, code: 'body_too_large', message: 'The project brief is too large.' }, 400)
  }

  const now = Date.now()
  if (isRateLimited(requestIp(request), now)) {
    return response(
      { ok: false, code: 'rate_limited', message: 'Too many attempts. Please try again in 15 minutes.' },
      429
    )
  }

  let input: ContactLeadInput
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return response({ ok: false, code: 'body_too_large', message: 'The project brief is too large.' }, 400)
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return response({ ok: false, code: 'invalid_json', message: 'The form data was not valid.' }, 400)
    }
    input = parsed as ContactLeadInput
  } catch {
    return response({ ok: false, code: 'invalid_json', message: 'The form data was not valid.' }, 400)
  }

  const validated = validateContactLead(input, now)
  if (!validated.ok) {
    return response(validated, 400)
  }
  const sent = await sendContactLead(validated.lead)
  if (!sent.ok) {
    return response(sent, sent.code === 'not_configured' ? 503 : 502)
  }
  return response({ ok: true, id: sent.id }, 200)
}
