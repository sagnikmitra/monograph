// ═══════════════════════════════════════════════════════════════════════════
// MANIFOLD GALLERY · six canonical 3D objects from mathematical physics
// Each panel is its own row at full width, with a math caption + plate.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import {
  C, FONT_MATH, FONT_DISPLAY, FONT_MONO, M, Eq, orbitCamera, Figure,
} from "./shared-kernel-ui.jsx";
import { useResponsive } from "./responsive";
import LazyMount from "./LazyMount";

// ───────────────────────────────────────────────────────────────────────────
// Local helpers
// ───────────────────────────────────────────────────────────────────────────
function GalleryFrame({ rank, eyebrow, title, formula, summary, tone, children, controls, explain }) {
  const responsive = useResponsive();
  return (
    <div style={{
      background: C.bgDeep,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${tone}`,
      borderRadius: 4,
      overflow: "hidden",
      boxShadow: `0 8px 32px ${tone}14, inset 0 1px 0 ${tone}22`,
      marginBottom: 22,
    }}>
      <div style={{
        padding: responsive.isMobile ? "14px 16px" : "18px 22px",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.panelAlt}ee 0%, ${C.panelAlt}99 100%)`,
        display: "flex",
        gap: responsive.isMobile ? 12 : 18,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 26 : 36, color: tone,
          lineHeight: 1, minWidth: responsive.isMobile ? 30 : 44,
          textShadow: `0 0 20px ${tone}66`,
        }}>{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 9.5 : 10.5,
            color: tone, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 4,
          }}>{eyebrow}</div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: responsive.isMobile ? 19 : 24,
            color: C.ink, lineHeight: 1.2, marginBottom: 8, fontWeight: 500,
          }}>{title}</div>
          {formula && (
            <div style={{
              margin: "8px 0 10px",
              padding: "8px 12px",
              background: C.bg,
              borderLeft: `2px solid ${tone}`,
              fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 13 : 15,
              color: C.inkBr, overflowX: "auto",
            }}>{formula}</div>
          )}
          <div style={{
            fontFamily: FONT_MATH, fontStyle: "italic",
            fontSize: responsive.isMobile ? 13.5 : 15, color: C.inkDim, lineHeight: 1.55,
          }}>{summary}</div>
        </div>
      </div>
      {children}
      {controls}
      {explain}
    </div>
  );
}

function Explainer({ tone, items }) {
  const responsive = useResponsive();
  return (
    <div style={{
      padding: responsive.isMobile ? "14px 16px" : "18px 22px",
      borderTop: `1px solid ${C.border}`,
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 100%)`,
    }}>
      <div style={{
        fontFamily: FONT_MONO, fontSize: 10, color: tone,
        letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 12,
      }}>Detailed walkthrough</div>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: responsive.isMobile ? "1fr" : "180px 1fr",
            gap: responsive.isMobile ? 4 : 16,
            padding: "10px 0", borderTop: i === 0 ? "none" : `1px dashed ${C.border}`,
          }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 10.5, color: tone,
              letterSpacing: 1.6, textTransform: "uppercase",
            }}>{it.head}</div>
            <div style={{
              fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 13.5 : 14.5,
              color: C.inkBr, lineHeight: 1.6,
            }}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function Slider({ label, value, min, max, step = 0.01, onChange, tone, valueText }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
      padding: "10px 14px", background: C.panel, borderTop: `1px solid ${C.border}`,
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 1.6, textTransform: "uppercase" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={e => onChange(+e.target.value)}
             style={{ flex: 1, maxWidth: 320, accentColor: tone }} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: tone, minWidth: 60, textAlign: "right" }}>{valueText}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. KLEIN BOTTLE — non-orientable 2-manifold immersed in ℝ³
// ═══════════════════════════════════════════════════════════════════════════
function KleinBottle() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [twist, setTwist] = useState(1.0);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 60 : 90;
    const M2 = responsive.isMobile ? 30 : 50;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const u = (i / N) * 2 * Math.PI;
      for (let j = 0; j <= M2; j++) {
        const v = (j / M2) * 2 * Math.PI;
        // Standard Lawson immersion of the Klein bottle in ℝ³
        const cu = Math.cos(u), su = Math.sin(u);
        const r = 4 * (1 - cu / 2);
        let X, Y, Z;
        if (u < Math.PI) {
          X = 6 * cu * (1 + su) + r * cu * Math.cos(v);
          Y = 16 * su + r * su * Math.cos(v);
        } else {
          X = 6 * cu * (1 + su) + r * Math.cos(v + Math.PI);
          Y = 16 * su;
        }
        Z = r * Math.sin(v) * twist;
        xr.push(X * 0.05); yr.push(Y * 0.05); zr.push(Z * 0.05);
        cr.push(Math.sin(2 * u) * Math.cos(v));
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.indigo], [0.5, C.gold], [1, C.crimson]],
      showscale: false, opacity: 0.94,
      lighting: { ambient: 0.55, diffuse: 0.9, roughness: 0.5, specular: 0.6 },
      contours: { x: { show: true, color: `${C.bgDeep}88`, width: 1 } },
      hovertemplate: "Klein bottle · χ = 0<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.85, 1.7, 0.6),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [twist, responsive.isMobile]);
  return (
    <GalleryFrame
      rank="IV" tone={C.crimson}
      eyebrow="Topology · non-orientable surface"
      title="Klein bottle 𝒦"
      formula={<M>{"\\mathcal K = \\mathbb{R}^2 / \\Gamma, \\quad \\Gamma = \\langle (x,y) \\mapsto (x+1, y), \\, (x,y) \\mapsto (1-x, y+1) \\rangle"}</M>}
      summary={<>A closed non-orientable surface with Euler characteristic <M>{"\\chi = 0"}</M> and first homology <M>{"H_1(\\mathcal K; \\mathbb Z) = \\mathbb Z \\oplus \\mathbb Z/2"}</M>. It admits no embedding in <M>{"\\mathbb R^3"}</M> — only an immersion with self-intersection (Lawson 1970). Models gauge bundles over Möbius-like base spaces and appears in the worldsheet construction of the type-I superstring after orientifold projection.</>}
      controls={<Slider label="immersion twist" value={twist} min={0.4} max={1.6} onChange={setTwist} tone={C.crimson} valueText={twist.toFixed(2)} />}
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <>Take the plane <M>{"\\mathbb R^2"}</M> and identify it under two operations: a pure translation <M>{"(x,y) \\mapsto (x+1, y)"}</M> and a glide-reflection <M>{"(x,y) \\mapsto (1-x, y+1)"}</M>. The quotient <M>{"\\mathbb R^2/\\Gamma"}</M> is closed but non-orientable — walking around one of the loops returns you with reversed handedness.</> },
        { head: "What you are seeing", body: <>The Lawson immersion of <M>{"\\mathcal K"}</M> in <M>{"\\mathbb R^3"}</M>. The bottle appears to "pass through itself" — that self-intersection is forced because <M>{"\\mathcal K"}</M> cannot be embedded in 3-space, only immersed. Increasing the twist slider exaggerates how the inside connects to the outside; decreasing it flattens the surface toward a Möbius-like ribbon.</> },
        { head: "Why this matters", body: <>Non-orientable surfaces underpin orientifold constructions in string theory: the type-I superstring is type-IIB modulo worldsheet parity, producing unoriented strings whose vacuum amplitude includes a Klein-bottle diagram. They are also the simplest examples of bundles where the structure group is disconnected — useful as a "minimal" testing ground for global anomalies in gauge theory.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. HYPERBOLIC PSEUDOSPHERE — constant negative curvature K = −1
// ═══════════════════════════════════════════════════════════════════════════
function Pseudosphere() {
  const responsive = useResponsive();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 50 : 80;
    const M2 = responsive.isMobile ? 50 : 80;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const u = (i / N) * 2 * Math.PI;
      for (let j = 0; j <= M2; j++) {
        const v = -2.2 + (j / M2) * 4.4;
        // Tractrix of revolution (Beltrami pseudosphere)
        const sech = 1 / Math.cosh(v);
        const X = sech * Math.cos(u);
        const Y = sech * Math.sin(u);
        const Z = v - Math.tanh(v);
        xr.push(X); yr.push(Y); zr.push(Z * 0.4);
        cr.push(Math.tanh(v));
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.teal], [0.5, C.gold], [1, C.crimson]],
      showscale: false, opacity: 0.95,
      lighting: { ambient: 0.5, diffuse: 0.95, roughness: 0.45, specular: 0.55 },
      contours: { z: { show: true, color: `${C.bgDeep}aa`, width: 1 } },
      hovertemplate: "K = −1 · Beltrami pseudosphere<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "manual", aspectratio: { x: 1, y: 1, z: 1.2 },
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.6, 1.55, 0.35),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [responsive.isMobile]);
  return (
    <GalleryFrame
      rank="V" tone={C.teal}
      eyebrow="Geometry · constant negative curvature"
      title="Beltrami pseudosphere 𝓟"
      formula={<M>{"ds^2 = \\mathrm{sech}^2(v)\\, du^2 + (\\tanh^2 v)\\, dv^2, \\qquad K = -1"}</M>}
      summary={<>Surface of revolution generated by rotating a tractrix about its asymptote. The first complete model of <M>{"\\mathbb H^2"}</M> realised in <M>{"\\mathbb R^3"}</M> (Beltrami 1868), forced to be incomplete by Hilbert&apos;s theorem (1901): no smooth complete <M>{"K=-1"}</M> surface immerses in <M>{"\\mathbb R^3"}</M>. Its universal cover is the hyperbolic plane, the kinematic arena of special relativity in rapidity coordinates.</>}
      explain={<Explainer tone={C.teal} items={[
        { head: "What the equation says", body: <>The line element gives the metric in geodesic coordinates: distances along <M>{"u"}</M> shrink exponentially with <M>{"v"}</M> (the <M>{"\\mathrm{sech}^2 v"}</M> factor) while the <M>{"v"}</M>-direction has its own warping. Computing the Gaussian curvature <M>{"K = -\\frac{1}{\\sqrt g}\\partial_v(\\partial_v\\sqrt g/\\sqrt g)"}</M> from this metric gives the constant <M>{"K = -1"}</M> — the surface is everywhere "saddle-shaped" with the same intrinsic curvature.</> },
        { head: "What you are seeing", body: <>The tractrix-of-revolution: a horn that flares as <M>{"v \\to 0"}</M> and tapers asymptotically to a cusp as <M>{"|v| \\to \\infty"}</M>. Geodesics on the surface project to straight lines on the upper half-plane <M>{"\\mathbb H^2"}</M> in the natural coordinates — the hyperbolic plane has been "rolled up" into 3D.</> },
        { head: "Why this matters", body: <>Hyperbolic geometry is the local model for negatively curved spacetimes (open FRW universes, anti-de Sitter slices), the rapidity space of special relativity, and the natural arena of the AdS/CFT boundary. The fact that <em>no</em> complete <M>{"K = -1"}</M> surface fits in <M>{"\\mathbb R^3"}</M> (Hilbert) is why we have to work intrinsically — and why hyperbolic 3-manifolds (Thurston) are so geometrically rich.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SCHWARZSCHILD EMBEDDING — Flamm's paraboloid
// ═══════════════════════════════════════════════════════════════════════════
function FlammParaboloid() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [rs, setRs] = useState(1.0); // Schwarzschild radius (in geometric units)
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 60 : 90;
    const M2 = responsive.isMobile ? 50 : 80;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const r = rs + (i / N) * 4 * rs;
      for (let j = 0; j <= M2; j++) {
        const phi = (j / M2) * 2 * Math.PI;
        // Embedding: w(r) = 2 sqrt(rs (r - rs))
        const w = 2 * Math.sqrt(rs * (r - rs));
        xr.push(r * Math.cos(phi) * 0.4);
        yr.push(r * Math.sin(phi) * 0.4);
        zr.push(-w * 0.4);
        cr.push(rs / r);
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.indigo], [0.5, C.gold], [1, C.crimson]],
      showscale: false, opacity: 0.93,
      lighting: { ambient: 0.6, diffuse: 0.85, roughness: 0.5, specular: 0.5 },
      contours: { z: { show: true, color: `${C.bgDeep}aa`, width: 1, start: -3, end: 0, size: 0.3 } },
      hovertemplate: "Flamm paraboloid · r_s = " + rs.toFixed(2) + "<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "manual", aspectratio: { x: 1, y: 1, z: 0.95 },
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.7, 1.75, 0.5),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [rs, responsive.isMobile]);
  return (
    <GalleryFrame
      rank="VI" tone={C.gold}
      eyebrow="General relativity · embedding diagram"
      title="Flamm&apos;s paraboloid for Schwarzschild geometry"
      formula={<M>{"ds^2 = \\Big(1 - \\tfrac{r_s}{r}\\Big)^{-1} dr^2 + r^2\\, d\\phi^2, \\qquad w(r) = 2\\sqrt{r_s\\,(r - r_s)}"}</M>}
      summary={<>The equatorial slice <M>{"t = \\text{const}, \\, \\theta = \\pi/2"}</M> of a Schwarzschild black hole, isometrically embedded in flat <M>{"\\mathbb R^3"}</M> (Flamm 1916). The throat sits at <M>{"r = r_s = 2GM/c^2"}</M>; the paraboloid pinches off there and is geodesically incomplete — the singular boundary of the exterior. Doubled across the throat, it is the spatial slice of the maximally extended Kruskal manifold, the prototype Einstein–Rosen bridge.</>}
      controls={<Slider label="Schwarzschild radius r_s" value={rs} min={0.4} max={2.0} step={0.05} onChange={setRs} tone={C.gold} valueText={rs.toFixed(2)} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>This is the spatial part of the Schwarzschild metric in the equatorial plane (<M>{"t = "}</M> const, <M>{"\\theta = \\pi/2"}</M>). The radial coefficient <M>{"(1 - r_s/r)^{-1}"}</M> diverges at <M>{"r = r_s"}</M>: distances stretch as you approach the horizon. Flamm asked which surface in flat <M>{"\\mathbb R^3"}</M> has the same induced metric and got the paraboloid <M>{"w(r) = 2\\sqrt{r_s(r-r_s)}"}</M>.</> },
        { head: "What you are seeing", body: <>The throat of a black hole, with the horizon as the rim where the surface pinches off. Outside the horizon (the flared region) you can move freely. The rim is the boundary of the exterior chart — beyond it, <M>{"r"}</M> ceases to be a spatial coordinate. Sliding <M>{"r_s"}</M> simply rescales the throat.</> },
        { head: "Why this matters", body: <>This is the prototype of a non-trivial spacetime in general relativity. Doubled across the throat, you get the Einstein–Rosen bridge — two asymptotic regions joined by a wormhole. Quantum-mechanically the throat is the seat of Hawking radiation and the holographic screen that encodes the black-hole entropy <M>{"S = A/(4 G\\hbar)"}</M> — the most precise quantitative success of any quantum-gravity proposal.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. HOPF FIBRATION — S³ → S² with circle fibres
// ═══════════════════════════════════════════════════════════════════════════
function HopfFibration() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [nFib, setNFib] = useState(28);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // Each Hopf fibre is a circle in S^3, stereographically projected to a torus knot in R^3
    // Choose fibre points uniformly on S^2 base via Fibonacci sphere
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < nFib; k++) {
      const y = 1 - (k / (nFib - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * k;
      const bx = Math.cos(theta) * radius;
      const by = y;
      const bz = Math.sin(theta) * radius;
      // Lift this base point to a circle in S^3, then stereographically project
      // Parameterise the fibre over (bx, by, bz) using standard formulas
      const a = Math.sqrt((1 + by) / 2);
      const b = bx / (2 * a);
      const c = bz / (2 * a);
      const xs = [], ys = [], zs = [];
      const NP = 80;
      for (let p = 0; p <= NP; p++) {
        const t = (p / NP) * 2 * Math.PI;
        const q0 = a * Math.cos(t);
        const q1 = a * Math.sin(t);
        const q2 = b * Math.cos(t) - c * Math.sin(t);
        const q3 = b * Math.sin(t) + c * Math.cos(t);
        // Stereographic projection from S^3 (north pole q3=1) to R^3
        const denom = 1 - q3 + 1e-6;
        xs.push(q0 / denom);
        ys.push(q1 / denom);
        zs.push(q2 / denom);
      }
      // Colour by base-sphere position
      const hue = (k / nFib);
      const col = hue < 0.33
        ? C.crimson
        : hue < 0.66 ? C.gold : C.teal;
      traces.push({
        type: "scatter3d", mode: "lines",
        x: xs, y: ys, z: zs,
        line: { color: col, width: 3 },
        opacity: 0.78,
        hoverinfo: "skip",
      });
    }
    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [-3, 3] },
        yaxis: { visible: false, range: [-3, 3] },
        zaxis: { visible: false, range: [-3, 3] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.5, 1.75, 0.4),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [nFib, responsive.isMobile]);
  return (
    <GalleryFrame
      rank="VII" tone={C.indigo}
      eyebrow="Fibre bundle · π₃(S²) = ℤ"
      title="Hopf fibration S³ → S²"
      formula={<M>{"h: S^3 \\to S^2, \\quad (z_1, z_2) \\mapsto (2 z_1 \\bar z_2,\\; |z_1|^2 - |z_2|^2), \\quad h^{-1}(p) \\cong S^1"}</M>}
      summary={<>The first non-trivial homotopy class of maps between spheres (Hopf 1931): every fibre over a point of <M>{"S^2"}</M> is a circle, and any two distinct fibres link with linking number <M>{"+1"}</M>. Stereographically projected to <M>{"\\mathbb R^3"}</M>, the linked circles fill space as Villarceau circles on nested tori. Carries the magnetic-monopole bundle, the spin connection of a single qubit on the Bloch sphere, and the fundamental instanton of <M>{"SU(2)"}</M> Yang–Mills.</>}
      controls={<Slider label="number of fibres shown" value={nFib} min={8} max={80} step={1} onChange={setNFib} tone={C.indigo} valueText={String(nFib)} />}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>The Hopf map sends a unit pair <M>{"(z_1, z_2) \\in \\mathbb C^2"}</M> with <M>{"|z_1|^2 + |z_2|^2 = 1"}</M> (so the pair lies on <M>{"S^3"}</M>) to the point <M>{"(2 z_1 \\bar z_2, |z_1|^2 - |z_2|^2)"}</M> on <M>{"S^2"}</M>. The pre-image of any point on <M>{"S^2"}</M> is a circle <M>{"S^1"}</M> — the Hopf fibre — and any two distinct fibres are linked exactly once.</> },
        { head: "What you are seeing", body: <>Each curve in 3D is the stereographic projection of one Hopf fibre. They are the Villarceau circles of nested tori: every torus <M>{"|z_1| = "}</M> const is foliated by such circles. Increasing the slider draws more fibres — the entire <M>{"S^3"}</M> is the union of all of them.</> },
        { head: "Why this matters", body: <>The Hopf bundle is the magnetic-monopole bundle (Wu–Yang), the Berry-phase fibration over the Bloch sphere of a single qubit, and the <M>{"k = 1"}</M> instanton of <M>{"SU(2)"}</M> Yang–Mills. The first non-zero higher homotopy group <M>{"\\pi_3(S^2) = \\mathbb Z"}</M> is generated precisely by this map — every continuous map <M>{"S^3 \\to S^2"}</M> can be deformed to a multiple of the Hopf class.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ADS HYPERBOLOID — anti-de Sitter spacetime in R^{2,1} → embed slice
// ═══════════════════════════════════════════════════════════════════════════
function AdSHyperboloid() {
  const responsive = useResponsive();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 60 : 100;
    const M2 = responsive.isMobile ? 50 : 80;
    const xs = [], ys = [], zs = [], cs = [];
    // Hyperboloid:  -X0² - X1² + X2² + X3² = -L²,  parametrise (ρ, τ)
    const L = 1.0;
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const tau = -2.4 + (i / N) * 4.8; // global time
      for (let j = 0; j <= M2; j++) {
        const phi = (j / M2) * 2 * Math.PI;
        const rho = 1.4;
        const X0 = L * Math.cosh(rho) * Math.cos(tau);
        const X1 = L * Math.cosh(rho) * Math.sin(tau);
        const X2 = L * Math.sinh(rho) * Math.cos(phi);
        const X3 = L * Math.sinh(rho) * Math.sin(phi);
        // Embed (X0, X1, X2) into R^3 to visualise
        xr.push(X2 * 0.55);
        yr.push(X3 * 0.55);
        zr.push(X1 * 0.45);
        cr.push(Math.cos(tau));
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.crimson], [0.5, C.gold], [1, C.teal]],
      showscale: false, opacity: 0.9,
      lighting: { ambient: 0.55, diffuse: 0.85, roughness: 0.55, specular: 0.5 },
      contours: { x: { show: true, color: `${C.bgDeep}aa`, width: 1 } },
      hovertemplate: "AdS₃ hyperboloid<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "manual", aspectratio: { x: 1, y: 1, z: 1.4 },
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.55, 1.6, 0.25),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [responsive.isMobile]);
  return (
    <GalleryFrame
      rank="VIII" tone={C.crimson}
      eyebrow="String theory · holography"
      title="Anti-de Sitter spacetime AdS₃"
      formula={<M>{"-X_0^2 - X_1^2 + X_2^2 + X_3^2 = -L^2 \\;\\subset\\; \\mathbb R^{2,2}, \\qquad ds^2 = L^2(-\\cosh^2\\!\\rho\\, d\\tau^2 + d\\rho^2 + \\sinh^2\\!\\rho\\, d\\phi^2)"}</M>}
      summary={<>The maximally symmetric Lorentzian solution of <M>{"R_{\\mu\\nu} = -\\frac{2}{L^2} g_{\\mu\\nu}"}</M>. Its boundary is a conformal cylinder on which a 2D CFT lives (Maldacena 1997): the AdS/CFT correspondence states that quantum gravity in the bulk is exactly dual to a non-gravitational gauge theory on the boundary. The closed timelike loop <M>{"\\tau \\sim \\tau + 2\\pi"}</M> visible here is unwrapped on the universal cover.</>}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>AdS<sub>3</sub> is the Lorentzian signature analogue of the hyperboloid: a hypersurface in flat <M>{"\\mathbb R^{2,2}"}</M> (signature <M>{"(-,-,+,+)"}</M>) defined by the negative-norm constraint. Solving the constraint with global coordinates <M>{"(\\tau, \\rho, \\phi)"}</M> gives the metric on the right; <M>{"\\rho \\to \\infty"}</M> is the conformal boundary.</> },
        { head: "What you are seeing", body: <>The hyperboloid of one sheet, drawn with the <M>{"\\tau"}</M>-direction (timelike) wrapped around the symmetry axis. The cylindrical sweep visualises constant-<M>{"\\rho"}</M> shells; the boundary at infinity is the asymptotic cylinder <M>{"\\mathbb R \\times S^1"}</M>. We unwrap closed timelike loops by passing to the universal cover, the standard physical choice.</> },
        { head: "Why this matters", body: <>AdS/CFT (Maldacena 1997) is the most concrete realisation of the holographic principle: gravity in <M>{"d+1"}</M> dimensions is exactly equivalent to a conformal field theory in <M>{"d"}</M> dimensions. AdS<sub>3</sub>/CFT<sub>2</sub> in particular is exactly solvable enough to compute Bekenstein–Hawking entropy from the Cardy formula, derive Hawking-radiation spectra, and build "it from qubit" models of quantum gravity.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. RIEMANN SURFACE FOR √z — branched double cover of ℂ
// ═══════════════════════════════════════════════════════════════════════════
function RiemannSurface() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [genus, setGenus] = useState(2);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 80 : 120;
    const M2 = responsive.isMobile ? 80 : 120;
    const xs1 = [], ys1 = [], zs1 = [], cs1 = [];
    const xs2 = [], ys2 = [], zs2 = [], cs2 = [];
    // Re/Im of f(z) = z^(1/g) over z = r e^{iθ}
    const g = genus;
    for (let i = 0; i <= N; i++) {
      const r1 = [], r2 = [], i1 = [], i2 = [], rz1 = [], rz2 = [], cc1 = [], cc2 = [];
      const r = (i / N) * 2.2;
      for (let j = 0; j <= M2; j++) {
        const theta = -Math.PI + (j / M2) * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const rho = Math.pow(r, 1 / g);
        const phi = theta / g;
        r1.push(x); i1.push(y); rz1.push(rho * Math.cos(phi));
        r2.push(x); i2.push(y); rz2.push(rho * Math.cos(phi + Math.PI));
        cc1.push(rho * Math.sin(phi));
        cc2.push(rho * Math.sin(phi + Math.PI));
      }
      xs1.push(r1); ys1.push(i1); zs1.push(rz1); cs1.push(cc1);
      xs2.push(r2); ys2.push(i2); zs2.push(rz2); cs2.push(cc2);
    }
    Plotly.react(ref.current, [
      {
        type: "surface", x: xs1, y: ys1, z: zs1, surfacecolor: cs1,
        colorscale: [[0, C.indigo], [0.5, C.teal], [1, C.gold]],
        showscale: false, opacity: 0.92,
        lighting: { ambient: 0.55, diffuse: 0.9, roughness: 0.45, specular: 0.5 },
        hovertemplate: "Sheet I · z^(1/" + g + ")<extra></extra>",
      },
      {
        type: "surface", x: xs2, y: ys2, z: zs2, surfacecolor: cs2,
        colorscale: [[0, C.crimson], [0.5, C.gold], [1, C.teal]],
        showscale: false, opacity: 0.85,
        lighting: { ambient: 0.55, diffuse: 0.9, roughness: 0.45, specular: 0.5 },
        hovertemplate: "Sheet II · z^(1/" + g + ")<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "manual", aspectratio: { x: 1, y: 1, z: 0.95 },
        xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.65, 1.65, 0.5),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [genus, responsive.isMobile]);
  return (
    <GalleryFrame
      rank="IX" tone={C.gold}
      eyebrow="Complex geometry · branched cover"
      title="Riemann surface of z^{1/g}"
      formula={<M>{"\\Sigma_g = \\{(z, w) \\in \\mathbb C^2 : w^g = z\\}, \\qquad \\chi(\\Sigma_g) = 2 - 2g"}</M>}
      summary={<>The two sheets shown are the analytic continuations of <M>{"w_\\pm(z) = \\rho^{1/g} e^{i(\\theta + 2\\pi k)/g}"}</M> across the branch cut on the negative real axis. Compactifying yields a closed orientable surface of genus <M>{"g"}</M>, the moduli space <M>{"\\mathcal M_g"}</M> of which has dimension <M>{"3g - 3"}</M> (Riemann 1857). Conformal field theories on these surfaces are the worldsheets of perturbative string theory; the partition function at <M>{"g"}</M> loops is an integral over <M>{"\\overline{\\mathcal M_g}"}</M>.</>}
      controls={<Slider label="genus g (branching order)" value={genus} min={2} max={6} step={1} onChange={setGenus} tone={C.gold} valueText={String(genus)} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>The polynomial equation <M>{"w^g = z"}</M> in <M>{"\\mathbb C^2"}</M> has <M>{"g"}</M> distinct solutions for <M>{"w"}</M> at every <M>{"z \\neq 0"}</M> — so projecting <M>{"(z, w) \\mapsto z"}</M> gives a <M>{"g"}</M>-to-1 covering map of the <M>{"z"}</M>-plane, branched at <M>{"z = 0, \\infty"}</M>. Compactifying and "gluing" the sheets across the branch cuts yields a closed orientable surface of genus <M>{"g"}</M>.</> },
        { head: "What you are seeing", body: <>The <M>{"g"}</M> sheets visible at once with their branch-cut intersections rendered explicitly. The Euler characteristic <M>{"\\chi = 2 - 2g"}</M> falls as the surface gains handles. The moduli space <M>{"\\mathcal M_g"}</M> of complex structures has real dimension <M>{"6g - 6"}</M>, the famous Riemann count.</> },
        { head: "Why this matters", body: <>Compact Riemann surfaces are the worldsheets of perturbative string theory: each genus is one loop of the string. A scattering amplitude is an integral over <M>{"\\overline{\\mathcal M_g}"}</M>, weighted by <M>{"g_s^{2g-2}"}</M>. The same surfaces parametrise stable curves in algebraic geometry, count via Witten's conjecture (Kontsevich's theorem), and underlie 2D conformal field theory.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT — the gallery component, six manifolds in vertical stack
// ═══════════════════════════════════════════════════════════════════════════
export default function ManifoldGallery() {
  const responsive = useResponsive();
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        padding: responsive.isMobile ? "16px 18px" : "22px 26px",
        marginBottom: 22,
        background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panel} 100%)`,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.gold}`,
        borderRadius: 4,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10, color: C.gold,
          letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8,
        }}>Manifold gallery · six geometric exhibits</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 17 : 22, color: C.ink, lineHeight: 1.4,
        }}>
          A walk through the canonical 3D objects on which modern unification rests:
          a non-orientable surface, a hyperbolic geometry, a black-hole throat,
          a non-trivial fibre bundle, an Anti-de Sitter spacetime, and a
          higher-genus Riemann surface. Each panel is fully interactive; rotate,
          zoom, and pan with the mouse.
        </div>
      </div>
     <LazyMount minHeight={600}><KleinBottle /></LazyMount>
     <LazyMount minHeight={600}><Pseudosphere /></LazyMount>
     <LazyMount minHeight={600}><FlammParaboloid /></LazyMount>
     <LazyMount minHeight={600}><HopfFibration /></LazyMount>
     <LazyMount minHeight={600}><AdSHyperboloid /></LazyMount>
     <LazyMount minHeight={600}><RiemannSurface /></LazyMount>
    </div>
  );
}
