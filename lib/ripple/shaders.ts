/**
 * GLSL for the hero water surface.
 *
 * Everything here is GLSL ES 1.00. WebGL2 accepts 1.00 shaders verbatim, so a
 * single source serves both context versions — the only version-specific work
 * is JS-side (sized internal formats for the float render targets).
 *
 * ── Why the background is drawn here rather than shown through ──────────────
 *
 * The canvas is opaque, so refraction has something real to bend. That means
 * the shader has to BE the hero background, not sit on top of it: `atmosphere()`
 * reproduces, in order, the same gradients the DOM paints underneath —
 * AtmosphereLayer's base/blue fields/wash/vignette plus the hero's own two
 * radials. Get that right and the mid-hero opacity fade is a mathematical
 * no-op on the background and a pure removal of the ripples.
 *
 * ── Why there is a mid-frequency detail layer ───────────────────────────────
 *
 * Refraction is only legible if the thing being refracted has contrast at a
 * scale comparable to the displacement. The first version of this shader had
 * plate energy at ~1000px (the gradients) and 6px (a fine grain) and nothing
 * between, while the displacement was ~11px: displacing a 1000px feature by
 * 11px changes it by ~0.3/255 (invisible), and displacing 6px noise by 11px
 * simply decorrelates it (shimmer, not bending). The whole effect therefore
 * collapsed onto the additive lighting terms, which were rotationally
 * symmetric — a foggy halo with a dark centre.
 *
 * `plateDetail()` fills the 40–150px band, and its amplitude is modulated by
 * local surface disturbance so it is ~30% at rest (invisible) and full where a
 * wave is bending it. That is what makes the ripple read as liquid rather than
 * as a stain, without lifting the still hero off black.
 *
 * Coordinates: `p` is CSS convention — (0,0) top-left, (1,1) bottom-right —
 * because every gradient below was authored in CSS. GL's own bottom-up v is
 * flipped once, in the fragment entry point, and never again.
 */

/** Fullscreen triangle-pair vertex shader, shared by every pass. */
export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/**
 * The procedural background.
 *
 * Colour values are sRGB 0–1 and are composited without linearisation, which is
 * exactly what CSS does for gradients — so the numbers match the DOM stack
 * rather than merely resembling it. `transparent` in CSS is rgba(0,0,0,0) and
 * interpolates premultiplied, which for every stop below reduces to "hold the
 * colour, ramp the alpha" — hence the `mix(c, colour, alpha)` form throughout.
 */
const ATMOSPHERE = `
const vec3 BG950 = vec3(0.0078431, 0.0117647, 0.0235294); // #020306
const vec3 BG900 = vec3(0.0196078, 0.0235294, 0.0352941); // #050609
const vec3 BLUE  = vec3(0.0,       0.5372549, 1.0);       // #0089FF
const vec3 BLUE2 = vec3(0.0,       0.4313725, 0.8235294); // rgb(0,110,210)
const vec3 PALE  = vec3(0.8627451, 0.9333333, 1.0);       // rgb(220,238,255)
const vec3 DEEP  = vec3(0.0352941, 0.0470588, 0.0784314); // rgb(9,12,20)

const float PI = 3.14159265;
const float TAU = 6.2831853;

/*
 * The nine contour hairlines, rasterised from AtmosphereLayer's own path data
 * into a texture at exactly the canvas's device resolution. Rasterising the
 * real SVG path strings through Path2D is exact, and has the happy side effect
 * that the hairlines are refracted along with everything else.
 */
uniform sampler2D uContours;

/** One CSS pixel expressed in p units: (1/cssWidth, 1/cssHeight). */
uniform vec2 uPxToP;
/** Detail amplitude multiplier, live-tunable from the debug panel. */
uniform float uDetail;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/**
 * CSS radial-gradient(ellipse RX% RY% at CX% CY%, colour, transparent STOP%).
 * The ellipse radii are each relative to their OWN axis, so no aspect
 * correction belongs here — the normalised space is already the right one.
 */
float ellipseAlpha(vec2 p, vec2 centre, vec2 radii, float stop) {
  float d = length((p - centre) / radii);
  return 1.0 - clamp(d / stop, 0.0, 1.0);
}

/**
 * Structure in the 40–150px band: soft striations plus mid-scale mottling.
 *
 * Authored in CSS pixels (via uPxToP) rather than in normalised uv, so the band
 * lands at the same physical scale on a 1366 laptop and a 2560 ultrawide — the
 * displacement it has to survive is a pixel quantity, so the carrier has to be
 * one too. The low-frequency warp keeps the bands from ever reading as a
 * regular pattern.
 *
 * Returns roughly [-1.7, 1.7].
 */
float plateDetail(vec2 p) {
  vec2 px = vec2(p.x / max(uPxToP.x, 1e-6), p.y / max(uPxToP.y, 1e-6));

  float warp = vnoise(px / 420.0) - 0.5;

  // Two near-horizontal bands and one shallow diagonal, ~78–135px apart.
  float b1 = sin((px.y / 115.0 + warp * 0.9) * TAU);
  float b2 = sin((px.y / 78.0 - warp * 0.6 + 1.7) * TAU);
  float b3 = sin(((px.x * 0.35 + px.y) / 135.0 + warp * 0.5) * TAU);
  float bands = b1 * 0.5 + b2 * 0.3 + b3 * 0.34;

  // Mid-scale mottling, dominant period ~70px with a ~34px second octave.
  float mott = (vnoise(px / 70.0) - 0.5) * 1.4 + (vnoise(px / 34.0) - 0.5) * 0.7;

  return bands * 0.55 + mott;
}

/**
 * The gain argument scales everything that exists purely to be refracted. It is ~0.30
 * where the surface is still and 1.0 where a wave is passing, which is what
 * lets the hero stay minimal in a screenshot while the moving region carries
 * enough contrast to read as water.
 */
vec3 atmosphere(vec2 p, float aspect, float gain) {
  // A1 — linear-gradient(to bottom, #020306, #050609 55%, #020306)
  vec3 c = p.y < 0.55
    ? mix(BG950, BG900, p.y / 0.55)
    : mix(BG900, BG950, (p.y - 0.55) / 0.45);

  // The contour field. The texture already carries each path's own opacity and
  // the .static-contour-field 0.24 multiplier, so it composites straight over.
  vec4 lines = texture2D(uContours, clamp(p, 0.0, 1.0));
  c = mix(c, lines.rgb, lines.a);

  // A3 — upper blue field
  c = mix(c, BLUE, 0.085 * ellipseAlpha(p, vec2(0.28, 0.30), vec2(0.62, 0.40), 0.68));
  // A4 — counter field, low and right
  c = mix(c, BLUE2, 0.06 * ellipseAlpha(p, vec2(0.82, 0.62), vec2(0.48, 0.34), 0.70));

  // A5 — the 112deg depth wash. CSS angles run clockwise from "to top", so the
  // direction in screen space (y down) is (sin a, -cos a).
  vec2 dir = vec2(0.9271839, 0.3746066);
  vec2 q = vec2(p.x * aspect, p.y);
  float L = aspect * dir.x + dir.y;
  float t = 0.5 + dot(q - vec2(aspect * 0.5, 0.5), dir) / L;
  float wash = 0.0;
  vec3 washCol = BLUE;
  if (t > 0.15 && t < 0.84) {
    if (t < 0.42)      { wash = mix(0.0,   0.018, (t - 0.15) / 0.27); }
    else if (t < 0.50) { wash = mix(0.018, 0.025, (t - 0.42) / 0.08); washCol = mix(BLUE, PALE, (t - 0.42) / 0.08); }
    else if (t < 0.58) { wash = mix(0.025, 0.015, (t - 0.50) / 0.08); washCol = mix(PALE, BLUE, (t - 0.50) / 0.08); }
    else               { wash = mix(0.015, 0.0,   (t - 0.58) / 0.26); }
  }
  c = mix(c, washCol, wash);

  // A6 — vignette: transparent to 42%, rgba(2,3,6,0.6) at the ellipse edge.
  float vd = length((p - vec2(0.5)) / vec2(0.92, 0.74));
  c = mix(c, BG950, 0.6 * clamp((vd - 0.42) / 0.58, 0.0, 1.0));

  // H1 — the hero's own base radial
  c = mix(c, DEEP, 0.9 * ellipseAlpha(p, vec2(0.50, 0.54), vec2(0.85, 0.50), 0.74));
  // H2 — the hero's blue title-base light (element opacity .07 folded in)
  c = mix(c, BLUE, 0.035 * ellipseAlpha(p, vec2(0.50, 0.57), vec2(0.42, 0.13), 0.72));

  /* ---- everything below exists to be refracted ---- */

  // One broad, very soft reflected-light pool behind the middle. Gain-modulated
  // like the rest, so at rest it is ~2/255 and only becomes a readable pool
  // where a wave is bending through it.
  float pool = ellipseAlpha(p, vec2(0.50, 0.44), vec2(0.58, 0.32), 0.88);
  c = mix(c, BLUE, 0.034 * pool * gain);

  // The 40–150px carrier, faintly blue-toned.
  vec3 detailCol = mix(vec3(1.0), vec3(0.42, 0.72, 1.0), 0.5);
  c += detailCol * plateDetail(p) * 0.012 * gain * uDetail;

  // Very fine grain — texture only, far too small to carry refraction.
  float grain = vnoise(vec2(p.x * aspect, p.y) * 240.0) - 0.5;
  c += grain * 0.003 * (0.4 + 0.6 * gain);

  return max(c, 0.0);
}
`

/** Wave-equation step. r = height, g = velocity. */
export const FRAG_UPDATE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uSpeed;
uniform float uDamping;
uniform float uDrag;

void main() {
  vec4 s = texture2D(uState, vUv);
  float h = s.r;
  float v = s.g;

  float l = texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture2D(uState, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture2D(uState, vUv + vec2(0.0, uTexel.y)).r;

  // The grid is sized to the canvas aspect, so texels are isotropic and the
  // four neighbours can carry equal weight.
  float avg = (l + r + d + u) * 0.25;

  v += (avg - h) * uSpeed;
  v *= uDrag;
  h += v;
  h *= uDamping;

  // Absorbing border. CLAMP_TO_EDGE alone makes the boundary a perfect mirror,
  // which sends every ripple back inward and builds standing waves.
  vec2 e = min(vUv, 1.0 - vUv);
  float sponge = mix(0.86, 1.0, smoothstep(0.0, 0.07, min(e.x, e.y)));
  h *= sponge;
  v *= sponge;

  gl_FragColor = vec4(h, v, 0.0, 1.0);
}
`

/**
 * Seeds up to four wave packets in one pass.
 *
 * The previous version added a raised cosine — `cos(min(d,1)*PI)*0.5+0.5` — which
 * is single-signed, so it seeded one broad bump and the surface never showed
 * more than a single blurred ring. This is a damped oscillating packet instead:
 * a crest at the centre, a trough behind it and a weak secondary crest, about
 * 1.25 cycles inside the radius. `edge` takes it to exactly zero at the
 * boundary with a smooth derivative, so the impulse never introduces a
 * discontinuity the wave equation would ring on.
 */
export const FRAG_DROP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec4 uDrops[4];   // xy = centre (uv), z = strength, w = radius in texels
uniform int uDropCount;
uniform vec2 uSimSize;

void main() {
  vec4 s = texture2D(uState, vUv);
  float add = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uDropCount) break;
    vec4 drop = uDrops[i];
    // Texel space, so the packet is round on screen for any canvas aspect.
    vec2 diff = (vUv - drop.xy) * uSimSize;
    float x = length(diff) / max(drop.w, 1.0);
    if (x < 1.0) {
      float env = exp(-2.6 * x * x);
      float edge = 1.0 - smoothstep(0.70, 1.0, x);
      float wave = cos(x * 7.854);   // 2.5 * PI → crest, trough, weak secondary
      /*
       * Hold the very centre down.
       *
       * With cos() the origin is the packet's maximum, which puts the sharpest
       * curvature in a handful of texels — and since the caustic term is that
       * curvature, it rendered as a hard dark dot exactly under the cursor. The
       * leading wave should be the tallest part of a ripple, not the point of
       * impact, so the first 30% of the radius is scaled back.
       */
      float core = 0.25 + 0.75 * smoothstep(0.0, 0.30, x);
      add += drop.z * env * edge * wave * core;
    }
  }
  s.r += add;
  gl_FragColor = s;
}
`

/** Shared refraction/lighting tail used by both the simulation and analytic paths. */
const SHADE = `
uniform float uPerturbance;
uniform float uSpecular;
uniform float uRim;
uniform float uShade;
uniform float uTint;
uniform float uRippleFade;   // damps ripples into the bottom blend band
uniform float uFadeStart;
uniform float uFadeEnd;
uniform int uDebugView;      // 1 = visualise |grad| for calibration

uniform float uCaustic;

/**
 * The caustic argument is the Laplacian of the height field, scaled by uCaustic.
 *
 * This is the term that produces CONCENTRIC bands, and the reason the first two
 * attempts could not. A directional light on a radially symmetric wave gives a
 * bright half and a dark half — measured, the azimuthal mean of that is zero at
 * every radius, so it reads as a lit blob rather than as rings. The second
 * derivative does not cancel: where the surface is convex the displacement
 * field converges and light concentrates, where it is concave it spreads. That
 * alternates in sign from crest to trough all the way around the ring, which is
 * exactly the caustic banding real water shows on a dark surface — and it
 * integrates to ~0 across the disturbed area, so it leaves no patch behind.
 */
vec3 shade(vec2 p, vec2 grad, float caustic, float aspect) {
  vec3 n = normalize(vec3(-grad.x, -grad.y, 1.0));
  float slopeMag = length(n.xy);

  if (uDebugView == 1) {
    return vec3(clamp(slopeMag * 2.0, 0.0, 1.0));
  }

  /*
   * How disturbed the surface is here.
   *
   * Deliberately NOT clamp(length(n.xy) * 3.4, 0.0, 1.0), which is what the
   * first version used: that pinned to 1.0 across the whole ripple, so every
   * term driven by it became a flat-topped disc — the halo. An exponential
   * approach keeps a real gradient all the way out to the wave's edge.
   */
  float activity = 1.0 - exp(-slopeMag * 4.5);

  // Detail is revealed by disturbance: ~30% at rest, full under a wave.
  float gain = mix(0.30, 1.0, activity);

  vec3 base = atmosphere(p, aspect, gain);
  vec3 c = base;

  if (activity > 0.004) {
    /*
     * Refraction. The plate is sampled a second time at a displaced coordinate
     * and blended in proportionally to the disturbance. Below the threshold the
     * offset is sub-pixel anyway, so the branch buys a single-sample still
     * frame — and the still frame is the common case, since the loop sleeps
     * whenever the surface has settled.
     */
    vec2 offset = n.xy * uPerturbance;
    vec3 refracted = atmosphere(p + offset, aspect, gain);
    c = mix(base, refracted, clamp(activity * 1.6, 0.0, 1.0));
  }

  vec3 lightDir = normalize(vec3(-0.35, -0.55, 0.76));
  vec2 lightXY = normalize(lightDir.xy);

  vec3 lightCol = mix(vec3(0.78, 0.86, 1.0), BLUE, uTint);

  /*
   * The signed slope term — the thing that actually makes a ripple read as a
   * ripple, and the piece the first two attempts were missing.
   *
   * Every previous term (specular, rim, sheen) was non-negative, so the surface
   * could only ever get BRIGHTER: measured, the radial profile of a ripple was
   * uniformly positive and decayed monotonically, i.e. a stain rather than
   * waves. A real water surface tilts toward the light on one face of a wave
   * and away on the other, so the face turned toward the key lifts and the back
   * face drops below the plate. That signed pair is what the eye reads as
   * concentric bands, and because it averages to ~0 over the disturbed area it
   * adds no net brightness and leaves no patch behind.
   */
  float facing = dot(n.xy, lightXY);
  c += lightCol * facing * uShade;

  // The concentric caustic banding. Clamped so a very steep leading edge
  // cannot punch a hard ring; the shape is meant to read as light gathering,
  // not as an outline.
  c += lightCol * clamp(caustic, -1.0, 1.0) * uCaustic;

  // A narrow specular that hugs the steepest crest. At rest n = (0,0,1) and
  // this is 0.76^26 ≈ 0.0008, i.e. nothing.
  float spec = pow(max(dot(n, lightDir), 0.0), 26.0);
  c += lightCol * spec * uSpecular;

  // Blue enters only as a tint on light that is already there, and only on the
  // faces turned toward the key — never as an additive disc, which is why there
  // is no glowing centre.
  float lit = max(facing, 0.0);
  c += BLUE * lit * lit * uRim;

  /*
   * The bottom blend into solid black, done here rather than as a DOM overlay.
   * Measured on the real page: the shader's plate steps 0.56/255 between rows,
   * the plain DOM background steps 2.67/255, and a CSS gradient over the canvas
   * took the composite to 1.44/255 — the ramp spans only ~5/255 in blue, so an
   * 8-bit CSS gradient has nowhere to hide its quantisation. Here it can be
   * dithered.
   */
  float f = smoothstep(uFadeStart, uFadeEnd, p.y);
  c = mix(c, BG950, f);

  // Noise slightly wider than one LSB breaks the quantisation grid across the
  // ramp, faded out over the last stretch so "solid black" is exactly #020306.
  float solid = smoothstep(0.88, 0.985, p.y);
  float dith = (hash21(gl_FragCoord.xy * 0.9187 + 13.17) - 0.5) * (2.4 / 255.0);
  c += dith * (1.0 - solid);

  return c;
}
`

/** Simulation render pass: normals from the height field, then shade. */
export const FRAG_RENDER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uSlope;
${ATMOSPHERE}
${SHADE}

void main() {
  // CSS convention for everything downstream.
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);

  float hc = texture2D(uState, vUv).r;
  float hl = texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture2D(uState, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture2D(uState, vUv + vec2(0.0, uTexel.y)).r;

  // Central difference. The y term is negated because vUv is bottom-up while
  // p is top-down, and the normal must live in p's space.
  vec2 grad = vec2(hr - hl, -(hu - hd)) * uSlope * uRippleFade;

  // Discrete Laplacian on the same 5-point stencil the simulation uses. Sign is
  // orientation-free, so no y flip is needed here.
  float lap = ((hl + hr + hd + hu) * 0.25 - hc) * uRippleFade;

  gl_FragColor = vec4(shade(p, grad, lap, uAspect), 1.0);
}
`

/**
 * Analytic fallback for machines without a renderable float target.
 *
 * Each ripple is a Gaussian-windowed ring expanding from its origin. The height
 * gradient is taken analytically (h'(r) times the radial unit vector) rather
 * than by finite differences, so the pass costs one evaluation per ripple
 * instead of three, and it feeds the same `shade()` as the simulation — the two
 * paths are the same surface, differing only in how the height field arises.
 *
 * It carries its OWN slope uniform value: the analytic derivative is expressed
 * per unit of p, while the simulation's is per texel, so a single scale factor
 * cannot serve both. Sharing one was why this path rendered saturated.
 */
export const FRAG_ANALYTIC = `
precision highp float;
varying vec2 vUv;
uniform vec4 uRipples[12];   // xy = centre (p-space), z = age 0..1, w = strength
uniform int uRippleCount;
uniform float uAspect;
uniform float uSlope;
uniform float uMaxRadius;    // in height-units, reached at age 1
uniform float uRingWidth;
${ATMOSPHERE}
${SHADE}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  vec2 grad = vec2(0.0);
  float lap = 0.0;

  for (int i = 0; i < 12; i++) {
    if (i >= uRippleCount) break;
    vec4 rp = uRipples[i];

    // Height-units so the ring is circular at any canvas aspect.
    vec2 diff = vec2((p.x - rp.x) * uAspect, p.y - rp.y);
    float r = length(diff);
    if (r < 1e-5) continue;

    float age = rp.z;
    float r0 = age * uMaxRadius;
    float x = (r - r0) / uRingWidth;
    if (abs(x) > 3.0) continue;

    // h(r) = A * exp(-x^2) * cos(PI * x), with A decaying over the lifetime.
    float env = (1.0 - age) * (1.0 - age);
    float amp = rp.w * env;
    float g = exp(-x * x);
    float s = sin(PI * x);
    float wv = cos(PI * x);

    // dh/dr = A/W * (-2x*g*wv - PI*g*sin(PI*x))
    float dh = amp / uRingWidth * (-2.0 * x * g * wv - PI * g * s);
    // d2h/dr2 = A/W^2 * g * ((4x^2 - 2 - PI^2) cos(PI x) + 4 PI x sin(PI x))
    float d2h =
      amp / (uRingWidth * uRingWidth) * g *
      ((4.0 * x * x - 2.0 - PI * PI) * wv + 4.0 * PI * x * s);

    grad += (diff / r) * dh;
    // Radial Laplacian: h'' + h'/r.
    lap += d2h + dh / r;
  }

  grad *= uSlope * uRippleFade;
  // Scaled to sit in the same range as the simulation's discrete stencil, whose
  // Laplacian is per texel rather than per unit of p.
  lap *= uSlope * uRippleFade * 0.0025;
  gl_FragColor = vec4(shade(p, grad, lap, uAspect), 1.0);
}
`

/*
 * There is deliberately no separate "flat plate" program.
 *
 * Setting `uRippleFade` to 0 in either render shader zeroes the gradient, which
 * makes the normal exactly (0,0,1): activity goes to 0, the refraction branch
 * is skipped, the rim vanishes and the specular collapses to 0.76^26 ≈ 8e-4.
 * The output is `atmosphere(p, aspect, 0.30)` and nothing else — so the
 * verification freeze exercises the real render path rather than a lookalike.
 */
