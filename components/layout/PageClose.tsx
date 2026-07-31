'use client'

import AnimatedBrandSignature from '@/components/home/AnimatedBrandSignature'
import Footer from '@/components/Footer'

/**
 * Consistent page-resolution beat for non-home routes: large CINEHEIGHT
 * wordmark, then the integrated footer — same closing language as homepage.
 */
export default function PageClose() {
  return (
    <div className="relative z-10" style={{ marginTop: 'clamp(4rem, 10vh, 8rem)' }}>
      <AnimatedBrandSignature />
      <Footer variant="integrated" />
    </div>
  )
}
