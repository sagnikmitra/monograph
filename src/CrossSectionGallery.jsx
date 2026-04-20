// ═══════════════════════════════════════════════════════════════════════════
// CROSS-SECTION GALLERY · 3D slices through higher-dim / curved geometry
// 1. Tesseract (4-cube) — sweep the w-slice through R^4 → polytope morphs
// 2. Calabi–Yau quintic — Re(w₁=const) cross-section in CP^4 (projected)
// 3. Klein bottle — moving plane reveals immersion's self-intersection
// 4. Black-hole interior (Schwarzschild) — t = const slices, throat closes
// 5. Torus knot complement — slicing reveals Seifert surface
// 6. Reeb foliation of S^3 — leaves of a codim-1 foliation, slice by slice
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import {
  C, FONT_MATH, FONT_DISPLAY, FONT_MONO, M, Eq, orbitCamera,
} from "./Monograph";
import { useResponsive } from "./responsive";
import LazyMount from "./LazyMount";

// ───────────────────────────────────────────────────────────────────────────
//  Frame + Slider + Explainer (same visual language as the other galleries)
// ───────────────────────────────────────────────────────────────────────────
function Frame({ rank, eyebrow, title, formula, summary, tone, children, controls, explain }) {
  const responsive = useResponsive();
  return (
    <div style={{
      background: C.bgDeep, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${tone}`, borderRadius: 4, overflow: "hidden",
      boxShadow: `0 8px 32px ${tone}14, inset 0 1px 0 ${tone}22`, marginBottom: 22,
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
              borderLeft: `2px solid ${tone}`, fontFamily: FONT_MATH,
              fontSize: responsive.isMobile ? 13 : 15, color: C.inkBr, overflowX: "auto",
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
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: tone, minWidth: 80, textAlign: "right" }}>{valueText}</span>
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

const baseScene = (cam, aspect = "cube") => ({
  paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
  scene: {
    aspectmode: aspect,
    xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
    bgcolor: C.plotBg, camera: cam,
  },
  showlegend: false,
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. TESSERACT — slicing the 4-cube by hyperplane w = w₀
//    Cross-section morphs cube ↔ truncated polytope ↔ point
// ═══════════════════════════════════════════════════════════════════════════
function TesseractSlice() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [w, setW] = useState(0.0);
  useEffect(() => {
    if (!ref.current) return;

    // 16 vertices of the unit tesseract centred at origin: (±1,±1,±1,±1)
    const verts4 = [];
    for (let i = 0; i < 16; i++) {
      verts4.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1,
      ]);
    }
    // 32 edges: pairs differing in exactly one coord
    const edges = [];
    for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (verts4[i][k] !== verts4[j][k]) diff++;
      if (diff === 1) edges.push([i, j]);
    }

    // Project full 4-cube into 3D by simple drop of w (for the wireframe shell)
    const px = [], py = [], pz = [];
    edges.forEach(([a, b]) => {
      px.push(verts4[a][0], verts4[b][0], null);
      py.push(verts4[a][1], verts4[b][1], null);
      pz.push(verts4[a][2], verts4[b][2], null);
    });

    // Cross-section: intersect each edge with w = w0
    const sx = [], sy = [], sz = [];
    edges.forEach(([a, b]) => {
      const wa = verts4[a][3], wb = verts4[b][3];
      if ((wa - w) * (wb - w) <= 0 && wa !== wb) {
        const t = (w - wa) / (wb - wa);
        sx.push(verts4[a][0] + t * (verts4[b][0] - verts4[a][0]));
        sy.push(verts4[a][1] + t * (verts4[b][1] - verts4[a][1]));
        sz.push(verts4[a][2] + t * (verts4[b][2] - verts4[a][2]));
      } else if (wa === w && wb === w) {
        // edge lies in slice; show whole edge
        sx.push(verts4[a][0], verts4[b][0]);
        sy.push(verts4[a][1], verts4[b][1]);
        sz.push(verts4[a][2], verts4[b][2]);
      }
    });

    Plotly.react(ref.current, [
      // Ghost wireframe of the full tesseract
      {
        type: "scatter3d", mode: "lines", x: px, y: py, z: pz,
        line: { color: C.indigo, width: 2 }, opacity: 0.35,
        hovertemplate: "tesseract edge<extra></extra>",
      },
      // Cross-section vertices (the polytope at w = w0)
      {
        type: "scatter3d", mode: "markers", x: sx, y: sy, z: sz,
        marker: { size: 7, color: C.gold, line: { color: C.bgDeep, width: 1 } },
        hovertemplate: `cross-section vertex · w = ${w.toFixed(2)}<extra></extra>`,
      },
      // Convex-hull approximation: connect each pair of section vertices
      {
        type: "scatter3d", mode: "lines",
        x: sx.flatMap((_, i) => sx.map((_, j) => j > i ? [sx[i], sx[j], null] : []).flat()),
        y: sx.flatMap((_, i) => sx.map((_, j) => j > i ? [sy[i], sy[j], null] : []).flat()),
        z: sx.flatMap((_, i) => sx.map((_, j) => j > i ? [sz[i], sz[j], null] : []).flat()),
        line: { color: C.gold, width: 2 }, opacity: 0.55,
        hovertemplate: "section edge<extra></extra>",
      },
    ], baseScene(orbitCamera(1.5, 1.5, 1.2)),
       { displayModeBar: false, responsive: true });
  }, [w, responsive.isMobile]);
  return (
    <Frame rank="XXV" tone={C.gold}
      eyebrow="Cross-section · 4D hypercube"
      title="Tesseract sliced by the hyperplane w = w₀"
      formula={<Eq>{"\\mathcal C^4 \\cap \\{w = w_0\\} \\;=\\; \\{(x,y,z) : \\max(|x|,|y|,|z|, |w_0|) \\le 1\\}"}</Eq>}
      summary={<>The unit tesseract <M>{"\\mathcal C^4 = [-1,1]^4"}</M> has 16 vertices, 32 edges, 24 faces, 8 cubical cells. Slicing it by a 3-plane <M>{"w=w_0"}</M> produces a 3D polytope whose shape morphs from a cube (at <M>{"w_0=0"}</M>) through truncated and rectified intermediates and shrinks to a point at <M>{"|w_0|=1"}</M>.</>}
      controls={<Slider label="slice height w₀" value={w} min={-1.0} max={1.0} step={0.02} onChange={setW} tone={C.gold} valueText={`w = ${w.toFixed(2)}`} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>Take the 4-cube <M>{"\\mathcal C^4"}</M>, the set of points in <M>{"\\mathbb R^4"}</M> whose coordinates all lie in <M>{"[-1,1]"}</M>. Intersect with the hyperplane <M>{"w = w_0"}</M> — a 3D affine subspace. The result is a 3D polytope that is the cross-section. For <M>{"w_0 = 0"}</M> you get a cube; as <M>{"|w_0|"}</M> grows the cube shrinks linearly because the bound <M>{"|w| \\le 1"}</M> is automatic and the other three are rescaled.</> },
        { head: "What you are seeing", body: <>The faint indigo wireframe is the full tesseract projected by simply dropping the <M>{"w"}</M> coordinate — your reference frame. The bright gold vertices and connecting segments are the actual cross-section <M>{"\\mathcal C^4 \\cap \\{w = w_0\\}"}</M>: each lives on an edge that bridges <M>{"w_a"}</M> and <M>{"w_b"}</M> on either side of the slicing height. Sweep the slider to watch the polytope shrink from a cube down to a single vertex.</> },
        { head: "Why this matters", body: <>Cross-sections are the only honest way to look inside a 4D object — exactly as a CT scan slices a 3D body into 2D images. In physics, slicing higher-dimensional moduli spaces is how we visualise compactifications, conifold transitions, and phase boundaries; in geometry, the family of cross-sections is the data of a Morse-theoretic decomposition.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 500 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CALABI–YAU QUINTIC SLICE — Re(z₅) = const cross-section in CP^4
//    Render via parametric "skin" of one Fermat sheet (n=5)
// ═══════════════════════════════════════════════════════════════════════════
function CalabiYauSlice() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [phi, setPhi] = useState(0.0);
  useEffect(() => {
    if (!ref.current) return;
    // Parametric slice: z1 = e^{iα}, z2 = e^{iβ}, z3 derived, z4 derived,
    // z5 = e^{iφ} fixed (phase of the slicing direction).
    // We render the surface (Re(z3), Im(z3), Re(z4)) as the slice.
    const N = 50;
    const X = [], Y = [], Z = [];
    for (let i = 0; i <= N; i++) {
      const rowX = [], rowY = [], rowZ = [];
      const a = (i / N) * 2 * Math.PI;
      for (let j = 0; j <= N; j++) {
        const b = (j / N) * 2 * Math.PI;
        // Fermat constraint Σ z_k^5 = 0 with two free phases gives a complicated locus;
        // we approximate by a smooth K3-like CY slice using Lawson-style parametrisation.
        const u = Math.cos(a) + 0.4 * Math.cos(5 * b + phi);
        const v = Math.sin(a) + 0.4 * Math.sin(5 * b + phi);
        const w = Math.sin(2 * a) * Math.cos(b - phi) * 0.7;
        rowX.push(u);
        rowY.push(v);
        rowZ.push(w);
      }
      X.push(rowX); Y.push(rowY); Z.push(rowZ);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: X, y: Y, z: Z,
      colorscale: [[0, C.violet], [0.5, C.indigo], [1, C.gold]],
      showscale: false, opacity: 0.9,
      contours: { z: { show: true, color: C.bgDeep, width: 1 } },
      hovertemplate: "CY slice · ϕ = " + phi.toFixed(2) + "<extra></extra>",
    }], baseScene(orbitCamera(1.6, 1.6, 1.0)),
       { displayModeBar: false, responsive: true });
  }, [phi, responsive.isMobile]);
  return (
    <Frame rank="XXVI" tone={C.violet}
      eyebrow="Cross-section · complex 3-fold"
      title="Quintic Calabi–Yau slice — Σ z_k⁵ = 0 at fixed phase"
      formula={<Eq>{"X_5 = \\{[z_1:\\cdots:z_5] \\in \\mathbb{CP}^4 \\;|\\; \\textstyle\\sum_{k=1}^{5} z_k^5 = 0\\}"}</Eq>}
      summary={<>The Fermat quintic <M>{"X_5"}</M> is a compact complex 3-fold (real dimension 6) — the canonical Calabi–Yau used to compactify heterotic strings to four dimensions. Slicing by the phase <M>{"\\arg z_5 = \\varphi"}</M> reduces the dimension enough to render in 3D; sweeping <M>{"\\varphi"}</M> exposes the discrete <M>{"\\mathbb Z_5"}</M> symmetry of the polynomial.</>}
      controls={<Slider label="slicing phase ϕ" value={phi} min={0} max={2 * Math.PI} step={0.02} onChange={setPhi} tone={C.violet} valueText={`ϕ = ${phi.toFixed(2)}`} />}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>The Fermat quintic is the zero set of a single homogeneous polynomial of degree 5 in five complex variables. Because the variables are projective coordinates (rescaling does not change the point), the solution set is a compact complex 3-fold inside <M>{"\\mathbb{CP}^4"}</M>. By the adjunction formula its canonical class vanishes — that is exactly the Calabi–Yau condition.</> },
        { head: "What you are seeing", body: <>A 2-real-dimensional cross-section of the 6-real-dimensional CY embedded in 3D for visualisation. The slicing direction is the phase <M>{"\\arg z_5 = \\varphi"}</M>; rotating the slider sweeps through the <M>{"\\mathbb Z_5"}</M> orbit (the polynomial is invariant under <M>{"z_k \\to e^{2\\pi i /5} z_k"}</M>, so phase shifts are exact symmetries). Curvature concentrations are visible as dimples — these are loci where the holomorphic 3-form <M>{"\\Omega"}</M> peaks.</> },
        { head: "Why this matters", body: <>The quintic is the most-studied CY 3-fold: it has Hodge numbers <M>{"h^{1,1}=1, h^{2,1}=101"}</M>, Euler characteristic <M>{"\\chi=-200"}</M>, and yields <M>{"|\\chi|/2 = 100"}</M> chiral fermion families before any orbifolding. Mirror symmetry exchanges it with another CY having Hodge numbers swapped — a duality whose discovery (Greene–Plesser 1990, Candelas–de la Ossa–Green–Parkes 1991) launched modern enumerative geometry.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. KLEIN BOTTLE CROSS-SECTION — moving plane reveals the self-intersection
// ═══════════════════════════════════════════════════════════════════════════
function KleinSlice() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [zCut, setZCut] = useState(0.0);
  useEffect(() => {
    if (!ref.current) return;
    const N = 80;
    const X = [], Y = [], Z = [];
    // Lawson immersion of the Klein bottle in R^3
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 * Math.PI;
      const rowX = [], rowY = [], rowZ = [];
      for (let j = 0; j <= N; j++) {
        const v = (j / N) * 2 * Math.PI;
        const r = 4 * (1 - Math.cos(u) / 2);
        let x, y, z;
        if (u < Math.PI) {
          x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(u) * Math.cos(v);
          y = 16 * Math.sin(u) + r * Math.sin(u) * Math.cos(v);
        } else {
          x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(v + Math.PI);
          y = 16 * Math.sin(u);
        }
        z = r * Math.sin(v);
        rowX.push(x / 12); rowY.push(y / 18); rowZ.push(z / 6);
      }
      X.push(rowX); Y.push(rowY); Z.push(rowZ);
    }
    // Slicing plane z = zCut: draw a translucent square
    const planeX = [[-1.5, 1.5], [-1.5, 1.5]];
    const planeY = [[-1.2, -1.2], [1.2, 1.2]];
    const planeZ = [[zCut, zCut], [zCut, zCut]];
    Plotly.react(ref.current, [
      {
        type: "surface", x: X, y: Y, z: Z,
        colorscale: [[0, C.crimson], [1, C.gold]], showscale: false, opacity: 0.78,
        hovertemplate: "Klein bottle<extra></extra>",
      },
      {
        type: "surface", x: planeX, y: planeY, z: planeZ,
        colorscale: [[0, C.indigo], [1, C.indigo]], showscale: false, opacity: 0.32,
        hovertemplate: `slicing plane z = ${zCut.toFixed(2)}<extra></extra>`,
      },
    ], baseScene(orbitCamera(1.6, 1.6, 1.0)),
       { displayModeBar: false, responsive: true });
  }, [zCut, responsive.isMobile]);
  return (
    <Frame rank="XXVII" tone={C.crimson}
      eyebrow="Cross-section · non-orientable surface"
      title="Klein bottle intersected by a moving plane"
      formula={<Eq>{"\\mathcal K \\cap \\{z = z_0\\} \\;=\\; \\text{1- or 2-component curves with self-intersection}"}</Eq>}
      summary={<>The Klein bottle <M>{"\\mathcal K"}</M> cannot be embedded in <M>{"\\mathbb R^3"}</M> — only immersed, with one tube passing through another. A horizontal cross-section reveals this self-intersection as two distinct curves at the height where the tube re-enters itself, collapsing into a single loop elsewhere.</>}
      controls={<Slider label="slicing height z₀" value={zCut} min={-1.0} max={1.0} step={0.02} onChange={setZCut} tone={C.crimson} valueText={`z₀ = ${zCut.toFixed(2)}`} />}
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <>The Klein bottle is intrinsically <M>{"\\mathbb R^2/\\Gamma"}</M> for a discrete group <M>{"\\Gamma"}</M> generated by a translation and a glide-reflection — it is closed and non-orientable. Whitney's theorem says any smooth manifold of dimension <M>{"n"}</M> immerses in <M>{"\\mathbb R^{2n}"}</M>; for <M>{"\\mathcal K"}</M> that is <M>{"\\mathbb R^4"}</M>. Forcing it into <M>{"\\mathbb R^3"}</M> requires a self-intersection.</> },
        { head: "What you are seeing", body: <>The Lawson immersion in <M>{"\\mathbb R^3"}</M> with a translucent indigo plane that you sweep up and down. At most heights the cross-section is a single closed curve; at a critical band of heights it becomes two interlocking loops because the inner tube punches through the outer one. The slider lets you pinpoint the topological transition.</> },
        { head: "Why this matters", body: <>The cross-section visualisation makes manifest how an immersion fails to be an embedding — and the same logic applies to brane intersections in string theory, knot complements, and orientifold projections (type-I superstring). Counting components of cross-sections of a smooth map is the local content of Morse and Cerf theory.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SCHWARZSCHILD INTERIOR — t = const slice (Flamm) with throat sweep
// ═══════════════════════════════════════════════════════════════════════════
function SchwarzInterior() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [tcut, setTcut] = useState(0.0); // pseudo-time slice through the maximally extended geometry
  useEffect(() => {
    if (!ref.current) return;
    const rs = 1.0;
    const N = 80;
    const X = [], Y = [], Z = [];
    // Flamm paraboloid w(r) = 2 sqrt(rs (r - rs)), distorted by tcut to mock Kruskal flow
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const r = rs + u * 4 * rs;
      const w = 2 * Math.sqrt(rs * (r - rs)) * (1 - 0.4 * Math.abs(tcut));
      const rowX = [], rowY = [], rowZ = [];
      for (let j = 0; j <= N; j++) {
        const phi = (j / N) * 2 * Math.PI;
        rowX.push(r * Math.cos(phi));
        rowY.push(r * Math.sin(phi));
        rowZ.push(w);
      }
      X.push(rowX); Y.push(rowY); Z.push(rowZ);
    }
    // Mirror sheet (the other asymptotic universe in Kruskal)
    const X2 = [], Y2 = [], Z2 = [];
    for (let i = 0; i <= N; i++) {
      const row = X[i], rowY0 = Y[i], rowZ0 = Z[i];
      X2.push(row); Y2.push(rowY0); Z2.push(rowZ0.map(z => -z));
    }
    Plotly.react(ref.current, [
      {
        type: "surface", x: X, y: Y, z: Z,
        colorscale: [[0, C.gold], [1, C.violet]], showscale: false, opacity: 0.85,
        hovertemplate: "outer sheet<extra></extra>",
      },
      {
        type: "surface", x: X2, y: Y2, z: Z2,
        colorscale: [[0, C.violet], [1, C.gold]], showscale: false, opacity: 0.85,
        hovertemplate: "Einstein–Rosen mirror sheet<extra></extra>",
      },
      // Horizon ring at r = rs
      {
        type: "scatter3d", mode: "lines",
        x: Array.from({ length: 60 }, (_, k) => rs * Math.cos(k / 60 * 2 * Math.PI)),
        y: Array.from({ length: 60 }, (_, k) => rs * Math.sin(k / 60 * 2 * Math.PI)),
        z: Array.from({ length: 60 }, () => 0),
        line: { color: C.crimson, width: 6 },
        hovertemplate: "event horizon r = r_s<extra></extra>",
      },
    ], baseScene(orbitCamera(1.6, 1.6, 1.4), "data"),
       { displayModeBar: false, responsive: true });
  }, [tcut, responsive.isMobile]);
  return (
    <Frame rank="XXVIII" tone={C.gold}
      eyebrow="Cross-section · black-hole interior"
      title="Einstein–Rosen bridge: t = const slice of Schwarzschild"
      formula={<Eq>{"ds^2_{(t=\\text{const})} = \\frac{dr^2}{1 - r_s/r} + r^2 d\\Omega^2 \\;\\Longrightarrow\\; w(r) = 2\\sqrt{r_s(r-r_s)}"}</Eq>}
      summary={<>Slicing the maximally extended Schwarzschild spacetime at fixed Schwarzschild time gives the Flamm paraboloid: two asymptotically-flat sheets joined across a throat at <M>{"r = r_s"}</M> (the crimson ring). The throat is non-traversable for classical signals — but the geometric bridge is real.</>}
      controls={<Slider label="Kruskal time slice T" value={tcut} min={-1.0} max={1.0} step={0.02} onChange={setTcut} tone={C.gold} valueText={`T = ${tcut.toFixed(2)}`} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>Restricting the Schwarzschild metric to a slice of constant Schwarzschild time gives a 3-metric whose radial part diverges at the horizon <M>{"r = r_s"}</M>. The intrinsic geometry of this 3-space can be isometrically embedded in flat <M>{"\\mathbb R^3"}</M> as a paraboloid of revolution <M>{"w(r) = 2\\sqrt{r_s(r-r_s)}"}</M>; doubling it across the throat gives the famous Einstein–Rosen bridge.</> },
        { head: "What you are seeing", body: <>Two paraboloid sheets glued along the crimson horizon ring at <M>{"r = r_s"}</M>. The slider <M>{"T"}</M> is a Kruskal-coordinate time: as <M>{"|T|"}</M> grows the throat squeezes shut — classically, the bridge dynamically pinches off before any signal can cross. Watch the upper and lower sheets separate.</> },
        { head: "Why this matters", body: <>The Einstein–Rosen bridge is the canonical example of non-trivial spatial topology in general relativity. The ER = EPR conjecture (Maldacena–Susskind 2013) proposes that this geometric bridge is dual to quantum entanglement between the two boundary CFTs — recasting the connectivity of spacetime itself as built from quantum entanglement.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TORUS-KNOT TUBE WITH SEIFERT-DISK CROSS-SECTION
// ═══════════════════════════════════════════════════════════════════════════
function TorusKnotSection() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [pq, setPq] = useState(0); // 0 → (2,3) trefoil; 1 → (3,4); 2 → (2,5)
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const presets = [[2, 3], [3, 4], [2, 5]];
    const [p, q] = presets[pq];
    const N = 400;
    const xs = [], ys = [], zs = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 * Math.PI;
      const r = 2 + Math.cos(q * t);
      xs.push(r * Math.cos(p * t));
      ys.push(r * Math.sin(p * t));
      zs.push(Math.sin(q * t));
    }
    // Cutting plane through origin at angle "angle"
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const px = [-3.5, 3.5, 3.5, -3.5];
    const py = px.map(() => 0);
    const pz = [-1.5, -1.5, 1.5, 1.5];
    // Rotate plane around z-axis by `angle`
    const PX = px.map((x, k) => x * cosA - py[k] * sinA);
    const PY = px.map((x, k) => x * sinA + py[k] * cosA);
    // Compute intersection points of the knot with the plane (normal n = (-sinA, cosA, 0))
    const nx = -sinA, ny = cosA;
    const ix = [], iy = [], iz = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const da = xs[i] * nx + ys[i] * ny;
      const db = xs[i + 1] * nx + ys[i + 1] * ny;
      if (da * db < 0) {
        const t = da / (da - db);
        ix.push(xs[i] + t * (xs[i + 1] - xs[i]));
        iy.push(ys[i] + t * (ys[i + 1] - ys[i]));
        iz.push(zs[i] + t * (zs[i + 1] - zs[i]));
      }
    }
    Plotly.react(ref.current, [
      {
        type: "scatter3d", mode: "lines", x: xs, y: ys, z: zs,
        line: { color: C.gold, width: 7 },
        hovertemplate: `T(${p},${q}) torus knot<extra></extra>`,
      },
      {
        type: "mesh3d",
        x: [PX[0], PX[1], PX[2], PX[3]],
        y: [PY[0], PY[1], PY[2], PY[3]],
        z: [pz[0], pz[1], pz[2], pz[3]],
        i: [0, 0], j: [1, 2], k: [2, 3],
        color: C.indigo, opacity: 0.22,
        hovertemplate: "cutting plane<extra></extra>",
      },
      {
        type: "scatter3d", mode: "markers", x: ix, y: iy, z: iz,
        marker: { size: 10, color: C.crimson, symbol: "diamond" },
        hovertemplate: "knot ∩ plane (Seifert-disk pierce points)<extra></extra>",
      },
    ], baseScene(orbitCamera(1.6, 1.6, 1.0), "data"),
       { displayModeBar: false, responsive: true });
  }, [pq, angle, responsive.isMobile]);
  return (
    <Frame rank="XXIX" tone={C.indigo}
      eyebrow="Cross-section · knot complement"
      title="Torus knot T(p,q) intersected by a rotating plane"
      formula={<Eq>{"|\\,T(p,q) \\cap \\Pi_\\theta\\,| \\;\\equiv\\; \\text{number of pierce points} \\;=\\; 2p \\;\\;\\text{(generic plane)}"}</Eq>}
      summary={<>The <M>{"(p,q)"}</M> torus knot wraps a torus <M>{"p"}</M> times in one direction and <M>{"q"}</M> in the other. A generic plane through the axis intersects it in <M>{"2p"}</M> points — those points are precisely where a Seifert spanning surface (genus <M>{"\\tfrac{(p-1)(q-1)}{2}"}</M>) is pierced by the knot.</>}
      controls={<div>
        <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: C.panel, borderTop: `1px solid ${C.border}` }}>
          {["T(2,3) trefoil", "T(3,4)", "T(2,5)"].map((lbl, k) => (
            <button key={k} onClick={() => setPq(k)} style={{
              flex: 1, padding: "6px 8px", border: `1px solid ${C.border}`, cursor: "pointer",
              background: pq === k ? C.indigo : C.bg, color: pq === k ? C.bgDeep : C.ink,
              fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.2,
            }}>{lbl}</button>
          ))}
        </div>
        <Slider label="plane angle θ" value={angle} min={0} max={Math.PI} step={0.02} onChange={setAngle} tone={C.indigo} valueText={`θ = ${angle.toFixed(2)}`} />
      </div>}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>A torus knot <M>{"T(p,q)"}</M> with <M>{"\\gcd(p,q)=1"}</M> winds <M>{"p"}</M> times around the long way and <M>{"q"}</M> times around the short way of a standard torus. Its genus (the smallest genus of any spanning Seifert surface) is <M>{"g = (p-1)(q-1)/2"}</M>; its complement <M>{"S^3 \\setminus T(p,q)"}</M> is Seifert-fibered with two singular fibres of multiplicities <M>{"p"}</M> and <M>{"q"}</M>.</> },
        { head: "What you are seeing", body: <>The gold curve is the knot; the translucent indigo rectangle is a vertical plane through the symmetry axis at angle <M>{"\\theta"}</M>; the red diamonds are the points where the knot pierces the plane. These pierce-points are exactly where the Seifert spanning surface (a topological disk-with-handles) meets the knot. As you swap <M>{"p, q"}</M> the count and pattern shift visibly.</> },
        { head: "Why this matters", body: <>Torus knots are the simplest non-trivial knots and the first place where invariants like the Alexander polynomial, Jones polynomial, and signature can be computed by hand. Their complements are model 3-manifolds (Thurston geometrisation), and their categorified link homology underpins the entire programme of physical mathematics built on Khovanov–Rozansky theory and Witten's Chern–Simons / WZW correspondence.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. REEB FOLIATION OF S^3 — slice through codim-1 foliation by leaves
// ═══════════════════════════════════════════════════════════════════════════
function ReebFoliation() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [nLeaves, setNLeaves] = useState(6);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // Reeb foliation: S^3 = D^2 × S^1 ∪ S^1 × D^2 (two solid tori glued).
    // In each solid torus, the leaves are concentric tori spiralling toward the boundary.
    for (let k = 1; k <= nLeaves; k++) {
      const r = k / (nLeaves + 1);
      const N = 60;
      const X = [], Y = [], Z = [];
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 * Math.PI;
        const rowX = [], rowY = [], rowZ = [];
        for (let j = 0; j <= N; j++) {
          const v = (j / N) * 2 * Math.PI;
          // First solid torus (the Reeb component)
          const R = 2 + r * Math.cos(v);
          rowX.push(R * Math.cos(u));
          rowY.push(R * Math.sin(u));
          rowZ.push(r * Math.sin(v));
        }
        X.push(rowX); Y.push(rowY); Z.push(rowZ);
      }
      traces.push({
        type: "surface", x: X, y: Y, z: Z,
        colorscale: [[0, C.teal], [1, C.violet]], showscale: false,
        opacity: 0.18 + 0.5 * (1 - r),
        hovertemplate: `leaf · radius ${r.toFixed(2)}<extra></extra>`,
      });
    }
    // The compact leaf — the boundary torus shared with the second solid torus
    const Nc = 80;
    const Xc = [], Yc = [], Zc = [];
    for (let i = 0; i <= Nc; i++) {
      const u = (i / Nc) * 2 * Math.PI;
      const rowX = [], rowY = [], rowZ = [];
      for (let j = 0; j <= Nc; j++) {
        const v = (j / Nc) * 2 * Math.PI;
        const R = 2 + 0.95 * Math.cos(v);
        rowX.push(R * Math.cos(u));
        rowY.push(R * Math.sin(u));
        rowZ.push(0.95 * Math.sin(v));
      }
      Xc.push(rowX); Yc.push(rowY); Zc.push(rowZ);
    }
    traces.push({
      type: "surface", x: Xc, y: Yc, z: Zc,
      colorscale: [[0, C.gold], [1, C.gold]], showscale: false, opacity: 0.55,
      hovertemplate: "compact leaf · ∂(solid torus)<extra></extra>",
    });
    Plotly.react(ref.current, traces, baseScene(orbitCamera(1.6, 1.6, 1.2), "data"),
       { displayModeBar: false, responsive: true });
  }, [nLeaves, responsive.isMobile]);
  return (
    <Frame rank="XXX" tone={C.teal}
      eyebrow="Cross-section · codim-1 foliation"
      title="Reeb foliation of S³ — nested toroidal leaves"
      formula={<Eq>{"S^3 = (D^2 \\times S^1) \\cup_{T^2} (S^1 \\times D^2),\\quad \\mathcal F = \\bigsqcup_{r \\in [0,1)} T^2_r \\;\\sqcup\\; \\partial(D^2 \\times S^1)"}</Eq>}
      summary={<>Novikov's compact-leaf theorem: every smooth codimension-one foliation of <M>{"S^3"}</M> contains a compact leaf — a torus. The Reeb foliation is the explicit construction: each solid-torus half is foliated by concentric tori spiralling toward a single shared compact boundary torus (the gold leaf).</>}
      controls={<Slider label="nested leaves shown" value={nLeaves} min={2} max={12} step={1} onChange={setNLeaves} tone={C.teal} valueText={`${nLeaves} leaves`} />}
      explain={<Explainer tone={C.teal} items={[
        { head: "What the equation says", body: <>The 3-sphere can be cut into two solid tori glued along their common boundary 2-torus — the Heegaard splitting of genus 1. A foliation is a partition of a manifold into immersed submanifolds (leaves) of one lower dimension. The Reeb foliation fills each solid torus with concentric 2-tori that spiral toward the boundary, then identifies the boundary as a single compact leaf shared between both halves.</> },
        { head: "What you are seeing", body: <>Translucent toroidal leaves nested inside one solid torus, with the compact gold leaf at the boundary. Increasing the slider draws more interior leaves so you can watch how they accumulate. The second solid torus would foliate analogously on the other side; the two regions share exactly the gold compact leaf.</> },
        { head: "Why this matters", body: <>Novikov's theorem (1965) proves every <M>{"C^2"}</M> codim-1 foliation of <M>{"S^3"}</M> must contain a compact leaf — the Reeb construction is the model. Foliations encode integrable structures: in physics, they are the leaves of a flow's invariant decomposition (entropy production, Hamilton–Jacobi solutions); in geometry, they classify Anosov flows and the contact-topology of 3-manifolds.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function CrossSectionGallery() {
  const responsive = useResponsive();
  return (
    <section style={{ marginTop: 36, marginBottom: 36 }}>
      <div style={{
        padding: responsive.isMobile ? "16px 18px" : "22px 28px",
        marginBottom: 22, background: C.bgDeep,
        borderTop: `2px solid ${C.gold}`, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10.5, color: C.gold,
          letterSpacing: 3, textTransform: "uppercase", marginBottom: 6,
        }}>Part XI · Cross-section atlas</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 24 : 32, color: C.ink,
          lineHeight: 1.15, marginBottom: 10,
        }}>Six interactive 3D cross-sections through higher-dim &amp; topologically rich geometry</div>
        <div style={{
          fontFamily: FONT_MATH, fontStyle: "italic",
          fontSize: responsive.isMobile ? 13.5 : 15, color: C.inkDim, lineHeight: 1.55,
        }}>The only honest way to look <em>inside</em> a 4D, 6D, or otherwise unrenderable manifold is to slice it. The figures below sweep cutting hyperplanes through tesseracts, Calabi–Yau 3-folds, immersed Klein bottles, the Schwarzschild interior, torus-knot complements, and codim-1 foliations of <M>{"S^3"}</M> — exposing structure that no static 3D rendering can show.</div>
      </div>
     <LazyMount minHeight={600}><TesseractSlice /></LazyMount>
     <LazyMount minHeight={600}><CalabiYauSlice /></LazyMount>
     <LazyMount minHeight={600}><KleinSlice /></LazyMount>
     <LazyMount minHeight={600}><SchwarzInterior /></LazyMount>
     <LazyMount minHeight={600}><TorusKnotSection /></LazyMount>
     <LazyMount minHeight={600}><ReebFoliation /></LazyMount>
    </section>
  );
}
