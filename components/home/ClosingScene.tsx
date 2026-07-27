'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { closing, contact } from '@/content/siteContent'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import Footer from '@/components/Footer'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The journey's destination. A typographic takeover of the closing question,
 * a magnetic call to action the signal thread completes at, the real contact
 * channels composited into the same field, and the footer emerging out of the
 * bottom of it — no border above the CTA, no boxed footer band.
 */
export default function ClosingScene() {
  const rootRef = useRef<HTMLElement>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const cta = self.selector!('[data-cta]')[0]
      const channels = self.selector!('[data-channel]') as HTMLElement[]
      if (cta) {
        gsap.fromTo(
          cta,
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: cta, start: 'top 86%' } }
        )
      }
      if (channels.length) {
        gsap.fromTo(
          channels,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: { trigger: channels[0], start: 'top 90%' },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  // A single soft light that follows the pointer across the closing field.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    const light = lightRef.current
    if (!root || !light) return
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      light.style.setProperty('--cx', `${e.clientX - r.left}px`)
      light.style.setProperty('--cy', `${e.clientY - r.top}px`)
      light.style.opacity = '1'
    }
    const onLeave = () => {
      light.style.opacity = '0'
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [rich])

  const channels = [
    { label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    { label: 'Phone', value: contact.phone, href: contact.phoneHref },
    { label: 'WhatsApp', value: 'Message us', href: contact.whatsapp, external: true },
    { label: 'Instagram', value: contact.instagramHandle, href: contact.instagramUrl, external: true },
  ]

  return (
    <section
      ref={rootRef}
      id="contact"
      aria-label="Start a project"
      className="relative z-10 overflow-hidden"
      style={{ marginTop: mobile ? '10vh' : 'clamp(8rem, 20vh, 18rem)' }}
    >
      {rich && (
        <div
          ref={lightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: 0,
            background: 'radial-gradient(circle 340px at var(--cx, 50%) var(--cy, 50%), rgba(0,137,255,0.09), transparent 70%)',
          }}
        />
      )}

      <div className="flow-gutter relative">
        <div data-parallax-y="0.1">
          <ScrollHeadline
            as="h2"
            text={closing.question}
            accent={['RISE']}
            className="font-display max-w-[16ch] font-bold uppercase text-text-100"
            style={{ fontSize: 'clamp(2.4rem, 8.4vw, 8.4rem)', lineHeight: 0.9, letterSpacing: '-0.035em' }}
            from={0.18}
            end="top 32%"
          />
        </div>

        <div data-cta className="mt-12" style={{ opacity: reduced ? 1 : 0 }}>
          <MagneticLink
            href="/contact"
            strength={9}
            className="group font-display inline-flex min-h-[56px] items-center rounded-full border px-9 py-4 text-sm font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)', background: 'rgba(0,137,255,0.06)' }}
          >
            {closing.cta}
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
              <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </MagneticLink>
          {/* the thread's destination */}
          <div data-flow-anchor="left" className="pointer-events-none h-px w-full" aria-hidden="true" />
        </div>

        {/* channels as part of the composition, not a contact card grid */}
        <div data-parallax-y="0.05">
          <ul className="mt-16 flex flex-wrap gap-x-14 gap-y-9">
            {channels.map((ch) => (
              <li key={ch.label} data-channel className="group list-none" style={{ opacity: reduced ? 1 : 0 }}>
                <p className="font-display text-[10px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.28em' }}>
                  {ch.label}
                </p>
                <a
                  href={ch.href}
                  {...(ch.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="font-display mt-2 inline-flex min-h-[44px] items-center text-xl font-medium text-text-100 transition-colors duration-300 hover:text-[var(--blue-200)] sm:text-2xl"
                >
                  {ch.value}
                </a>
                <span
                  aria-hidden="true"
                  className="mt-2 block h-px w-full origin-left scale-x-[0.25] bg-[var(--blue-500)] opacity-40 transition-transform duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-90"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* the footer emerges out of the same field */}
      <Footer variant="integrated" />
    </section>
  )
}
