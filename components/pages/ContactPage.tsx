'use client'

import { useEffect, useRef, useState } from 'react'
import { contact, closing } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import ProjectContactForm from '@/components/contact/ProjectContactForm'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier } from '@/lib/useMediaPreferences'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'

/**
 * The destination. One large project-start statement and the real channels
 * arranged as a composition that shifts around the pointer — the signal leans
 * toward whichever channel you approach, and the moment you commit, the link
 * is an ordinary anchor that navigates instantly.
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
  const [focused, setFocused] = useState<number | null>(null)

  // Channels drift with the pointer; the signal leans toward the nearest one.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return

    const pointer = { x: 0, y: 0 }
    const cur = itemRefs.current.map(() => ({ x: 0, y: 0 }))
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
        itemLeft[index] = rect.left - cur[index].x
        centerX[index] = rect.left + rect.width / 2 - cur[index].x
        centerY[index] = rect.top + rect.height / 2 - cur[index].y
      })
      measureDirty = false
    }

    const animation = createManagedFrameLoop((_now, dt) => {
      if (measureDirty) measure()
      const f = damp(0.07, dt)
      let nearest = -1
      let nearestD = Infinity
      let unsettled = false

      itemRefs.current.forEach((el, i) => {
        if (!el) return
        const dx = pointer.x - centerX[i]
        const dy = pointer.y - centerY[i]
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
        if (Math.abs(tx - cur[i].x) > 0.02 || Math.abs(ty - cur[i].y) > 0.02) unsettled = true
        el.style.transform = `translate3d(${cur[i].x.toFixed(2)}px, ${cur[i].y.toFixed(2)}px, 0)`
      })

      // The thread reaches from the statement toward the nearest channel.
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
          path.style.opacity = '0.55'
        }
      } else if (path) {
        path.style.opacity = '0'
      }

      return unsettled
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
    const stopPromotion = observeVisibleLayerPromotion(
      itemRefs.current.filter((element): element is HTMLLIElement => Boolean(element))
    )
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange)
      stopPromotion()
      animation.destroy()
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
          Tell us what you are building. A real person will reply and help you find the right next step.
        </p>
      </header>

      <section aria-label="Contact channels and project form" className="flow-gutter relative z-10" style={{ marginTop: mobile ? '8vh' : '12vh' }}>
        <div className="grid gap-x-14 gap-y-16 lg:grid-cols-12">
          <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-6">
            {CHANNELS.map((ch, i) => (
              <li
                key={ch.label}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className="list-none"
                style={{ marginTop: mobile ? 0 : `${[0, 2.5, 1, 3.5][i] ?? 0}rem` }}
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
              </li>
            ))}
          </ul>
          <div className="lg:col-span-6">
            <ProjectContactForm variant="full" />
          </div>
        </div>
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
