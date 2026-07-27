'use client'

import { useCallback, useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { processSteps } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import {
  buildSignalPath,
  fractionAtPoint,
  pointAtFraction,
  sampleSignalPath,
  type PathPoint,
  type PathSample,
} from '@/lib/signalPath'
import { clamp } from '@/lib/utils'
import { DURATION_MS, SCRUB, TRIGGER } from '@/lib/motionTokens'
import {
  useCanRunRichEffects,
  useIsMobileTier,
  useReducedMotion,
} from '@/lib/useMediaPreferences'

/**
 * "How we work" — four steps joined by one measured signal path.
 *
 * Two things drove this rebuild.
 *
 * The scene used to carry four giant decorative words (LISTEN / PLAN / MAKE /
 * GROW) behind the content at 11vw. They were clipped by the section box, never
 * matched the actual step titles, and at 1.8 % opacity read as an unexplained
 * smear rather than as typography. They are gone. What replaces them is a small
 * legible micro-label beside each step number — a deliberate, readable second
 * voice instead of mystery text.
 *
 * The path used to be a hard-coded viewBox stretched with
 * `preserveAspectRatio="none"`, which meant the line only touched its nodes at
 * one viewport width and the node circles turned into ellipses everywhere else.
 * It is now measured from the real DOM position of each step's anchor and
 * rebuilt whenever the layout can have moved.
 *
 * Motion is driven by ONE scroll-scrubbed value. Everything — dash offset,
 * pulse position, node activation, text state — is a pure function of that
 * value, so the pulse cannot drift off the drawn edge (it is read from the same
 * arc length that defines the edge) and scrolling back up simply plays the
 * function backwards.
 */

/**
 * A second, plain-language name for each step. Small and subordinate — it sits
 * on the number line, never behind the content.
 */
const MICRO_LABELS = ['INSIGHT', 'DIRECTION', 'PRODUCTION', 'GROWTH']

/** Arc-length window, in progress units, over which one step resolves. */
const STEP_WINDOW = 0.14
/** How far ahead of a node the pulse begins to wake it. */
const STEP_LEAD = 0.04

interface Geometry {
  length: number
  samples: PathSample[]
  /** Arc-length fraction of each measured node, 0–1. */
  nodeAt: number[]
}

/** Smooth 0→1 ramp; avoids the linear look of a raw clamp. */
const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export default function ProcessCompact() {
  const rootRef = useRef<HTMLElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  const geo = useRef<Geometry>({ length: 0, samples: [], nodeAt: [] })
  /** Measured node centres in path space — shared with the pointer effect. */
  const nodeCentres = useRef<PathPoint[]>([])
  /** Latest scrub value, so a rebuild can re-apply the current state. */
  const progress = useRef(0)

  /**
   * Paint every path-driven element for a given progress value.
   *
   * Deliberately a pure function of `p`: reversing the scroll re-runs it with a
   * smaller number and the scene simply un-draws. Nothing here holds state that
   * could fall out of step with anything else.
   */
  const applyProgress = useCallback((p: number) => {
    progress.current = p
    const root = rootRef.current
    const svg = svgRef.current
    if (!root || !svg) return

    const { length, samples, nodeAt } = geo.current
    if (!length || !samples.length) return

    const drawPath = svg.querySelector<SVGPathElement>('[data-process-path]')
    const pulse = svg.querySelector<SVGCircleElement>('[data-process-pulse]')
    const nodes = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-process-node]'))
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'))

    if (drawPath) drawPath.style.strokeDashoffset = `${length * (1 - p)}`

    if (pulse) {
      // Read the tip from the SAME arc length that defines the visible edge —
      // this is what keeps the pulse welded to the end of the drawn line.
      const tip = pointAtFraction(samples, p)
      pulse.setAttribute('cx', tip.x.toFixed(2))
      pulse.setAttribute('cy', tip.y.toFixed(2))
      // Fade in as it leaves the start, out as it settles at the end.
      const edge = Math.min(smoothstep(p / 0.06), smoothstep((1 - p) / 0.05))
      pulse.style.opacity = String(edge)
    }

    steps.forEach((step, index) => {
      const at = nodeAt[index] ?? index / Math.max(1, steps.length - 1)
      const a = smoothstep((p - at + STEP_LEAD) / STEP_WINDOW)
      // Steps already passed stay fully readable but recede a little, so the
      // leading edge is always the brightest thing in the scene.
      const passed = smoothstep((p - at - STEP_WINDOW * 1.5) / 0.25)
      const settle = 1 - passed * 0.12

      const node = nodes[index]
      if (node) {
        // Brief expansion as the pulse arrives, then settle just above rest.
        // Written as a custom property so the pointer-proximity effect can
        // multiply its own emphasis in without either owner clobbering the
        // other's value.
        const arrival = Math.sin(smoothstep((p - at + 0.03) / 0.08) * Math.PI)
        node.style.setProperty('--node-scale', String(1 + a * 0.35 + arrival * 0.9))
        node.style.opacity = String(0.35 + a * 0.65)
      }

      const number = step.querySelector<HTMLElement>('[data-process-number]')
      if (number) {
        number.style.opacity = String(0.3 + a * 0.7)
        number.style.filter = a > 0.85 ? 'none' : `blur(${(1 - a) * 0.8}px)`
      }

      const title = step.querySelector<HTMLElement>('[data-process-title]')
      if (title) {
        title.style.opacity = String((0.34 + a * 0.66) * settle)
        // Tracking resolves from slightly open to the final value.
        title.style.letterSpacing = `${(1 - a) * 0.03 - 0.02}em`
      }

      const description = step.querySelector<HTMLElement>('[data-process-description]')
      if (description) {
        description.style.opacity = String((0.2 + a * 0.8) * settle)
        description.style.transform = `translateY(${(1 - a) * 4}px)`
      }
    })
  }, [])

  /**
   * Re-read the anchors and rebuild the curve in real pixels.
   *
   * The SVG is sized to the field box rather than given a stretched viewBox, so
   * one unit is one pixel and the node circles stay circular at every viewport.
   */
  const measure = useCallback(() => {
    const field = fieldRef.current
    const svg = svgRef.current
    if (!field || !svg) return

    const drawPath = svg.querySelector<SVGPathElement>('[data-process-path]')
    const rail = svg.querySelector<SVGPathElement>('[data-process-rail]')
    const secondary = svg.querySelector<SVGPathElement>('[data-process-secondary]')
    const nodes = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-process-node]'))
    const anchors = Array.from(field.querySelectorAll<HTMLElement>('[data-process-anchor]'))
    if (!drawPath || anchors.length < 2) return

    const box = field.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) return

    const centres: PathPoint[] = anchors.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
    })
    nodeCentres.current = centres

    // Extend past the final node so the journey reads as continuing rather than
    // stopping dead at step four. Kept inside the field box — this path belongs
    // to the process scene and must never wander into the global flow thread.
    const first = centres[0]
    const last = centres[centres.length - 1]
    const pts: PathPoint[] = [...centres]
    // Run out by roughly half a step so the line clears the final node without
    // sprawling into the page gutter.
    if (mobile) {
      const step = (last.y - first.y) / Math.max(1, centres.length - 1)
      const end = Math.min(last.y + step * 0.45, box.height - 6)
      if (end > last.y + 16) pts.push({ x: first.x, y: end })
    } else {
      const step = (last.x - first.x) / Math.max(1, centres.length - 1)
      const end = Math.min(last.x + step * 0.62, box.width - 6)
      if (end > last.x + 24) pts.push({ x: end, y: last.y })
    }

    svg.setAttribute('width', String(Math.round(box.width)))
    svg.setAttribute('height', String(Math.round(box.height)))
    svg.setAttribute('viewBox', `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`)

    const d = buildSignalPath(pts, {
      axis: mobile ? 'y' : 'x',
      // A gentle wave between nodes. The curve still passes exactly through
      // every measured centre; only the approach bends.
      bow: mobile ? 0.06 : 0.045,
      maxBow: mobile ? 14 : 26,
    })

    drawPath.setAttribute('d', d)
    rail?.setAttribute('d', d)
    secondary?.setAttribute('d', d)

    const length = drawPath.getTotalLength()
    drawPath.style.strokeDasharray = `${length}`
    const samples = sampleSignalPath(drawPath, 240)
    geo.current = {
      length,
      samples,
      nodeAt: centres.map((c) => fractionAtPoint(samples, c)),
    }

    nodes.forEach((node, i) => {
      const c = centres[i]
      if (!c) return
      node.setAttribute('cx', c.x.toFixed(2))
      node.setAttribute('cy', c.y.toFixed(2))
    })

    applyProgress(reduced ? 1 : progress.current)
  }, [applyProgress, mobile, reduced])

  // ---- measure + keep in sync with layout -------------------------------
  useIsomorphicLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return

    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }

    measure()

    const ro = new ResizeObserver(schedule)
    ro.observe(field)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    // Fonts change the height of every title, which moves every anchor.
    document.fonts?.ready.then(schedule).catch(() => {})
    // Late layout settling (images, restored scroll position, route re-entry).
    const late = window.setTimeout(schedule, 700)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.clearTimeout(late)
    }
  }, [measure])

  // ---- one scrubbed progress source -------------------------------------
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (reduced) {
      // Completed state: full line, every node, all text. No scrub.
      applyProgress(1)
      return
    }

    const ctx = gsap.context(() => {
      const state = { value: 0 }
      gsap.to(state, {
        value: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: TRIGGER.sectionStart,
          end: TRIGGER.sectionEnd,
          scrub: SCRUB.signal,
        },
        onUpdate: () => applyProgress(state.value),
      })
    }, root)

    /**
     * If the trigger never runs — an observer failure, a transformed ancestor,
     * a very fast scroll straight past the section — the scene must not be left
     * half-drawn with unreadable text.
     */
    const failsafe = window.setTimeout(() => {
      if (progress.current > 0.01) return
      const rect = root.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) applyProgress(1)
    }, DURATION_MS.failsafe)

    return () => {
      ctx.revert()
      window.clearTimeout(failsafe)
    }
  }, [applyProgress, mobile, reduced])

  // ---- pointer proximity (secondary to the scroll pulse) -----------------
  useEffect(() => {
    if (!rich || reduced) return
    const root = rootRef.current
    const svg = svgRef.current
    if (!root || !svg) return

    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'))
    const nodes = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-process-node]'))
    const secondary = svg.querySelector<SVGPathElement>('[data-process-secondary]')
    const hoverPulse = svg.querySelector<SVGCircleElement>('[data-process-hover-pulse]')
    let active = -1

    const update = (event: PointerEvent) => {
      let nearest = -1
      let distance = 180
      steps.forEach((step, index) => {
        const rect = step.getBoundingClientRect()
        const d = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2)
        )
        if (d < distance) {
          distance = d
          nearest = index
        }
      })
      if (active === nearest) return
      active = nearest

      steps.forEach((step, index) => {
        step.dataset.processHover = index === nearest ? 'true' : 'false'
      })
      // Emphasis is a small multiplier on top of whatever the scroll pulse has
      // already set, so pointer play never fights the primary animation.
      nodes.forEach((node, index) => {
        node.style.setProperty('--node-hover', index === nearest ? '1.15' : '1')
      })
      if (secondary) secondary.style.opacity = nearest >= 0 ? '0.5' : '0.16'

      if (hoverPulse) {
        const centre = nodeCentres.current[nearest]
        if (nearest >= 0 && centre) {
          hoverPulse.setAttribute('cx', centre.x.toFixed(2))
          hoverPulse.setAttribute('cy', centre.y.toFixed(2))
          hoverPulse.style.opacity = '0.8'
        } else {
          hoverPulse.style.opacity = '0'
        }
      }
    }

    const leave = () => {
      active = -1
      steps.forEach((step) => {
        step.dataset.processHover = 'false'
      })
      nodes.forEach((node) => node.style.setProperty('--node-hover', '1'))
      if (secondary) secondary.style.opacity = '0.16'
      if (hoverPulse) hoverPulse.style.opacity = '0'
    }

    root.addEventListener('pointermove', update)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', update)
      root.removeEventListener('pointerleave', leave)
    }
  }, [mobile, reduced, rich])

  const nodeRadius = mobile ? 4 : 3.5

  return (
    <section
      ref={rootRef}
      id="process"
      aria-label="How we work"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(3.5rem, 10vh, 8rem) * var(--scene-gap))' }}
    >
      <div className="flow-gutter relative z-10">
        <KineticLabel text="HOW WE WORK" />
        <SplitLineReveal
          as="h2"
          lines={['One team. One', 'continuous journey.']}
          srLabel="One team. One continuous journey."
          className="type-display-2 font-display mt-6 font-bold uppercase text-text-100"
          style={{ maxWidth: '20ch' }}
        />
        <p
          className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300"
          data-parallax-y="0.05"
        >
          One connected path from insight to launch and ongoing growth.
        </p>
      </div>

      {/*
        Bring the route thread to this side BEFORE the process line starts.
        Without it the thread sweeps diagonally across the whole section to
        reach the anchor at the bottom, cutting straight through the process
        nodes so the two signal systems read as one tangled graphic.
      */}
      <div
        data-flow-anchor="left"
        data-flow-lead="1"
        className="pointer-events-none h-px"
        aria-hidden="true"
      />

      <div
        ref={fieldRef}
        className="flow-gutter relative mt-10 sm:mt-14"
        style={{ paddingTop: mobile ? undefined : 'clamp(2.5rem, 5vh, 4.5rem)' }}
      >
        {/*
          Sized in real pixels from the field box (see `measure`). No stretched
          viewBox, so `r` means the same thing on every axis and the nodes stay
          circular from 320 px to 5120 px.
        */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <path data-process-rail stroke="rgba(0,137,255,0.16)" strokeWidth={1.2} fill="none" />
          <path
            data-process-secondary
            stroke="#0089FF"
            strokeWidth={1.1}
            strokeDasharray="2 13"
            fill="none"
            style={{ opacity: 0.16, transition: 'opacity 300ms ease' }}
          />
          <path
            data-process-path
            stroke="#0089FF"
            strokeWidth={mobile ? 2 : 1.8}
            strokeLinecap="round"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 5px rgba(0,137,255,0.45))' }}
          />
          {processSteps.map((step) => (
            <circle
              key={step.index}
              data-process-node
              r={nodeRadius}
              fill="#DCEEFF"
              stroke="#0089FF"
              strokeWidth="1.4"
              className="process-node"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}
          <circle
            data-process-pulse
            r={mobile ? 3.6 : 3}
            fill="#DCEEFF"
            style={{ filter: 'drop-shadow(0 0 6px #0089FF)', opacity: 0 }}
          />
          <circle
            data-process-hover-pulse
            r={mobile ? 8 : 7}
            fill="none"
            stroke="#0089FF"
            strokeWidth="1.2"
            style={{ opacity: 0, transition: 'opacity 220ms ease' }}
          />
        </svg>

        <ol
          className={
            mobile
              ? 'relative flex flex-col gap-10 pl-11'
              : 'relative grid grid-cols-4 gap-x-6 xl:gap-x-8'
          }
        >
          {processSteps.map((step, index) => (
            <li
              key={step.index}
              data-process-step
              data-process-hover="false"
              className="process-step relative list-none"
            >
              {/*
                The node anchor. It carries no visual of its own — the circle is
                drawn in the SVG above at this element's measured centre, which
                is what guarantees the line actually passes through the nodes.
              */}
              <span
                data-process-anchor
                aria-hidden="true"
                className="pointer-events-none absolute block h-2 w-2"
                style={
                  mobile
                    ? { left: '-2.35rem', top: '0.55rem' }
                    : { left: 0, top: 'calc(-1 * clamp(1.4rem, 2.6vh, 2.4rem))' }
                }
              />
              <p
                data-process-number
                className="font-body flex items-baseline gap-2 text-[11px] uppercase text-text-500"
                style={{ letterSpacing: '0.24em' }}
              >
                {step.index}
                <span
                  data-process-micro
                  className="text-[9px] text-text-500/80"
                  style={{ letterSpacing: '0.2em' }}
                >
                  {MICRO_LABELS[index]}
                </span>
              </p>
              <h3
                data-process-title
                className="type-display-3 font-display mt-2 font-bold uppercase text-text-100"
                style={{ letterSpacing: '-0.02em' }}
              >
                {step.title}
              </h3>
              <p
                data-process-description
                className="font-body mt-3 max-w-[30ch] text-sm leading-relaxed text-text-300"
              >
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div data-flow-anchor="left" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
