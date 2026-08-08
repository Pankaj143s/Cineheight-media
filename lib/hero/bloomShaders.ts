/**
 * GLSL for the hero aurora bloom.
 *
 * GLSL ES 1.00 throughout — WebGL2 accepts 1.00 verbatim, so one source serves
 * both context versions (matching the convention in lib/ripple/shaders.ts).
 *
 * The look: a large soft blue plasma on black, with slow swirling darker bands
 * cutting across it and film grain over the whole frame.
 *
 * Three ideas do the work:
 *
 * 1. **Domain warping.** Plain fbm gives clouds; feeding fbm's own output back
 *    in as a coordinate offset (`warp`) gives the long curved filaments that
 *    read as swirl. Two rounds of it, the second weaker, is the cheapest form
 *    that still looks organic.
 *
 * 2. **A dimmed core.** The wordmark sits dead centre, so the radial mask is
 *    not a plain falloff — `ring()` multiplies the outward falloff by an
 *    inward one, putting peak brightness in an annulus AROUND the centre and
 *    holding the middle near black. That is what keeps light-grey letters
 *    legible over the brightest frames instead of fighting them.
 *
 * 3. **Grain in-shader.** A per-pixel hash, applied after the colour ramp so
 *    it dithers the gradient. This is what stops the wide, low-contrast falloff
 *    from banding into visible steps on 8-bit displays — the global
 *    `.grain-overlay` composites on top of it and is a separate, finer effect.
 *
 * 4. **A deliberately sharp pointer.** The cursor terms are singular by design
 *    — a normalised direction plus an exponential falloff, which paints a tight
 *    radial starburst on the pointer. A smooth, wide alternative was tried and
 *    rejected as too soft, so the point is the art direction. See `main()`.
 *
 * Coordinates: `p` is aspect-corrected and centred, so (0,0) is the middle of
 * the viewport and distances are circular regardless of window shape.
 */

/*
 * NOTE: the GLSL below lives in template literals, so NO BACKTICKS may appear
 * inside them — not even in comments. A stray backtick terminates the string
 * and the file fails to parse with a misleading "expected a semicolon" at the
 * comment line. Refer to identifiers in shader comments unquoted.
 */

/** Fullscreen triangle vertex shader. Matches lib/ripple/gl.ts's createQuad. */
export const BLOOM_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const BLOOM_FRAG = `
precision highp float;

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
/** Pointer in UV space, already damped on the JS side. */
uniform vec2  uPointer;
/** 0 when the pointer has never been seen or has left; 1 when active. */
uniform float uPointerStrength;
/** Hero scroll progress 0-1. */
uniform float uProgress;
/** Handshake contact ring, 1 -> 0 over its lifetime. */
uniform float uPulse;
/** Page-wide recede: 0 over the hero, ramping to 1 once the hero has
    scrolled past — the single authority for dimming the field below the
    hero (see main()). */
uniform float uDim;

// Brand blues. sRGB 0-1, composited without linearisation to match CSS.
const vec3 BLUE_500 = vec3(0.0, 0.5372549, 1.0);       // #0089ff
const vec3 BLUE_700 = vec3(0.0, 0.3411765, 0.6392157); // #0057a3
const vec3 PALE     = vec3(0.6862745, 0.8509804, 1.0); // lifts the hottest core

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/** Value noise with quintic smoothing — smoother derivatives than cubic,
    which matters because this gets warped by its own output below. */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = p * 2.02 + vec2(17.3, 9.1);
    amp *= 0.5;
  }
  return v;
}

/** fbm fed its own output as a coordinate offset — the swirl filaments. */
float warp(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.10)), fbm(p + vec2(5.2, 1.3) - t * 0.08));
  vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 0.06),
                fbm(p + 3.4 * q + vec2(8.3, 2.8) - t * 0.05));
  return fbm(p + 2.2 * r);
}

/**
 * Annulus mask: bright ring, dark centre, dark outside.
 * The inner term holds the middle down so the wordmark stays readable.
 */
float ring(float d) {
  float outer = 1.0 - smoothstep(0.10, 0.92, d);
  float inner = smoothstep(0.0, 0.42, d);
  return outer * mix(0.30, 1.0, inner);
}

void main() {
  // Aspect-corrected, centred. Circles stay circular at any window shape.
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float t = uTime * 0.06;

  /*
   * Pointer response — the sharp point is ART-DIRECTED, not a bug.
   *
   * normalize(p - ptr) is undefined AT the cursor, so its direction flips
   * across that pixel and the exp() falloff spikes there. Together they paint
   * a tight radial starburst converging on the cursor. That is the intended
   * look: it was once replaced with a wide gaussian glow to remove the
   * singularity, and the softer version was rejected. Do not "fix" it.
   *
   * The + 1e-5 is the one guard that stays: it keeps normalize() from
   * producing NaN exactly on the cursor pixel, which would punch a black hole
   * through the middle of the effect.
   */
  vec2 ptr = (uPointer - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float ptrDist = length(p - ptr);
  float ptrFall = exp(-ptrDist * 3.2) * uPointerStrength;
  vec2 pw = p + normalize(p - ptr + 1e-5) * ptrFall * 0.10;

  // Slow rotation so the swirl never sits still.
  float a = t * 0.22;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  float f = warp(rot * pw * 1.35 + vec2(0.0, t * 0.15), t);

  float d = length(pw);
  float mask = ring(d);

  // Contact ring from the handshake.
  float pulseRing = 0.0;
  if (uPulse > 0.001) {
    float travelled = (1.0 - uPulse) * 0.95;
    pulseRing = smoothstep(0.10, 0.0, abs(d - travelled)) * uPulse * 0.5;
  }

  // Energy: the warped field carves the darker bands out of the bloom.
  // Page-wide recede once past the hero — the ambient field dims harder than
  // the pointer response, so the mouse interaction stays visible against the
  // darker field even deep into the page (net ≈35% overall at uDim = 1).
  float dimBase = mix(1.0, 0.30, uDim);
  float dimPtr  = mix(1.0, 0.55, uDim);
  float energy = mask * (0.35 + 0.85 * f) * dimBase + ptrFall * 0.28 * dimPtr + pulseRing * dimBase;
  energy = max(energy, 0.0);

  vec3 col = mix(BLUE_700, BLUE_500, smoothstep(0.10, 0.55, energy));
  col = mix(col, PALE, smoothstep(0.62, 1.05, energy) * 0.55);
  col *= energy * 1.25;

  // Grain last, so it dithers the ramp and kills banding on the wide falloff.
  float g = hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
  col += g * 0.035;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`
