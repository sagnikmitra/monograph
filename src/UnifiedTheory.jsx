// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED THEORY · STANDALONE COMPENDIUM
// A self-contained deep-dive on what "unification" means in physics, the
// historical and conceptual road from Maxwell → Einstein → Electroweak → GUT
// → Supersymmetry → Strings → Theory of Everything, AND the Monograph's own
// structural unification thesis (Section 18 categorical synthesis), with all
// hero figures, equations, and the four-layer claim architecture in one page.
//
// Sources synthesised:
//   · Britannica — "unified field theory" (Christine Sutton)
//   · Britannica — Cosmology (uploaded PDF)
//   · BigThink   — "The big idea of Grand Unified Theories of physics"
//   · EBSCO      — "Grand Unification Theories And Supersymmetry" (LoSecco)
//   · Wikipedia  — "Unified field theory"
//   · SpaceFed   — "Unified Field Theory Solved?"
//   · Monograph  — Part II §§ 8–17 + Section 18 (Categorical Synthesis)
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Plotly from "plotly.js-dist-min";
// Each gallery is a multi-hundred-KB chunk of Plotly traces. Code-split them
// so they only download as the reader scrolls into the relevant section,
// keeping the initial /unified payload lean.
const ManifoldGallery = lazy(() => import("./ManifoldGallery"));
const AdvancedGallery = lazy(() => import("./AdvancedGallery"));
const UnificationCharts = lazy(() => import("./UnificationCharts"));
const StringTheoryGallery = lazy(() => import("./StringTheoryGallery"));
const CrossSectionGallery = lazy(() => import("./CrossSectionGallery"));
const LieGroupGallery = lazy(() => import("./LieGroupGallery"));
import LazyMount from "./LazyMount";
import { SectionLoader } from "./Loader";
import useInView from "./useInView";

// Suspense fallback shown while a gallery chunk is being fetched.
function GalleryFallback({ minHeight = 600, label = "Loading figures" }) {
  return <SectionLoader minHeight={minHeight} label={label} />;
}

// Wrapper that overlays a SectionLoader on top of a Plotly host <div> until
// the chart has actually been initialised. Without this, charts that are
// waiting for their viewport-gated useEffect appear as blank white rectangles
// (sometimes with a broken-image icon from Plotly's deferred logo asset).
function ChartHost({ hostRef, ready, height, loaderLabel = "Rendering figure" }) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <div style={{ position: "absolute", inset: 0 }}>
          <SectionLoader minHeight={height} label={loaderLabel} />
        </div>
      )}
    </div>
  );
}
import {
  C,
  FONT_MATH,
  FONT_DISPLAY,
  FONT_MONO,
  M,
  Eq,
  Theorem,
  SectionHead,
  Figure,
  Prose,
  Metric,
  generateRegimeConstellation,
  generateLayerArchitecture,
  generateTripShell,
  generateScatterSample,
  orbitCamera,
  cayleySylvester,
  p3Corrected,
} from "./shared-kernel-ui.jsx";
import { useResponsive, responsiveScale, responsiveSpacing } from "./responsive";

// ───────────────────────────────────────────────────────────────────────────
// Local helpers (page-only)
// ───────────────────────────────────────────────────────────────────────────
function SubHead({ number, title, tone = "gold" }) {
  const c = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "crimson" ? C.crimson : C.indigo;
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 10, color: c, letterSpacing: 3,
      textTransform: "uppercase", marginTop: 28, marginBottom: 8,
    }}>
      {number ? `${number} · ` : ""}{title}
    </div>
  );
}

function Pill({ children, tone = "gold" }) {
  const c = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "crimson" ? C.crimson : tone === "violet" ? C.violet : C.indigo;
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", margin: "0 6px 6px 0",
      fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase",
      color: c, background: `${c}14`, border: `1px solid ${c}55`, borderRadius: 999,
    }}>{children}</span>
  );
}

function Card({ title, eyebrow, tone = "gold", children, style }) {
  const c = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "crimson" ? C.crimson : tone === "violet" ? C.violet : C.indigo;
  return (
    <div style={{
      padding: "14px 16px",
      background: C.panelAlt,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${c}`,
      borderRadius: 3,
      minWidth: 0,
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      ...style,
    }}>
      {eyebrow && <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: c, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 4, overflowWrap: "anywhere" }}>{eyebrow}</div>}
      {title && <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 17, color: C.inkBr, marginBottom: 6, overflowWrap: "anywhere" }}>{title}</div>}
      <div style={{ fontFamily: FONT_MATH, fontSize: 14.5, color: C.ink, lineHeight: 1.6, overflowWrap: "anywhere", overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function RefLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      color: C.tealBr, textDecoration: "none", borderBottom: `1px dotted ${C.teal}88`,
    }}>{children}</a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function UnifiedTheory() {
  const responsive = useResponsive();
  const lowPowerDevice =
    typeof navigator !== "undefined" &&
    ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4));

  // ── live state for the kernel chamber + new interactive figures ────────
  const [M_, setM] = useState(40);
  const [selectedS, setSelectedS] = useState(22);
  // Symmetry-breaking cascade slider: temperature in log10(GeV), 19→ −3
  const [logE, setLogE] = useState(19);
  // Calabi–Yau quintic deformation parameter ψ (controls the visible cross-section)
  const [cyPsi, setCyPsi] = useState(0.7);

  const tripShell = useMemo(() => generateTripShell(M_), [M_]);
  const regimeConstellation = useMemo(() => generateRegimeConstellation(), []);
  const layerArchitecture = useMemo(() => generateLayerArchitecture(), []);
  const scatterData = useMemo(
    () =>
      generateScatterSample(
        M_,
        responsive.isMobile ? 2400 : lowPowerDevice ? 6200 : 9000
      ),
    [M_, responsive.isMobile, lowPowerDevice]
  );

  // ── refs for ALL hero 3D plots (now five) ──────────────────────────────
  const tripRef = useRef(null);
  const constRef = useRef(null);
  const archRef = useRef(null);
  const couplingRef = useRef(null);   // RG-coupling convergence
  const cascadeRef = useRef(null);    // historical EW → GUT → UFT → TOE cascade (Fig 1)
  const cyRef = useRef(null);         // Calabi–Yau quintic real cross-section (3D)
  const breakRef = useRef(null);      // interactive symmetry-breaking cascade (3D)

  // ── viewport gating: defer Plotly init until each chart is near the
  // viewport, AND track a `ready` flag so we can overlay a loader on the
  // host <div> until the chart actually paints. ─────────────────────────
  const tripInView = useInView(tripRef);
  const constInView = useInView(constRef, { rootMargin: "320px 0px 320px 0px", once: false });
  const archInView = useInView(archRef);
  const couplingInView = useInView(couplingRef);
  const cascadeInView = useInView(cascadeRef);
  const cyInView = useInView(cyRef);
  const breakInView = useInView(breakRef);
  const [tripReady, setTripReady] = useState(false);
  const [constReady, setConstReady] = useState(false);
  const [archReady, setArchReady] = useState(false);
  const [couplingReady, setCouplingReady] = useState(false);
  const [cascadeReady, setCascadeReady] = useState(false);
  const [cyReady, setCyReady] = useState(false);
  const [breakReady, setBreakReady] = useState(false);

  // ── kernel chamber ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!tripRef.current || !tripInView) return;
    const xS = [], yS = [], zS = [];
    for (let i = 0; i < scatterData.xs.length; i++) {
      if (scatterData.ss[i] === selectedS) {
        xS.push(scatterData.xs[i]); yS.push(scatterData.ys[i]); zS.push(scatterData.zs[i]);
      }
    }
    Plotly.react(tripRef.current, [
      {
        type: "mesh3d", x: tripShell.vx, y: tripShell.vy, z: tripShell.vz,
        i: [0, 0, 0, 1], j: [1, 1, 2, 2], k: [2, 3, 3, 3],
        color: C.teal, opacity: 0.08, hoverinfo: "skip",
      },
      {
        type: "scatter3d", mode: "lines",
        x: tripShell.edgeX, y: tripShell.edgeY, z: tripShell.edgeZ,
        line: { color: C.gold, width: 4 }, hoverinfo: "skip",
      },
      {
        type: "scatter3d", mode: "markers",
        x: xS, y: yS, z: zS,
        marker: { size: responsive.isMobile ? 3 : 4, color: C.goldBr, opacity: 0.95 },
        hovertemplate: "Σ=%{text}<extra></extra>", text: xS.map(() => selectedS),
      },
      {
        type: "scatter3d", mode: "markers",
        x: xS, y: yS, z: xS.map(() => 1),
        marker: { size: responsive.isMobile ? 2 : 2.6, color: C.indigo, opacity: 0.18 },
        hoverinfo: "skip",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [1, M_] },
        yaxis: { visible: false, range: [1, M_] },
        zaxis: { visible: false, range: [1, M_] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.35, responsive.isMobile ? 1.4 : 1.6, responsive.isMobile ? 0.7 : 0.85),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true }).then(() => setTripReady(true));
  }, [tripShell, scatterData, selectedS, M_, responsive.isMobile, tripInView]);

  // ── regime constellation (rotating) ────────────────────────────────────
  useEffect(() => {
    if (!constRef.current || !constInView) return;
    const kernel = regimeConstellation[0];
    const outer = regimeConstellation.slice(1);
    const classColors = { explicit: C.tealBr, inferred: C.goldBr, analogical: C.violet };
    const lineX = [], lineY = [], lineZ = [];
    outer.forEach(({ x, y, z }) => {
      lineX.push(kernel.x, x, null);
      lineY.push(kernel.y, y, null);
      lineZ.push(kernel.z, z, null);
    });
    Plotly.react(constRef.current, [
      { type: "scatter3d", mode: "lines", x: lineX, y: lineY, z: lineZ, line: { color: `${C.gold}66`, width: 4 }, hoverinfo: "skip" },
      {
        type: "scatter3d", mode: "lines",
        x: [...outer.map(p => p.x), outer[0].x],
        y: [...outer.map(p => p.y), outer[0].y],
        z: [...outer.map(p => p.z), outer[0].z],
        line: { color: `${C.indigo}88`, width: 3, dash: "dot" }, hoverinfo: "skip",
      },
      {
        type: "scatter3d", mode: "markers+text",
        x: regimeConstellation.map(p => p.x),
        y: regimeConstellation.map(p => p.y),
        z: regimeConstellation.map(p => p.z),
        text: regimeConstellation.map(p => p.name),
        textposition: "top center",
        textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkBr },
        marker: {
          size: regimeConstellation.map(p => p.name === "Kernel" ? 9 : 6),
          color: regimeConstellation.map(p => p.name === "Kernel" ? C.crimson : classColors[p.cls]),
          line: { color: C.bgDeep, width: 1 },
        },
        hovertemplate: "%{text}<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        xaxis: { visible: false, range: [-3.4, 3.4] },
        yaxis: { visible: false, range: [-3.4, 3.4] },
        zaxis: { visible: false, range: [-2.2, 2.6] },
        bgcolor: C.plotBg,
        camera: orbitCamera(1.18, responsive.isMobile ? 1.45 : 1.62, responsive.isMobile ? 0.78 : 0.9),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });

    if (responsive.isMobile || lowPowerDevice || !constInView) return;
    let theta = 1.18;
    const t = setInterval(() => {
      theta += 0.012;
      if (constRef.current) Plotly.relayout(constRef.current, { "scene.camera": orbitCamera(theta, 1.62, 0.9) });
    }, 120);
    return () => clearInterval(t);
  }, [regimeConstellation, responsive.isMobile, lowPowerDevice, constInView]);

  // ── proof-stack architecture ───────────────────────────────────────────
  useEffect(() => {
    if (!archRef.current || !archInView) return;
    const traces = [];
    layerArchitecture.layers.forEach(layer => {
      const s = layer.size;
      traces.push({
        type: "scatter3d", mode: "lines",
        x: [-s, s, s, -s, -s], y: [-s, -s, s, s, -s], z: [layer.z, layer.z, layer.z, layer.z, layer.z],
        line: { color: layer.color, width: 5 }, hovertemplate: `${layer.name}<extra></extra>`,
      });
      traces.push({
        type: "scatter3d", mode: "text",
        x: [0], y: [0], z: [layer.z + 0.06],
        text: [layer.name],
        textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: layer.color },
        hoverinfo: "skip",
      });
    });
    const cx = [], cy = [], cz = [];
    for (let i = 0; i < layerArchitecture.layers.length - 1; i++) {
      const a = layerArchitecture.layers[i];
      const b = layerArchitecture.layers[i + 1];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        cx.push(sx * a.size, sx * b.size, null);
        cy.push(sy * a.size, sy * b.size, null);
        cz.push(a.z, b.z, null);
      });
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: cx, y: cy, z: cz,
      line: { color: `${C.inkDim}88`, width: 3, dash: "dot" }, hoverinfo: "skip",
    });
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x: layerArchitecture.assumptions.map(a => a.x),
      y: layerArchitecture.assumptions.map(a => a.y),
      z: layerArchitecture.assumptions.map(a => a.z),
      text: layerArchitecture.assumptions.map(a => a.name),
      textposition: "top center",
      textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkBr },
      marker: { size: responsive.isMobile ? 4 : 5, color: C.goldBr, line: { color: C.bgDeep, width: 1 } },
      hovertemplate: "assumption %{text}<extra></extra>",
    });
    Plotly.react(archRef.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        xaxis: { visible: false, range: [-4.1, 4.1] },
        yaxis: { visible: false, range: [-4.1, 4.1] },
        zaxis: { visible: false, range: [-0.3, 3.5] },
        bgcolor: C.plotBg,
        camera: orbitCamera(-0.42, responsive.isMobile ? 1.44 : 1.6, responsive.isMobile ? 0.9 : 1.02),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true }).then(() => setArchReady(true));
  }, [layerArchitecture, responsive.isMobile, archInView]);

  // ── RG gauge-coupling convergence (Standard Model + MSSM) ──────────────
  useEffect(() => {
    if (!couplingRef.current || !couplingInView) return;
    // log10(μ/GeV) from MZ ≈ 1.96 to MGUT ≈ 16
    const xs = [];
    for (let t = 1.96; t <= 19; t += 0.1) xs.push(t);
    // 1-loop running α_i^{-1}(μ) = α_i^{-1}(MZ) - (b_i / 2π) ln(μ/MZ)
    // α_i(MZ): α1^-1≈59.0, α2^-1≈29.6, α3^-1≈8.5
    // SM b: (41/10, -19/6, -7);  MSSM b: (33/5, 1, -3)
    const ln10 = Math.log(10);
    const series = (a0, b) => xs.map(t => a0 - (b / (2 * Math.PI)) * (t - 1.96) * ln10);
    const sm1 = series(59.0,  41 / 10);
    const sm2 = series(29.6, -19 / 6);
    const sm3 = series(8.5,  -7);
    const ms1 = series(59.0,  33 / 5);
    const ms2 = series(29.6,  1);
    const ms3 = series(8.5,  -3);
    Plotly.react(couplingRef.current, [
      { x: xs, y: sm1, mode: "lines", name: "α₁⁻¹ (SM)", line: { color: C.crimson, width: 2 } },
      { x: xs, y: sm2, mode: "lines", name: "α₂⁻¹ (SM)", line: { color: C.indigo,  width: 2 } },
      { x: xs, y: sm3, mode: "lines", name: "α₃⁻¹ (SM)", line: { color: C.teal,    width: 2 } },
      { x: xs, y: ms1, mode: "lines", name: "α₁⁻¹ (MSSM)", line: { color: C.crimson, width: 2, dash: "dot" } },
      { x: xs, y: ms2, mode: "lines", name: "α₂⁻¹ (MSSM)", line: { color: C.indigo,  width: 2, dash: "dot" } },
      { x: xs, y: ms3, mode: "lines", name: "α₃⁻¹ (MSSM)", line: { color: C.teal,    width: 2, dash: "dot" } },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 16, r: 14, b: 44, l: 50 },
      font: { family: FONT_MONO, size: 10, color: C.inkDim },
      xaxis: { title: "log₁₀(μ / GeV)", gridcolor: `${C.border}66`, zerolinecolor: C.border, color: C.inkDim, range: [1.96, 19] },
      yaxis: { title: "α⁻¹(μ)", gridcolor: `${C.border}66`, zerolinecolor: C.border, color: C.inkDim, range: [0, 65] },
      legend: { orientation: "h", y: -0.22, font: { size: 9, color: C.inkDim } },
      shapes: [
        { type: "line", x0: 16, x1: 16, y0: 0, y1: 65, line: { color: `${C.gold}88`, dash: "dash", width: 1 } },
      ],
      annotations: [
        { x: 16, y: 60, text: "M_GUT ≈ 10¹⁶ GeV", showarrow: false, font: { family: FONT_MONO, size: 9, color: C.gold } },
      ],
    }, { displayModeBar: false, responsive: true }).then(() => setCouplingReady(true));
  }, [responsive.isMobile, couplingInView]);

  // ── Calabi–Yau quintic real cross-section ──────────────────────────────
  // We render a 2D real slice of the quintic threefold
  //   X_ψ = { (z1,…,z5) ∈ CP^4 : z1^5 + … + z5^5 − 5ψ z1 z2 z3 z4 z5 = 0 }
  // restricted to the real plane (z1, z2 real, z3 = z4 = z5 = ξ ∈ ℝ),
  // sweeping ψ to deform the manifold. The result is a Riemann-surface-like
  // 3D embedding (u, v, height) used purely as a visual.
  useEffect(() => {
    if (!cyRef.current || !cyInView) return;
    const N = responsive.isMobile ? 26 : lowPowerDevice ? 34 : 44;
    const range = 1.6;
    const xs = [], ys = [], zs = [];
    for (let i = 0; i <= N; i++) {
      const row = [];
      const xrow = [], yrow = [];
      for (let j = 0; j <= N; j++) {
        const u = -range + (2 * range * i) / N;
        const v = -range + (2 * range * j) / N;
        // Real-slice quintic surface, height = (u^5 + v^5 + 3 ξ^5 − 5 ψ u v ξ^3)
        // with ξ given by an implicit closure ξ = (1 − ψ uv)/√(u²+v²+0.6)
        const r = Math.sqrt(u * u + v * v + 0.6);
        const xi = (1 - cyPsi * u * v) / r;
        const h = (Math.pow(u, 5) + Math.pow(v, 5) + 3 * Math.pow(xi, 5) - 5 * cyPsi * u * v * Math.pow(xi, 3)) * 0.18;
        // Twist into a torus-like CY-evocative shape
        const theta = Math.atan2(v, u);
        const rho = Math.sqrt(u * u + v * v);
        const X = (1.1 + 0.55 * Math.cos(3 * theta + h)) * Math.cos(2 * theta);
        const Y = (1.1 + 0.55 * Math.cos(3 * theta + h)) * Math.sin(2 * theta);
        const Z = 0.55 * Math.sin(3 * theta + h) + 0.35 * Math.tanh(h) + 0.18 * rho;
        xrow.push(X); yrow.push(Y); row.push(Z);
      }
      xs.push(xrow); ys.push(yrow); zs.push(row);
    }
    Plotly.react(cyRef.current, [
      {
        type: "surface",
        x: xs, y: ys, z: zs,
        colorscale: [
          [0,    C.indigo],
          [0.25, C.teal],
          [0.5,  C.gold],
          [0.75, "#d4783a"],
          [1,    C.crimson],
        ],
        showscale: false,
        opacity: 0.92,
        contours: {
          x: { show: true, color: `${C.bgDeep}aa`, width: 1 },
          y: { show: true, color: `${C.bgDeep}aa`, width: 1 },
          z: { show: false },
        },
        lighting: { ambient: 0.55, diffuse: 0.85, roughness: 0.6, specular: 0.45 },
        hovertemplate: "ψ = " + cyPsi.toFixed(2) + "<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [-2, 2] },
        yaxis: { visible: false, range: [-2, 2] },
        zaxis: { visible: false, range: [-1.5, 1.8] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.65, responsive.isMobile ? 1.55 : 1.7, responsive.isMobile ? 0.85 : 0.95),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true }).then(() => setCyReady(true));
  }, [cyPsi, responsive.isMobile, lowPowerDevice, cyInView]);

  // ── Interactive symmetry-breaking cascade (3D) ─────────────────────────
  // Plots the four-stage hierarchy as a vertical stack, with a Higgs-style
  // Mexican-hat potential at the *current* logE energy. The symmetry that
  // is currently "active" lights up; everything below it is broken.
  useEffect(() => {
    if (!breakRef.current || !breakInView) return;
    // Five symmetry stages, top → bottom in energy (more vertical spacing)
    const stages = [
      { name: "TOE / quantum gravity",        E: 19,    color: C.crimson, group: "G_TOE",                  z: 4.2 },
      { name: "Unified field (with gravity)", E: 18,    color: C.gold,    group: "G_TOE → G_GUT × G_grav", z: 2.8 },
      { name: "Grand Unified Theory",         E: 16,    color: C.indigo,  group: "SU(5) / SO(10) / E₆",     z: 1.4 },
      { name: "Standard Model",               E: 2.4,   color: C.teal,    group: "SU(3)×SU(2)×U(1)",        z: 0.0 },
      { name: "Electroweak broken (today)",   E: -0.5,  color: "#7aa6c2", group: "SU(3)×U(1)_em",           z: -1.4 },
    ];
    // Higgs Mexican-hat potential, kept clearly below the lowest plate.
    const N = responsive.isMobile ? 20 : lowPowerDevice ? 28 : 34;
    const R = 1.7;
    const HAT_Z = -3.6;
    const breakingActive =
      stages.reduce((best, s) => (Math.abs(s.E - logE) < Math.abs(best.E - logE) ? s : best), stages[0]);
    const tOverTc = Math.max(0.05, Math.min(2.5, Math.pow(10, (logE - 2.4) / 4)));
    const muSq = Math.max(-2, 1.5 - tOverTc * 1.4);
    const lam = 0.6;
    const px = [], py = [], pz = [];
    for (let i = 0; i <= N; i++) {
      const xrow = [], yrow = [], zrow = [];
      for (let j = 0; j <= N; j++) {
        const u = -R + (2 * R * i) / N;
        const v = -R + (2 * R * j) / N;
        const phi2 = u * u + v * v;
        const V = -muSq * phi2 + lam * phi2 * phi2;
        xrow.push(u * 0.95); yrow.push(v * 0.95); zrow.push(HAT_Z + V * 0.55);
      }
      px.push(xrow); py.push(yrow); pz.push(zrow);
    }

    const traces = [];
    const SZ = 1.7;

    // Plates: outline + faint filled mesh + corner markers + label leader
    stages.forEach((s) => {
      const isActive = s === breakingActive;
      const isAbove = s.E > logE; // not yet broken at this epoch
      const baseOpacity = isActive ? 1 : isAbove ? 0.55 : 0.28;
      const lineColor = isActive ? s.color : isAbove ? s.color : `${s.color}`;
      // Filled translucent plate
      traces.push({
        type: "mesh3d",
        x: [-SZ, SZ, SZ, -SZ],
        y: [-SZ, -SZ, SZ, SZ],
        z: [s.z, s.z, s.z, s.z],
        i: [0, 0], j: [1, 2], k: [2, 3],
        color: s.color,
        opacity: isActive ? 0.18 : isAbove ? 0.07 : 0.04,
        flatshading: true,
        hoverinfo: "skip",
        showscale: false,
      });
      // Plate outline
      traces.push({
        type: "scatter3d", mode: "lines",
        x: [-SZ, SZ, SZ, -SZ, -SZ],
        y: [-SZ, -SZ, SZ, SZ, -SZ],
        z: [s.z, s.z, s.z, s.z, s.z],
        line: { color: lineColor, width: isActive ? 7 : 3 },
        opacity: baseOpacity + 0.1,
        hovertemplate: `<b>${s.name}</b><br>E ≈ 10^${s.E.toFixed(1)} GeV<br>${s.group}<extra></extra>`,
      });
      // Corner glow markers on active plate
      if (isActive) {
        traces.push({
          type: "scatter3d", mode: "markers",
          x: [-SZ, SZ, SZ, -SZ],
          y: [-SZ, -SZ, SZ, SZ],
          z: [s.z, s.z, s.z, s.z],
          marker: { size: 6, color: s.color, line: { color: "#fff", width: 1 }, symbol: "diamond" },
          hoverinfo: "skip",
        });
      }
      // Text label: pulled out to the front-left corner with a leader line
      const lx = -SZ - 0.15, ly = -SZ - 0.15, lz = s.z + 0.18;
      traces.push({
        type: "scatter3d", mode: "lines",
        x: [-SZ, lx], y: [-SZ, ly], z: [s.z, lz],
        line: { color: lineColor, width: 1 },
        opacity: baseOpacity,
        hoverinfo: "skip",
      });
      traces.push({
        type: "scatter3d", mode: "text",
        x: [lx], y: [ly], z: [lz + 0.12],
        text: [`<b>${s.name}</b>  ·  ${s.group}`],
        textposition: "top left",
        textfont: {
          family: FONT_MONO,
          size: responsive.isMobile ? 10 : 12,
          color: isActive ? "#ffffff" : isAbove ? s.color : C.inkDim,
        },
        opacity: 1,
        hoverinfo: "skip",
      });
    });

    // Vertical connectors at the four corners between consecutive plates
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i], b = stages[i + 1];
      const broken = a.E > logE; // already happened
      [[-SZ, -SZ], [SZ, -SZ], [SZ, SZ], [-SZ, SZ]].forEach(([x, y]) => {
        traces.push({
          type: "scatter3d", mode: "lines",
          x: [x, x], y: [y, y], z: [a.z, b.z],
          line: {
            color: broken ? `${C.gold}cc` : `${C.inkDim}66`,
            width: broken ? 3 : 1.5,
            dash: broken ? "solid" : "dot",
          },
          hoverinfo: "skip",
        });
      });
    }

    // Mexican-hat potential surface, well separated below the stack
    traces.push({
      type: "surface",
      x: px, y: py, z: pz,
      colorscale: [
        [0,   muSq < 0 ? "#1f4d5e" : "#5a1d2c"],
        [0.5, C.gold],
        [1,   muSq < 0 ? "#7a2236" : "#1f6b80"],
      ],
      showscale: false,
      opacity: 0.92,
      lighting: { ambient: 0.6, diffuse: 0.9, roughness: 0.55, specular: 0.5 },
      hovertemplate: `Higgs potential at log₁₀E=${logE.toFixed(1)}<br>μ²=${muSq.toFixed(2)}<extra></extra>`,
    });
    // Label for Higgs potential
    traces.push({
      type: "scatter3d", mode: "text",
      x: [0], y: [0], z: [HAT_Z - 0.55],
      text: [`Higgs V(φ) = −μ²|φ|² + λ|φ|⁴   ·   μ² = ${muSq.toFixed(2)}`],
      textfont: { family: FONT_MONO, size: responsive.isMobile ? 9 : 11, color: C.gold },
      hoverinfo: "skip",
    });

    // "Current epoch" luminous ring, sized to active plate, sitting just above it
    const ringTheta = [];
    for (let i = 0; i <= 80; i++) ringTheta.push((i / 80) * 2 * Math.PI);
    const ringR = SZ * 1.18;
    traces.push({
      type: "scatter3d", mode: "lines",
      x: ringTheta.map(t => ringR * Math.cos(t)),
      y: ringTheta.map(t => ringR * Math.sin(t)),
      z: ringTheta.map(() => breakingActive.z + 0.04),
      line: { color: breakingActive.color, width: 6 },
      opacity: 0.95,
      hoverinfo: "skip",
    });

    Plotly.react(breakRef.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "manual",
        aspectratio: { x: 1, y: 1, z: 1.9 },
        xaxis: { visible: false, range: [-2.8, 2.8] },
        yaxis: { visible: false, range: [-2.8, 2.8] },
        zaxis: { visible: false, range: [-5.0, 5.2] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.95, responsive.isMobile ? 1.7 : 1.9, responsive.isMobile ? 0.35 : 0.45),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true }).then(() => setBreakReady(true));
  }, [logE, responsive.isMobile, lowPowerDevice, breakInView]);

  useEffect(() => {
    if (!cascadeRef.current || !cascadeInView) return;
    const stages = [
      { name: "EW (tested)",     E: 100,           color: C.teal,    forces: ["em", "weak"] },
      { name: "GUT (conjectural)", E: 1e16,        color: C.indigo,  forces: ["em", "weak", "strong"] },
      { name: "UFT (open)",      E: 1e18,          color: C.gold,    forces: ["em", "weak", "strong", "gravity"] },
      { name: "TOE (open)",      E: 1.22e19,       color: C.crimson, forces: ["em", "weak", "strong", "gravity", "quantum-grav"] },
    ];
    Plotly.react(cascadeRef.current, [
      {
        type: "scatter", mode: "markers+text+lines",
        x: stages.map(s => Math.log10(s.E)),
        y: stages.map(s => s.forces.length),
        text: stages.map(s => s.name),
        textposition: "top center",
        textfont: { family: FONT_MONO, size: 10, color: C.inkBr },
        line: { color: `${C.gold}66`, width: 2, dash: "dot" },
        marker: {
          size: stages.map(s => 14 + s.forces.length * 2),
          color: stages.map(s => s.color),
          line: { color: C.bgDeep, width: 2 },
        },
        hovertemplate: "%{text}<br>E ≈ 10^%{x:.1f} GeV<br>forces unified: %{y}<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 30, r: 20, b: 50, l: 50 },
      font: { family: FONT_MONO, size: 10, color: C.inkDim },
      xaxis: { title: "log₁₀(energy / GeV)", gridcolor: `${C.border}66`, color: C.inkDim, range: [1, 20] },
      yaxis: { title: "# forces unified", gridcolor: `${C.border}66`, color: C.inkDim, range: [1.5, 6], dtick: 1 },
      showlegend: false,
    }, { displayModeBar: false, responsive: true }).then(() => setCascadeReady(true));
  }, [responsive.isMobile, cascadeInView]);

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: FONT_MATH, fontSize: responsiveScale(17),
      background: C.bg, color: C.ink, minHeight: "100vh",
      backgroundImage: `
        radial-gradient(ellipse at 20% 0%, ${C.gold}08 0%, transparent 55%),
        radial-gradient(ellipse at 80% 100%, ${C.indigo}0c 0%, transparent 55%),
        linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 100%)
      `,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderBr}; border-radius: 3px; }
        .drop-cap::first-letter {
          font-family: ${FONT_DISPLAY}; font-size: 3.4em; font-weight: 500;
          float: left; line-height: 0.85; padding: 6px 8px 0 0;
          color: ${C.gold}; font-style: italic;
        }
        a:hover { color: ${C.goldBr} !important; }
      `}</style>

      {/* ═══ TOP NAV ═══ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.bg}f0`, backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.rule}`,
        padding: responsive.isMobile ? "10px 16px" : "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 2, textTransform: "uppercase" }}>
            Unified theory · standalone compendium
          </span>
        </div>
        <Link to="/" style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", textDecoration: "none", border: `1px solid ${C.gold}55`, borderRadius: 4, padding: "5px 12px" }}>
          ← Monograph
        </Link>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{
        maxWidth: responsive.isMobile ? "100%" : responsive.isTablet ? 960 : 1040,
        margin: "0 auto",
        padding: responsive.isMobile ? "0 18px" : "0 40px",
        overflowX: "hidden",
        width: "100%",
      }}>
        {/* COVER */}
        <section style={{ padding: responsive.isMobile ? "36px 0 16px" : "64px 0 32px" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 9 : 11.5, color: C.gold, letterSpacing: responsive.isMobile ? 2 : 4, textTransform: "uppercase", marginBottom: 14 }}>
            Compendium · MMXXVI · Unified Theory · sgnk
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: responsive.isMobile ? 14 : 18, color: C.inkDim, marginBottom: 8 }}>
            On the Unification of
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 500, color: C.inkBr, lineHeight: 1.02,
            fontSize: responsive.isMobile ? 38 : responsive.isTablet ? 52 : 66,
            letterSpacing: responsive.isMobile ? -0.6 : -1, margin: "0 0 14px",
          }}>
            Forces, Fields, and
            <span style={{ color: C.gold, fontStyle: "italic" }}> the Same </span>
            Arithmetic Shadow
          </h1>
          <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: responsive.isMobile ? 18 : 26, color: C.gold, margin: "10px 0 22px" }}>
            EW ⊂ GUT ⊂ UFT ⊂ TOE ⊃ p₃(S | M)
          </div>
          <p className="drop-cap" style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? "1.08em" : "1.22em", lineHeight: 1.7, color: C.ink, textAlign: "justify", maxWidth: 880 }}>
            Unification, in physics, is the long programme of showing that what look like several independent forces or several independent kinds of matter are in fact different faces of one underlying structure. Maxwell unified electricity and magnetism. Einstein extended the field idea to gravity. Glashow, Salam and Weinberg fused electromagnetism with the weak force. Quantum chromodynamics organised the strong force in the same gauge-theoretic language. <em>Grand Unified Theories</em> attempt to fuse all three nuclear/electromagnetic forces; <em>unified field theories</em> add gravity; a <em>theory of everything</em> would explain all of it together with quantum mechanics. This compendium walks the entire arc — from Maxwell&#8217;s 1864 paper to the open frontier of quantum gravity — and then turns the lens inward, showing how the present Monograph contributes a <em>structural</em> unification: a single arithmetic kernel <M>p₃(S | M)</M> that reappears across eleven physical regimes through one categorical universal property.
          </p>

          <div style={{
            marginTop: 22,
            display: "grid", gap: 10,
            gridTemplateColumns: responsive.isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          }}>
            <Metric label="Forces (today)"   value="4"   tone="gold"    />
            <Metric label="Unified by SM"    value="3"   tone="teal"    />
            <Metric label="Regimes (Trip)"   value="11"  tone="indigo"  />
            <Metric label="Open frontier"    value="∞"   tone="crimson" />
          </div>

          <div style={{ marginTop: 16 }}>
            <Pill tone="teal">Maxwell 1864</Pill>
            <Pill tone="teal">Einstein 1915</Pill>
            <Pill tone="indigo">QED 1949</Pill>
            <Pill tone="indigo">Electroweak 1967</Pill>
            <Pill tone="indigo">QCD 1973</Pill>
            <Pill tone="gold">SU(5) GUT 1974</Pill>
            <Pill tone="gold">SO(10) 1975</Pill>
            <Pill tone="violet">Supersymmetry</Pill>
            <Pill tone="violet">Superstrings</Pill>
            <Pill tone="crimson">M-theory</Pill>
            <Pill tone="crimson">Quantum gravity (open)</Pill>
          </div>
        </section>

        {/* ═══════════════════ TABLE OF CONTENTS ═══════════════════ */}
        <SectionHead number="0" title="Compendium contents" eyebrow="ROADMAP" />
        <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
          {[
            ["I",   "What unification means",            "definitions, taxonomy, why it matters"],
            ["II",  "Maxwell to Einstein",                "the original two unifications"],
            ["III", "Quantum field theory and the Standard Model", "QED, electroweak, QCD"],
            ["IV",  "Grand Unified Theories",             "SU(5), SO(10), proton decay"],
            ["V",   "Supersymmetry",                      "bosons ↔ fermions, MSSM, dark matter"],
            ["VI",  "Strings, branes, M-theory",          "10/11 dimensions, dualities"],
            ["VII", "Towards a Theory of Everything",     "quantum gravity, the graviton, open problems"],
            ["VIII","Cosmological frame",                 "Big Bang, BBN, CMB, dark sector"],
            ["VIII½","Chung's Unified Theory of Physics",  "space–object structure, 4-stage cosmology, periodic table of particles"],
            ["VIII¾","Nduka's Unified Theory of Science",  "index of the universe, kets |n⟩, partition geometry"],
            ["VIII⅞","Zhang–Zhao Spiral-Space UFT",        "cylindrical-spiral space, redefined time, c-invariance"],
            ["IX",  "Trip kernel — structural unification", "the categorical synthesis (Section 18)"],
            ["X",   "The eleven regimes",                 "where p₃(S | M) reappears"],
            ["XI",  "Layered architecture",               "definitions → safe → mid → flagship"],
            ["XII", "Falsification suite & taxonomy",     "Popperian discipline, downgrade operator"],
            ["XIII","References",                         "primary sources & further reading"],
          ].map(([n, t, sub], i) => (
            <div key={i} style={{
              padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: 3, background: C.panelAlt,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, minWidth: 24 }}>{n}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 16, color: C.inkBr }}>{t}</span>
              </div>
              <div style={{ fontFamily: FONT_MATH, fontSize: 12.5, color: C.inkDim, marginTop: 3, paddingLeft: 34 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ═══════════════════ I · WHAT UNIFICATION MEANS ═══════════════════ */}
        <SectionHead number="I" title="What unification means" eyebrow="DEFINITIONS · TAXONOMY" />

        <Prose>
          A <em>unified field theory</em> is, in the words of the Britannica entry by Christine Sutton, &ldquo;an attempt to describe all fundamental forces and the relationships between elementary particles in terms of a single theoretical framework.&rdquo; In physics, forces are described by <em>fields</em> that mediate interactions between separate objects. Maxwell&#8217;s 1860s synthesis of electricity and magnetism into electromagnetism was the first such field theory; Einstein&#8217;s 1915 general relativity was a field theory of gravitation. Einstein then spent the last thirty years of his life trying to unify electromagnetism with gravity. He failed, and to this day gravity remains outside any complete unified field theory.
        </Prose>

        <Prose>
          The word <em>unification</em> covers four distinct ambitions, each strictly contained in the next:
        </Prose>

        <Eq number="I.1">{"\\text{EW (tested)} \\;\\subset\\; \\text{GUT (conjectural)} \\;\\subset\\; \\text{UFT including gravity (open)} \\;\\subset\\; \\text{TOE (open)}."}</Eq>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="EW · proven" title="Electroweak unification" tone="teal">
            Glashow–Salam–Weinberg (1967, Nobel 1979). Above ~246 GeV the electromagnetic and weak forces merge into a single SU(2)<sub>L</sub> × U(1)<sub>Y</sub> gauge theory mediated by the photon γ and the bosons W<sup>±</sup>, Z<sup>0</sup>. The W and Z were observed at CERN UA1/UA2 in 1983; the Higgs that breaks the symmetry was found at the LHC in 2012.
          </Card>
          <Card eyebrow="GUT · conjectural" title="Grand Unified Theory" tone="indigo">
            A single gauge group (SU(5), SO(10), E<sub>6</sub>, …) containing SU(3)<sub>c</sub> × SU(2)<sub>L</sub> × U(1)<sub>Y</sub> and predicting that the three coupling constants meet at ~10<sup>16</sup> GeV. Predicts proton decay, magnetic monopoles, and (in many versions) neutrino mass via the see-saw.
          </Card>
          <Card eyebrow="UFT · open" title="Unified Field Theory with gravity" tone="gold">
            Adds general relativity. Includes Kaluza–Klein, Einstein&#8217;s teleparallel attempts, supergravity, and the gravitational sector of string theory. No experimentally confirmed candidate yet exists.
          </Card>
          <Card eyebrow="TOE · open" title="Theory of Everything" tone="crimson">
            A single quantum framework reproducing all particles, all forces, all initial conditions, and the value of every constant of nature. Candidates include superstring theory / M-theory and loop quantum gravity. None are experimentally established.
          </Card>
        </div>

        <Theorem kind="Definition" number="I.1" title="Force × matter taxonomy" tone="gold">
          Matter consists of <em>quarks</em> and <em>leptons</em> (12 species + antiparticles, in three generations). Forces are mediated by <em>gauge bosons</em>: the photon γ (electromagnetism), W<sup>±</sup> and Z (weak), eight gluons (strong), and the hypothetical graviton (gravity). The Higgs boson H is not a force carrier but the quantum of the field that gives mass.
        </Theorem>

        <Figure number="1" caption="The cascade of unification ambitions, plotted against the energy scale at which each is conjectured to operate. EW unification has been tested; everything above it remains conjectural or open. The y-axis counts how many of the four fundamental forces are merged at each stage.">
          <ChartHost hostRef={cascadeRef} ready={cascadeReady} height={responsive.isMobile ? 340 : 380} />
        </Figure>

        <Prose>
          The four <em>fundamental forces</em>, ordered by relative strength at low energy, are: the <strong>strong</strong> nuclear force (1), <strong>electromagnetism</strong> (≈10<sup>−2</sup>), the <strong>weak</strong> nuclear force (≈10<sup>−6</sup>), and <strong>gravity</strong> (≈10<sup>−39</sup>). The strong force binds quarks into protons and neutrons; electromagnetism governs charged particles; the weak force is responsible for beta decay; gravity is the attraction between massive bodies. Unification asks: are these four really one?
        </Prose>

        {/* ═══════════════════ II · MAXWELL TO EINSTEIN ═══════════════════ */}
        <SectionHead number="II" title="Maxwell to Einstein" eyebrow="THE FIRST TWO UNIFICATIONS" />

        <Prose>
          The modern programme begins with <strong>James Clerk Maxwell</strong>. By 1864 Maxwell had assembled the four equations that bear his name. They showed that what Faraday, Ampère, Ørsted and Biot–Savart had treated as four separate phenomena — static charges, magnets, currents producing magnetic fields, changing magnetic fields producing currents — were four facets of a <em>single</em> electromagnetic field. The equations also predicted, with no extra input, that the field could propagate as a wave at the speed
        </Prose>

        <Eq number="II.1">{"c = 1/\\sqrt{\\varepsilon_0 \\mu_0} \\;\\approx\\; 2.998 \\times 10^8 \\, \\text{m/s},"}</Eq>

        <Prose>
          which Maxwell immediately recognised as the speed of light. Light <em>is</em> an electromagnetic wave. The first true unification in physics had been achieved.
        </Prose>

        <Prose>
          Half a century later <strong>Albert Einstein</strong> recast gravity in the same field language. General relativity (1915) replaced Newton&#8217;s instantaneous force with a field — the spacetime metric <M>{"g_{\\mu\\nu}"}</M> — whose dynamics are governed by:
        </Prose>

        <Eq number="II.2">{"R_{\\mu\\nu} - \\tfrac{1}{2} R \\, g_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\tfrac{8\\pi G}{c^4} T_{\\mu\\nu}."}</Eq>

        <Prose>
          From 1925 until his death in 1955 Einstein worked, mostly alone, on a unified field theory that would absorb electromagnetism into general relativity. He tried <em>teleparallelism</em> (using a connection with non-zero torsion but zero curvature), <em>five-dimensional Kaluza–Klein theory</em>, and <em>asymmetric metrics</em>. None succeeded. As Wikipedia&#8217;s entry on unified field theory notes, Einstein&#8217;s attempts were &ldquo;not generally seen as successful&rdquo;, and gravity remained outside the framework.
        </Prose>

        <Theorem kind="Lesson" number="II.1" title="Why Einstein's programme stalled" tone="indigo">
          Two reasons, recognisable only in hindsight: (i) electromagnetism is fundamentally <em>quantum</em>, while general relativity is classical — the two languages do not naturally merge before quantisation; (ii) the strong and weak nuclear forces, both essential, were unknown to Einstein until very late. A unification of electromagnetism with gravity that omitted the nuclear forces could never be complete.
        </Theorem>

        {/* ═══════════════════ III · QFT AND THE STANDARD MODEL ═══════════════════ */}
        <SectionHead number="III" title="Quantum field theory and the Standard Model" eyebrow="QED · ELECTROWEAK · QCD" />

        <Prose>
          At subatomic distances classical fields fail; we need <em>quantum field theory</em> (QFT). In QFT every particle is the quantised excitation of an underlying field, and interactions occur by the exchange of virtual mediator quanta. The first complete QFT, <strong>quantum electrodynamics</strong> (QED), was developed in the 1940s by Tomonaga, Schwinger, Feynman and Dyson. Its agreement with experiment is the most precise in all of science: the anomalous magnetic moment of the electron is correct to 12 decimal places.
        </Prose>

        <Eq number="III.1">{"\\mathcal{L}_{\\mathrm{QED}} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi - \\tfrac{1}{4} F_{\\mu\\nu}F^{\\mu\\nu}, \\quad D_\\mu = \\partial_\\mu + ieA_\\mu."}</Eq>

        <Prose>
          QED is built around <em>local U(1) gauge invariance</em>: the freedom to redefine the phase of the electron field independently at every point in spacetime forces the existence of the photon. Generalising this principle to non-Abelian gauge groups was the key step toward unification. Yang and Mills (1954) wrote down SU(N) gauge theories; Glashow, Salam and Weinberg (1961–1968) proposed the <strong>electroweak</strong> theory based on SU(2)<sub>L</sub> × U(1)<sub>Y</sub>; Brout, Englert and Higgs (1964) supplied the spontaneous symmetry-breaking mechanism that gives W and Z their masses while keeping the photon massless. By the 1970s <strong>quantum chromodynamics</strong> (QCD), the SU(3) gauge theory of quarks and gluons, completed the picture.
        </Prose>

        <Eq number="III.2">{"G_{\\mathrm{SM}} = SU(3)_c \\times SU(2)_L \\times U(1)_Y \\;\\xrightarrow{\\langle H\\rangle \\neq 0}\\; SU(3)_c \\times U(1)_{\\mathrm{em}}."}</Eq>

        <div style={{
          margin: "16px 0", padding: "16px 18px",
          background: C.bgDeep, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.teal, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            standard model · particle content
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MATH, fontSize: 13, color: C.ink }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.rule}` }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: C.gold, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500 }}>Sector</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: C.gold, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500 }}>Members</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: C.gold, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500 }}>Mediator</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: C.gold, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500 }}>Coupling at MZ</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Quarks (3 gen.)", "u, d; c, s; t, b", "8 gluons (SU(3))", "α₃ ≈ 0.118"],
                ["Leptons (3 gen.)", "e νₑ; μ νμ; τ ντ", "W±, Z (SU(2)L)", "α₂ ≈ 0.034"],
                ["Hypercharge", "left-/right-handed fermions", "B (U(1)Y)", "α₁ ≈ 0.017"],
                ["EM after EWSB", "all charged particles", "γ (massless)", "α ≈ 1/137"],
                ["Higgs", "H (m ≈ 125 GeV)", "—", "λ ≈ 0.13"],
                ["Gravity (not in SM)", "all energy", "graviton (?)", "GN E²/ℏc"],
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}66` }}>
                  <td style={{ padding: "6px 8px", color: C.inkBr, fontStyle: "italic" }}>{r[0]}</td>
                  <td style={{ padding: "6px 8px", color: C.ink, fontFamily: FONT_MONO, fontSize: 11.5 }}>{r[1]}</td>
                  <td style={{ padding: "6px 8px", color: C.teal }}>{r[2]}</td>
                  <td style={{ padding: "6px 8px", color: C.inkDim, fontFamily: FONT_MONO, fontSize: 11.5 }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose>
          The Standard Model — SU(3)<sub>c</sub> × SU(2)<sub>L</sub> × U(1)<sub>Y</sub>, broken to SU(3)<sub>c</sub> × U(1)<sub>em</sub> by the Higgs — has survived every test for fifty years. But it leaves three forces (after EWSB they are em, weak, strong) with three different couplings, plus gravity entirely outside. Three is not one. The next move is to ask: are α<sub>1</sub>, α<sub>2</sub>, α<sub>3</sub> three faces of <em>one</em> coupling at some higher energy?
        </Prose>

        {/* ═══════════════════ IV · GRAND UNIFIED THEORIES ═══════════════════ */}
        <SectionHead number="IV" title="Grand Unified Theories" eyebrow="SU(5) · SO(10) · PROTON DECAY" />

        <Prose>
          As the EBSCO research-starter on Grand Unification puts it, GUTs &ldquo;strive to combine the strong, weak, and electromagnetic forces&rdquo; into a single gauge structure. The defining observation, made by Georgi, Quinn and Weinberg in 1974, is that the three Standard Model couplings, when run with the renormalisation group toward higher energies, <em>almost</em> meet at a single point near 10<sup>16</sup> GeV.
        </Prose>

        <Eq number="IV.1">{"\\alpha_i^{-1}(\\mu) = \\alpha_i^{-1}(M_Z) - \\frac{b_i}{2\\pi} \\ln \\frac{\\mu}{M_Z}, \\quad (b_1, b_2, b_3)_{\\mathrm{SM}} = \\Big(\\tfrac{41}{10}, -\\tfrac{19}{6}, -7\\Big)."}</Eq>

        <Figure number="2" caption="Renormalisation-group running of the three Standard Model gauge couplings α_i⁻¹(μ) from the Z mass up to the conjectured GUT scale. Solid lines: pure Standard Model (the three couplings nearly but not exactly meet near 10¹⁶ GeV). Dotted lines: minimal supersymmetric extension (MSSM) with superpartners at the TeV scale — the three couplings meet to within experimental uncertainty. Convergence is the central numerical evidence for grand unification.">
          <ChartHost hostRef={couplingRef} ready={couplingReady} height={responsive.isMobile ? 360 : 410} />
        </Figure>

        <Prose>
          Georgi and Glashow proposed the simplest GUT in 1974: the gauge group <strong>SU(5)</strong>. It elegantly fits one generation of Standard Model fermions into the representations <M>{"\\bar{5} \\oplus 10"}</M>:
        </Prose>

        <Eq number="IV.2">{"\\bar{5} = (d^c, L), \\qquad 10 = (Q, u^c, e^c), \\qquad SU(5) \\supset SU(3)_c \\times SU(2)_L \\times U(1)_Y."}</Eq>

        <Prose>
          But unifying quarks (which feel the strong force) with leptons (which do not) inside one multiplet means the gauge bosons of SU(5) include new <em>X</em> and <em>Y</em> bosons that mediate transitions between them. These transitions allow the proton to decay:
        </Prose>

        <Eq number="IV.3">{"p \\;\\to\\; e^+ + \\pi^0, \\qquad \\tau_p \\sim \\frac{M_X^4}{m_p^5} \\;\\sim\\; 10^{31\\text{–}32} \\text{ years}."}</Eq>

        <Theorem kind="Result" number="IV.1" title="The proton is stable beyond the simplest GUT" tone="crimson">
          Underground detectors (Kamiokande, IMB, Super-Kamiokande, and now Hyper-K) have monitored ~10<sup>34</sup> proton-years and seen no decay events. The current bound τ<sub>p</sub> &gt; 1.6 × 10<sup>34</sup> years <em>excludes</em> minimal SU(5). Surviving GUTs must either embed in a larger group (SO(10), E<sub>6</sub>) or invoke supersymmetry, both of which suppress proton decay sufficiently while preserving coupling unification.
        </Theorem>

        <Prose>
          The next-larger candidate is <strong>SO(10)</strong> (Fritzsch, Minkowski, Georgi, 1975). It places one full generation — including a right-handed neutrino — in a single 16-dimensional spinor representation. SO(10) automatically generates neutrino masses by the see-saw mechanism, predicts magnetic monopoles (still unobserved), and naturally accommodates baryogenesis through leptogenesis. <strong>E<sub>6</sub></strong>, the next exceptional group, has been suggested by string-derived models. None has been experimentally confirmed.
        </Prose>

        <div style={{
          margin: "16px 0", padding: "14px 16px",
          background: `${C.indigo}10`, border: `1px solid ${C.indigo}55`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.indigo, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
            why GUTs would matter
          </div>
          <div style={{ fontFamily: FONT_MATH, fontSize: 14, color: C.ink, lineHeight: 1.6 }}>
            (i) explanation of charge quantisation (electron charge = 1/3 of quark charge); (ii) prediction of the matter–antimatter asymmetry via <em>B − L</em> violation; (iii) natural neutrino masses; (iv) baryogenesis from heavy GUT-scale processes; (v) theoretical motivation for inflation at <M>{"M_{\\mathrm{GUT}}^4"}</M> energies.
          </div>
        </div>

        <SubHead title="Primary papers · GUTs and proton decay" tone="indigo" />
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="Phys. Rev. Lett. 32, 438 (1974)" title="Georgi & Glashow — Unity of all elementary-particle forces" tone="indigo">
            The founding paper. Strong, electromagnetic and weak forces are conjectured to arise from a single SU(5) gauge interaction. The fermions of one generation fit into the <M>{"\\bar 5 \\oplus 10"}</M> representation; quark and lepton charges are quantised together; <em>X</em> and <em>Y</em> bosons of mass <M>{"\\sim 10^{15}\\,\\text{GeV}"}</M> mediate proton decay.{" "}
            <RefLink href="https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.32.438">journals.aps.org/prl/abstract/10.1103/PhysRevLett.32.438</RefLink>
          </Card>
          <Card eyebrow="Phys. Rev. D 102, 112011 (2020)" title="Super-Kamiokande — search for p → e⁺π⁰ and p → μ⁺π⁰" tone="crimson">
            Enlarged-fiducial analysis (450 kton·year exposure, runs I–IV). Sets the partial-lifetime bounds <M>{"\\tau / B(p \\to e^+ \\pi^0) > 2.4 \\times 10^{34}"}</M> yr and <M>{"\\tau / B(p \\to \\mu^+ \\pi^0) > 1.6 \\times 10^{34}"}</M> yr at 90% CL. Minimal non-supersymmetric SU(5) is excluded; minimal SUSY-SU(5) is severely constrained.{" "}
            <RefLink href="https://journals.aps.org/prd/abstract/10.1103/PhysRevD.102.112011">journals.aps.org/prd/abstract/10.1103/PhysRevD.102.112011</RefLink>
          </Card>
          <Card eyebrow="arXiv hep-ph/0505200" title="Babu & Macesanu — neutrino masses in minimal SO(10)" tone="indigo">
            With Higgs in the <M>{"10 \\oplus \\overline{126}"}</M> representations only, SO(10) makes 12 predictions for the neutrino sector once the charged-lepton and quark masses are fit. The fit favours a normal mass hierarchy with atmospheric mixing close to maximal — quantitatively consistent with experiment. Type-II seesaw dominance is selected.{" "}
            <RefLink href="https://arxiv.org/abs/hep-ph/0505200">arxiv.org/abs/hep-ph/0505200</RefLink>
          </Card>
          <Card eyebrow="arXiv 2506.20708" title="Carrasco-Martinez et al. — flavor in SO(10) with a spinor Higgs" tone="indigo">
            Recent (2025) treatment of SO(10) with a single <M>16</M> Higgs that breaks the gauge symmetry directly to the Standard Model. Cabibbo angle and lepton mixing emerge from a single Yukawa structure plus the spinor VEV; predicts long-lived proton decay just below the next round of Hyper-K sensitivity.{" "}
            <RefLink href="https://arxiv.org/abs/2506.20708">arxiv.org/abs/2506.20708</RefLink>
          </Card>
        </div>

        <Theorem kind="Status" number="IV.2" title="Where the GUT programme stands in 2024" tone="gold">
          Coupling unification: <em>almost</em> in pure SM, <em>essentially exact</em> in the MSSM at <M>{"\\sim 2 \\times 10^{16}\\,\\text{GeV}"}</M>. Proton decay: minimal SU(5) excluded; SO(10) and SUSY variants alive but cornered. Magnetic monopoles: never seen. Inflation seeded at the GUT scale: consistent with CMB tensor-to-scalar bound <M>{"r < 0.036"}</M> (BICEP/Keck, 2021). Verdict: the GUT idea has survived, the simplest realisations have not.
        </Theorem>


        <SectionHead number="V" title="Supersymmetry" eyebrow="BOSONS ↔ FERMIONS · MSSM · DARK MATTER" />

        <Prose>
          Quoting LoSecco&#8217;s EBSCO entry: &ldquo;Supersymmetry introduces a relationship between bosons and fermions, suggesting that each known particle has a superpartner.&rdquo; A supersymmetric transformation Q acts as
        </Prose>

        <Eq number="V.1">{"Q \\, |\\text{boson}\\rangle = |\\text{fermion}\\rangle, \\qquad Q \\, |\\text{fermion}\\rangle = |\\text{boson}\\rangle, \\qquad \\{Q_\\alpha, \\bar{Q}_{\\dot\\beta}\\} = 2 \\sigma^\\mu_{\\alpha\\dot\\beta} P_\\mu."}</Eq>

        <Prose>
          The anticommutator on the right is <em>spacetime translation</em>: SUSY is a non-trivial extension of the Poincaré algebra (Coleman–Mandula notwithstanding, by use of graded Lie superalgebras). For every known particle SUSY predicts a partner with opposite statistics: electrons pair with selectrons, quarks with squarks, photons with photinos, gluons with gluinos. Local supersymmetry plus general covariance gives <strong>supergravity</strong>, which contains a graviton and its spin-3/2 partner, the gravitino.
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="why SUSY" title="Hierarchy" tone="teal">
            Cancels the quadratic divergence of the Higgs mass (the &ldquo;hierarchy problem&rdquo;) provided superpartners are not too far above the TeV scale. This is the strongest theoretical motivation.
          </Card>
          <Card eyebrow="why SUSY" title="Coupling unification" tone="indigo">
            Adding superpartners to the running of α<sub>1,2,3</sub> shifts the b-coefficients to <M>{"(33/5, 1, -3)"}</M>, producing meeting at a single point near 2 × 10<sup>16</sup> GeV — the dotted lines in Figure 2.
          </Card>
          <Card eyebrow="why SUSY" title="Dark matter" tone="gold">
            R-parity protects the lightest superpartner (LSP), typically the neutralino, from decay. A weakly interacting particle of mass ~100 GeV is exactly what cosmological data require for cold dark matter.
          </Card>
        </div>

        <Theorem kind="Status" number="V.1" title="LHC bounds on SUSY" tone="crimson">
          Eight years of LHC running at √s = 13 TeV have pushed gluino masses above ~2.3 TeV and squark masses above ~1.6 TeV in the simplest scenarios. SUSY is not excluded — natural variants survive at higher masses, with compressed spectra, or through R-parity violation — but minimal &ldquo;natural&rdquo; SUSY at the EW scale is now in tension with data. The Higgs mass m<sub>H</sub> ≈ 125 GeV is itself a mild surprise for the MSSM and pushes superpartners higher.
        </Theorem>

        {/* ═══════════════════ VI · STRINGS, BRANES, M-THEORY ═══════════════════ */}
        <SectionHead number="VI" title="Strings, branes, M-theory" eyebrow="10/11 DIMENSIONS · DUALITIES" />

        <Prose>
          String theory replaces point particles with one-dimensional <em>strings</em> whose vibrational modes correspond to the spectrum of particles, including a massless spin-2 mode that is automatically a graviton. Quantum consistency (vanishing of the conformal anomaly) requires the bosonic string to live in 26 spacetime dimensions; the supersymmetric string (superstring), in 10. There are five consistent superstring theories — Type I, Type IIA, Type IIB, heterotic SO(32), heterotic E<sub>8</sub>×E<sub>8</sub> — connected by a web of dualities.
        </Prose>

        <Eq number="VI.1">{"S_{\\mathrm{Polyakov}} = -\\tfrac{T}{2} \\int d^2\\sigma \\, \\sqrt{-h} \\, h^{ab} \\partial_a X^\\mu \\partial_b X_\\mu, \\qquad T = \\frac{1}{2\\pi \\alpha'}."}</Eq>

        <Prose>
          In 1995 Edward Witten conjectured that all five superstring theories plus 11-dimensional supergravity are limits of a single 11-dimensional &ldquo;<strong>M-theory</strong>&rdquo;, whose fundamental degrees of freedom include not only strings but also higher-dimensional <em>branes</em>. The extra six (or seven) dimensions are presumed compactified on a Calabi–Yau manifold; the choice of compactification controls which Standard Model is realised at low energy. The number of consistent compactifications — the &ldquo;string landscape&rdquo; — is estimated at ~10<sup>500</sup>, which has spawned a vigorous debate about whether the framework is predictive at all.
        </Prose>

        <div style={{
          margin: "14px 0", padding: "14px 16px",
          background: `${C.violet}10`, border: `1px solid ${C.violet}55`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.violet, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            five superstring theories + 11D sugra
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: responsive.isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
            {[
              ["Type I",        "open + closed unoriented", "SO(32) gauge"],
              ["Type IIA",      "closed oriented",         "non-chiral, branes p=0,2,4,6,8"],
              ["Type IIB",      "closed oriented",         "chiral, S-dual, branes p=−1,1,3,5,7"],
              ["Heterotic SO(32)", "closed, hybrid",      "SO(32) × right-movers"],
              ["Heterotic E₈×E₈", "closed, hybrid",       "two E₈, attractive for GUTs"],
              ["11D Supergravity","point particles",       "M-theory low-E limit"],
            ].map((r, i) => (
              <div key={i} style={{ padding: "8px 10px", background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 3 }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.violet, letterSpacing: 1.4, textTransform: "uppercase" }}>{r[0]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 12, color: C.ink, marginTop: 2 }}>{r[1]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 2 }}>{r[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <Prose>
          Strings give a quantum-mechanical, anomaly-free framework that <em>contains</em> a graviton, gauge interactions, and chiral fermions. They are the most-studied candidate for a unified field theory including gravity. They have not, however, made any unique experimentally tested prediction. The recent <em>spacefed.com</em> piece, Britannica&#8217;s related-topics list, and the Wikipedia article all flag this point: string theory is a structurally compelling candidate for a TOE, not an established one.
        </Prose>

        <SubHead title="Calabi–Yau compactification — where the extra dimensions live" tone="violet" />
        <Prose>
          A superstring lives in ten spacetime dimensions; we observe four. The standard resolution is <em>compactification</em>: six of the dimensions are curled up on a tiny internal manifold whose geometry then dictates the low-energy physics. <strong>Calabi conjectured</strong> in 1957, and <strong>Yau proved</strong> in 1977, that every compact Kähler manifold of vanishing first Chern class admits a unique Ricci-flat metric in each Kähler class. Such a manifold — a <em>Calabi–Yau manifold</em> — has exactly the right properties to preserve <M>{"\\mathcal{N} = 1"}</M> supersymmetry in 4D after compactification of the heterotic string (Candelas, Horowitz, Strominger, Witten, 1985).
        </Prose>

        <Eq number="VI.2">{"\\mathbb{R}^{1,3} \\times X_6, \\qquad X_6: \\;\\; c_1(X_6) = 0, \\;\\; \\mathrm{Ric}(g) = 0, \\;\\; \\mathrm{Hol}(g) \\subseteq SU(3)."}</Eq>

        <Prose>
          The simplest non-trivial example is the <strong>quintic threefold</strong>: a smooth degree-5 hypersurface in <M>{"\\mathbb{CP}^4"}</M>. The Fermat-quintic family is parametrised by a complex deformation parameter <M>\psi</M>:
        </Prose>

        <Eq number="VI.3">{"X_\\psi \\;=\\; \\Big\\{ [z_1 : z_2 : z_3 : z_4 : z_5] \\in \\mathbb{CP}^4 : \\;\\; z_1^5 + z_2^5 + z_3^5 + z_4^5 + z_5^5 - 5\\psi \\, z_1 z_2 z_3 z_4 z_5 = 0 \\Big\\}."}</Eq>

        <Prose>
          Its Hodge numbers are <M>{"h^{1,1} = 1"}</M> and <M>{"h^{2,1} = 101"}</M>; its Euler characteristic is <M>{"\\chi(X) = -200"}</M>. The 101 complex-structure moduli and the 1 Kähler modulus parametrise the family of consistent compactifications. Crucially, the number of fermion generations seen at low energy is determined by <M>{"|\\chi(X)|/2"}</M> (heterotic <em>standard embedding</em>), so getting three generations requires <M>{"|\\chi| = 6"}</M> — driving an extensive search of Calabi–Yau threefolds with the right topology. Mirror symmetry (Greene–Plesser, 1990; Candelas–de la Ossa–Green–Parkes, 1991) then pairs each <M>X</M> with a topologically different mirror <M>{"\\tilde X"}</M> having <M>{"h^{1,1}(\\tilde X) = h^{2,1}(X)"}</M>, exchanging A-model and B-model topological string amplitudes — one of the deepest equivalences in mathematical physics.
        </Prose>

        <Figure number="3" caption="Real cross-section of the quintic Calabi–Yau threefold X_ψ. The full manifold is six real (three complex) dimensions, embedded in a four-complex-dimensional projective space; only a 2-real-dimensional slice can be visualised. The slider sweeps the deformation parameter ψ — at ψ = 1 the surface develops a conifold singularity (Strominger 1995, used to resolve the type-IIB conifold transition); away from ψ = 1 the manifold is smooth. Each value of ψ gives a different vacuum of the heterotic string, with different Standard Model gauge content. Colours encode the value of the defining quintic polynomial along the slice.">
          <ChartHost hostRef={cyRef} ready={cyReady} height={responsive.isMobile ? 360 : 440} />
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 12,
            padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 1.6, textTransform: "uppercase" }}>quintic deformation:</span>
            <label style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.violet, letterSpacing: 1.4 }}>ψ</label>
            <input type="range" min={-1.4} max={1.4} step={0.05} value={cyPsi} onChange={e => setCyPsi(+e.target.value)} style={{ flex: 1, maxWidth: 280 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.violet, minWidth: 50 }}>{cyPsi.toFixed(2)}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.inkDim }}>
              h¹,¹=<span style={{ color: C.gold }}>1</span> · h²,¹=<span style={{ color: C.teal }}>101</span> · χ=<span style={{ color: C.crimson }}>−200</span>
            </span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 12,
          }}>
            <Metric label="Real dim" value="6" tone="violet" />
            <Metric label="Complex dim" value="3" tone="indigo" />
            <Metric label="Holonomy" value="SU(3)" tone="gold" />
            <Metric label="Generations" value="|χ|/2" tone="teal" />
          </div>
        </Figure>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><ManifoldGallery /></Suspense></LazyMount>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><AdvancedGallery /></Suspense></LazyMount>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><UnificationCharts /></Suspense></LazyMount>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><StringTheoryGallery /></Suspense></LazyMount>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><CrossSectionGallery /></Suspense></LazyMount>

        <LazyMount minHeight={600}><Suspense fallback={<GalleryFallback />}><LieGroupGallery /></Suspense></LazyMount>

        <Theorem kind="Theorem" number="VI.1" title="Yau's theorem (1977)" tone="violet">
          Let <M>X</M> be a compact Kähler manifold with vanishing first Chern class <M>{"c_1(X) = 0"}</M>. Then in every Kähler class <M>{"[\\omega] \\in H^{1,1}(X, \\mathbb{R})"}</M> there exists a unique Ricci-flat Kähler metric. Equivalently, the Monge–Ampère equation <M>{"\\det(g_{i \\bar j} + \\partial_i \\bar\\partial_j \\phi) = e^F \\det(g_{i \\bar j})"}</M> has a unique smooth solution. This is the existence theorem that allowed string theorists to assert that suitable compactification manifolds exist without writing down the metric explicitly.
        </Theorem>

        <Prose>
          The 6-dimensional internal Calabi–Yau is the geometric carrier of <em>all</em> low-energy physics in heterotic string theory: gauge group, fermion generations, Yukawa couplings, and the cosmological constant are read off from its topology and complex structure. The size of the moduli space — the &ldquo;<strong>landscape</strong>&rdquo; of <M>{"\\sim 10^{500}"}</M> consistent flux compactifications (Bousso–Polchinski, 2000; Douglas, 2003) — is the central tension in string phenomenology: the framework is rigid in principle but explosively non-unique in practice.
        </Prose>

        <Prose>
          Strings give a quantum-mechanical, anomaly-free framework that <em>contains</em> a graviton, gauge interactions, and chiral fermions. They are the most-studied candidate for a unified field theory including gravity. They have not, however, made any unique experimentally tested prediction. The recent <em>spacefed.com</em> piece, Britannica&#8217;s related-topics list, and the Wikipedia article all flag this point: string theory is a structurally compelling candidate for a TOE, not an established one.
        </Prose>

        <SectionHead number="VII" title="Towards a Theory of Everything" eyebrow="QUANTUM GRAVITY · OPEN PROBLEMS" />

        <Prose>
          Even a successful GUT would not be a TOE, because gravity is still missing. Sutton&#8217;s Britannica article ends precisely on this point: &ldquo;A successful GUT will still not include gravity. The problem here is that theorists do not yet know how to formulate a workable quantum field theory of gravity based on the exchange of a hypothesised graviton.&rdquo;
        </Prose>

        <Eq number="VII.1">{"\\big[\\,\\hat{x}^\\mu, \\hat{p}_\\nu\\,\\big] = i\\hbar \\, \\delta^\\mu{}_\\nu, \\qquad G_{\\mu\\nu}[\\,g\\,] = \\frac{8\\pi G}{c^4} \\langle \\hat{T}_{\\mu\\nu} \\rangle_{\\!|g|}: \\;\\text{operator on the left, c-number metric on the right.}"}</Eq>

        <Prose>
          The conceptual obstruction is that quantum field theory presupposes a <em>fixed background spacetime</em>, while general relativity makes spacetime dynamical. Trying to quantise the metric perturbatively gives a non-renormalisable theory: at high energies, an infinite series of counterterms is required and predictivity collapses. Three main approaches address this:
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="approach A" title="String / M-theory" tone="violet">
            UV-complete by construction; predicts a graviton; requires extra dimensions and supersymmetry. AdS/CFT shows it is mathematically consistent in some limits.
          </Card>
          <Card eyebrow="approach B" title="Loop quantum gravity" tone="indigo">
            Quantises the geometry of space directly; predicts discrete area and volume spectra. Background-independent. Has not yet reproduced general relativity in the classical limit unambiguously.
          </Card>
          <Card eyebrow="approach C" title="Emergent / asymptotic safety" tone="gold">
            Spacetime emerges from more primitive degrees of freedom (causal sets, tensor networks, holography). Asymptotic safety conjectures a non-trivial UV fixed point of GR&#8217;s renormalisation group.
          </Card>
        </div>

        <Theorem kind="Open" number="VII.1" title="Why a TOE remains open" tone="crimson">
          No experimental probe currently reaches the Planck scale (10<sup>19</sup> GeV). Direct tests of quantum gravity are 16 orders of magnitude beyond LHC energies. Indirect tests (CMB, gravitational waves, black-hole information paradox) constrain candidate theories but do not yet pick one out. Until an experimental discriminator exists, &ldquo;TOE&rdquo; remains an aspirational label.
        </Theorem>

        <SubHead title="Quantum gravity — three live programmes" tone="indigo" />
        <Prose>
          The three approaches in the cards above are not equally developed; each has a defining technical paper and a defining open problem.
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="String / M-theory" title="Witten — String theory dynamics in various dimensions (1995)" tone="violet">
            <em>Nucl. Phys. B 443, 85.</em> Showed that the five 10-dimensional superstring theories and 11-dimensional supergravity are limits of a single 11-D theory (later called <em>M-theory</em>), connected by a web of strong-weak (S) and large-small (T) dualities. Triggered the &ldquo;second superstring revolution&rdquo;.{" "}
            <RefLink href="https://www.sciencedirect.com/science/article/abs/pii/055032139500158O">sciencedirect.com — Witten 1995</RefLink>
          </Card>
          <Card eyebrow="Loop quantum gravity" title="Rovelli & Smolin — discreteness of area and volume (1994)" tone="indigo">
            <em>arXiv gr-qc/9411005.</em> Proved that area and volume operators in canonical quantum gravity have discrete spectra,
            <M>{" \\;A_n = 8\\pi G \\hbar \\sum_i \\sqrt{j_i(j_i+1)},"}</M>
            with <M>{"j_i \\in \\{0, 1/2, 1, \\ldots\\}"}</M> labelling spin-network edges crossing the surface. Spacetime is granular at the Planck scale.{" "}
            <RefLink href="https://arxiv.org/abs/gr-qc/9411005">arxiv.org/abs/gr-qc/9411005</RefLink>
          </Card>
          <Card eyebrow="Asymptotic safety" title="Bonanno et al. — critical reflections on AS gravity (2020)" tone="gold">
            <em>arXiv 2004.06810; Front. Phys. 8, 269.</em> Comprehensive review of Weinberg&#8217;s 1979 conjecture that gravity has a non-trivial UV fixed point of the renormalisation group flow. Functional-RG calculations consistently find such a fixed point in truncations; mathematical control of the full theory remains open.{" "}
            <RefLink href="https://arxiv.org/abs/2004.06810">arxiv.org/abs/2004.06810</RefLink>
          </Card>
        </div>

        <Eq number="VII.2">{"\\text{Asymptotic safety: } \\;\\; \\beta(g_*) = 0, \\;\\; \\det\\!\\bigg(\\frac{\\partial \\beta}{\\partial g}\\bigg)_{g_*} \\!\\!\\neq 0, \\;\\; \\dim \\mathcal{M}_{\\text{UV}} < \\infty \\;\\; \\Rightarrow \\;\\; \\text{predictivity restored.}"}</Eq>

        <Theorem kind="Open problems" number="VII.2" title="What a successful TOE must do" tone="crimson">
          (i) Reproduce general relativity in the IR limit. (ii) Reproduce the Standard Model gauge group and three generations. (iii) Resolve the black-hole information paradox without breaking unitarity. (iv) Explain the value of the cosmological constant <M>{"\\Lambda \\sim 10^{-122} M_{\\mathrm{Pl}}^4"}</M>. (v) Make at least one quantitative prediction below the Planck scale that is testable in our lifetime. No present candidate satisfies all five.
        </Theorem>


        <SectionHead number="VIII" title="Cosmological frame" eyebrow="BIG BANG · BBN · CMB · DARK SECTOR" />

        <Prose>
          Cosmology is the laboratory in which unification is most directly tested, because the early universe reaches energies our colliders cannot. The Britannica entry on cosmology (uploaded as the source PDF) traces the standard <em>hot Big Bang</em> picture: at very early times the universe was a hot dense plasma, expanding and cooling. As it cooled it passed through a sequence of <em>symmetry-breaking transitions</em> that turned a single high-energy theory into the four distinct forces we observe today.
        </Prose>

        <Eq number="VIII.1">{"\\text{TOE} \\;\\xrightarrow{10^{19}\\,\\text{GeV}}\\; \\text{GUT} \\;\\xrightarrow{10^{16}}\\; SU(3)\\times SU(2)\\times U(1) \\;\\xrightarrow{10^{2}}\\; SU(3)\\times U(1)_{\\mathrm{em}}."}</Eq>

        <Figure number="4" caption="Interactive symmetry-breaking cascade. Move the slider to set the cosmic energy scale log₁₀(E/GeV); the highlighted ring marks the symmetry that is currently active in the universe at that temperature. The four square plates stack the unification ladder (top → bottom): TOE, unified field with gravity, GUT, Standard Model, electroweak-broken phase. Solid gold links between plates indicate transitions that have already occurred in cosmic history (E_now < E_transition); dotted grey links indicate restorations that exist only above the slider position. The floating surface at the bottom is the Higgs (Mexican-hat) potential V(φ) = −μ²|φ|² + λ|φ|⁴, which morphs from a single symmetric well at high T to a degenerate vacuum manifold at low T — the geometric mechanism of every transition above.">
          <ChartHost hostRef={breakRef} ready={breakReady} height={responsive.isMobile ? 540 : 660} />
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 12,
            padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 1.6, textTransform: "uppercase" }}>cosmic energy scale:</span>
            <label style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 1.4 }}>log₁₀(E/GeV)</label>
            <input type="range" min={-3} max={20} step={0.1} value={logE} onChange={e => setLogE(+e.target.value)} style={{ flex: 1, maxWidth: 320 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.gold, minWidth: 50 }}>{logE.toFixed(1)}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.inkDim }}>
              T ≈ <span style={{ color: C.crimson }}>{(Math.pow(10, logE) * 1.16e13).toExponential(1)}</span> K
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            {[
              ["19", "Planck / TOE"],
              ["16", "GUT breaking"],
              ["2.4", "Electroweak"],
              ["−0.5", "QCD confinement"],
            ].map(([e, label]) => (
              <button key={e} onClick={() => setLogE(+e)} style={{
                padding: "6px 10px", background: Math.abs(logE - +e) < 0.3 ? `${C.gold}33` : C.panelAlt,
                border: `1px solid ${Math.abs(logE - +e) < 0.3 ? C.gold : C.border}`, borderRadius: 3,
                fontFamily: FONT_MONO, fontSize: 10, color: C.inkBr, letterSpacing: 1.3, textTransform: "uppercase", cursor: "pointer",
              }}>
                {label} · 10<sup>{e}</sup>
              </button>
            ))}
          </div>
        </Figure>


        <Prose>
          The cosmological evidence that anchors this story includes: the <em>cosmic microwave background</em> (CMB), the relic radiation released ~380,000 years after the Big Bang, with a near-perfect blackbody spectrum at T = 2.725 K and tiny anisotropies of order 10<sup>−5</sup>; <em>Big Bang nucleosynthesis</em> (BBN), which predicts the primordial abundances of D, <sup>3</sup>He, <sup>4</sup>He and <sup>7</sup>Li to within a few percent given a single parameter (the baryon-to-photon ratio η ≈ 6 × 10<sup>−10</sup>); and the <em>large-scale structure</em> mapped by surveys such as SDSS and Euclid.
        </Prose>

        <div style={{
          margin: "14px 0", padding: "14px 16px",
          background: C.bgDeep, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            ΛCDM concordance · current best values
          </div>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))" }}>
            {[
              ["H₀", "67.4 km/s/Mpc", "Planck"],
              ["Ωm", "0.315", "matter density"],
              ["ΩΛ", "0.685", "dark energy"],
              ["Ωb", "0.0493", "baryons"],
              ["t₀", "13.8 Gyr", "age of universe"],
              ["TCMB", "2.725 K", "blackbody"],
              ["η", "6.1×10⁻¹⁰", "baryon/photon"],
              ["Yp", "0.247", "primordial He"],
            ].map((r, i) => (
              <div key={i} style={{ padding: "6px 8px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3 }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase" }}>{r[0]}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkBr }}>{r[1]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 10.5, color: C.inkDim, fontStyle: "italic" }}>{r[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <Prose>
          Two outstanding problems dominate cosmology today. <strong>Dark matter</strong> (≈26% of the energy budget): unseen, non-baryonic, presumed to be a particle outside the Standard Model. The neutralino of SUSY, axions of Peccei–Quinn, and sterile neutrinos all remain candidates. <strong>Dark energy</strong> (≈69%): a cosmological constant or slowly-varying scalar field driving the observed acceleration of cosmic expansion (Riess–Perlmutter, Nobel 2011). Both are signs that the Standard Model + general relativity do not exhaust nature; both are natural targets for whatever unified framework eventually replaces them.
        </Prose>

        {/* ═══════════════════ VIII½ · CHUNG'S UNIFIED THEORY OF PHYSICS ═══════════════════ */}
        <SectionHead number="VIII½" title="Chung's Unified Theory of Physics" eyebrow="SPACE–OBJECT STRUCTURE · 4-STAGE COSMOLOGY · PERIODIC TABLE OF PARTICLES" />

        <Prose>
          A distinct, heterodox unification programme due to <strong>Ding-Yu Chung</strong> (<em>The Unified Theory of Physics</em>, arXiv:hep-th/0201115, v17) merits a standalone treatment because it attempts what no mainstream framework above has achieved in closed form: a <em>single dimensional accountancy</em> that simultaneously yields (i) a periodic table of all elementary particles with calculated masses, (ii) the observed dark energy / dark matter / baryon split, (iii) the four force fields as developmental stages of one zero-energy universe, and (iv) the inflation, Big Bang, and galaxy-formation sequence. We summarise its architecture and headline numbers; the reader should treat this as a non-Standard-Model proposal whose status is conjectural but whose <em>structural</em> resonance with the Trip kernel (next section) is striking.
        </Prose>

        <Pill tone="violet">arXiv:hep-th/0201115v17</Pill>
        <Pill tone="indigo">Zero-energy universe</Pill>
        <Pill tone="teal">Space–object duality</Pill>
        <Pill tone="gold">11D → 10D → 10D → 4D cascade</Pill>
        <Pill tone="crimson">Calculated Higgs mass</Pill>

        <SubHead number="VIII½.1" title="The space–object structures" tone="teal" />

        <Prose>
          Chung posits that the universe decomposes into a <em>space structure</em> and an <em>object structure</em>, related by Higgs-boson combination rules on a binary alphabet <M>{"(1)_n \\leftrightarrow (0)_n"}</M>. The three combinations <M>{"(1\\,0)_n,\\;(1+0)_n,\\;(1)_n(0)_n"}</M> generate, respectively, the lattice, partition, and binary phases that organise spacetime. The object structure is encoded by four superscripted–subscripted dimensional indices
        </Prose>

        <Eq number="VIII½.1">{"\\;{}^{3}_{11},\\quad {}^{2}_{10},\\quad {}^{1}_{4\\to 10},\\quad {}^{0}_{4\\to 11}"}</Eq>

        <Prose>
          and the dimensional energy ladder
        </Prose>

        <Eq number="VIII½.2">{"E \\;=\\; \\frac{M c^{2}}{\\alpha^{\\,2(D-4)}}"}</Eq>

        <Prose>
          where <M>{"\\alpha \\approx 1/137"}</M> is the fine-structure constant and <M>{"D"}</M> is the spatial dimensionality of the relevant orbital. This single power law is what carries the calculation from electroweak masses up to the GUT scale and back down to galactic dynamics.
        </Prose>

        <SubHead number="VIII½.2" title="The four-stage cosmology" tone="indigo" />

        <Prose>
          Rather than a single Big Bang, Chung's universe runs through a four-stage cycle, each stage hosting one of the four fundamental forces:
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="Stage 1 · Strong" title="11D membrane dual universe" tone="crimson">
            The strong force emerges from the membrane phase. Eleven dimensions, dual structure (object ↔ anti-object), zero net energy.
          </Card>
          <Card eyebrow="Stage 2 · Gravitational" title="10D string dual universe" tone="indigo">
            One dimension compactifies; the resulting 10D string phase carries the gravitational interaction. Strings are the natural quanta of the dual stress field.
          </Card>
          <Card eyebrow="Stage 3 · Charged" title="10D particle dual universe" tone="teal">
            Strings condense into point particles; electromagnetism appears as the long-range charge interaction. The Standard Model gauge structure is recovered here.
          </Card>
          <Card eyebrow="Stage 4 · Current" title="Asymmetrical light–dark dual universe" tone="gold">
            Symmetry between matter and dark sector breaks asymmetrically. The weak force survives as the residue of the broken duality. This is the universe we observe.
          </Card>
        </div>

        <Prose>
          The cycle then repeats — the <em>repetitive cosmology</em> is essential to the bookkeeping of the cosmological constant, which in this framework is not fine-tuned but emerges as a stage-transition residue.
        </Prose>

        <SubHead number="VIII½.3" title="The dark sector budget — calculated, not fitted" tone="gold" />

        <Prose>
          The headline numerical claim of the framework is that the dark-sector / baryon split is fully <em>calculated</em> from the dimensional ladder, with no free parameters tuned to observation:
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Metric label="Dark energy (calc.)" value="72.8 %" sub="Planck 2018: 68.5 ± 0.7" />
          <Metric label="Dark matter (calc.)" value="22.7 %" sub="Planck 2018: 26.5 ± 0.5" />
          <Metric label="Baryonic matter (calc.)" value="4.53 %" sub="Planck 2018: 4.9 ± 0.1" />
          <Metric label="Onset of dark energy" value="4.47 Gyr ago" sub="observed: 4.71 ± 0.98 Gyr" />
        </div>

        <Prose>
          Whether the agreement is genuinely predictive or a numerological coincidence is, of course, the open question — but the structural form of the calculation (a discrete sum of dimensional contributions weighted by powers of <M>{"\\alpha"}</M>) is exactly the kind of <em>graded invariant</em> we will meet again in the Trip kernel.
        </Prose>

        <SubHead number="VIII½.4" title="Periodic table of elementary particles" tone="violet" />

        <Prose>
          Every known lepton and quark — and several predicted ones — sits at a definite cell <M>{"(d, a)"}</M> of a two-index lattice with <M>{"d \\in \\{5,\\dots,11\\}"}</M> the dimensional orbital and <M>{"a"}</M> the auxiliary index. Masses are produced by the boson and fermion mass formulae
        </Prose>

        <Eq number="VIII½.3">{"M_{B_{d,0}} \\;=\\; \\frac{M_{B_{d-1,0}}}{\\alpha\\,\\cos^{2}\\!\\Theta_{W}}\\,\\sum_{a=0}^{a} a^{4}, \\qquad M_{a} \\;=\\; M_{e} + \\frac{3 M_{e}}{2\\alpha}\\sum_{a=0}^{a} a^{4}"}</Eq>

        <Prose>
          and the electroweak/strong coupling ratios are tied by
        </Prose>

        <Eq number="VIII½.4">{"\\frac{G_{8}}{G_{7}} \\;=\\; \\frac{\\alpha\\, E_{7}^{2}\\,\\cos^{2}\\!\\Theta_{W}}{\\alpha_{W}\\, E_{8}^{2}}."}</Eq>

        <Prose>
          The mass of the LHC Higgs (≈ 125 GeV) and its decay channels — <M>{"H \\to \\gamma\\gamma,\\;ZZ,\\;WW,\\;b\\bar{b},\\;\\tau\\bar{\\tau}"}</M> — are reproduced, and a second &ldquo;hidden lepton condensate&rdquo; Higgs <M>{"H_{\\text{HLC}} \\to \\gamma\\gamma"}</M> is predicted as a distinct di-photon resonance.
        </Prose>

        <SubHead number="VIII½.5" title="Galaxy formation cascade" tone="teal" />

        <Prose>
          The same dimensional reduction governs the assembly of structure:
        </Prose>

        <Eq number="VIII½.5">{"\\text{cosmic expansion} \\to \\text{baryonic droplets / free baryonic matter} \\to \\text{Big Eruption} \\to \\text{1st-gen galaxies / IGM} \\to \\text{merge} \\to \\text{clusters / 2nd-gen galaxies / ICM} \\to \\text{superclusters}."}</Eq>

        <Prose>
          The interpolating acceleration <M>{"a_{i} = \\sqrt{a_{N}\\, a_{0}\\, t/t_{0}}"}</M> for <M>{"t_{0} \\geq t"}</M> reproduces flat rotation curves <em>without</em> a particle-dark-matter halo by tying the small-acceleration regime to a stage-transition timescale — a MOND-like phenomenology arising from the cosmological cycle rather than from a modification of inertia.
        </Prose>

        <SubHead number="VIII½.6" title="Extreme force fields" tone="crimson" />

        <Prose>
          Under extreme conditions the binary lattice space transitions to a binary partition space:
        </Prose>

        <Eq number="VIII½.6">{"\\binom{1}{4}_{m} + \\sum_{k=1}^{k}\\!\\left(\\binom{0}{4}\\right)\\!\\binom{1}{4}_{n,k} \\;\\xrightarrow{\\;\\text{extreme}\\;}\\; \\binom{1}{4}_{m} + \\sum_{k=1}^{k}\\binom{0}{4}_{n,k}\\binom{1}{4}_{n,k}"}</Eq>

        <Prose>
          which in this framework underlies superconductivity, the fractional quantum Hall effect, gravastars, and supernovae as a single &ldquo;extreme particle / extreme boson&rdquo; phase.
        </Prose>

        <SubHead number="VIII½.7" title="Status and relation to the Trip kernel" tone="gold" />

        <Prose>
          Chung's framework is <em>not</em> part of the Standard Model and has not been independently confirmed; it is reproduced here because (a) it makes <em>numerical</em> predictions in agreement with measured cosmological parameters, and (b) its core mathematical move — encoding all of physics in a graded sum over a small dimensional alphabet — is structurally identical to the Trip kernel <M>{"p_{3}(S\\mid M)"}</M> introduced next, where the same role is played by an arithmetic invariant on the bounded ordered triplet simplex. We treat the resonance as a <em>structural data point</em>, not a confirmation, and pass the falsification discipline of § XII to the Trip kernel itself.
        </Prose>

        {/* ═══════════════════ VIII¾ · NDUKA'S UNIFIED THEORY OF SCIENCE ═══════════════════ */}
        <SectionHead number="VIII¾" title="Nduka's Unified Theory of Science" eyebrow="INDEX OF THE UNIVERSE · KETS |n⟩ · PARTITION GEOMETRY" />

        <Prose>
          A second heterodox programme, due to <strong>Amagh Nduka</strong> (Federal University of Technology, Owerri; <em>Applied Mathematics</em> 7, 1279–1282, 2016), proposes that <em>the whole of science is derivable from a single cosmic parameter</em> called the <em>index of the universe</em>. We include it here because, like Chung's, it reduces all of physical law to a discrete combinatorial alphabet — and because its &ldquo;partition of the ket <M>{"|n\\rangle"}</M>&rdquo; is, formally, a small partition function of exactly the kind the Trip kernel <M>{"p_{3}(S\\mid M)"}</M> generalises.
        </Prose>

        <Pill tone="violet">SciRes Applied Math 7:1279</Pill>
        <Pill tone="indigo">Quantum mathematics</Pill>
        <Pill tone="teal">Discrete geometry</Pill>
        <Pill tone="gold">|n⟩ = 2(4ⁿ)</Pill>
        <Pill tone="crimson">Dimensionality theorem</Pill>

        <SubHead number="VIII¾.1" title="The absolute space S and the index n" tone="teal" />

        <Prose>
          Nduka begins with an <em>absolute space</em> (or universe) <M>{"S"}</M> whose elements are denoted by kets <M>{"|n\\rangle"}</M>. The index <M>{"n"}</M> takes only non-negative integral and half-integral values, excluding zero, and the cardinality of each ket is fixed by
        </Prose>

        <Eq number="VIII¾.1">{"|n\\rangle \\;=\\; 2\\,(4^{n}), \\qquad n \\in \\tfrac{1}{2}\\mathbb{Z}_{>0}."}</Eq>

        <Prose>
          A <em>subspace</em> (or world) <M>{"S' \\subset S"}</M> is then specified by three data: (i) the index <M>{"n"}</M>, (ii) a <em>partition</em> of <M>{"|n\\rangle"}</M> into its primitive geometrical entities, and (iii) the geometry of those entities (Euclidean / pseudo-Euclidean, classical / discrete). The thesis is that every physical theory — classical, quantum, relativistic — corresponds to one such triple <M>{"(n,\\, \\pi,\\, g)"}</M>.
        </Prose>

        <SubHead number="VIII¾.2" title="Classical theories — the n=1 partitions" tone="indigo" />

        <Prose>
          For <M>{"n = 1"}</M>, <M>{"|1\\rangle = 2(4) = 8"}</M>, and there are two independent partitions:
        </Prose>

        <Eq number="VIII¾.2">{"|1\\rangle \\;=\\; (3,1\\,;\\,3,1),\\;(3,\\bar{3}\\,;\\,1,1) \\qquad\\text{and}\\qquad |1\\rangle \\;=\\; (4\\,;\\,4)."}</Eq>

        <Prose>
          The first encodes Newtonian particle mechanics; the second encodes Einstein–Dirac wave theory. Both share the common origin <M>{"|1\\rangle"}</M>, and Nduka's <em>Invariant Operator Theory</em> is the unified theory built on that shared origin. Maxwell's electromagnetism sits inside the first partition, and the gauge constraint that orthodox QED imposes is, in this reading, an artefact of mismatching the partition to (4;4).
        </Prose>

        <SubHead number="VIII¾.3" title="The dimensionality theorem" tone="gold" />

        <Prose>
          Define the <em>dimensionality</em> of a state as the algebraic sum of the primitive elements of its partition. For Newton, Einstein and Dirac this sum equals <strong>8</strong>. By wave–particle duality the same value must apply to every microphysical state — this is the <em>dimensionality theorem</em>, the single constraint that selects physical partitions from the much larger combinatorial set.
        </Prose>

        <Eq number="VIII¾.3">{"\\dim(|n\\rangle) \\;=\\; \\sum_{j} \\pi_{j} \\;=\\; 8 \\qquad (\\text{for every admissible state})."}</Eq>

        <SubHead number="VIII¾.4" title="Fermion world — n = 1/2" tone="violet" />

        <Prose>
          The Dirac partition <M>{"|1/2\\rangle = (2,\\bar{2})"}</M> with <M>{"2 = (+1/2,\\,-1/2)"}</M> fails the dimensionality theorem and must be replaced by
        </Prose>

        <Eq number="VIII¾.4">{"|1/2\\rangle \\;\\equiv\\; (2,\\,\\bar{2}\\,;\\,2,\\,\\bar{2})"}</Eq>

        <Prose>
          where the second <M>{"(2,\\bar{2})"}</M> represents <em>neutral</em> spin-½ states — neutrons and neutrinos with their antiparticles. This single move accounts for the lepton/antilepton/nucleus tripartition of the Fermion world (the <M>{"n=1/2"}</M> nucleus being the alpha particle), and removes the historical mystery of the electron neutrino's mass.
        </Prose>

        <SubHead number="VIII¾.5" title="Boson world — n = 1, partition (1, 3̄ ; 3, 1̄)" tone="crimson" />

        <Prose>
          For the boson rest state, the partition <M>{"(3,1\\,;\\,3,1)"}</M> is rejected as not independent of the classical case, leaving
        </Prose>

        <Eq number="VIII¾.5">{"|1\\rangle \\;\\equiv\\; (1,\\,\\bar{3}\\,;\\,3,\\,\\bar{1})."}</Eq>

        <Prose>
          Its representation is the union of (a) a spin-0 particle, (b) a spin-0 antiparticle, (c) a spin-1 particle, and (d) a spin-1 antiparticle — i.e. the photon, the graviton, a vector boson and an antivector boson. The vector boson is strongly interacting when neutrons participate, weakly interacting when neutrinos participate. <em>This single partition is the unification of the four fundamental interactions</em>. To preserve electrical neutrality of the boson world and antiworld, nature is forced to supply the muon and muon-neutrino with their antiparticles.
        </Prose>

        <Prose>
          Nduka's critique of the orthodox electroweak theory is direct: the Glashow–Salam–Weinberg representation contains five particles (photon, three vector bosons, Higgs) and therefore violates both the electrical-neutrality constraint and the dimensionality theorem.
        </Prose>

        <SubHead number="VIII¾.6" title="Fermion–Boson world — astrophysics and stars" tone="teal" />

        <Prose>
          The independent third partition at <M>{"n=1"}</M> is
        </Prose>

        <Eq number="VIII¾.6">{"|1\\rangle \\;\\equiv\\; (2\\,;\\,3,\\,\\bar{3}),\\quad (3,\\,\\bar{3}\\,;\\,\\bar{2})"}</Eq>

        <Prose>
          which gives a manifestly interacting (chaotic) world — chaotic because no <M>{"4\\times 4"}</M> matrix can be assembled from a <M>{"2\\times 2"}</M> and a <M>{"6\\times 6"}</M> block. Two electrically-neutral representations exist: a neutron interacting with a charged vector boson and its antiparticle (the <em>normal star</em>), and a neutron interacting with a neutral vector boson and its antiparticle (the <em>neutron star</em>). At low energy the neutron is replaced by a neutrino and the vector boson by a meson. These are the strong nuclear interactions that drive stellar fusion; the tau lepton and tau neutrino are the price nature pays to keep the normal star electrically neutral.
        </Prose>

        <SubHead number="VIII¾.7" title="Status and resonance with the Trip kernel" tone="gold" />

        <Prose>
          Nduka's framework is, like Chung's, outside the Standard Model and has not been independently verified. Its interest for this compendium is structural: <em>partitioning a fixed integer (the cardinality of <M>{"|n\\rangle"}</M>) into ordered tuples whose primitive elements sum to a fixed dimensionality</em> is precisely the combinatorial object that the bounded ordered triplet simplex <M>{"\\mathbf{Trip}(M)"}</M> captures in its general form. Where Nduka constrains the partition by <M>{"\\sum \\pi_{j} = 8"}</M> and an electrical-neutrality side condition, the Trip kernel constrains it by <M>{"x+y+z = S"}</M> with <M>{"1 \\le x \\le y \\le z \\le M"}</M>, and the count <M>{"p_{3}(S\\mid M)"}</M> is the corresponding graded invariant. The two frameworks differ in physical content but agree in mathematical form — another structural data point, not a confirmation.
        </Prose>

        {/* ═══════════════════ VIII⅞ · ZHANG–ZHAO SPIRAL-SPACE UFT ═══════════════════ */}
        <SectionHead number="VIII⅞" title="Zhang–Zhao Spiral-Space Unified Field Theory" eyebrow="CYLINDRICAL-SPIRAL SPACE · REDEFINED TIME · c-INVARIANCE" />

        <Prose>
          A third recent heterodox programme is the <strong>Spiral-Space Unified Field Theory</strong> of <strong>Xiangqian Zhang &amp; Pengfei Zhao</strong> (<em>Int. J. Phys. Res. Appl.</em> 8(7) 222–246, 2025; DOI 10.29328/journal.ijpra.1001129). It is included here because it attempts a unification by <em>redefining the kinematic substrate itself</em> — space, time, and motion — rather than by adding gauge or geometric structure on top of them.
        </Prose>

        <Pill tone="violet">IJPRA 8(7):222 (2025)</Pill>
        <Pill tone="indigo">Cylindrical spiral space</Pill>
        <Pill tone="teal">Time = perception of space-motion</Pill>
        <Pill tone="gold">Vector speed of light</Pill>
        <Pill tone="crimson">No Big Bang (locally only)</Pill>

        <SubHead number="VIII⅞.1" title="Three foundational redefinitions" tone="teal" />

        <Prose>
          The framework rests on three mutually consistent redefinitions, all preserved without reduction to anything more elementary:
        </Prose>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="Substrate" title="Space" tone="indigo">
            A self-sustaining entity that continually executes a right-handed cylindrical-spiral motion. Not made of, nor convertible into, anything more fundamental.
          </Card>
          <Card eyebrow="Sensation" title="Time" tone="teal">
            Not an independent dimension. The observer's <em>perception</em> of the spiral motion of surrounding space. Whenever space displaces, the observer labels the experience &ldquo;passage of time.&rdquo;
          </Card>
          <Card eyebrow="Two faces" title="Motion" tone="gold">
            (i) Travel of objects through space; (ii) autonomous motion of space itself. All physical quantities — mass, charge, momentum, energy — are <em>descriptive layers</em> over these two motions.
          </Card>
        </div>

        <SubHead number="VIII⅞.2" title="The fundamental assumption" tone="gold" />

        <Prose>
          The single postulate that drives the rest of the framework is:
        </Prose>

        <Theorem title="Spatial expansion postulate (Zhang–Zhao 2025)" tone="gold">
          The space surrounding any object in the universe expands outward from that object's centre in a <em>cylindrical spiral</em> at a vector speed of light <M>{"\\vec{c}"}</M>. The observer's perception of this surrounding spiral motion <em>is</em> time.
        </Theorem>

        <Eq number="VIII⅞.1">{"\\vec{r}(t) \\;=\\; \\bigl(R\\cos\\omega t,\\; R\\sin\\omega t,\\; v_{z} t\\bigr), \\qquad |\\vec{c}| \\;=\\; \\sqrt{(R\\omega)^{2} + v_{z}^{2}} \\;=\\; c."}</Eq>

        <SubHead number="VIII⅞.3" title="Universe = objects + space (dualism, not monism)" tone="violet" />

        <Prose>
          Zhang &amp; Zhao reject monistic ontologies: the universe is composed solely of <em>objects</em> and the <em>space</em> surrounding them, with no third entity. All physical phenomena are descriptions, by the observer, of the motion of objects in space and the motion of space around objects. The brain generates two descriptive modes — <em>geometric</em> (size, quantity, direction, structure) and <em>physical</em> (motion and its consequences). Without observers neither world exists; only objects and space remain.
        </Prose>

        <SubHead number="VIII⅞.4" title="Hierarchy of derived concepts" tone="indigo" />

        <Prose>
          From the two primitives (object, space) every other concept is built by composition with motion. The hierarchy reads
        </Prose>

        <Eq number="VIII⅞.2">{"\\{\\text{object},\\,\\text{space}\\} \\;\\to\\; \\{t,\\,\\vec{r},\\,\\text{fields}\\} \\;\\to\\; \\{\\vec{v},\\,c\\} \\;\\to\\; \\{m,\\,q\\} \\;\\to\\; \\vec{p} \\;\\to\\; \\vec{F} \\;\\to\\; \\{E,\\,W\\} \\;\\to\\; \\{T,\\,\\text{light},\\,\\text{sound},\\,\\text{colour}\\}."}</Eq>

        <Prose>
          Mass and charge are <em>not</em> intrinsic substances but descriptions of how an object's surrounding spiral space behaves under translation; field strength is a description of the local geometry of that spiral.
        </Prose>

        <SubHead number="VIII⅞.5" title="The four fields as one spiral" tone="crimson" />

        <Prose>
          The gravitational, electric, magnetic, and nuclear-force fields are interpreted as four projections of the <em>same</em> cylindrical-spiral motion of space. The weak field is not fundamental in this scheme — it is a composite of the electric, magnetic, and nuclear-force fields. Schematically:
        </Prose>

        <Eq number="VIII⅞.3">{"\\bigl(\\,\\vec{g},\\,\\vec{E},\\,\\vec{B},\\,\\vec{N}\\,\\bigr) \\;=\\; \\Pi_{i}\\!\\bigl[\\,\\partial_{t}\\vec{r}_{\\text{spiral}}(R,\\omega,v_{z};\\,\\hat{n})\\,\\bigr], \\qquad i \\in \\{g, E, B, N\\}."}</Eq>

        <Prose>
          Electric and magnetic fields are <em>not</em> two faces of a single field in this scheme — their directions need not align — but they are siblings under the same spiral parent.
        </Prose>

        <SubHead number="VIII⅞.6" title="The invariance of c, re-explained" tone="gold" />

        <Prose>
          Because <M>{"|\\vec{c}|"}</M> is the magnitude of the spiral velocity of space itself, and time is the observer's <em>perception</em> of that motion, every observer in every frame is — by definition — measuring the speed of their own time-generating substrate. The Lorentz invariance of <M>{"c"}</M> is therefore not a postulate but a tautology of the redefinition: there is no frame in which the observer's surrounding space spirals at a different rate, because that rate <em>is</em> what the observer calls time.
        </Prose>

        <SubHead number="VIII⅞.7" title="Cosmological implications" tone="teal" />

        <Prose>
          Two heterodox cosmological consequences follow. First, the universe has <em>no beginning and no end</em>: space and age are infinite, and the Big Bang accounts only for local phenomena, not for the origin of the cosmos. Second, dark matter and dark energy are not new substances but artefacts of how the surrounding spiral space of distant objects projects into the local observer's spiral frame.
        </Prose>

        <SubHead number="VIII⅞.8" title="Status and resonance with the Trip kernel" tone="gold" />

        <Prose>
          The Zhang–Zhao framework is heterodox, has not been independently confirmed, and several of its claims (rejection of EM unification, denial of cosmological Big Bang) place it outside the consensus. We include it because its <em>structural</em> move — &ldquo;all physics is the description of one spiral motion under different projections&rdquo; — is exactly the kind of <em>functorial collapse</em> the Trip kernel formalises in the next section: many regimes, one underlying invariant, distinguished only by the projection (functor) chosen. Where Zhang–Zhao project a single cylindrical spiral onto four field labels, the Monograph's Section 18 projects a single bounded ordered triplet simplex onto eleven regime labels via the count <M>{"p_{3}(S \\mid M)"}</M>. The physical content differs sharply; the categorical signature is the same.
        </Prose>

        {/* ═══════════════════ IX · TRIP KERNEL · STRUCTURAL UNIFICATION ═══════════════════ */}
        <SectionHead number="IX" title="The Trip kernel — structural unification" eyebrow="MONOGRAPH · SECTION 18 · CATEGORICAL SYNTHESIS" />

        <Prose>
          The unification programmes above (EW, GUT, UFT, TOE) are <em>physical</em>: they seek to merge forces and particles. The present Monograph contributes a different kind of unification — call it <em>structural</em>. The thesis is this: across eleven physically disparate regimes, from Bose–Einstein statistics to Big Bang nucleosynthesis to lattice cryptography, the <em>same arithmetic kernel</em>
        </Prose>

        <Eq number="IX.1">{"p_3(S \\mid M) = \\#\\{(x,y,z) \\in \\mathbb{Z}^3 : 1 \\le x \\le y \\le z \\le M, \\; x + y + z = S\\}"}</Eq>

        <Prose>
          appears as a graded invariant. The eleven regimes are not analogies; they are different functorial transcriptions of one categorical object — the bounded ordered triplet simplex <M>{"\\mathbf{Trip}"}</M>. The boundary against the EW/GUT/UFT/TOE taxonomy is sharp, and the Monograph itself records it (§ 18.97):
        </Prose>

        <Theorem kind="Boundary" number="IX.1" title="What this kernel is and is not" tone="crimson">
          <M>{"\\mathfrak{U}_{\\mathrm{Trip}}"}</M> is a falsifiable <em>structural unification programme</em> across eleven bounded three-mode regimes. It is <strong>not</strong> a solved unified field theory, not a GUT, and not a TOE. Any sentence equating <M>{"\\mathfrak{U}_{\\mathrm{Trip}}"}</M> with a completed quantum-gravity unification is outside its declared domain and must be downgraded.
        </Theorem>

        <Figure number="3" caption="The synthesis chamber: three coupled 3D objects rendering the unification thesis. Left — the bounded simplex T_M with the active sum-slice Σ = S lit inside the shell and projected onto the floor. Middle — the eleven-regime constellation orbiting a central kernel node, coloured by evidence class (explicit / inferred / analogical). Right — the four-layer proof architecture, with assumptions H1–H8 suspended between layers.">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 18,
          }}>
            {[
              { title: "Kernel chamber",  rank: "I",   note: "T_M as the fixed solid behind every transcription. Σ = S sum-slice lit inside the simplex shell, with floor projection.", ref: tripRef,  ready: tripReady,  tone: C.gold },
              { title: "Regime orbit",    rank: "II",  note: "Eleven-regime constellation orbiting the central kernel node, coloured by evidence class — explicit, inferred, analogical bridges as geometry.", ref: constRef, ready: constReady, tone: C.teal },
              { title: "Proof stack",     rank: "III", note: "Four-layer proof architecture: definitions, safe core, conjectural middle, flagship crown — with assumptions H1–H8 suspended between layers.", ref: archRef,  ready: archReady,  tone: C.indigo },
            ].map((panel) => (
              <div key={panel.title} style={{
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${panel.tone}`,
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: `0 8px 32px ${panel.tone}14, inset 0 1px 0 ${panel.tone}22`,
              }}>
                <div style={{
                  padding: responsive.isMobile ? "12px 14px" : "14px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  background: `linear-gradient(180deg, ${C.panelAlt}ee 0%, ${C.panelAlt}99 100%)`,
                  display: "flex",
                  alignItems: "center",
                  gap: responsive.isMobile ? 12 : 18,
                  flexWrap: "wrap",
                }}>
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontStyle: "italic",
                    fontSize: responsive.isMobile ? 22 : 30,
                    color: panel.tone,
                    lineHeight: 1,
                    minWidth: responsive.isMobile ? 28 : 38,
                    textShadow: `0 0 18px ${panel.tone}66`,
                  }}>{panel.rank}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: responsive.isMobile ? 10 : 11,
                      color: panel.tone,
                      letterSpacing: 2.2,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}>{panel.title}</div>
                    <div style={{
                      fontFamily: FONT_MATH,
                      fontStyle: "italic",
                      fontSize: responsive.isMobile ? 14 : 15.5,
                      color: C.ink,
                      lineHeight: 1.5,
                    }}>{panel.note}</div>
                  </div>
                </div>
                <ChartHost hostRef={panel.ref} ready={panel.ready} height={responsive.isMobile ? 380 : 560} />
              </div>
            ))}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 12,
          }}>
            <Metric label="Regimes"      value="11" tone="gold" />
            <Metric label="Core layers"  value="4"  tone="teal" />
            <Metric label="Assumptions"  value="8"  tone="indigo" />
            <Metric label="Weak edges"   value="7"  tone="crimson" />
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 14,
            padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 1.6, textTransform: "uppercase" }}>chamber controls:</span>
            <label style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 1.4 }}>M</label>
            <input type="range" min={10} max={100} value={M_} onChange={e => setM(+e.target.value)} style={{ flex: 1, maxWidth: 220 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.gold, minWidth: 28 }}>{M_}</span>
            <label style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 1.4 }}>Σ=S</label>
            <input type="range" min={3} max={3 * M_} value={selectedS} onChange={e => setSelectedS(+e.target.value)} style={{ flex: 1, maxWidth: 220 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.crimson, minWidth: 28 }}>{selectedS}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkDim }}>
              p₃ ≈ <span style={{ color: C.teal }}>{cayleySylvester(selectedS)}</span> (CS) /
              <span style={{ color: C.gold }}> {p3Corrected(selectedS, M_)}</span> (corrected)
            </span>
          </div>
        </Figure>

        <SubHead title="The category Trip and its functors" tone="gold" />
        <Prose>
          Define <M>{"\\mathbf{Trip}"}</M> as the small symmetric monoidal category whose objects are the bounded ordered triplet simplices <M>{"T_M"}</M> and whose morphisms are sum-preserving lattice maps. <M>{"\\mathbf{Trip}"}</M> has a terminal object <M>{"T_1 = \\{(1,1,1)\\}"}</M>, an initial object <M>{"T_0 = \\emptyset"}</M>, a chain of inclusions <M>{"T_0 \\hookrightarrow T_1 \\hookrightarrow T_2 \\hookrightarrow \\cdots"}</M> with colimit <M>{"T_\\infty"}</M>, and the natural Minkowski sum <M>{"T_M \\boxplus T_N \\cong T_{M+N}"}</M> as monoidal product. Its graded cardinality is the Gaussian binomial <M>{"\\binom{M+2}{3}_q"}</M>, whose coefficient at <M>{"q^S"}</M> is precisely <M>p_3(S \\mid M)</M>.
        </Prose>

        <Eq number="IX.2">{"\\mathbf{Trip} \\;\\xrightarrow{\\;\\mathcal{F}_\\mathcal{P}\\;}\\; \\mathcal{C}_\\mathcal{P} \\;\\xrightarrow{\\dim / |\\cdot| / \\mu}\\; \\mathbb{Z}[\\![q]\\!], \\qquad q \\mapsto \\sum_S p_3(S \\mid M) \\, q^S."}</Eq>

        <Theorem kind="Theorem" number="IX.2" title="Representability of the kernel (= Theorem 18.4)" tone="teal">
          The partition functor <M>{"P_3 : \\mathbf{Trip} \\to \\mathbb{Z}[\\![q]\\!]"}</M> is representable in graded abelian groups: there exists a universal graded object <M>{"\\mathcal{K} = \\mathbb{Z}\\langle e_1, e_2, e_3 \\rangle"}</M> (free graded abelian group on three generators of degrees 1, 2, 3) such that
          <M>{"P_3(T_M) \\cong \\mathrm{Hom}_{\\mathrm{grAb}}(\\mathcal{K}, \\mathbb{Z}[\\![q]\\!])^{T_M}"}</M>
          naturally in <M>M</M>. This single object generates every instance of the kernel.
        </Theorem>

        <SubHead title="Conservation laws as natural transformations" tone="gold" />
        <Prose>
          Every conservation law in the eleven regimes — energy, momentum, charge, photon count, magnitude, coordinate sum — is the same structural datum: a natural transformation <M>{"\\eta : \\mathcal{F}_\\mathcal{P} \\Rightarrow \\mathcal{F}_\\mathcal{Q}"}</M> between two regime functors whose naturality square commutes on every morphism of <M>{"\\mathbf{Trip}"}</M>. Restriction to the graded component at fixed sum <M>S</M> recovers the sharp combinatorial form of the law.
        </Prose>

        <Eq number="IX.3">{"\\mathcal{F}_\\mathcal{P}(T_M) \\xrightarrow{\\mathcal{F}_\\mathcal{P}(f)} \\mathcal{F}_\\mathcal{P}(T_N), \\quad \\eta_{T_M}\\!\\downarrow \\;\\;\\eta_{T_N}\\!\\downarrow, \\quad \\mathcal{F}_\\mathcal{Q}(T_M) \\xrightarrow{\\mathcal{F}_\\mathcal{Q}(f)} \\mathcal{F}_\\mathcal{Q}(T_N)."}</Eq>

        <SubHead title="Coend formula and the species of triplets" tone="gold" />
        <Eq number="IX.4">{"p_3(S \\mid M) = \\int^{T \\in \\mathbf{Trip}} \\mathrm{Hom}_{\\mathbf{Trip}}(T, T_M) \\times \\delta_S(T), \\qquad \\sum_{n \\ge 3} p_3(n) \\, q^n = \\frac{q^3}{(1-q)(1-q^2)(1-q^3)}."}</Eq>

        <Prose>
          The coend identifies the kernel as a canonically defined invariant of <M>{"\\mathbf{Trip}"}</M>, not a feature imported from any particular regime. The product on the right is Molien&#8217;s identity for the symmetric group <M>{"\\mathfrak{S}_3"}</M> acting on three generators of equal weight; the bounded version is the Gaussian binomial obtained by truncation.
        </Prose>

        <SubHead title="The triadic operad and Koszul duality" tone="gold" />
        <Prose>
          Let <M>{"\\mathcal{O}_3"}</M> be the operad of rooted planar trees of valence ≤ 3, weighted by sum of leaf depths. Operadic composition is tree grafting; the generating power series of graded dimensions is the Gaussian binomial. <M>{"\\mathcal{O}_3"}</M> is Koszul, with quadratic dual the operad of strict Lie trees. This gives the categorical reason that <em>three</em> — not two and not four — is the natural arity of the kernel: <M>{"\\varphi^3"}</M> field theory is the operadic home, with the BRST/Feynman expansion arising as the bar construction.
        </Prose>

        <Eq number="IX.5">{"\\sum_n \\dim_q \\mathcal{O}_3(n) \\, t^n = \\prod_{k=1}^3 \\frac{1}{1 - t \\, q^k} \\;\\;\\bmod\\; t^{M+1}."}</Eq>

        <SubHead title="Grand unifying conjecture (assumption-explicit form)" tone="crimson" />
        <Eq number="IX.6">{"H = \\{H_1,\\ldots,H_8\\}: \\;\\text{graded boundedness, sum conservation, finite multiplicity, normalizable projection, residual control, coherence compatibility, derived decategorification, cross-regime comparability.}"}</Eq>

        <Theorem kind="Conjecture" number="IX.3" title="Grand unifying conjecture (= Conjecture 18.12)" tone="crimson">
          Conditional on H, the inclusion <M>{"\\iota : \\mathbf{Trip}^{\\mathrm{univ}} \\to \\mathbf{UReg}"}</M> is essentially surjective up to regime equivalence and conservative on invariants: every admissible bounded three-mode regime factors through <M>{"\\mathbf{Trip}"}</M> to first arithmetic order, and its projected invariant satisfies
          <M>{"\\;\\pi_\\mathcal{R} I_\\mathcal{R}(T_M, S) = p_3(S \\mid M) + \\varepsilon_\\mathcal{R}(S, M),"}</M>
          with <M>{"\\varepsilon_\\mathcal{R}"}</M> in an explicitly declared residual class. In the strict residual-zero subclass, <M>p_3(S \\mid M)</M> is the unique shared graded kernel.
        </Theorem>

        <Prose>
          <em>Conservative form:</em> the exact combinatorial kernel and its asymptotic <M>{"p_3(S) \\sim S^2 / 12"}</M> are theorem-level. Trans-framework uniqueness is conjectural unless every hypothesis in H is checked for the target regime. This subsection therefore encodes both ambition (Layer IV) and discipline (Layer II).
        </Prose>

        {/* ═══════════════════ X · ELEVEN REGIMES ═══════════════════ */}
        <SectionHead number="X" title="The eleven regimes" eyebrow="WHERE p₃(S | M) REAPPEARS" />

        <Prose>
          Each regime is a target category <M>{"\\mathcal{C}_\\mathcal{P}"}</M> equipped with a functor <M>{"\\mathcal{F}_\\mathcal{P} : \\mathbf{Trip} \\to \\mathcal{C}_\\mathcal{P}"}</M> whose graded invariant recovers <M>p_3(S \\mid M)</M>. The eleven instances span quantum statistics, perturbative QFT, representation theory, optics, dynamical systems, fluid turbulence, seismology, cosmology, lattice cryptography, and quantum computation.
        </Prose>

        <div style={{
          margin: "16px 0", padding: "16px 18px",
          background: C.bgDeep, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.indigo}`, borderRadius: 3,
          overflowX: "auto",
        }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontFamily: FONT_MATH, fontSize: 13, color: C.ink }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.rule}` }}>
                {["§", "Functor", "Target category 𝒞", "Image of T_M", "Invariant", "Edge"].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 9.5, fontFamily: FONT_MONO, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontStyle: "italic" }}>
              {[
                ["8",  "ℱ_BE",  "Hilb (sym. Fock)",          "Sym³(ℓ²_{M+1}) / 𝔖₃",   "graded dimension",     "INFERRED"],
                ["9",  "ℱ_φ³",  "Conn. ribbon graphs",       "vacuum diagrams ≤ val. M","Euler χ",              "ANALOGICAL"],
                ["10", "ℱ_λ",   "Rep(SU(N))",                "V_λ ⊗ V_λ*",             "character χ_λ",         "ANALOGICAL"],
                ["11", "ℱ_χ³",  "Nonlin. optical bundles",   "phase-match locus Δk=0", "mode area",             "ANALOGICAL"],
                ["12", "ℱ_L",   "Hilb-manifold dyn. syst.",  "Poincaré triplet bundle","natural measure μ",     "ANALOGICAL"],
                ["13", "ℱ_K",   "Graded div-free vec. fld",  "triadic interaction set","energy flux Π",         "ANALOGICAL"],
                ["14", "ℱ_GR",  "Borel σ-algebra / Earth",   "aftershock sequence",   "seismic moment M₀",     "ANALOGICAL"],
                ["15", "ℱ_BBN", "Likelihood sheaves on η",   "(Yp, D/H, ⁷Li/H)",      "posterior density",     "ANALOGICAL"],
                ["16", "ℱ_SIS", "Ab. groups mod q",          "ker(A : ℤ_q^m → ℤ_q^n)","# short kernel vects",  "INFERRED"],
                ["17", "ℱ_QW",  "Hilb (walker)",             "ℂ^{T_M}",               "|ψ(S, t)|²",            "INFERRED"],
                ["18", "ℱ_id",  "Trip → Trip",               "T_M itself",            "|T_M|",                 "EXPLICIT"],
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}66` }}>
                  <td style={{ padding: "6px 10px", color: C.gold, fontFamily: FONT_MONO, fontSize: 10, fontStyle: "normal" }}>{r[0]}</td>
                  <td style={{ padding: "6px 10px", color: C.teal, fontFamily: FONT_MATH }}>{r[1]}</td>
                  <td style={{ padding: "6px 10px", color: C.ink }}>{r[2]}</td>
                  <td style={{ padding: "6px 10px", color: C.ink }}>{r[3]}</td>
                  <td style={{ padding: "6px 10px", color: C.inkDim }}>{r[4]}</td>
                  <td style={{ padding: "6px 10px", fontFamily: FONT_MONO, fontSize: 9.5, fontStyle: "normal", color: r[5] === "EXPLICIT" ? C.teal : r[5] === "INFERRED" ? C.indigo : C.gold }}>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SubHead title="Regime atlas — short descriptions" tone="gold" />
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          {[
            ["§ 8 · Bose–Einstein", "Three harmonic modes; the partition function Z₃(β) = Σₛ p₃(S|M) e^{−βħωS} factors through Trip with 𝔖₃ exchange enforced.", C.indigo],
            ["§ 9 · Feynman φ³", "Vacuum diagrams of trivalent ribbon graphs at order n have multiplicity ∝ p₃(n|M); naturality is the BRST identity.", C.gold],
            ["§ 10 · Young / antiparticle", "Conjugate partition λ ↔ λᵀ realises charge conjugation as the involution on Trip preserved by all functors.", C.gold],
            ["§ 11 · Three-wave NLO", "ω₁ + ω₂ = ω₃ with k₁ + k₂ = k₃: phase-matching loci are the lattice slices Σ = S inside T_M.", C.gold],
            ["§ 12 · Lorenz / strange attractors", "Triplet returns on the Poincaré section reproduce p₃(S) up to coarse-graining residuals.", C.gold],
            ["§ 13 · K41 turbulence", "Triadic energy transfer in Fourier space lives on the Σ = const slice; flux Π is conservation = naturality.", C.gold],
            ["§ 14 · Gutenberg–Richter", "Aftershock triplet coincidence frequency follows the same parabolic envelope after b-value rescaling.", C.gold],
            ["§ 15 · Big Bang nucleosynthesis", "Posterior over (Yp, D/H, ⁷Li/H) at the freeze-out simplex projects onto p₃ at fixed η.", C.gold],
            ["§ 16 · SIS / lattice crypto", "Short kernel vectors of A : ℤ_q^m → ℤ_q^n at degree S obey the Trip count to algorithmic precision.", C.indigo],
            ["§ 17 · Quantum walk", "|ψ(S, t)|² on the triplet simplex time-averages to p₃(S|M)/|T_M|.", C.indigo],
            ["§ 18 · Combinatorics (identity)", "The graded cardinality functor itself; theorem-level, the only EXPLICIT row.", C.teal],
          ].map(([title, desc, tone], i) => (
            <Card key={i} eyebrow={`Regime ${i + 1}`} title={title} tone={tone === C.teal ? "teal" : tone === C.indigo ? "indigo" : "gold"}>
              {desc}
            </Card>
          ))}
        </div>

        {/* ═══════════════════ XI · LAYERED ARCHITECTURE ═══════════════════ */}
        <SectionHead number="XI" title="Layered architecture of the claim" eyebrow="DEFINITIONS → SAFE → MID → FLAGSHIP" />

        <Prose>
          To prevent rhetorical overreach, the unifying thesis is recast in a strict four-layer architecture. Layer I defines objects and grading; Layer II records safe propositions; Layer III contains testable intermediate conjectures; Layer IV states the flagship unification claim under the hypothesis stack H = {`{H_1, …, H_8}`}. This separates proved combinatorics from conjectural trans-regime universality.
        </Prose>

        <div style={{
          margin: "16px 0", padding: "16px 18px",
          background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panel} 100%)`,
          border: `1px solid ${C.borderBr}`, borderLeft: `3px solid ${C.crimson}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            layer map · truth labels
          </div>
          <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["LAYER I",  "Definitions",   "T_M, p₃, Z_M(q), bridge interface",                                C.teal],
              ["LAYER II", "Proven Core",   "identities, asymptotic baseline, Yoneda/Kan basics",               C.indigo],
              ["LAYER III","Intermediate",  "factorisation, coherence, derived/motivic compatibility",          C.gold],
              ["LAYER IV", "Flagship",      "global unification under H1–H8",                                   C.crimson],
            ].map((row, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 3, padding: "10px 10px 9px", background: `${row[3]}0F` }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: row[3], letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 5 }}>{row[0]}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: C.ink }}>{row[1]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, lineHeight: 1.5, marginTop: 4 }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <SubHead title="Dependency strip" tone="violet" />
        <Eq number="XI.1">{"N_1: T_M \\to N_2: T_M(S) \\to N_3: p_3(S\\mid M) \\to N_4: Z_M(q) \\to N_5: \\text{closed form} \\to N_6: S^2 / 12."}</Eq>

        <div style={{
          margin: "12px 0 18px", padding: "14px 16px",
          background: `${C.violet}10`, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.violet}`, borderRadius: 3,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))", gap: 8 }}>
            {["objects", "fibres", "kernel", "series", "closed form", "asymptotic law"].map((label, i) => (
              <div key={i} style={{ padding: "10px 8px", textAlign: "center", borderRadius: 3, border: `1px solid ${C.border}`, background: C.panel }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: i < 4 ? C.teal : i === 4 ? C.indigo : C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>N{i + 1}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <SubHead title="Weak-edge register" tone="crimson" />
        <Eq number="XI.2">{"E_{\\mathrm{weak}} = \\{N_{10}\\!\\to\\!N_{12},\\; N_{12}\\!\\to\\!N_{13},\\; N_{12}\\!\\to\\!N_{14},\\; N_{12}\\!\\to\\!N_{15},\\; N_{13}\\!\\to\\!N_{16},\\; N_{14}\\!\\to\\!N_{16},\\; N_{15}\\!\\to\\!N_{16}\\}."}</Eq>

        <SubHead title="Assumption ledger H1–H8" tone="gold" />
        <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {[
            ["H1", "graded boundedness"],
            ["H2", "sum conservation"],
            ["H3", "finite multiplicities"],
            ["H4", "normalizable projection"],
            ["H5", "residual control"],
            ["H6", "coherence compatibility"],
            ["H7", "derived decategorification"],
            ["H8", "cross-regime comparability"],
          ].map((r, i) => (
            <div key={i} style={{ padding: "10px 12px", border: `1px solid ${C.border}`, background: C.panelAlt, borderRadius: 3 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: C.gold, letterSpacing: 1.4, textTransform: "uppercase" }}>{r[0]}</div>
              <div style={{ fontFamily: FONT_MATH, fontSize: 12.5, color: C.inkDim, marginTop: 4 }}>{r[1]}</div>
            </div>
          ))}
        </div>

        {/* ═══════════════════ XII · FALSIFICATION SUITE ═══════════════════ */}
        <SectionHead number="XII" title="Falsification suite & taxonomy" eyebrow="POPPERIAN DISCIPLINE · DOWNGRADE" />

        <Prose>
          A unifying programme that does not specify how it could be defeated is not a theory; it is rhetoric. The Monograph therefore commits to a Popperian discipline in which every claim is shadowed by an explicit set of falsifiers. Successful falsifiers automatically demote the claim along the chain
        </Prose>

        <Eq number="XII.1">{"\\delta : \\{\\text{Theorem}, \\text{Conjecture}, \\text{Heuristic}, \\text{Program}\\} \\;\\times\\; \\mathfrak{F}_{\\mathrm{tests}} \\;\\to\\; \\{\\text{Retracted}, \\text{Conjecture}, \\text{Heuristic}, \\text{Program}\\}."}</Eq>

        <div style={{
          margin: "12px 0 20px", padding: "16px 18px",
          background: `${C.crimson}0D`, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.crimson}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            falsification suite F1–F10
          </div>
          <div style={{ display: "grid", gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
            {[
              "construct admissible regime with no Trip factorisation",
              "disprove representability of the kernel object",
              "compute non-1/12 coherence asymptotic in-class",
              "find incompatible derived decategorifications",
              "produce motivic realisation mismatch",
              "show large irreducible residual in validated regime",
              "Lorenz fit rejection under fixed normalisation",
              "turbulence DNS mismatch under shell projection",
              "crypto short-vector counts diverge from kernel law",
              "discover twelfth regime outside current closure",
            ].map((item, i) => (
              <div key={i} style={{ padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.crimson, letterSpacing: 1.4, textTransform: "uppercase", minWidth: 26 }}>F{i + 1}</span>
                  <span style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim }}>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SubHead title="Physics unification taxonomy (= § 18.97)" tone="gold" />
        <Eq number="XII.2">{"\\text{EW (tested)} \\subset \\text{GUT (conjectural)} \\subset \\text{UFT including gravity (open)} \\subset \\text{TOE (open)}, \\qquad \\mathfrak{U}_{\\mathrm{Trip}} \\text{ is structural, not a TOE}."}</Eq>

        <SubHead title="Gauge-coupling convergence as analogy, not equivalence (= § 18.98)" tone="gold" />
        <Prose>
          Grand unification in high-energy physics is diagnosed by renormalisation-group flow of gauge couplings (Figure 2). The Monograph borrows this as an <em>analogy</em> for regime-flow coherence, while preserving non-identity between particle-physics coupling constants and Trip residual flows. Convergence-like behaviour in Trip diagnostics does <em>not</em> constitute evidence for particle-physics gauge unification, and conversely.
        </Prose>

        <SubHead title="Closing theorem-schema (= § 18.75)" tone="crimson" />
        <Eq number="XII.3">{"\\mathfrak{L}_0 \\subset \\mathfrak{D}_{\\mathrm{safe}} \\subset \\mathfrak{C}_{\\mathrm{intermediate}} \\subset \\mathfrak{C}_{\\mathrm{flagship}}, \\quad \\mathfrak{C}_{\\mathrm{flagship}} \\text{ survives iff } \\forall F_i \\in \\mathfrak{F}_{\\mathrm{tests}}, \\; F_i \\text{ fails to refute}."}</Eq>

        <Prose>
          The exact combinatorial kernel, its asymptotic parabola, the bounded reflection law, and the reusable categorical skeleton are secure. The trans-framework universality of that skeleton remains a live conjectural programme — now rendered in sufficient detail to be proved, refined, or broken. Either outcome is worth a decade.
        </Prose>

        {/* ═══════════════════ XIII · REFERENCES ═══════════════════ */}
        <SectionHead number="XIII" title="References & primary sources" eyebrow="FURTHER READING" />

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: responsive.isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <Card eyebrow="Encyclopedia" title="Britannica — unified field theory" tone="teal">
            Christine Sutton, with Britannica editors. Definitive short article tracing the programme from Maxwell through QED, electroweak unification, GUT and the open quantum-gravity problem.{" "}
            <RefLink href="https://www.britannica.com/science/unified-field-theory">britannica.com/science/unified-field-theory</RefLink>
          </Card>
          <Card eyebrow="Encyclopedia" title="Britannica — cosmology (PDF)" tone="teal">
            Standard hot Big Bang, BBN, CMB, dark matter, dark energy, and the symmetry-breaking cascade in early-universe cosmology. Source of the ΛCDM concordance values reproduced above.
          </Card>
          <Card eyebrow="Long-form" title="BigThink — Grand Unified Theories of physics" tone="indigo">
            Ethan Siegel&#8217;s essay on why GUTs are theoretically attractive and what their experimental status is. Strong on the running-coupling argument and its modern interpretation.{" "}
            <RefLink href="https://bigthink.com/starts-with-a-bang/grand-unified-theories-physics/">bigthink.com/starts-with-a-bang/grand-unified-theories-physics</RefLink>
          </Card>
          <Card eyebrow="Research starter" title="EBSCO — GUTs and supersymmetry" tone="indigo">
            John M. LoSecco (2022). Concise reference summarising the four-force taxonomy, the SUSY proposal, and the experimental motivation (proton decay, dark matter).{" "}
            <RefLink href="https://www.ebsco.com/research-starters/physics/grand-unification-theories-and-supersymmetry">ebsco.com/research-starters/physics/grand-unification-theories-and-supersymmetry</RefLink>
          </Card>
          <Card eyebrow="Wikipedia" title="Unified field theory" tone="gold">
            Historical timeline (Faraday, Maxwell, Einstein, Kaluza, Klein, Heisenberg), the distinction from Grand Unified Theory, and the modern context including string theory.{" "}
            <RefLink href="https://en.wikipedia.org/wiki/Unified_field_theory">en.wikipedia.org/wiki/Unified_field_theory</RefLink>
          </Card>
          <Card eyebrow="Popular science" title="SpaceFed — Unified Field Theory Solved?" tone="violet">
            International Space Federation overview of recent claims and continuing open problems in the unified-field programme.{" "}
            <RefLink href="https://spacefed.com/physics/unified-field-theory-solved/">spacefed.com/physics/unified-field-theory-solved</RefLink>
          </Card>
          <Card eyebrow="This work" title="Monograph № III — Categorical Synthesis" tone="crimson">
            sgnk (2026). The full Section 18 (≈ 100 sub-sections, theorems 18.1–18.13, conjectures up to 18.13, dependency DAG, falsification suite) is available in the parent Monograph; this compendium reproduces its three hero figures and key claims.{" "}
            <RefLink href="/">return to Monograph →</RefLink>
          </Card>
          <Card eyebrow="Historical primary" title="Glashow, Salam, Weinberg" tone="indigo">
            S. Glashow, Nucl. Phys. 22 (1961) 579; A. Salam, &ldquo;Weak and Electromagnetic Interactions&rdquo; (1968); S. Weinberg, Phys. Rev. Lett. 19 (1967) 1264. The trio of papers establishing the electroweak theory; Nobel Prize 1979.
          </Card>
          <Card eyebrow="Historical primary" title="Georgi & Glashow, SU(5) GUT" tone="gold">
            H. Georgi and S. L. Glashow, Phys. Rev. Lett. 32 (1974) 438. The first Grand Unified Theory; subsequently excluded by proton-decay searches but the template for SO(10), E₆ and SUSY GUTs that followed.
          </Card>
        </div>

        <div style={{ height: 60 }} />
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 16, marginBottom: 50, fontFamily: FONT_MONO, fontSize: 10, color: C.inkFaint, letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center" }}>
          end of compendium · sgnk · MMXXVI
        </div>
      </div>
    </div>
  );
}
