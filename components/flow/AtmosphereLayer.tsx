/**
 * The ONE background for a route. Fixed and full-viewport, so it inherently
 * crosses every content boundary — which is precisely what the old
 * section-per-section backgrounds could not do.
 *
 * Deliberately STATIC. It reacts to neither the pointer nor the scroll
 * position: no subscriptions, no requestAnimationFrame, no animated custom
 * properties. The only thing that moves globally is the FlowThread's blue
 * signal line. Every gradient below is fixed at the composition the animated
 * version used to pass through mid-route, so the page keeps the look it had
 * without the drift.
 *
 * Scenes must NOT paint their own opaque backgrounds; at most they contribute
 * a small local accent through `accent`.
 */
export default function AtmosphereLayer({
  /** Local client accent for case-study routes — subtle, never a wash. */
  accent,
}: {
  accent?: string
}) {
  return (
    <div
      data-atmosphere
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 'var(--z-atmosphere)' }}
    >
      {/* Deep base — the near-black stage the whole site sits on */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, var(--bg-950), var(--bg-900) 55%, var(--bg-950))' }}
      />

      {/* Upper blue field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 40% at 28% 30%, rgba(0,137,255,0.085), transparent 68%)',
        }}
      />

      {/* Counter field, low and to the right — the two together give the stage
          its diagonal weight without either of them moving. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 48% 34% at 82% 62%, rgba(0,110,210,0.06), transparent 70%)',
        }}
      />

      {/* Local client accent — case-study routes only, deliberately faint */}
      {accent && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 54% 38% at 50% 52%, ${accent}1f, transparent 72%)`,
          }}
        />
      )}

      {/* Quiet depth wash — soft diagonal lift without competing geometry. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(112deg, transparent 15%, rgba(0,137,255,0.018) 42%, rgba(220,238,255,0.025) 50%, rgba(0,137,255,0.015) 58%, transparent 84%)',
        }}
      />

      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 92% 74% at 50% 50%, transparent 42%, rgba(2,3,6,0.6))' }}
      />
    </div>
  )
}
