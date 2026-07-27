import type { SocialPlatform } from '@/content/siteContent'

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === 'facebook') {
    return <path d="M14.4 8.2h2.4V4.5c-.4-.1-1.8-.2-3.4-.2-3.3 0-5.6 2-5.6 5.8v3.2H4v4.2h3.8V28h4.7V17.5h3.7l.6-4.2h-4.3v-2.8c0-1.2.3-2.3 1.9-2.3Z" />
  }
  if (platform === 'instagram') {
    return (
      <>
        <rect x="4.5" y="4.5" width="23" height="23" rx="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="5.3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="23.5" cy="8.7" r="1.25" />
      </>
    )
  }
  if (platform === 'youtube') {
    return (
      <>
        <path d="M28 10.1a4 4 0 0 0-2.8-2.8C22.7 6.6 16 6.6 16 6.6s-6.7 0-9.2.7A4 4 0 0 0 4 10.1 42 42 0 0 0 3.3 16 42 42 0 0 0 4 21.9a4 4 0 0 0 2.8 2.8c2.5.7 9.2.7 9.2.7s6.7 0 9.2-.7a4 4 0 0 0 2.8-2.8 42 42 0 0 0 .7-5.9 42 42 0 0 0-.7-5.9Z" />
        <path d="m13.3 20.2 7-4.2-7-4.2v8.4Z" fill="#020306" />
      </>
    )
  }
  return (
    <>
      <path d="M6.3 11.2h4.3V25H6.3V11.2Zm2.2-6.9A2.5 2.5 0 1 1 8.5 9a2.4 2.4 0 0 1 0-4.8Z" />
      <path d="M13.4 11.2h4.1v1.9h.1c.6-1.1 2-2.4 4.1-2.4 4.4 0 5.2 2.9 5.2 6.7V25h-4.3v-6.7c0-1.6 0-3.7-2.3-3.7s-2.6 1.8-2.6 3.6V25h-4.3V11.2Z" />
    </>
  )
}

export default function SocialIconLink({
  platform,
  label,
  href,
}: {
  platform: SocialPlatform
  label: string
  href: string | null
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border transition-colors duration-300 group-hover:border-[var(--blue-500)] group-focus-visible:border-[var(--blue-500)]"
        style={{ borderColor: 'var(--border-strong)' }}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-2 right-2 h-px origin-left scale-x-0 bg-[var(--blue-500)] transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
      <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <SocialGlyph platform={platform} />
      </svg>
    </>
  )

  if (!href) {
    return (
      <span
        role="img"
        aria-label={`${label} profile is not yet configured`}
        title={`${label} profile coming soon`}
        className="relative flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full text-text-500 opacity-55"
      >
        {content}
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — opens in a new tab`}
      className="group relative flex h-11 w-11 items-center justify-center rounded-full text-text-300 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--blue-200)] focus-visible:-translate-y-0.5 focus-visible:text-[var(--blue-200)]"
    >
      {content}
    </a>
  )
}
