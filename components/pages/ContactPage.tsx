'use client'

import { useEffect, useRef, useState } from 'react'
import { contact, closing } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier } from '@/lib/useMediaPreferences'

/**
 * The destination. One large project-start statement and the real channels
 * arranged as a composition that shifts around the pointer — the signal leans
 * toward whichever channel you approach, and the moment you commit, the link
 * is an ordinary anchor that navigates instantly.
 *
 * No form: no submission endpoint exists anywhere in this project, and the old
 * site's form only simulated success. Shipping a fake one would be the
 * dishonest option.
 */

const CHANNELS = [
  {
    label: 'Email',
    value: contact.email,
    href: `mailto:${contact.email}`,
    hint: 'Best for project briefs — tell us where your brand is and where it should be.',
    drift: { x: -1, y: -1 },
  },
  {
    label: 'Phone',
    value: contact.phone,
    href: contact.phoneHref,
    hint: 'Mon–Sat, IST business hours.',
    drift: { x: 1, y: -0.6 },
  },
  {
    label: 'WhatsApp',
    value: contact.phone,
    href: contact.whatsapp,
    hint: 'Quick questions and voice notes welcome.',
    external: true,
    drift: { x: -0.6, y: 1 },
  },
  {
    label: 'Instagram',
    value: contact.instagramHandle,
    href: contact.instagramUrl,
    hint: 'Our latest work, as it ships.',
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
  const [focused, setFocused] = useState<number | null>(null)

  // Channels drift with the pointer; the signal leans toward the nearest one.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return

    const pointer = { x: 0, y: 0 }
    const cur = itemRefs.current.map(() => ({ x: 0, y: 0 }))
    let raf = 0
    let last = performance.now()
    let inside = false

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.07, dt)
      let nearest = -1
      let nearestD = Infinity

      itemRefs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = pointer.x - cx
        const dy = pointer.y - cy
        const d = Math.hypot(dx, dy)
        if (d < nearestD) {
          nearestD = d
          nearest = i
        }
        // Near the pointer a channel leans in; far away it drifts on its own
        // slow vector, so the field is never completely still.
        const reach = 420
        const pull = inside && d < reach ? (1 - d / reach) ** 2 : 0
        const tx = inside ? clamp(dx * 0.05 * pull, -14, 14) : 0
        const ty = inside ? clamp(dy * 0.05 * pull, -14, 14) : 0
        cur[i].x += (tx - cur[i].x) * f
        cur[i].y += (ty - cur[i].y) * f
        el.style.transform = `translate3d(${cur[i].x.toFixed(2)}px, ${cur[i].y.toFixed(2)}px, 0)`
      })

      // The thread reaches from the statement toward the nearest channel.
      const path = threadRef.current
      if (path && nearest >= 0 && inside) {
        const el = itemRefs.current[nearest]
        const rootRect = root.getBoundingClientRect()
        if (el) {
          const r = el.getBoundingClientRect()
          const x2 = r.left - rootRect.left + 6
          const y2 = r.top - rootRect.top + r.height / 2
          const x1 = 0
          const y1 = rootRect.height * 0.26
          path.setAttribute(
            'd',
            `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.45} ${y1}, ${x2 - (x2 - x1) * 0.3} ${y2}, ${x2} ${y2}`
          )
          path.style.opacity = '0.55'
        }
      } else if (path) {
        path.style.opacity = '0'
      }

      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      inside = true
    }
    const onLeave = () => {
      inside = false
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [rich])

  return (
    <main ref={rootRef} className="relative z-10 overflow-hidden">
      {/* the reaching signal — decorative, never required to find a channel */}
      {rich && (
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
        <SplitLineReveal
          as="h1"
          lines={["Let's build", 'your brand.']}
          srLabel={closing.cta}
          className="font-display mt-6 font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.6rem, 10vw, 9rem)', lineHeight: 0.88, letterSpacing: '-0.04em' }}
        />
        <p className="font-body measure mt-9 text-base leading-relaxed text-text-300 sm:text-lg">
          One conversation is enough to find out whether we are the right team for your brand. Reach us on any
          channel — a real person answers, not a ticket queue.
        </p>
      </header>

      <section aria-label="Contact channels" className="flow-gutter relative z-10" style={{ marginTop: mobile ? '8vh' : '14vh' }}>
        <ul className="flex flex-wrap gap-x-[clamp(2.5rem,8vw,9rem)] gap-y-[clamp(3rem,7vh,6rem)]">
          {CHANNELS.map((ch, i) => (
            <li
              key={ch.label}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              className="list-none will-change-transform"
              style={{
                // Staggered baselines so the channels read as a field, not a grid.
                marginTop: `${[0, 3.5, 1.5, 5][i] ?? 0}rem`,
              }}
            >
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
                  className="font-display mt-3 flex min-h-[44px] items-center font-bold text-text-100 transition-colors duration-300 group-hover:text-[var(--blue-200)] group-focus-visible:text-[var(--blue-200)]"
                  style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.6rem)', lineHeight: 1.04, letterSpacing: '-0.02em' }}
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
            </li>
          ))}
        </ul>
        <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '50%' }} aria-hidden="true" />
      </section>

      <section aria-label="Studio" className="flow-gutter relative z-10" style={{ marginTop: mobile ? '10vh' : '16vh' }}>
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
        <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    </main>
  )
}
