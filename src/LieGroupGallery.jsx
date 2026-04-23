// ═══════════════════════════════════════════════════════════════════════════
// LIE-GROUP GALLERY · four canonical group manifolds from gauge theory
//   I.  SU(2) ≅ S³ via the Hopf fibration  S¹ → S³ → S²
//   II. SO(3) ≅ ℝP³ — antipodal quotient, the rotation group
//   III. Flag variety F₃ = SU(3)/T² — moduli of complete flags in ℂ³
//   IV. E₈ root polytope — Gosset 4₂₁, Coxeter-plane projection (240 roots)
// Same one-per-row treatment as ManifoldGallery / StringTheoryGallery.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import { C, FONT_MATH, FONT_DISPLAY, FONT_MONO, M, orbitCamera } from "./shared-kernel-ui.jsx";
import { useResponsive } from "./responsive";
import LazyMount from "./LazyMount";

// ───────────────────────────────────────────────────────────────────────────
// Local frame + explainer (mirrors ManifoldGallery style)
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
        display: "flex", gap: responsive.isMobile ? 12 : 18,
        alignItems: "flex-start", flexWrap: "wrap",
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
              margin: "8px 0 10px", padding: "8px 12px", background: C.bg,
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
            gridTemplateColumns: responsive.isMobile ? "1fr" : "180px minmax(0, 1fr)",
            gap: responsive.isMobile ? 4 : 16,
            padding: "10px 0", borderTop: i === 0 ? "none" : `1px dashed ${C.border}`,
          }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 10.5, color: tone,
              letterSpacing: 1.6, textTransform: "uppercase",
            }}>{it.head}</div>
            <div style={{
              fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 13.5 : 14.5,
              color: C.inkBr, lineHeight: 1.6, overflowWrap: "anywhere",
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
// I. SU(2) ≅ S³ via the Hopf fibration
// Stereographic projection of S³ ⊂ ℝ⁴ to ℝ³, drawing fibers (great circles)
// over a sample of base points on S². Each fiber is the orbit of U(1).
// ═══════════════════════════════════════════════════════════════════════════
function SU2Hopf() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [nFibers, setNFibers] = useState(24);

  useEffect(() => {
    if (!ref.current) return;
    // Sample base points on S² via Fibonacci spiral
    const N = Math.round(nFibers);
    const ga = Math.PI * (3 - Math.sqrt(5));
    const traces = [];
    const fiberSamples = responsive.isMobile ? 60 : 120;

    // Color ramp from indigo→teal→gold→crimson over the base S²
    const ramp = (t) => {
      const stops = [C.indigo, C.teal, C.gold, C.crimson];
      const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
      const i = Math.floor(x);
      return stops[i];
    };

    for (let k = 0; k < N; k++) {
      const y2 = 1 - (2 * k) / (N - 1);          // S² point
      const r2 = Math.sqrt(Math.max(0, 1 - y2 * y2));
      const phi = ga * k;
      const bx = r2 * Math.cos(phi);
      const by = y2;
      const bz = r2 * Math.sin(phi);
      // Hopf preimage: parametrise the fiber over (bx, by, bz)
      // Use formula  (z1, z2) = ( (1+bz)^{1/2} e^{iα/2}, (bx+i by)/√(2(1+bz)) e^{iα/2} ) (when bz>−1)
      const denom = Math.sqrt(2 * (1 + bz + 1e-9));
      const xs = [], ys = [], zs = [];
      for (let j = 0; j <= fiberSamples; j++) {
        const a = (j / fiberSamples) * 2 * Math.PI;
        // Real S³ point in ℝ⁴
        const A = Math.sqrt((1 + bz) / 2);
        const B = denom > 1e-7 ? 1 / denom : 0;
        const X1 = A * Math.cos(a / 2);
        const X2 = A * Math.sin(a / 2);
        const X3 = B * (bx * Math.cos(a / 2) - by * Math.sin(a / 2));
        const X4 = B * (bx * Math.sin(a / 2) + by * Math.cos(a / 2));
        // Stereographic projection from north pole (X4 = 1)
        const w = 1 - X4;
        if (Math.abs(w) < 1e-3) continue;
        xs.push(X1 / w);
        ys.push(X2 / w);
        zs.push(X3 / w);
      }
      traces.push({
        type: "scatter3d", mode: "lines",
        x: xs, y: ys, z: zs,
        line: { color: ramp((k + 0.5) / N), width: 3 },
        hovertemplate: `fiber ${k + 1}/${N}<extra></extra>`,
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
        camera: orbitCamera(0.9, 1.7, 0.55),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [nFibers, responsive.isMobile]);

  return (
    <GalleryFrame
      rank="I" tone={C.gold}
      eyebrow="Group manifold · simply-connected covering of SO(3)"
      title="SU(2) ≅ S³ via the Hopf fibration"
      formula={<M>{"S^1 \\hookrightarrow S^3 \\xrightarrow{\\;\\pi\\;} S^2, \\quad \\pi(z_1, z_2) = (2 z_1 \\bar z_2,\\, |z_1|^2 - |z_2|^2)"}</M>}
      summary={<>The group <M>{"SU(2) = \\{ U \\in \\mathrm{Mat}_2(\\mathbb C) : U^\\dagger U = \\mathbb 1,\\, \\det U = 1 \\}"}</M> is diffeomorphic to the unit 3-sphere <M>{"S^3 \\subset \\mathbb R^4"}</M>. The Hopf map <M>π</M> exhibits <M>{"S^3"}</M> as a non-trivial principal <M>{"U(1)"}</M>-bundle over <M>{"S^2"}</M> with first Chern class <M>{"c_1 = 1"}</M>. Each fiber is a great circle; distinct fibers are linked Hopf rings. Stereographically projected to <M>{"\\mathbb R^3"}</M> below.</>}
      controls={<Slider label="number of fibers" value={nFibers} min={6} max={48} step={1} onChange={setNFibers} tone={C.gold} valueText={String(Math.round(nFibers))} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>Every element of <M>{"SU(2)"}</M> can be written <M>{"U = \\begin{pmatrix} z_1 & -\\bar z_2 \\\\ z_2 & \\bar z_1 \\end{pmatrix}"}</M> with <M>{"|z_1|^2 + |z_2|^2 = 1"}</M> — that is exactly the equation of <M>{"S^3 \\subset \\mathbb C^2 = \\mathbb R^4"}</M>. The Hopf projection collapses the <M>{"U(1)"}</M> phase shared by <M>{"(z_1, z_2)"}</M> and <M>{"(e^{i\\alpha} z_1, e^{i\\alpha} z_2)"}</M> down to a single point of <M>{"S^2"}</M>.</> },
        { head: "What you are seeing", body: <>Each colored loop is a single <M>{"U(1)"}</M>-fiber over a base point on <M>{"S^2"}</M>, stereographically projected to 3-space. Any two fibers are linked exactly once — that linking number IS the first Chern class. The slider increases how many base points you sample; the global texture stays the same because the bundle is homogeneous.</> },
        { head: "Why this matters", body: <>Topologically non-trivial bundles over spacetime are how gauge theory hosts magnetic monopoles, instantons, and θ-vacua. The Hopf bundle is the prototype: replacing <M>{"S^2"}</M> with a Euclidean <M>{"S^4"}</M> and <M>{"U(1)"}</M> with <M>{"SU(2)"}</M> gives the BPST instanton. <M>{"SU(2)"}</M> itself is the gauge group of the weak interaction.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 540 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// II. SO(3) ≅ ℝP³ — solid 3-ball with antipodal boundary identification.
// Visualised as a ball of axis-angle vectors r = θ n̂, |r| ≤ π,
// with antipodal boundary points identified.
// ═══════════════════════════════════════════════════════════════════════════
function SO3RP3() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [showLoop, setShowLoop] = useState(true);

  useEffect(() => {
    if (!ref.current) return;
    // Translucent "ball of radius π" = SO(3) configuration space
    const Nu = responsive.isMobile ? 36 : 60;
    const Nv = responsive.isMobile ? 18 : 30;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= Nv; i++) {
      const theta = (i / Nv) * Math.PI;
      const xr = [], yr = [], zr = [], cr = [];
      for (let j = 0; j <= Nu; j++) {
        const phi = (j / Nu) * 2 * Math.PI;
        const R = Math.PI;
        xr.push(R * Math.sin(theta) * Math.cos(phi));
        yr.push(R * Math.sin(theta) * Math.sin(phi));
        zr.push(R * Math.cos(theta));
        cr.push(theta);
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    const traces = [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.indigo], [1, C.teal]],
      showscale: false, opacity: 0.18,
      lighting: { ambient: 0.7, diffuse: 0.4, specular: 0.1 },
      hoverinfo: "skip",
    }];
    // Coordinate axes inside the ball
    const ax = (a, b, c, color) => ({
      type: "scatter3d", mode: "lines",
      x: [-a, a], y: [-b, b], z: [-c, c],
      line: { color, width: 3 }, hoverinfo: "skip",
    });
    traces.push(ax(Math.PI, 0, 0, `${C.crimson}aa`));
    traces.push(ax(0, Math.PI, 0, `${C.gold}aa`));
    traces.push(ax(0, 0, Math.PI, `${C.violet}aa`));

    // The famous "non-contractible loop": straight line from one boundary point
    // through the origin to its antipode — these endpoints are identified, so
    // the line is a closed loop in ℝP³ that cannot be contracted to a point.
    if (showLoop) {
      const ts = [];
      for (let k = 0; k <= 60; k++) ts.push(-1 + (2 * k) / 60);
      const ux = 0.65, uy = 0.55, uz = 0.52;
      const norm = Math.hypot(ux, uy, uz);
      const nx = ux / norm, ny = uy / norm, nz = uz / norm;
      traces.push({
        type: "scatter3d", mode: "lines",
        x: ts.map(t => t * Math.PI * nx),
        y: ts.map(t => t * Math.PI * ny),
        z: ts.map(t => t * Math.PI * nz),
        line: { color: C.goldBr, width: 6 },
        hovertemplate: "non-contractible loop · π₁(SO(3)) = ℤ/2<extra></extra>",
      });
      // Mark antipodal endpoints (identified)
      traces.push({
        type: "scatter3d", mode: "markers+text",
        x: [Math.PI * nx, -Math.PI * nx],
        y: [Math.PI * ny, -Math.PI * ny],
        z: [Math.PI * nz, -Math.PI * nz],
        marker: { size: 7, color: C.crimson, line: { color: C.bgDeep, width: 2 } },
        text: ["p", "−p ≡ p"],
        textposition: "top center",
        textfont: { family: FONT_MONO, size: 10, color: C.crimson },
        hoverinfo: "skip",
      });
      // Doubled loop (the spinor/Dirac belt) — traverse twice; this IS contractible
      const ts2 = [];
      for (let k = 0; k <= 120; k++) ts2.push((k / 120) * 2);
      traces.push({
        type: "scatter3d", mode: "lines",
        x: ts2.map(t => Math.sin(t * Math.PI) * 0.85 * Math.PI * nx + Math.cos(t * Math.PI * 2) * 0.4),
        y: ts2.map(t => Math.sin(t * Math.PI) * 0.85 * Math.PI * ny - Math.sin(t * Math.PI * 2) * 0.4),
        z: ts2.map(t => Math.sin(t * Math.PI) * 0.85 * Math.PI * nz),
        line: { color: `${C.teal}cc`, width: 3, dash: "dot" },
        hovertemplate: "doubled loop is contractible<extra></extra>",
      });
    }

    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [-Math.PI * 1.05, Math.PI * 1.05] },
        yaxis: { visible: false, range: [-Math.PI * 1.05, Math.PI * 1.05] },
        zaxis: { visible: false, range: [-Math.PI * 1.05, Math.PI * 1.05] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.7, 1.65, 0.55),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [showLoop, responsive.isMobile]);

  return (
    <GalleryFrame
      rank="II" tone={C.crimson}
      eyebrow="Rotation group · π₁ = ℤ/2"
      title="SO(3) ≅ ℝP³ and the Dirac belt"
      formula={<M>{"SO(3) \\cong S^3 / \\{\\pm \\mathbb 1\\} \\cong \\mathbb{RP}^3, \\qquad \\pi_1(SO(3)) = \\mathbb Z / 2"}</M>}
      summary={<>Every rotation is an axis-angle pair <M>{"r = \\theta\\, \\hat n"}</M> with <M>{"\\theta \\in [0, \\pi]"}</M>. This fills the closed 3-ball of radius <M>π</M>; antipodal boundary points <M>{"\\pi \\hat n"}</M> and <M>{"-\\pi \\hat n"}</M> represent the same rotation, so the boundary <M>{"S^2"}</M> is identified by the antipodal map. The result is real projective 3-space <M>{"\\mathbb{RP}^3"}</M>, with non-trivial fundamental group of order two — the topological origin of spinors.</>}
      controls={
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 14px",
          background: C.panel, borderTop: `1px solid ${C.border}`,
        }}>
          <button onClick={() => setShowLoop(s => !s)} style={{
            fontFamily: FONT_MONO, fontSize: 10, padding: "6px 12px",
            background: showLoop ? `${C.crimson}33` : C.panelAlt,
            color: showLoop ? C.crimson : C.inkDim,
            border: `1px solid ${C.crimson}66`, borderRadius: 3,
            letterSpacing: 1.6, textTransform: "uppercase", cursor: "pointer",
          }}>{showLoop ? "Hide" : "Show"} non-contractible loop</button>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, alignSelf: "center" }}>
            single traverse: non-trivial · double traverse: contractible (dotted)
          </span>
        </div>
      }
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <><M>{"S^3 \\to SO(3)"}</M> is a 2-to-1 covering: each rotation <M>{"R \\in SO(3)"}</M> lifts to exactly two unit quaternions <M>{"\\pm q \\in S^3"}</M>. Quotienting <M>{"S^3"}</M> by <M>{"\\{\\pm 1\\}"}</M> gives <M>{"\\mathbb{RP}^3"}</M>, so the rotation group has fundamental group <M>{"\\mathbb Z/2"}</M> — there is exactly one non-trivial loop class.</> },
        { head: "What you are seeing", body: <>The transparent ball is the configuration space (radius <M>π</M>). The bold gold line is a path from a boundary point <M>p</M> to its antipode <M>{"-p"}</M> — but those two points ARE the same rotation, so this IS a closed loop. It cannot be shrunk to a point. Traversed twice, however (dotted teal), the doubled loop CAN be deformed to a constant — this is the Dirac belt / Balinese-cup trick.</> },
        { head: "Why this matters", body: <>Because <M>{"\\pi_1(SO(3)) = \\mathbb Z/2"}</M>, quantum-mechanical wavefunctions can transform under either of two projective representations: bosons (trivial) or fermions (sign-flip under <M>{"2\\pi"}</M> rotation). Spin-1/2 particles exist BECAUSE of this topology. The double cover <M>{"\\mathrm{Spin}(3) = SU(2)"}</M> is the simply-connected group whose representations include spinors.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 400 : 560 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// III. Flag variety F₃ = SU(3)/T² = U(3)/(U(1)³)
// 6 real dimensions; we draw its toric moment polytope (a hexagon) and the
// orbits over interior vs face vs vertex points, demonstrating the Bruhat
// stratification.
// ═══════════════════════════════════════════════════════════════════════════
function FlagVariety() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [orbitDepth, setOrbitDepth] = useState(0.55);

  // Hexagonal moment polytope: convex hull of the S₃-orbit of (3, 2, 1)
  // projected onto the plane x+y+z = 6.
  const hexVerts = useMemo(() => {
    const perms = [
      [3, 2, 1], [3, 1, 2], [2, 3, 1], [1, 3, 2], [1, 2, 3], [2, 1, 3],
    ];
    // Project to plane x+y+z = 6 with basis (1,-1,0)/√2, (1,1,-2)/√6
    const e1 = [1 / Math.sqrt(2), -1 / Math.sqrt(2), 0];
    const e2 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];
    return perms.map(p => {
      const a = p[0] * e1[0] + p[1] * e1[1] + p[2] * e1[2];
      const b = p[0] * e2[0] + p[1] * e2[1] + p[2] * e2[2];
      return { a, b, label: `(${p.join(",")})` };
    });
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    // Hexagon edges, lifted to 3D by giving each vertex a z = 0 baseline.
    const traces = [];
    const xs = hexVerts.map(v => v.a).concat([hexVerts[0].a]);
    const ys = hexVerts.map(v => v.b).concat([hexVerts[0].b]);
    const zs = hexVerts.map(() => 0).concat([0]);
    traces.push({
      type: "scatter3d", mode: "lines",
      x: xs, y: ys, z: zs,
      line: { color: C.indigo, width: 5 }, hoverinfo: "skip",
    });
    // Vertices = T-fixed points = Weyl group elements (6 of them)
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x: hexVerts.map(v => v.a),
      y: hexVerts.map(v => v.b),
      z: hexVerts.map(() => 0),
      text: hexVerts.map(v => v.label),
      textposition: "top center",
      textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.gold },
      marker: { size: 8, color: C.gold, line: { color: C.bgDeep, width: 1 } },
      hovertemplate: "Weyl element %{text}<extra></extra>",
    });

    // Above each interior point, draw the T²-orbit (a 2-torus). For visual
    // clarity, draw a few orbit-tori at varying heights = moment height μ.
    const sampleBase = [
      { a: 0, b: 0, h: orbitDepth, color: C.crimson, label: "generic flag · dim T² = 2" },
      { a: hexVerts[0].a * 0.55, b: hexVerts[0].b * 0.55, h: orbitDepth * 0.6, color: C.teal, label: "edge · 1-dim stabiliser" },
    ];
    sampleBase.forEach(({ a, b, h, color, label }) => {
      const Nu = 50, Nv = 18;
      const xx = [], yy = [], zz = [];
      for (let i = 0; i <= Nv; i++) {
        const u = (i / Nv) * 2 * Math.PI;
        const xr = [], yr = [], zr = [];
        for (let j = 0; j <= Nu; j++) {
          const v = (j / Nu) * 2 * Math.PI;
          const R = 0.45, r = 0.18;
          xr.push(a + (R + r * Math.cos(u)) * Math.cos(v));
          yr.push(b + (R + r * Math.cos(u)) * Math.sin(v));
          zr.push(h + r * Math.sin(u));
        }
        xx.push(xr); yy.push(yr); zz.push(zr);
      }
      traces.push({
        type: "surface", x: xx, y: yy, z: zz,
        colorscale: [[0, color], [1, color]],
        showscale: false, opacity: 0.55,
        lighting: { ambient: 0.6, diffuse: 0.7 },
        hovertemplate: `${label}<extra></extra>`,
      });
    });

    // Bruhat order arrows: connect identity vertex to each adjacent Weyl element
    const w0 = hexVerts[4]; // (1,2,3) = identity
    hexVerts.forEach((v, i) => {
      if (i === 4) return;
      traces.push({
        type: "scatter3d", mode: "lines",
        x: [w0.a, v.a], y: [w0.b, v.b], z: [0, 0],
        line: { color: `${C.violet}66`, width: 2, dash: "dot" },
        hoverinfo: "skip",
      });
    });

    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [-1.8, 1.8] },
        yaxis: { visible: false, range: [-1.8, 1.8] },
        zaxis: { visible: false, range: [-0.4, 1.4] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.6, 1.6, 0.65),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [hexVerts, orbitDepth, responsive.isMobile]);

  return (
    <GalleryFrame
      rank="III" tone={C.indigo}
      eyebrow="Homogeneous space · Kähler manifold of complete flags"
      title="Flag variety F₃ = SU(3)/T²"
      formula={<M>{"\\mathcal F_3 = SU(3) / T^2 = \\{\\, 0 \\subset L_1 \\subset L_2 \\subset \\mathbb C^3 \\,:\\, \\dim L_k = k \\,\\}, \\quad \\dim_{\\mathbb R} \\mathcal F_3 = 6"}</M>}
      summary={<>The space of complete flags in <M>{"\\mathbb C^3"}</M> is the homogeneous quotient <M>{"SU(3)/T^2"}</M>, where <M>{"T^2"}</M> is the diagonal maximal torus. It is a smooth compact Kähler manifold of complex dimension 3, fibered as <M>{"\\mathbb{CP}^1 \\to \\mathcal F_3 \\to \\mathbb{CP}^2"}</M>. Its image under the moment map is the regular hexagon shown — the convex hull of the Weyl-group orbit of <M>{"(3,2,1)"}</M> — and the cell decomposition reflects the Bruhat order on <M>{"S_3"}</M>.</>}
      controls={<Slider label="orbit-torus height" value={orbitDepth} min={0.1} max={1.1} onChange={setOrbitDepth} tone={C.indigo} valueText={orbitDepth.toFixed(2)} />}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>A complete flag in <M>{"\\mathbb C^3"}</M> is a chain of subspaces of dimensions 1 ⊂ 2 ⊂ 3. The unitary group acts transitively on flags, and the stabiliser of a fixed flag is the diagonal torus <M>{"T^2 \\subset SU(3)"}</M>, giving the quotient <M>{"SU(3)/T^2"}</M>. Counting parameters: <M>{"\\dim SU(3) - \\dim T^2 = 8 - 2 = 6"}</M> real dimensions, i.e. 3 complex dimensions.</> },
        { head: "What you are seeing", body: <>The hexagon at <M>{"z=0"}</M> is the moment polytope: the image of <M>{"\\mathcal F_3"}</M> under the <M>{"T^2"}</M>-moment map. Its 6 vertices (gold) are the <M>{"T"}</M>-fixed points, in bijection with the Weyl group <M>{"S_3"}</M>. Above the hexagon, the floating tori show two typical fibres: a generic 2-torus (crimson) and a degenerate 1-torus over an edge (teal). Dotted violet lines hint at the Bruhat order joining the identity element (1,2,3) to its neighbours.</> },
        { head: "Why this matters", body: <>Flag varieties are the geometric home of representation theory: by the Borel–Weil theorem, irreducible representations of <M>{"SU(3)"}</M> are realised as holomorphic sections of line bundles over <M>{"\\mathcal F_3"}</M>. Their Schubert calculus computes intersection numbers, three-point Gromov–Witten invariants, and quark mixing-matrix structure. They are the simplest non-symmetric Kähler manifolds where mirror symmetry is fully understood.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 540 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IV. E₈ root polytope — Gosset 4₂₁ — projected to 3D from 8D
// 240 roots:
//   · 112 of form (±1, ±1, 0, 0, 0, 0, 0, 0) and permutations
//   · 128 of form (±½, ±½, ±½, ±½, ±½, ±½, ±½, ±½) with even number of minus signs
// Projected onto a 3D analog of the Coxeter plane via three mutually
// orthogonal vectors that diagonalise the Coxeter element.
// ═══════════════════════════════════════════════════════════════════════════
function E8Polytope() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [phase, setPhase] = useState(0);

  const roots = useMemo(() => {
    const r = [];
    // Type A: 112 integer roots
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        for (const si of [1, -1]) {
          for (const sj of [1, -1]) {
            const v = new Array(8).fill(0);
            v[i] = si; v[j] = sj;
            r.push(v);
          }
        }
      }
    }
    // Type B: 128 half-integer roots, even number of minus signs
    for (let mask = 0; mask < 256; mask++) {
      let neg = 0;
      for (let b = 0; b < 8; b++) if ((mask >> b) & 1) neg++;
      if (neg % 2 !== 0) continue;
      const v = [];
      for (let b = 0; b < 8; b++) v.push(((mask >> b) & 1) ? -0.5 : 0.5);
      r.push(v);
    }
    return r; // 112 + 128 = 240
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    // Three projection vectors. Use a Coxeter-element-style choice:
    // u_k = (cos(2πk·1/30), cos(2πk·7/30), cos(2πk·11/30), cos(2πk·13/30),
    //        cos(2πk·17/30), cos(2πk·19/30), cos(2πk·23/30), cos(2πk·29/30))
    // with k=1,2,3 and overall phase shift φ for animation.
    const exps = [1, 7, 11, 13, 17, 19, 23, 29]; // units mod 30 (Coxeter number h=30)
    const proj = (k) => exps.map(e => Math.cos((2 * Math.PI * k * e) / 30 + phase * (k === 1 ? 1 : 0)));
    const u1 = proj(1), u2 = proj(7), u3 = proj(11);
    const dot = (a, b) => a.reduce((s, ai, i) => s + ai * b[i], 0);
    const xs = roots.map(r => dot(r, u1));
    const ys = roots.map(r => dot(r, u2));
    const zs = roots.map(r => dot(r, u3));
    const norms = roots.map(r => Math.sqrt(dot(r, r)));
    // Color by ‖proj‖ to highlight the nested rings
    const radii = xs.map((x, i) => Math.sqrt(x * x + ys[i] * ys[i] + zs[i] * zs[i]));
    const traces = [{
      type: "scatter3d", mode: "markers",
      x: xs, y: ys, z: zs,
      marker: {
        size: 4.6,
        color: radii,
        colorscale: [[0, C.violet], [0.4, C.indigo], [0.7, C.gold], [1, C.crimson]],
        opacity: 0.95,
        line: { color: C.bgDeep, width: 0.4 },
      },
      hovertemplate: "‖α‖ = %{text:.3f}<extra></extra>",
      text: norms,
    }];
    // Also draw selected edges: connect each root to its nearest neighbours
    // in 8D (those with inner product = 1, i.e. forming the E8 simplex graph).
    // For visual clarity, only draw the first ~200 nearest-neighbour edges.
    const ex = [], ey = [], ez = [];
    let count = 0;
    outer: for (let i = 0; i < roots.length; i++) {
      for (let j = i + 1; j < roots.length; j++) {
        if (Math.abs(dot(roots[i], roots[j]) - 1) < 1e-6) {
          ex.push(xs[i], xs[j], null);
          ey.push(ys[i], ys[j], null);
          ez.push(zs[i], zs[j], null);
          count++;
          if (count >= (responsive.isMobile ? 90 : 240)) break outer;
        }
      }
    }
    traces.push({
      type: "scatter3d", mode: "lines",
      x: ex, y: ey, z: ez,
      line: { color: `${C.gold}33`, width: 1.2 }, hoverinfo: "skip",
    });

    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [-3, 3] },
        yaxis: { visible: false, range: [-3, 3] },
        zaxis: { visible: false, range: [-3, 3] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.6, 1.7, 0.4),
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [roots, phase, responsive.isMobile]);

  return (
    <GalleryFrame
      rank="IV" tone={C.violet}
      eyebrow="Exceptional Lie group · 248 dimensions · rank 8"
      title="E₈ root polytope (Gosset 4₂₁) projected to ℝ³"
      formula={<M>{"\\Phi(E_8) = \\{\\,(\\pm 1, \\pm 1, 0^{\\,6})\\text{ perms}\\,\\} \\,\\cup\\, \\{\\,(\\pm \\tfrac12)^{8} : \\#\\{-\\} \\text{ even}\\,\\}, \\quad |\\Phi| = 112 + 128 = 240"}</M>}
      summary={<>The exceptional simple Lie algebra <M>{"\\mathfrak e_8"}</M> has 248 dimensions with rank 8, root system of 240 vectors, and Coxeter number <M>{"h = 30"}</M>. Its root polytope is the 8-dimensional Gosset uniform polytope <M>{"4_{21}"}</M>, with automorphism group of order <M>{"696{,}729{,}600"}</M>. Shown is its projection onto a 3D analogue of the Coxeter plane: the 240 roots organise into nested rings whose petal count is dictated by the exponents of the Coxeter element <M>{"\\{1, 7, 11, 13, 17, 19, 23, 29\\}"}</M>.</>}
      controls={<Slider label="Coxeter phase φ" value={phase} min={0} max={2 * Math.PI} step={0.02} onChange={setPhase} tone={C.violet} valueText={`${(phase / Math.PI).toFixed(2)} π`} />}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>The E₈ root system lives in <M>{"\\mathbb R^8"}</M> and consists of two pieces. The <em>integer roots</em> are vectors with two non-zero entries equal to <M>{"\\pm 1"}</M> and the rest zero — there are <M>{"\\binom{8}{2} \\cdot 4 = 112"}</M> of them. The <em>half-integer roots</em> are vectors all of whose entries are <M>{"\\pm \\tfrac12"}</M> with an even number of minus signs — there are <M>{"2^7 = 128"}</M>. Total: 240 roots, all of squared length 2.</> },
        { head: "What you are seeing", body: <>Each dot is one of the 240 roots, projected from 8D into 3D using three orthogonal Coxeter-plane basis vectors. The points organise into concentric shells (color-graded violet → crimson by projected radius). Faint gold lines mark <em>nearest-neighbour</em> edges — pairs of roots <M>{"\\alpha, \\beta"}</M> with <M>{"\\langle \\alpha, \\beta \\rangle = 1"}</M>, which generate the E₈ Dynkin geometry. Dragging the slider rotates the inner shell, exposing the eight-fold symmetry of the Coxeter element.</> },
        { head: "Why this matters", body: <>E₈ is the largest exceptional simple Lie group and a recurring candidate for unification: Garrett Lisi's <em>“Exceptionally Simple Theory of Everything”</em> (2007) tries to embed the Standard Model + gravity into <M>{"\\mathfrak e_8"}</M>; the heterotic <M>{"E_8 \\times E_8"}</M> string is the only ten-dimensional supergravity-compatible heterotic theory; and the E₈ lattice gives the densest sphere packing in 8 dimensions (Viazovska, 2016, Fields-medal work). Even outside physics, its 696-million-element Weyl group is a touchstone of pure representation theory.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 420 : 580 }} />
    </GalleryFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT — gallery wrapper with section header, mounted in UnifiedTheory.jsx
// ═══════════════════════════════════════════════════════════════════════════
export default function LieGroupGallery() {
  const responsive = useResponsive();
  return (
    <section style={{ marginTop: 36, marginBottom: 24 }}>
      <div style={{
        padding: responsive.isMobile ? "16px 16px" : "22px 24px",
        background: `linear-gradient(135deg, ${C.violet}11 0%, ${C.gold}08 100%)`,
        border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.violet}`,
        borderRadius: 4, marginBottom: 22,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10.5, color: C.violet,
          letterSpacing: 2.6, textTransform: "uppercase", marginBottom: 6,
        }}>Atlas · Group manifolds</div>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 26 : 34, color: C.ink,
          margin: "0 0 10px 0", lineHeight: 1.15,
        }}>Lie-group manifolds — geometry of symmetry</h2>
        <p style={{
          fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 14 : 15.5,
          color: C.inkDim, lineHeight: 1.65, margin: 0, maxWidth: 820,
        }}>
          Every gauge symmetry of nature is a Lie group, and every Lie group is itself a smooth manifold whose topology constrains physics: <M>{"SU(2) \\cong S^3"}</M> hosts spinors via its double cover of <M>{"SO(3) \\cong \\mathbb{RP}^3"}</M>; flag varieties <M>{"SU(N)/T^{N-1}"}</M> are where representation theory becomes geometry; and the exceptional polytope of <M>{"E_8"}</M> remains the most-studied candidate for total unification. Each plate below renders one such manifold full-width, with a precise definition, an interactive 3D embedding, and a three-part walkthrough.
        </p>
      </div>
     <LazyMount minHeight={600}><SU2Hopf /></LazyMount>
     <LazyMount minHeight={600}><SO3RP3 /></LazyMount>
     <LazyMount minHeight={600}><FlagVariety /></LazyMount>
     <LazyMount minHeight={600}><E8Polytope /></LazyMount>
    </section>
  );
}
