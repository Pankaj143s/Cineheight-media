const STATIC_CONTOURS = [
  'M-40 110 C230 82 420 148 710 112 S1160 76 1520 126',
  'M-40 190 C250 228 470 156 760 196 S1190 238 1520 178',
  'M-40 275 C220 238 455 306 730 270 S1190 232 1520 286',
  'M-40 365 C260 408 500 326 780 370 S1190 410 1520 350',
  'M-40 455 C220 414 480 496 750 450 S1170 412 1520 468',
  'M-40 545 C250 588 480 510 780 552 S1210 590 1520 532',
  'M-40 635 C210 598 450 678 740 632 S1170 596 1520 652',
  'M-40 725 C250 768 500 686 780 730 S1200 770 1520 712',
  'M-40 815 C220 778 470 852 750 810 S1190 778 1520 828',
]

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
    <div data-atmosphere aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {/* Deep base — the near-black stage the whole site sits on */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, var(--bg-950), var(--bg-900) 55%, var(--bg-950))' }}
      />

      <svg
        aria-hidden="true"
        className="static-contour-field absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        {STATIC_CONTOURS.map((d, index) => (
          <path
            key={index}
            d={d}
            stroke="#0089FF"
            strokeWidth={index === 4 ? 0.9 : 0.6}
            vectorEffect="non-scaling-stroke"
            opacity={index === 4 ? 0.36 : 0.2}
          />
        ))}
      </svg>

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

      {/* One quiet depth wash supports the contour field without adding
          competing rings or independently animated geometry. */}
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
