'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import KineticLabel from '@/components/motion/KineticLabel'
import { trustedClients, logoBox } from '@/content/siteContent'
import {
  useCanRunRichEffects,
  useIsMobileTier,
  useReducedMotion,
} from '@/lib/useMediaPreferences'

const ROW_B = [...trustedClients.slice(Math.ceil(trustedClients.length / 2)), ...trustedClients.slice(0, Math.ceil(trustedClients.length / 2))]
const LOOP_COPIES = [0, 1, 2, 3] as const

function LogoMark({
  client,
  tier,
}: {
  client: (typeof trustedClients)[number]
  tier: number
}) {
  const box = logoBox(client, tier)
  const dark = client.needsLightPlate

  return (
    <li
      className="group flex h-[82px] w-[190px] shrink-0 list-none items-center justify-center px-5"
      title={client.name}
    >
      <span
        className="flex h-[72px] w-full items-center justify-center rounded-full px-4 transition-transform duration-500 ease-out group-hover:-translate-y-1"
        style={
          dark
            ? {
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 55%, transparent 76%)',
              }
            : undefined
        }
      >
        <Image
          src={client.logo}
          alt={client.name}
          width={box.width}
          height={box.height}
          sizes={`${Math.max(120, box.width)}px`}
          className="object-contain opacity-70 transition-[opacity,filter] duration-500 ease-out group-hover:opacity-100"
          style={{
            width: box.width,
            height: box.height,
            maxWidth: 156,
            maxHeight: 58,
            filter: dark
              ? 'grayscale(1) brightness(2.6) contrast(0.85)'
              : 'grayscale(1) brightness(1.08)',
          }}
        />
      </span>
    </li>
  )
}

export default function ClientMarquee() {
  const rootRef = useRef<HTMLElement>(null)
  const trackARef = useRef<HTMLDivElement>(null)
  const trackBRef = useRef<HTMLDivElement>(null)
  const groupARef = useRef<HTMLUListElement>(null)
  const groupBRef = useRef<HTMLUListElement>(null)
  const pausedRef = useRef(false)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()
  const tier = mobile ? 0.88 : 1

  useEffect(() => {
    const root = rootRef.current
    const trackA = trackARef.current
    const trackB = trackBRef.current
    const groupA = groupARef.current
    const groupB = groupBRef.current
    if (!root || !trackA || !trackB || !groupA || !groupB || reduced) return

    let widthA = 1
    let widthB = 1
    let offsetA = 0
    let offsetB = 0
    let last = performance.now()
    let raf = 0
    let visible = false
    const speedA = mobile ? 22 : 32
    const speedB = mobile ? 17 : 25

    const measure = () => {
      widthA = Math.max(1, groupA.getBoundingClientRect().width)
      widthB = Math.max(1, groupB.getBoundingClientRect().width)
      offsetA %= widthA
      offsetB %= widthB
    }
    const frame = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      if (!pausedRef.current) {
        offsetA = (offsetA + (speedA * dt) / 1000) % widthA
        offsetB = (offsetB + (speedB * dt) / 1000) % widthB
      }
      trackA.style.transform = `translate3d(${-offsetA.toFixed(2)}px, 0, 0)`
      trackB.style.transform = `translate3d(${(-widthB + offsetB).toFixed(2)}px, 0, 0)`
      raf = requestAnimationFrame(frame)
    }
    const setRunning = () => {
      const should = visible && !document.hidden
      if (should && !raf) {
        trackA.style.willChange = 'transform'
        trackB.style.willChange = 'transform'
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else if (!should && raf) {
        cancelAnimationFrame(raf)
        raf = 0
        trackA.style.willChange = ''
        trackB.style.willChange = ''
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      setRunning()
    })
    observer.observe(root)
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(groupA)
    resizeObserver.observe(groupB)
    const onVisibility = () => setRunning()
    const pause = () => {
      pausedRef.current = true
    }
    const resume = () => {
      pausedRef.current = false
    }

    measure()
    document.addEventListener('visibilitychange', onVisibility)
    root.addEventListener('pointerenter', pause)
    root.addEventListener('pointerleave', resume)
    root.addEventListener('focusin', pause)
    root.addEventListener('focusout', resume)
    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      root.removeEventListener('pointerenter', pause)
      root.removeEventListener('pointerleave', resume)
      root.removeEventListener('focusin', pause)
      root.removeEventListener('focusout', resume)
    }
  }, [mobile, reduced])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !rich) return

    const onMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect()
      root.style.setProperty(
        '--depth-x',
        `${((event.clientX - bounds.left) / bounds.width - 0.5) * 10}px`
      )
      root.style.setProperty(
        '--depth-y',
        `${((event.clientY - bounds.top) / bounds.height - 0.5) * 5}px`
      )
    }
    const reset = () => {
      root.style.setProperty('--depth-x', '0px')
      root.style.setProperty('--depth-y', '0px')
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
    }
  }, [rich])

  const renderLoop = (
    clients: typeof trustedClients,
    groupRef: typeof groupARef,
    prefix: string
  ) =>
    LOOP_COPIES.map((copy) => (
      <ul
        key={`${prefix}-${copy}`}
        ref={copy === 0 ? groupRef : undefined}
        aria-hidden={copy === 0 ? undefined : true}
        className="flex shrink-0 items-center"
      >
        {clients.map((client) => (
          <LogoMark
            key={`${prefix}-${copy}-${client.name}`}
            client={client}
            tier={tier}
          />
        ))}
      </ul>
    ))

  return (
    <section
      ref={rootRef}
      data-interaction-quiet
      aria-label="Brands we have worked with"
      className="relative z-10 overflow-hidden"
      style={{
        marginTop: 'calc(clamp(2.5rem, 7vh, 6rem) * var(--scene-gap))',
        ['--depth-x' as string]: '0px',
        ['--depth-y' as string]: '0px',
      }}
    >
      <div className="flow-gutter" data-parallax-y="0.08">
        <KineticLabel text="BRANDS WE HAVE WORKED WITH" />
        <p className="font-body measure mt-4 text-sm leading-relaxed text-text-300">
          Trusted across mobility, education, hospitality and public organisations.
        </p>
      </div>

      <div
        className="relative mt-8 overflow-hidden border-y py-5"
        style={{
          borderColor: 'rgba(255,255,255,0.055)',
          transform: 'translate3d(var(--depth-x), var(--depth-y), 0)',
          transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {reduced ? (
          <div className="flow-gutter flex flex-col gap-2">
            <ul className="flex flex-wrap items-center justify-center gap-y-3">
              {trustedClients.filter((_, index) => index % 2 === 0).map((client) => (
                <LogoMark key={client.name} client={client} tier={tier} />
              ))}
            </ul>
            <ul className="flex flex-wrap items-center justify-center gap-y-3">
              {trustedClients.filter((_, index) => index % 2 === 1).map((client) => (
                <LogoMark key={client.name} client={client} tier={tier} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-4">
            <div
              data-parallax-y="0.07"
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              }}
            >
              <div
                ref={trackARef}
                data-client-marquee-track="forward"
                className="flex w-max"
              >
                {renderLoop(trustedClients, groupARef, 'forward')}
              </div>
            </div>
            <div
              data-parallax-y="-0.1"
              aria-hidden="true"
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              }}
            >
              <div
                ref={trackBRef}
                data-client-marquee-track="reverse"
                className="flex w-max"
              >
                {renderLoop(ROW_B, groupBRef, 'reverse')}
              </div>
            </div>
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(0,137,255,0.2), transparent)' }}
        />
      </div>

      <div data-flow-anchor="right" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
