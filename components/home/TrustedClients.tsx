'use client'

import Image from 'next/image'
import Reveal from '@/components/ui/Reveal'
import { trustedClients } from '@/content/siteContent'

/**
 * Trusted clients — a quiet bridge after the showreel (spec §14). Real logos
 * only, monochrome at rest, balanced wrapped rows (no marquee, no section
 * block). Sits directly on the shared dark stage; a staggered opacity reveal
 * is the only motion.
 */
export default function TrustedClients() {
  return (
    <section aria-label="Clients we have worked with" className="relative mx-auto w-full max-w-[1500px] px-6 pb-[10vh] pt-[6vh] sm:px-10 lg:px-14">
      <Reveal variant="fade" className="mb-9 flex items-baseline gap-4">
        <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
          Trusted by
        </span>
        <span className="font-body text-xs text-text-500 sm:text-sm">
          brands, institutions and businesses
        </span>
      </Reveal>

      <ul className="flex flex-wrap items-center gap-x-3 gap-y-4 sm:gap-x-5">
        {trustedClients.map((client, i) => (
          <Reveal
            key={client.name}
            as="li"
            variant="fade"
            delay={Math.min(i * 0.06, 0.7)}
            amount={0.2}
            className="flex list-none items-center justify-center"
            style={{ minWidth: 130, height: 72 }}
          >
            <div
              className={`flex items-center justify-center transition-all duration-300 ${
                client.needsLightPlate ? 'rounded-md bg-white/[0.07] px-3 py-1.5' : ''
              }`}
            >
              <Image
                src={client.logo}
                alt={client.name}
                width={client.maxW * 2}
                height={client.maxH * 2}
                style={{ maxWidth: client.maxW * 0.88, maxHeight: client.maxH * 0.88, width: 'auto', height: 'auto' }}
                className="object-contain opacity-[0.48] grayscale transition-all duration-300 hover:opacity-95 hover:grayscale-0"
              />
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
