import assert from 'node:assert/strict'
import {
  escapeHtml,
  sendContactLead,
  validateContactLead,
} from '../lib/server/contactLead.ts'

const now = 2_000_000_000_000
const base = {
  name: 'Asha Patil',
  contact: 'asha@example.com',
  company: 'Example Brand',
  projectDetails: 'We need a connected brand and launch campaign for a new product.',
  startedAt: now - 5000,
  website: '',
}

const validEmail = validateContactLead(base, now)
assert.equal(validEmail.ok, true, 'email lead validates')
assert.equal(validateContactLead({ ...base, contact: '+91 98765 43210' }, now).ok, true, 'phone lead validates')
assert.equal(validateContactLead({ ...base, contact: 'not-contact' }, now).ok, false, 'bad contact is rejected')
assert.equal(validateContactLead({ ...base, startedAt: now - 500 }, now).ok, false, 'too-fast form is rejected')
assert.equal(validateContactLead({ ...base, website: 'bot.example' }, now).ok, false, 'honeypot is rejected')
assert.equal(validateContactLead({ ...base, name: 'x'.repeat(101) }, now).ok, false, 'length limit is enforced')
assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;', 'HTML is escaped')

assert.equal(validEmail.ok, true)
if (!validEmail.ok) throw new Error('fixture did not validate')

const missing = await sendContactLead(validEmail.lead, {})
assert.deepEqual(missing, {
  ok: false,
  code: 'not_configured',
  message: 'The project inbox is not configured yet.',
})

let sentBody = ''
const successFetch = async (_url, init) => {
  sentBody = String(init?.body || '')
  return new Response(JSON.stringify({ id: 'email_test_123' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
const sent = await sendContactLead(
  { ...validEmail.lead, projectDetails: 'A real brief with <script>alert(1)</script> inside.' },
  {
    RESEND_API_KEY: 'test-key',
    CONTACT_FROM_EMAIL: 'Cineheight <website@cineheight.com>',
    CONTACT_TO_EMAIL: 'grow@cineheight.com',
  },
  successFetch
)
assert.deepEqual(sent, { ok: true, id: 'email_test_123' }, 'provider acceptance is required for success')
const sentPayload = JSON.parse(sentBody)
assert.ok(sentPayload.html.includes('&lt;script&gt;'), 'provider HTML contains escaped lead content')
assert.ok(!sentPayload.html.includes('<script>'), 'provider HTML never contains raw lead markup')

const failed = await sendContactLead(
  validEmail.lead,
  { RESEND_API_KEY: 'test-key', CONTACT_FROM_EMAIL: 'website@cineheight.com' },
  async () => new Response(JSON.stringify({ message: 'rejected' }), { status: 422 })
)
assert.equal(failed.ok, false, 'provider rejection is surfaced')
assert.equal(failed.code, 'provider_error')

console.log('Contact validation and provider tests passed.')
