'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { processSteps } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import {
  useCanRunRichEffects,
  useIsMobileTier,
  useReducedMotion,
} from '@/lib/useMediaPreferences'

const KEYWORDS = ['LISTEN', 'PLAN', 'MAKE', 'GROW']
const DESKTOP_NODES = [
  [8, 40],
  [335, 40],
  [665, 40],
  [992, 40],
]
const MOBILE_NODES = [
  [20, 20],
  [20, 230],
  [20, 460],
  [20, 680],
]

export default function ProcessCompact() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reduced) return
    const path = root.querySelector<SVGPathElement>('[data-process-path]')
    const pulse = root.querySelector<SVGCircleElement>('[data-process-pulse]')
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'))
    const nodes = Array.from(root.querySelectorAll<SVGCircleElement>('[data-process-node]'))
    const keywords = Array.from(root.querySelectorAll<HTMLElement>('[data-process-keyword]'))
    if (!path || !pulse || !steps.length) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    const progress = { value: 0 }
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 72%', once: true },
    })

    timeline.to(path, { strokeDashoffset: 0, duration: 1.45, ease: 'power2.inOut' })
    timeline.to(
      progress,
      {
        value: 1,
        duration: 2.15,
        ease: 'power1.inOut',
        onUpdate: () => {
          const point = path.getPointAtLength(length * progress.value)
          pulse.setAttribute('cx', point.x.toFixed(2))
          pulse.setAttribute('cy', point.y.toFixed(2))
        },
      },
      0.18
    )

    steps.forEach((step, index) => {
      const number = step.querySelector('[data-process-number]')
      const title = step.querySelector('[data-process-title]')
      const description = step.querySelector('[data-process-description]')
      const at = 0.26 + index * 0.42
      timeline
        .fromTo(
          nodes[index],
          { scale: 1, transformOrigin: 'center' },
          { scale: 2.1, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' },
          at
        )
        .to(number, { opacity: 1, filter: 'blur(0px)', duration: 0.26 }, at)
        .fromTo(
          title,
          { y: 5, letterSpacing: '0.025em' },
          { y: 0, letterSpacing: '-0.02em', opacity: 1, duration: 0.42, ease: 'power2.out' },
          at
        )
        .to(description, { opacity: 1, y: 0, duration: 0.38, ease: 'power1.out' }, at + 0.1)
        .to(keywords[index], { opacity: 0.04, duration: 0.4 }, at)
    })
    timeline.to(pulse, { opacity: 0, duration: 0.35 }, '>-0.15')

    return () => {
      timeline.revert()
    }
  }, [mobile, reduced])

  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'))
    const nodes = Array.from(root.querySelectorAll<SVGCircleElement>('[data-process-node]'))
    const secondary = root.querySelector<SVGPathElement>('[data-process-secondary]')
    const hoverPulse = root.querySelector<SVGCircleElement>('[data-process-hover-pulse]')
    const positions = mobile ? MOBILE_NODES : DESKTOP_NODES
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
        if (nodes[index]) nodes[index].style.scale = index === nearest ? '1.55' : '1'
      })
      if (secondary) secondary.style.opacity = nearest >= 0 ? '0.52' : '0.16'
      if (hoverPulse) {
        if (nearest >= 0) {
          hoverPulse.setAttribute('cx', String(positions[nearest][0]))
          hoverPulse.setAttribute('cy', String(positions[nearest][1]))
          hoverPulse.style.opacity = '0.85'
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
      nodes.forEach((node) => {
        node.style.scale = '1'
      })
      if (secondary) secondary.style.opacity = '0.16'
      if (hoverPulse) hoverPulse.style.opacity = '0'
    }

    root.addEventListener('pointermove', update)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', update)
      root.removeEventListener('pointerleave', leave)
    }
  }, [mobile, rich])

  const pathData = mobile
    ? 'M20 20 C48 100 4 150 20 230 S44 365 20 460 S2 595 20 680'
    : 'M8 40 C150 18 240 62 335 40 S560 18 665 40 S882 62 992 40'
  const nodes = mobile ? MOBILE_NODES : DESKTOP_NODES

  return (
    <section
      ref={rootRef}
      id="process"
      aria-label="How we work"
      className="relative z-10 overflow-hidden"
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
        <p className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300">
          Strategy, design, content and campaigns handled end to end — so nothing is lost between agencies.
        </p>
      </div>

      <div className="flow-gutter relative mt-12 sm:mt-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {KEYWORDS.map((keyword, index) => (
            <span
              key={keyword}
              data-process-keyword
              data-parallax-y={String(index % 2 ? -0.2 : 0.18)}
              className="font-display absolute hidden font-bold uppercase text-text-100 lg:block"
              style={{
                left: `${index * 25 + 2}%`,
                top: index % 2 ? '46%' : '8%',
                fontSize: 'clamp(5rem, 11vw, 12rem)',
                opacity: reduced ? 0.04 : 0.018,
                letterSpacing: '-0.05em',
              }}
            >
              {keyword}
            </span>
          ))}
        </div>

        <svg
          aria-hidden="true"
          className={
            mobile
              ? 'pointer-events-none absolute bottom-4 left-0 top-0 h-full w-16 overflow-visible'
              : 'pointer-events-none absolute inset-x-0 top-0 h-20 w-full overflow-visible'
          }
          viewBox={mobile ? '0 0 80 700' : '0 0 1000 80'}
          preserveAspectRatio="none"
        >
          <path
            d={pathData}
            stroke="rgba(0,137,255,0.16)"
            strokeWidth={mobile ? 1.5 : 1.2}
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            data-process-secondary
            d={pathData}
            stroke="#0089FF"
            strokeWidth={mobile ? 1.4 : 1.1}
            strokeDasharray="2 13"
            vectorEffect="non-scaling-stroke"
            fill="none"
            style={{ opacity: 0.16, transition: 'opacity 300ms ease' }}
          />
          <path
            data-process-path
            d={pathData}
            stroke="#0089FF"
            strokeWidth={mobile ? 2 : 1.8}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 5px rgba(0,137,255,0.45))' }}
          />
          {nodes.map(([x, y], index) => (
            <circle
              key={index}
              data-process-node
              cx={x}
              cy={y}
              r={mobile ? 3 : 2.5}
              fill="#DCEEFF"
              stroke="#0089FF"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', transition: 'scale 260ms ease' }}
            />
          ))}
          <circle
            data-process-pulse
            cx={nodes[0][0]}
            cy={nodes[0][1]}
            r={mobile ? 3.4 : 2.8}
            fill="#DCEEFF"
            vectorEffect="non-scaling-stroke"
            style={{ filter: 'drop-shadow(0 0 6px #0089FF)', opacity: reduced ? 0 : 1 }}
          />
          <circle
            data-process-hover-pulse
            cx={nodes[0][0]}
            cy={nodes[0][1]}
            r={mobile ? 4 : 3.4}
            fill="none"
            stroke="#0089FF"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0, transition: 'opacity 220ms ease' }}
          />
        </svg>

        <ol
          className={
            mobile
              ? 'relative flex flex-col gap-12 pl-12'
              : 'relative grid grid-cols-4 gap-x-8 pt-20'
          }
          style={mobile ? { minHeight: 700 } : undefined}
        >
          {processSteps.map((step, index) => (
            <li
              key={step.index}
              data-process-step
              data-process-hover="false"
              className="process-step relative list-none"
              style={mobile ? { minHeight: 150 } : undefined}
            >
              <p
                data-process-number
                className="font-body text-[11px] uppercase text-text-500"
                style={{ letterSpacing: '0.24em', opacity: reduced ? 1 : 0.68, filter: reduced ? 'none' : 'blur(0.7px)' }}
              >
                {step.index}
              </p>
              <h3
                data-process-title
                className="type-display-3 font-display mt-2 font-bold uppercase text-text-100"
                style={{ opacity: reduced ? 1 : 0.78 }}
              >
                {step.title}
              </h3>
              <p
                data-process-description
                className="font-body mt-3 max-w-[30ch] text-sm leading-relaxed text-text-300"
                style={{ opacity: reduced ? 1 : 0.68, transform: reduced ? undefined : 'translateY(3px)' }}
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
