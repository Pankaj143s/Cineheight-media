'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { closing, contact } from '@/content/siteContent'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import ProjectContactForm from '@/components/contact/ProjectContactForm'
import AnimatedBrandSignature from '@/components/home/AnimatedBrandSignature'
import Footer from '@/components/Footer'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { SCRUB } from '@/lib/motionTokens'

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
      const form = self.selector!('[data-closing-form]')[0]
      const footer = self.selector!('[data-closing-footer]')[0]
      if (cta) {
        gsap.fromTo(
          cta,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: cta, start: 'top 86%', end: 'top 48%', scrub: SCRUB.text },
          }
        )
      }
      if (channels.length) {
        gsap.fromTo(
          channels,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.08,
            ease: 'none',
            scrollTrigger: { trigger: channels[0], start: 'top 90%', end: 'top 50%', scrub: SCRUB.text },
          }
        )
      }
      if (form) {
        gsap.fromTo(
          form,
          { autoAlpha: 0.58, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: form, start: 'top 88%', end: 'top 56%', scrub: SCRUB.text },
          }
        )
      }
      if (footer) {
        gsap.fromTo(
          footer,
          { autoAlpha: 0.64, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: footer, start: 'top 94%', end: 'top 70%', scrub: SCRUB.text },
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
      /*
        Clip horizontally only. `overflow-hidden` also clipped the vertical
        axis, and since the closing headline is parallaxed upward inside this
        box, its ascenders were being sliced off on shorter viewports. `clip`
        on one axis still contains the decorative radial without cutting type.
      */
      className="relative z-10 overflow-x-clip"
      style={{
        marginTop: mobile ? '-7svh' : 'clamp(8rem, 20vh, 18rem)',
        paddingTop: mobile ? '12svh' : undefined,
        background: mobile
          ? 'linear-gradient(to bottom, rgba(2,3,6,0) 0%, var(--bg-950) 12svh)'
          : undefined,
      }}
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

        <div className="mt-14 grid gap-x-14 gap-y-14 lg:grid-cols-12">
          <div data-cta data-parallax-y="0.055" className="lg:col-span-5">
            <p className="font-body max-w-md text-base leading-relaxed text-text-300">
              Share the brief here, or reach us directly. A real person answers every channel.
            </p>
            <ul className="mt-9 flex flex-col items-start gap-5">
              {channels.map((ch, index) => (
                <li key={ch.label} data-channel className="group list-none">
                  <p className="font-display text-[10px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.28em' }}>
                    {ch.label}
                  </p>
                  <a
                    href={ch.href}
                    {...(ch.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`font-display mt-1 inline-flex min-h-11 items-center whitespace-nowrap font-medium text-text-100 transition-colors hover:text-[var(--blue-200)] ${
                      index < 2 ? 'text-2xl sm:text-3xl' : 'text-lg'
                    }`}
                  >
                    {ch.value}
                  </a>
                  <span
                    aria-hidden="true"
                    className="block h-px w-full origin-left scale-x-[0.2] bg-[var(--blue-500)] opacity-45 transition-transform duration-500 group-hover:scale-x-100"
                  />
                </li>
              ))}
            </ul>
            <div data-flow-anchor="left" className="pointer-events-none h-px w-full" aria-hidden="true" />
          </div>

          <div data-closing-form className="lg:col-span-6 lg:col-start-7">
            <ProjectContactForm variant="compact" />
          </div>
        </div>
      </div>

      <div data-closing-footer>
        <AnimatedBrandSignature />
        <Footer variant="integrated" />
      </div>
    </section>
  )
}
