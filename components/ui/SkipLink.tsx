'use client'

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="font-body fixed left-4 top-4 z-[1001] -translate-y-16 bg-text-100 px-4 py-3 text-sm font-semibold text-bg-950 opacity-0 shadow-lg transition-[transform,opacity] duration-150 focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-bg-950"
      onClick={(event) => {
        const target = document.getElementById('main-content')
        if (!target) return
        event.preventDefault()
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        target.focus({ preventScroll: true })
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      }}
    >
      Skip to main content
    </a>
  )
}