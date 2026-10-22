import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";

/**
 * Ink-bleed reveal (DESIGN.md §4.1). One fullscreen triangle; the fragment shader cover-fits two photos,
 * keeps the winter one cool/desaturated and reveals the green one through a domain-warped fbm threshold
 * (uProgress 0→1) with a soft edge and a dark fibrous "ink fringe". The noise drifts with uTime.
 */

export interface InkBleedSource {
  url: string;
  /** Focal point (0–1, origin top-left) that must stay in frame when cropping — the peak. */
  focal: [number, number];
}
export interface InkBleedOptions { winter: InkBleedSource; green: InkBleedSource; onReady?: () => void }
export interface InkBleed {
  setProgress(p: number): void;
  setVisible(v: boolean): void;
  destroy(): void;
}

const VERT = /* glsl */ `#version 300 es
in vec2 position;
out vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uWinter;
uniform sampler2D uGreen;
uniform vec2 uRes;
uniform vec2 uImgAspect;   // x: winter, y: green
uniform vec2 uFocalW;
uniform vec2 uFocalG;
uniform float uProgress;
uniform float uTime;
uniform float uScale;      // 1.08 -> 1.0 over the sequence

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

// cover-fit: uv (origin top-left) into an image of aspect ia, window centred on the focal point, clamped inside the image
vec2 cover(vec2 st, float ia, vec2 focal, float zoom) {
  float ca = uRes.x / uRes.y;
  vec2 vis = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  vis /= zoom;
  vec2 c = clamp(focal, vis * 0.5, 1.0 - vis * 0.5);
  return c + (st - 0.5) * vis;
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  float t = uTime * 0.05;

  float zoomW = uScale;
  float zoomG = 1.0 + (uScale - 1.0) * 1.35; // green drifts a touch more: subtle depth
  vec3 w = texture(uWinter, cover(st, uImgAspect.x, uFocalW, zoomW)).rgb;
  vec3 g = texture(uGreen, cover(st, uImgAspect.y, uFocalG, zoomG)).rgb;

  // Winter: cool, mostly desaturated, slightly lifted like fog-light
  float lw = luma(w);
  w = mix(vec3(lw), w, 0.12) * vec3(0.95, 1.0, 1.06);
  w = mix(w, vec3(0.78, 0.82, 0.86), 0.07);

  // Ink field: domain-warped fbm biased by distance from a few "wet" sources (pond / lower frame)
  vec2 q = st * vec2(uRes.x / uRes.y, 1.0);
  vec2 warp = vec2(fbm(q * 1.6 + vec2(0.0, t * 3.0)), fbm(q * 1.6 + vec2(5.2, 1.3) - t * 2.0));
  vec2 p = q * 2.4 + 3.5 * (warp - 0.5);
  float n = fbm(p + t * vec2(2.0, -1.4));
  float n2 = fbm(p * 2.7 - t * 3.1);
  float src = min(length((q - vec2(0.38 * uRes.x / uRes.y, 1.12)) * vec2(0.8, 1.0)),
                  length((q - vec2(0.95 * uRes.x / uRes.y, 1.0)) * vec2(0.9, 1.0)) * 1.15);
  float field = 0.58 * n + 0.14 * n2 + 0.33 * clamp(src / 1.25, 0.0, 1.4);
  // washi fibre: fine high-frequency grain on the boundary
  float fibre = noise(st * vec2(uRes.x, uRes.y) * 0.9) * 0.5 + noise(st * uRes * 0.22) * 0.5;
  field += (fibre - 0.5) * 0.045;

  float pr = uProgress;
  float thr = mix(-0.1, 0.98, pr * pr * (3.0 - 2.0 * pr));
  float edge = 0.02 + 0.03 * n2;                  // feathery, uneven
  float reveal = smoothstep(field - edge, field + edge, thr);
  float lag = smoothstep(field - 0.04, field + 0.22, thr - 0.09);   // colour saturates after the ink arrives
  float band = exp(-pow((thr - field) / (edge * 1.9 + 0.012), 2.0)); // the wet boundary
  float outer = exp(-pow((thr - field - edge * 1.0) / (edge * 2.6 + 0.03), 2.0));

  float lg = luma(g);
  vec3 gMuted = mix(vec3(lg), g, 0.45) * vec3(0.94, 0.98, 0.93);
  vec3 gFull = mix(gMuted, g * 1.04, lag);

  vec3 col = mix(w, gFull, reveal);

  // ink fringe: warm-dark sumi tone pooled at the boundary, thicker on the dry side, with fibre breakup
  vec3 inkTone = vec3(0.05, 0.065, 0.075);
  float fringe = (band * 0.5 + outer * 0.1) * (0.65 + 0.7 * fibre);
  col = mix(col, inkTone, clamp(fringe, 0.0, 0.6) * smoothstep(0.0, 0.04, pr) * (1.0 - smoothstep(0.93, 1.0, pr)));

  // vignette + faint grain
  vec2 vv = vUv - 0.5;
  col *= 1.0 - dot(vv, vv) * 0.4;
  col += (hash(st * uRes + fract(uTime)) - 0.5) * 0.018;

  outColor = vec4(col, 1.0);
}`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

/** Returns null when WebGL2 is unavailable (caller shows the CSS fallback). */
export function createInkBleed(canvas: HTMLCanvasElement, opts: InkBleedOptions): InkBleed | null {
  let renderer: Renderer;
  try {
    renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: false, antialias: false, webgl: 2 });
  } catch {
    return null;
  }
  const gl = renderer.gl;
  if (!gl || typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) return null;

  const geometry = new Triangle(gl);
  const texW = new Texture(gl, { generateMipmaps: true, flipY: false, minFilter: gl.LINEAR_MIPMAP_LINEAR });
  const texG = new Texture(gl, { generateMipmaps: true, flipY: false, minFilter: gl.LINEAR_MIPMAP_LINEAR });
  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uWinter: { value: texW },
      uGreen: { value: texG },
      uRes: { value: [1, 1] },
      uImgAspect: { value: [4 / 3, 3 / 2] },
      uFocalW: { value: opts.winter.focal },
      uFocalG: { value: opts.green.focal },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uScale: { value: 1.08 },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  let target = 0;
  let current = 0;
  let visible = true;
  let ready = false;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let destroyed = false;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h);
    canvas.style.width = "100%"; // OGL writes px sizes inline; keep CSS in charge so ResizeObserver can't feed back
    canvas.style.height = "100%";
    program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  };

  const frame = (now: number) => {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    current += (target - current) * Math.min(1, dt * 9); // light extra damping on top of Lenis
    if (Math.abs(target - current) < 0.0004) current = target;
    program.uniforms.uProgress.value = current;
    program.uniforms.uScale.value = 1.08 - 0.08 * current;
    program.uniforms.uTime.value = time;
    renderer.render({ scene: mesh });
    schedule();
  };
  const schedule = () => {
    if (!raf && visible && ready && !document.hidden && !destroyed) raf = requestAnimationFrame(frame);
  };
  const onVis = () => { last = performance.now(); schedule(); };
  document.addEventListener("visibilitychange", onVis);

  const ro = new ResizeObserver(() => { resize(); if (ready) renderer.render({ scene: mesh }); });
  ro.observe(canvas);
  resize();

  Promise.all([loadImage(opts.winter.url), loadImage(opts.green.url)])
    .then(([a, b]) => {
      if (destroyed) return;
      texW.image = a;
      texG.image = b;
      program.uniforms.uImgAspect.value = [a.naturalWidth / a.naturalHeight, b.naturalWidth / b.naturalHeight];
      ready = true;
      last = performance.now();
      schedule();
      opts.onReady?.();
    })
    .catch(() => { /* leave the canvas blank; CSS poster behind it remains visible */ });

  return {
    setProgress(p) { target = Math.min(1, Math.max(0, p)); schedule(); },
    setVisible(v) { visible = v; if (v) { last = performance.now(); schedule(); } },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      gl.deleteTexture(texW.texture);
      gl.deleteTexture(texG.texture);
      gl.deleteProgram(program.program);
    },
  };
}
