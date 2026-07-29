import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'

export default function NotFound() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <div className="layer-content">
      <main className="relative flex min-h-[70vh] items-center">
        <div className="mx-auto w-full max-w-[1500px] px-6 py-32 sm:px-10 lg:px-14">
          <p className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            404
          </p>
          <h1
            className="font-display mt-6 max-w-3xl font-bold text-text-100"
            style={{ fontSize: 'clamp(2rem, 4.6vw, 4.2rem)', lineHeight: 1.05, letterSpacing: '-0.015em' }}
          >
            This page rose above its category — and vanished.
          </h1>
          <p className="font-body mt-6 max-w-md text-base leading-relaxed text-text-300">
            The page you are looking for does not exist or has moved.
          </p>
          <Link
            href="/"
            className="group mt-10 inline-flex min-h-[48px] items-center gap-4 rounded-full border px-7 py-3.5 font-display text-[13px] font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Back to home
          </Link>
        </div>
      </main>
        <Footer />
      </div>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
