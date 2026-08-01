'use client'

import { useEffect, useRef, useState } from 'react'
import { contact, closing } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import OpticalResolve from '@/components/motion/OpticalResolve'
import Reveal from '@/components/ui/Reveal'
import ProjectContactForm from '@/components/contact/ProjectContactForm'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The destination. One large project-start statement and the real channels,
 * with a decorative signal that leans toward whichever channel you approach;
 * the moment you commit, the link is an ordinary anchor that navigates
 * instantly. The channel type itself never moves — see the effect below.
 *
 * The expressive direct channels remain intact beside the shared, real
 * project form. Its API reports provider/configuration failures honestly.
 */

const CHANNELS = [
  {
    label: 'Email',
    value: contact.email,
    href: `mailto:${contact.email}`,
    hint: 'Best for briefs and project details.',
    drift: { x: -1, y: -1 },
  },
  {
    label: 'Phone',
    value: contact.phone,
    href: contact.phoneHref,
    hint: 'Mon–Sat, IST.',
    drift: { x: 1, y: -0.6 },
  },
  {
    label: 'WhatsApp',
    value: contact.phone,
    href: contact.whatsapp,
    hint: 'Quick questions and voice notes.',
    external: true,
    drift: { x: -0.6, y: 1 },
  },
  {
    label: 'Instagram',
    value: contact.instagramHandle,
    href: contact.instagramUrl,
    hint: 'See our latest work.',
    external: true,
    drift: { x: 1, y: 1 },
  },
]

export default function ContactPage() {
  const rootRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const threadRef = useRef<SVGPathElement>(null)
  const rich = useCanRunRichEffects()
  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()
  const [focused, setFocused] = useState<number | null>(null)
  const [formActive, setFormActive] = useState(false)

  /**
   * The signal reaches from the statement toward whichever channel is nearest
   * the pointer.
   *
   * The channels themselves used to translate up to ±14px toward the cursor.
   * That has been removed: sliding readable contact details sideways under the
   * pointer reads as lag, and the phone number and email are exactly the text a
   * visitor is trying to hold still enough to read or copy. The proximity
   * signal — a decorative line, never required to find a channel — carries the
   * same "this one" intent without touching the type.
   */
  useEffect(() => {
    if (!rich || reduced || formActive) return
    const root = rootRef.current
    if (!root) return

    const pointer = { x: 0, y: 0 }
    const itemLeft = new Float32Array(itemRefs.current.length)
    const centerX = new Float32Array(itemRefs.current.length)
    const centerY = new Float32Array(itemRefs.current.length)
    let rootLeft = 0
    let rootTop = 0
    let rootHeight = 1
    let measureDirty = true
    let inside = false

    const measure = () => {
      const rootRect = root.getBoundingClientRect()
      rootLeft = rootRect.left
      rootTop = rootRect.top
      rootHeight = rootRect.height
      itemRefs.current.forEach((el, index) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        itemLeft[index] = rect.left
        centerX[index] = rect.left + rect.width / 2
        centerY[index] = rect.top + rect.height / 2
      })
      measureDirty = false
    }

    const animation = createManagedFrameLoop(() => {
      if (measureDirty) measure()
      let nearest = -1
      let nearestD = Infinity

      itemRefs.current.forEach((el, i) => {
        if (!el) return
        const d = Math.hypot(pointer.x - centerX[i], pointer.y - centerY[i])
        if (d < nearestD) {
          nearestD = d
          nearest = i
        }
      })

      const path = threadRef.current
      if (path && nearest >= 0 && inside) {
        const el = itemRefs.current[nearest]
        if (el) {
          const x2 = itemLeft[nearest] - rootLeft + 6
          const y2 = centerY[nearest] - rootTop
          const x1 = 0
          const y1 = rootHeight * 0.26
          path.setAttribute(
            'd',
            `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.45} ${y1}, ${x2 - (x2 - x1) * 0.3} ${y2}, ${x2} ${y2}`
          )
          path.style.opacity = '0.45'
        }
      } else if (path) {
        path.style.opacity = '0'
      }

      return false
    })

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      inside = !(e.target as HTMLElement | null)?.closest('[data-interaction-quiet]')
      animation.wake()
    }
    const onLeave = () => {
      inside = false
      animation.wake()
    }
    const onLayoutChange = () => {
      measureDirty = true
      animation.wake()
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, { passive: true })
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange)
      animation.destroy()
    }
  }, [rich, reduced, formActive])

  return (
    <main id="main-content" tabIndex={-1} ref={rootRef} className="relative z-10 scroll-mt-24 overflow-hidden outline-none">
      {rich && !reduced && !formActive && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 1 }} fill="none">
          <path
            ref={threadRef}
            d=""
            stroke="#0089FF"
            strokeWidth={1.2}
            strokeLinecap="round"
            style={{ opacity: 0, transition: 'opacity 0.4s linear', filter: 'drop-shadow(0 0 4px rgba(0,137,255,0.6))' }}
          />
        </svg>
      )}

      <header className="flow-gutter relative z-10 pb-[4vh] pt-32 lg:pt-40">
        <KineticLabel text="START A PROJECT" />
        <OpticalResolve
          as="h1"
          text="Let's build something worth remembering."
          delay={0.3}
          accentWords={['remembering.']}
          className="font-display mt-6 max-w-[14ch] font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.4rem, 9vw, 7.5rem)', lineHeight: 0.88, letterSpacing: '-0.04em' }}
        />
        <p className="sr-only">{closing.question}</p>
        <Reveal variant="fade-up" delay={0.08} className="font-body measure mt-8 text-base leading-relaxed text-text-300 sm:text-lg">
          Share the brief. A real person replies — and helps you find the right next step.
        </Reveal>
      </header>

      <section aria-label="Contact channels and project form" className="flow-gutter relative z-10" style={{ marginTop: mobile ? '7vh' : '10vh' }}>
        <div className="grid gap-x-14 gap-y-16 lg:grid-cols-12">
          <ul data-depth-layer="mid" className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-6">
            {CHANNELS.map((ch, i) => (
              <li
                key={ch.label}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className="list-none"
                style={{ marginTop: mobile ? 0 : `${[0, 2.5, 1, 3.5][i] ?? 0}rem` }}
              >
                <Reveal variant="fade-up" delay={0.04 * i} as="div">
                  <a
                    href={ch.href}
                    {...(ch.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group block max-w-[24ch]"
                    onFocus={() => setFocused(i)}
                    onBlur={() => setFocused(null)}
                  >
                    <p className="font-display text-[10px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
                      {ch.label}
                    </p>
                    <p
                      className="font-display mt-3 flex min-h-[44px] items-center whitespace-nowrap font-bold text-text-100 transition-colors duration-300 group-hover:text-[var(--blue-200)] group-focus-visible:text-[var(--blue-200)]"
                      style={{ fontSize: 'clamp(1.2rem, 2.4vw, 2rem)', lineHeight: 1.04, letterSpacing: '-0.02em' }}
                    >
                      {ch.value}
                    </p>
                    <span
                      aria-hidden="true"
                      className="mt-3 block h-px transition-all duration-500 group-hover:w-24 group-focus-visible:w-24"
                      style={{ width: focused === i ? 96 : 40, background: 'var(--blue-500)' }}
                    />
                    <p className="font-body mt-4 text-sm leading-relaxed text-text-500">{ch.hint}</p>
                  </a>
                </Reveal>
              </li>
            ))}
          </ul>
          <div
            className="relative lg:col-span-6"
            data-interaction-quiet
            onFocusCapture={() => setFormActive(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFormActive(false)
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem]"
              style={{
                background: formActive
                  ? 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,137,255,0.08), transparent 70%)'
                  : 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,137,255,0.04), transparent 70%)',
                transition: 'background 0.6s ease',
              }}
            />
            <ProjectContactForm variant="full" />
          </div>
        </div>
        <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '50%' }} aria-hidden="true" />
      </section>

      <section aria-label="Studio" className="flow-gutter relative z-10" style={{ marginTop: mobile ? '8vh' : '12vh' }}>
        <Reveal variant="fade-up" as="div">
          <p className="font-display text-[10px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
            Studio
          </p>
          <p
            className="font-display mt-4 font-bold text-text-100"
            style={{ fontSize: 'clamp(1.6rem, 4.4vw, 3.6rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
          >
            {contact.location}
          </p>
          <p className="font-body measure mt-5 text-sm leading-relaxed text-text-500">
            Rooted in Konkan, working with brands anywhere.
          </p>
        </Reveal>
        <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    </main>
  )
}
