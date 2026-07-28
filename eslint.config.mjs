import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

/*
 * Flat config, because Next 16 removed `next lint` — `npm run lint` is now a
 * plain `eslint .`.
 *
 * `eslint-config-next/core-web-vitals` exports a flat `Linter.Config[]`
 * directly (CJS `export =`), so it spreads straight in.
 */
const config = [
  {
    /*
     * `next lint` scoped itself to app/, components/, lib/ and src/. A bare
     * `eslint .` reaches everything, so this re-establishes that scope: build
     * output, captured screenshots, gitignored media-generation intermediates
     * (which contain partial .tsx fragments that do not parse on their own),
     * and the standalone Node scripts — zero-dependency CDP and test tooling
     * rather than app code, and never linted before.
     */
    ignores: [
      '.next/**',
      'out/**',
      '.shots/**',
      '.media-tmp/**',
      'next-env.d.ts',
      'scripts/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    /*
     * `eslint-config-next@16` upgrades eslint-plugin-react-hooks from v4 to
     * v7, which adds a compiler-driven rule family that did not exist under
     * the previous config. It reports 14 errors against code this upgrade did
     * not touch — `Navbar`, `SoundscapeProvider`, `CreativeOrbit`,
     * `MediaLightbox`, `useInViewOnce`, `CountUp`, `Reveal`, `CountUp` and
     * `useMediaPreferences`.
     *
     * Several of those are load-bearing for behaviour verified by the browser
     * probes (`useInViewOnce` drives the slice-reveal headline;
     * `useMediaPreferences` gates the cursor), so refactoring them inside a
     * dependency-security commit would mean shipping an unrelated and
     * unverified hooks rewrite.
     *
     * They stay visible as warnings, to be addressed on their own terms.
     * `rules-of-hooks` and `exhaustive-deps` keep the severity they have
     * always had.
     */
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]

export default config
