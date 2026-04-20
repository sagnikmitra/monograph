// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED MANIFOLD GALLERY · six deeper exhibits in mathematical physics
// Lie groups · gauge bundles · instantons · twistors · spin networks · CY slice
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import {
  C, FONT_MATH, FONT_DISPLAY, FONT_MONO, M, Eq, orbitCamera,
} from "./Monograph";
import { useResponsive } from "./responsive";
import LazyMount from "./LazyMount";

// ───────────────────────────────────────────────────────────────────────────
// Local frame (mirrors GalleryFrame in ManifoldGallery, kept independent so
// the two galleries can evolve separately)
// ───────────────────────────────────────────────────────────────────────────
function Frame({ rank, eyebrow, title, formula, summary, tone, children, controls, explain }) {
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
              margin: "8px 0 10px", padding: "8px 12px",
              background: C.bg, borderLeft: `2px solid ${tone}`,
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
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: tone, minWidth: 70, textAlign: "right" }}>{valueText}</span>
    </div>
  );
}

const baseLayout = (responsive, cam = orbitCamera(1.4, 1.4, 1.0), aspect = "cube") => ({
  paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
  scene: {
    aspectmode: aspect,
    xaxis: { visible: false }, yaxis: { visible: false }, zaxis: { visible: false },
    bgcolor: C.plotBg, camera: cam,
  },
  showlegend: false,
});

// ═══════════════════════════════════════════════════════════════════════════
// 1.  SU(2) ≅ S³ — group manifold via stereographic projection of unit
//     quaternions, fibred by left cosets of U(1) (Hopf bundle base of §2)
// ═══════════════════════════════════════════════════════════════════════════
function SU2Manifold() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [latRings, setLatRings] = useState(9);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // Latitudinal 2-spheres of S³ projected into ℝ³ (each is a constant-w slice)
    for (let k = 1; k < latRings; k++) {
      const w = -1 + (2 * k) / latRings;
      const r = Math.sqrt(Math.max(0, 1 - w * w));
      const N = responsive.isMobile ? 28 : 44;
      const xs = [], ys = [], zs = [];
      for (let i = 0; i <= N; i++) {
        const xr = [], yr = [], zr = [];
        const u = (i / N) * Math.PI;
        for (let j = 0; j <= N; j++) {
          const v = (j / N) * 2 * Math.PI;
          // (x,y,z,w) on S³ with constant w; stereographic from (0,0,0,−1)
          const X4 = r * Math.sin(u) * Math.cos(v);
          const Y4 = r * Math.sin(u) * Math.sin(v);
          const Z4 = r * Math.cos(u);
          const s = 1 / (1 - w * 0.92 + 1e-3);
          xr.push(X4 * s); yr.push(Y4 * s); zr.push(Z4 * s);
        }
        xs.push(xr); ys.push(yr); zs.push(zr);
      }
      const t = (k / latRings);
      const col = `rgba(${Math.round(124 + 100 * t)},${Math.round(96 + 80 * (1 - t))},${Math.round(220 - 120 * t)},0.16)`;
      traces.push({
        type: "surface", x: xs, y: ys, z: zs,
        colorscale: [[0, col], [1, col]], showscale: false, opacity: 0.55,
        hovertemplate: `w = ${w.toFixed(2)}<extra></extra>`,
        lighting: { ambient: 0.85, diffuse: 0.4, specular: 0.1 },
      });
    }
    Plotly.react(ref.current, traces, baseLayout(responsive, orbitCamera(1.5, 1.5, 1.0)),
      { displayModeBar: false, responsive: true });
  }, [latRings, responsive.isMobile]);
  return (
    <Frame rank="VII" tone={C.indigo}
      eyebrow="Lie group manifold · simply-connected 3-sphere"
      title="SU(2) ≅ S³ as nested 2-sphere foliation"
      formula={<M>{"SU(2) = \\{ U \\in M_2(\\mathbb C) : U^\\dagger U = \\mathbb 1, \\, \\det U = 1 \\} \\;\\cong\\; S^3 \\subset \\mathbb H"}</M>}
      summary={<>The double cover of <M>{"SO(3)"}</M>; topologically <M>{"\\pi_1(SU(2))=0"}</M>, <M>{"\\pi_3(SU(2))=\\mathbb Z"}</M>. The <M>{"\\pi_3"}</M> generator labels Yang–Mills instantons and the WZW level. Each shell here is a constant-<M>{"w"}</M> slice of the unit 3-sphere stereographically projected into <M>{"\\mathbb R^3"}</M>.</>}
      controls={<Slider label="latitude rings" value={latRings} min={3} max={17} step={1} onChange={setLatRings} tone={C.indigo} valueText={`${latRings}`} />}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>The set <M>{"SU(2)"}</M> is all 2×2 complex matrices <M>{"U"}</M> that are unitary (<M>{"U^\\dagger U = \\mathbb 1"}</M>, preserve inner product) <em>and</em> have determinant 1 (orientation-preserving, no overall phase). A direct calculation shows every such <M>{"U"}</M> can be written <M>{"U = a\\,\\mathbb 1 + i(b\\sigma_x + c\\sigma_y + d\\sigma_z)"}</M> with <M>{"a^2+b^2+c^2+d^2 = 1"}</M> — i.e. the unit 3-sphere <M>{"S^3"}</M> sitting inside the quaternions <M>{"\\mathbb H = \\mathbb R^4"}</M>.</> },
        { head: "What you are seeing", body: <>You can't draw <M>{"S^3"}</M> directly in 3D, so we slice it: each translucent shell is the set of points with a fixed fourth coordinate <M>{"w"}</M>. As <M>{"w"}</M> sweeps from <M>{"-1"}</M> to <M>{"+1"}</M> the slice grows from a point, becomes the equatorial 2-sphere of radius 1, and shrinks back to a point. We then stereographically project each shell into <M>{"\\mathbb R^3"}</M> so you see them nested inside one another. Increasing the slider just adds more shells.</> },
        { head: "Why this matters", body: <>Because <M>{"SU(2)"}</M> is simply-connected (<M>{"\\pi_1 = 0"}</M>), it is the universal cover of <M>{"SO(3)"}</M> — every rotation lifts to <em>two</em> spinors differing by a sign. This is the geometric origin of the spin-1/2 fermion. Because <M>{"\\pi_3(SU(2)) = \\mathbb Z"}</M>, gauge fields on a 4-manifold can wrap <M>{"S^3"}</M> in topologically distinct ways — those integers are the instanton numbers (next figure).</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2.  SO(3) ≅ ℝP³ — solid ball of radius π with antipodal identification
// ═══════════════════════════════════════════════════════════════════════════
function SO3Manifold() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [r, setR] = useState(Math.PI * 0.85);
  useEffect(() => {
    if (!ref.current) return;
    // Outer cutaway shell
    const N = responsive.isMobile ? 50 : 80;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const phi = (i / N) * Math.PI;
      for (let j = 0; j <= N; j++) {
        const th = -Math.PI / 2 + (j / N) * 1.7 * Math.PI; // cutaway slice
        const X = r * Math.sin(phi) * Math.cos(th);
        const Y = r * Math.sin(phi) * Math.sin(th);
        const Z = r * Math.cos(phi);
        xr.push(X); yr.push(Y); zr.push(Z);
        cr.push(Math.sqrt(X * X + Y * Y + Z * Z));
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    // Antipodal identification curves
    const Nc = 30, ax = [], ay = [], az = [];
    for (let i = 0; i <= Nc; i++) {
      const t = (i / Nc) * Math.PI;
      ax.push(Math.PI * Math.sin(t) * Math.cos(2 * t));
      ay.push(Math.PI * Math.sin(t) * Math.sin(2 * t));
      az.push(Math.PI * Math.cos(t));
    }
    Plotly.react(ref.current, [
      {
        type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
        colorscale: [[0, C.indigo], [0.5, C.violet], [1, C.crimson]],
        opacity: 0.78, showscale: false,
        lighting: { ambient: 0.55, diffuse: 0.85, specular: 0.5 },
      },
      {
        type: "scatter3d", mode: "lines", x: ax, y: ay, z: az,
        line: { color: C.gold, width: 6 },
        hovertemplate: "antipodal identification<extra></extra>",
      },
      {
        type: "scatter3d", mode: "markers",
        x: [Math.PI, -Math.PI], y: [0, 0], z: [0, 0],
        marker: { size: 8, color: C.gold, symbol: "diamond" },
        hovertemplate: "x ~ −x on ∂B<extra></extra>",
      },
    ], baseLayout(responsive, orbitCamera(1.6, 1.4, 1.1)),
      { displayModeBar: false, responsive: true });
  }, [r, responsive.isMobile]);
  return (
    <Frame rank="VIII" tone={C.violet}
      eyebrow="Lie group manifold · real projective 3-space"
      title="SO(3) ≅ ℝP³ — ball with antipodal gluing"
      formula={<M>{"SO(3) \\;\\cong\\; SU(2)/\\mathbb Z_2 \\;\\cong\\; \\mathbb{RP}^3 \\;=\\; B_\\pi^3 / (x \\sim -x \\text{ on } \\partial B)"}</M>}
      summary={<>The rotation group has <M>{"\\pi_1(SO(3)) = \\mathbb Z/2"}</M> — the source of the spin/statistics distinction. Points inside the open ball of radius <M>{"\\pi"}</M> are unique rotations; antipodal points on the boundary represent the same rotation by <M>{"\\pi"}</M> about opposite axes. The gold curve traces an antipodally identified pair.</>}
      controls={<Slider label="ball radius (π = full group)" value={r} min={0.6} max={Math.PI} step={0.02} onChange={setR} tone={C.violet} valueText={`${r.toFixed(2)} rad`} />}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>Every rotation of 3D space is given by a unit axis <M>{"\\hat n"}</M> and an angle <M>{"\\theta \\in [0, \\pi]"}</M>. Encode it as the vector <M>{"\\theta \\hat n"}</M> — these vectors fill the closed ball <M>{"B_\\pi^3"}</M> of radius <M>{"\\pi"}</M>. But a rotation by <M>{"\\pi"}</M> about <M>{"\\hat n"}</M> equals the rotation by <M>{"\\pi"}</M> about <M>{"-\\hat n"}</M>, so the antipodal points on the boundary sphere are identified: <M>{"x \\sim -x"}</M>. The quotient is <M>{"\\mathbb{RP}^3"}</M>.</> },
        { head: "What you are seeing", body: <>The cut-away ball shows the interior parametrising distinct rotations. The gold curve is one explicit pair of identified antipodal points on the boundary — they represent the <em>same</em> physical rotation. Slide the radius down to peek inside the small-angle (near-identity) region; slide back up to see the boundary where the topological surprise lives.</> },
        { head: "Why this matters", body: <>The non-trivial loop traversing two antipodal boundary points generates <M>{"\\pi_1(SO(3)) = \\mathbb Z/2"}</M> — Dirac's belt trick. Topologically this forces a 2-to-1 cover by <M>{"SU(2)"}</M> and is the reason fermions exist: a 360° rotation must act as <M>{"-1"}</M> on a half-integer-spin state. Every grand-unified group containing <M>{"SU(2)"}</M> inherits this same <M>{"\\mathbb Z/2"}</M> obstruction and therefore predicts both bosons and fermions.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3.  BPST INSTANTON — self-dual Yang–Mills field density on ℝ⁴, sliced
// ═══════════════════════════════════════════════════════════════════════════
function BPSTInstanton() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [rho, setRho] = useState(1.0);
  useEffect(() => {
    if (!ref.current) return;
    // |F|² ∝ ρ⁴ / (|x|² + ρ²)⁴  on a 3D slice (x4 = 0)
    const N = responsive.isMobile ? 26 : 36;
    const L = 3.5;
    const xs = [], ys = [], zs = [], vs = [];
    let vmax = 0;
    for (let i = 0; i < N; i++) {
      const x = -L + (2 * L * i) / (N - 1);
      for (let j = 0; j < N; j++) {
        const y = -L + (2 * L * j) / (N - 1);
        for (let k = 0; k < N; k++) {
          const z = -L + (2 * L * k) / (N - 1);
          const r2 = x * x + y * y + z * z;
          const v = Math.pow(rho, 4) / Math.pow(r2 + rho * rho, 4);
          xs.push(x); ys.push(y); zs.push(z); vs.push(v);
          if (v > vmax) vmax = v;
        }
      }
    }
    Plotly.react(ref.current, [{
      type: "volume",
      x: xs, y: ys, z: zs, value: vs,
      isomin: vmax * 0.02, isomax: vmax,
      opacity: 0.12, surface: { count: 14 },
      colorscale: [[0, C.indigo], [0.4, C.teal], [0.75, C.gold], [1, C.crimson]],
      caps: { x: { show: false }, y: { show: false }, z: { show: false } },
      showscale: false,
      hovertemplate: "|F|² density<extra></extra>",
    }], baseLayout(responsive, orbitCamera(1.6, 1.6, 1.0)),
      { displayModeBar: false, responsive: true });
  }, [rho, responsive.isMobile]);
  return (
    <Frame rank="IX" tone={C.teal}
      eyebrow="Gauge theory · self-dual SU(2) connection on ℝ⁴"
      title="BPST instanton density (k = 1)"
      formula={<M>{"A_\\mu^a = \\eta^a_{\\mu\\nu}\\, \\frac{2(x-x_0)^\\nu}{(x-x_0)^2 + \\rho^2}, \\qquad \\int \\operatorname{tr}(F \\wedge F) = -8\\pi^2"}</M>}
      summary={<>The unique (up to gauge and conformal symmetry) charge-1 instanton of <M>{"SU(2)"}</M> on <M>{"\\mathbb R^4"}</M>. We slice the field-strength density <M>{"|F|^2 \\propto \\rho^4/(r^2+\\rho^2)^4"}</M> at <M>{"x_4 = 0"}</M>. The size modulus <M>{"\\rho"}</M> parametrises the moduli space <M>{"\\mathcal M_1 \\cong \\mathbb R^4 \\times \\mathbb R_{>0}"}</M> (centre + scale).</>}
      controls={<Slider label="instanton scale ρ" value={rho} min={0.3} max={2.5} step={0.05} onChange={setRho} tone={C.teal} valueText={rho.toFixed(2)} />}
      explain={<Explainer tone={C.teal} items={[
        { head: "What the equation says", body: <>The vector potential <M>{"A_\\mu^a"}</M> is a Lie-algebra-valued field; <M>{"\\eta^a_{\\mu\\nu}"}</M> is the 't Hooft symbol that maps spacetime indices into <M>{"SU(2)"}</M> indices in a way that automatically makes <M>{"F = dA + A\\wedge A"}</M> self-dual (<M>{"F = \\star F"}</M>). The integer on the right is the second Chern number — the topological charge — equal to <M>{"-8\\pi^2"}</M> for one instanton. Self-duality + finite action force this charge to be quantised.</> },
        { head: "What you are seeing", body: <>You're looking at a 3D slice (fixing Euclidean time <M>{"x_4 = 0"}</M>) of the gauge-invariant energy density <M>{"|F|^2 = \\rho^4/(r^2+\\rho^2)^4"}</M>. It is sharply peaked around the instanton centre and falls off as <M>{"1/r^8"}</M>. The slider <M>{"\\rho"}</M> is the instanton size: small <M>{"\\rho"}</M> = a tight, intense lump; large <M>{"\\rho"}</M> = a broad, gentle one. The total integrated charge is the same for all <M>{"\\rho"}</M> — that is conformal invariance.</> },
        { head: "Why this matters", body: <>Instantons are the dominant non-perturbative effect in QCD and the canonical example of a topological vacuum sector. They mediate baryon-number-violating processes in the Standard Model (the 't Hooft anomaly), give the η' its mass, are the building blocks of vacuum decay, and — through Donaldson theory — distinguish smooth structures on 4-manifolds. The same self-duality equation, dimensionally reduced, gives BPS monopoles.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 540 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4.  TWISTOR INCIDENCE — projection of α-planes from ℙT to compactified
//     Minkowski (visualised as a family of null-related rays)
// ═══════════════════════════════════════════════════════════════════════════
function TwistorIncidence() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [alpha, setAlpha] = useState(0.6);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // Light cone (null geodesics in Minkowski, t = ±r)
    const Nc = responsive.isMobile ? 36 : 60;
    const upX = [], upY = [], upZ = [], dnZ = [];
    const ucs = [], dcs = [];
    for (let i = 0; i <= Nc; i++) {
      const ur = [], uy = [], uz = [], dz = [];
      const ucr = [], dcr = [];
      const u = (i / Nc) * 2 * Math.PI;
      for (let j = 0; j <= Nc; j++) {
        const r = (j / Nc) * 2.4;
        ur.push(r * Math.cos(u)); uy.push(r * Math.sin(u));
        uz.push(r); dz.push(-r);
        ucr.push(r); dcr.push(r);
      }
      upX.push(ur); upY.push(uy); upZ.push(uz);
      dnZ.push(dz); ucs.push(ucr); dcs.push(dcr);
    }
    traces.push({
      type: "surface", x: upX, y: upY, z: upZ, surfacecolor: ucs,
      colorscale: [[0, `${C.gold}55`], [1, `${C.gold}11`]],
      showscale: false, opacity: 0.45, hovertemplate: "future null cone<extra></extra>",
      lighting: { ambient: 0.9, diffuse: 0.2 },
    });
    traces.push({
      type: "surface", x: upX, y: upY, z: dnZ, surfacecolor: dcs,
      colorscale: [[0, `${C.violet}55`], [1, `${C.violet}11`]],
      showscale: false, opacity: 0.45, hovertemplate: "past null cone<extra></extra>",
      lighting: { ambient: 0.9, diffuse: 0.2 },
    });
    // α-plane family — null 2-planes in Minkowski; here a one-parameter pencil
    const Np = 12;
    for (let k = 0; k < Np; k++) {
      const phi = (k / Np) * 2 * Math.PI;
      const dx = Math.cos(phi), dy = Math.sin(phi);
      const xs = [], ys = [], zs = [];
      for (let s = -2.4; s <= 2.4; s += 0.05) {
        // tilted null direction
        const tilt = Math.sin(alpha * Math.PI);
        xs.push(s * dx);
        ys.push(s * dy);
        zs.push(s * tilt);
      }
      traces.push({
        type: "scatter3d", mode: "lines", x: xs, y: ys, z: zs,
        line: { color: C.crimson, width: 3 }, opacity: 0.85,
        hovertemplate: `α-plane ${k + 1}<extra></extra>`,
      });
    }
    Plotly.react(ref.current, traces, baseLayout(responsive, orbitCamera(1.8, 1.4, 0.9)),
      { displayModeBar: false, responsive: true });
  }, [alpha, responsive.isMobile]);
  return (
    <Frame rank="X" tone={C.gold}
      eyebrow="Twistor theory · ℙT → compactified Minkowski"
      title="Twistor incidence and α-planes"
      formula={<Eq>{"\\omega^A = i\\, x^{AA'} \\pi_{A'}, \\qquad Z^\\alpha = (\\omega^A, \\pi_{A'}) \\in \\mathbb C^4 \\setminus \\{0\\} \\to \\mathbb{CP}^3"}</Eq>}
      summary={<>A point of compactified Minkowski space is a <M>{"\\mathbb{CP}^1"}</M> in twistor space <M>{"\\mathbb{PT} = \\mathbb{CP}^3"}</M>; a twistor in <M>{"\\mathbb{PT}^+"}</M> determines a self-dual null 2-plane (an α-plane). The pencil of red lines visualises a one-parameter family of α-planes and their incidence with the null cone of an event.</>}
      controls={<Slider label="α-plane tilt parameter" value={alpha} min={0} max={1} step={0.01} onChange={setAlpha} tone={C.gold} valueText={alpha.toFixed(2)} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>Penrose's incidence relation: a twistor <M>{"Z^\\alpha = (\\omega^A, \\pi_{A'})"}</M> is a pair of 2-component spinors on which conformal Minkowski space acts. Holding the twistor fixed and solving <M>{"\\omega^A = i x^{AA'} \\pi_{A'}"}</M> for spacetime points <M>{"x"}</M> gives a 2-plane, and that plane is <em>null</em> and <em>self-dual</em> — an "α-plane". Twistor space itself is the projective space <M>{"\\mathbb{CP}^3"}</M> obtained by scaling out the overall complex factor.</> },
        { head: "What you are seeing", body: <>The two cones are the future- and past-directed light cones of a single spacetime event (the origin). The gold-and-violet shading distinguishes them. The red lines are α-planes — null 2-planes through the origin — drawn for one continuous family parameterised by the slider. As you tilt, you trace through different twistors that are all incident with the same event.</> },
        { head: "Why this matters", body: <>Twistor theory replaces points and curves in spacetime with holomorphic geometry in <M>{"\\mathbb{CP}^3"}</M>: nonlinear field equations (self-dual Yang–Mills, self-dual gravity) become free holomorphic data. This is the origin of modern amplitude methods (BCFW recursion, the amplituhedron, Witten's twistor-string) and of celestial holography — a candidate non-perturbative formulation of quantum gravity in asymptotically flat spacetime.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5.  SPIN NETWORK — a Penrose / loop-quantum-gravity 3-valent graph in ℝ³
// ═══════════════════════════════════════════════════════════════════════════
function SpinNetwork() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [seed, setSeed] = useState(7);
  useEffect(() => {
    if (!ref.current) return;
    // Deterministic pseudo-random nodes inside a sphere
    const rand = (n) => {
      let s = (seed * 9301 + n * 49297) % 233280;
      return (s / 233280);
    };
    const Nn = 28;
    const nx = [], ny = [], nz = [], spins = [];
    for (let i = 0; i < Nn; i++) {
      const u = rand(i * 3 + 1) * 2 - 1;
      const phi = rand(i * 3 + 2) * 2 * Math.PI;
      const r = 1.6 * Math.cbrt(rand(i * 3 + 3));
      const sq = Math.sqrt(1 - u * u);
      nx.push(r * sq * Math.cos(phi));
      ny.push(r * sq * Math.sin(phi));
      nz.push(r * u);
      spins.push(0.5 + Math.floor(rand(i * 5 + 11) * 4) * 0.5); // spins ½..2
    }
    // Build edges by nearest-3-neighbour
    const ex = [], ey = [], ez = [];
    const ec = [];
    for (let i = 0; i < Nn; i++) {
      const dists = [];
      for (let j = 0; j < Nn; j++) if (j !== i) {
        const dx = nx[i] - nx[j], dy = ny[i] - ny[j], dz = nz[i] - nz[j];
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < 3; k++) {
        const j = dists[k].j;
        if (j > i) {
          ex.push(nx[i], nx[j], null);
          ey.push(ny[i], ny[j], null);
          ez.push(nz[i], nz[j], null);
          ec.push((spins[i] + spins[j]) / 2);
        }
      }
    }
    const traces = [
      {
        type: "scatter3d", mode: "lines", x: ex, y: ey, z: ez,
        line: { color: C.teal, width: 4 }, opacity: 0.7,
        hovertemplate: "edge · spin label j<extra></extra>",
      },
      {
        type: "scatter3d", mode: "markers", x: nx, y: ny, z: nz,
        marker: {
          size: spins.map(s => 6 + s * 4),
          color: spins, colorscale: [[0, C.indigo], [0.5, C.gold], [1, C.crimson]],
          opacity: 0.95, line: { color: C.bgDeep, width: 1 },
        },
        text: spins.map(s => `intertwiner · j = ${s}`),
        hovertemplate: "%{text}<extra></extra>",
      },
    ];
    Plotly.react(ref.current, traces, baseLayout(responsive, orbitCamera(1.5, 1.5, 1.0)),
      { displayModeBar: false, responsive: true });
  }, [seed, responsive.isMobile]);
  return (
    <Frame rank="XI" tone={C.crimson}
      eyebrow="Loop quantum gravity · combinatorial geometry"
      title="Spin network — quantum 3-geometry state"
      formula={<M>{"\\hat A_\\Sigma \\,|\\Gamma, j_e, i_n\\rangle \\;=\\; 8\\pi \\gamma\\, \\ell_P^2 \\sum_{e \\cap \\Sigma} \\sqrt{j_e(j_e+1)}\\; |\\Gamma, j_e, i_n\\rangle"}</M>}
      summary={<>A spin network <M>{"|\\Gamma, j_e, i_n\\rangle"}</M> is a graph whose edges carry <M>{"SU(2)"}</M> irreps <M>{"j_e"}</M> and whose nodes carry intertwiners <M>{"i_n"}</M>; it is an eigenstate of the area and volume operators in canonical loop quantum gravity. Edge thickness here encodes <M>{"j_e"}</M>; node colour and size encode the intertwiner spin.</>}
      controls={<Slider label="combinatorial seed" value={seed} min={1} max={30} step={1} onChange={setSeed} tone={C.crimson} valueText={`#${seed}`} />}
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <>The area operator <M>{"\\hat A_\\Sigma"}</M> acts on the spin-network state <M>{"|\\Gamma, j_e, i_n\\rangle"}</M> with eigenvalue <M>{"8\\pi\\gamma\\,\\ell_P^2\\sum_e \\sqrt{j_e(j_e+1)}"}</M>, summing only over edges <M>{"e"}</M> that pierce the surface <M>{"\\Sigma"}</M>. <M>{"\\ell_P"}</M> is the Planck length, <M>{"\\gamma"}</M> is the Immirzi parameter. Area is therefore <em>quantised</em> with a minimum nonzero value of <M>{"\\sim \\ell_P^2"}</M>.</> },
        { head: "What you are seeing", body: <>A graph <M>{"\\Gamma"}</M> embedded in 3D. Each node is an "atom of space" — an intertwiner that couples the incoming spin labels invariantly. Each edge carries a half-integer spin <M>{"j_e \\in \\tfrac12 \\mathbb Z_{\\ge 0}"}</M>; we encode the spin in line thickness and node size/colour. Different seeds give different combinatorial 3-geometries — but the area/volume spectrum is universal.</> },
        { head: "Why this matters", body: <>Spin networks are the kinematical Hilbert-space basis of canonical loop quantum gravity (LQG). Their evolution in "time" gives spin foams — a path-integral formulation of quantum gravity. The discreteness of area/volume offers a concrete mechanism for resolving the Big-Bang and black-hole singularities (loop quantum cosmology, polymer black holes). The challenge is to recover smooth Einstein gravity in the semiclassical limit.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6.  CALABI–YAU REAL SLICE — Fermat-quintic-like 2D slice in ℝ³
//     z₀⁵ + z₁⁵ + z₂⁵ + z₃⁵ + z₄⁵ = 0  →  fix z₃, z₄ to constants, take Re/Im
// ═══════════════════════════════════════════════════════════════════════════
function CalabiYauSlice() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [n, setN] = useState(5);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 60 : 90;
    // Parametrise (a, b) ∈ [0,1]² and let z0 = a^(1/n) e^{i 2π k/n}, etc.
    const traces = [];
    for (let k1 = 0; k1 < n; k1++) {
      for (let k2 = 0; k2 < n; k2++) {
        const xs = [], ys = [], zs = [], cs = [];
        for (let i = 0; i <= N; i++) {
          const xr = [], yr = [], zr = [], cr = [];
          const a = i / N;
          for (let j = 0; j <= N; j++) {
            const b = j / N;
            // u = a^(1/n) e^{i 2π k1/n}, v = (1−a)^(1/n) e^{i (2π k2/n + π b)}
            const u_r = Math.pow(a, 1 / n);
            const v_r = Math.pow(1 - a, 1 / n);
            const phi1 = (2 * Math.PI * k1) / n;
            const phi2 = (2 * Math.PI * k2) / n + Math.PI * b;
            const X = u_r * Math.cos(phi1);
            const Y = v_r * Math.cos(phi2);
            const Z = Math.sin(0.5 * (phi1 + phi2)) * (u_r * v_r);
            xr.push(X); yr.push(Y); zr.push(Z);
            cr.push(Math.sin(phi1 + phi2));
          }
          xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
        }
        const t = (k1 * n + k2) / (n * n);
        traces.push({
          type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
          colorscale: [
            [0, C.indigo], [0.5, t > 0.5 ? C.gold : C.teal], [1, C.crimson],
          ],
          showscale: false, opacity: 0.55,
          lighting: { ambient: 0.55, diffuse: 0.85, specular: 0.4 },
          hovertemplate: `patch (k₁=${k1}, k₂=${k2})<extra></extra>`,
        });
      }
    }
    Plotly.react(ref.current, traces, baseLayout(responsive, orbitCamera(1.4, 1.4, 1.1)),
      { displayModeBar: false, responsive: true });
  }, [n, responsive.isMobile]);
  return (
    <Frame rank="XII" tone={C.violet}
      eyebrow="String compactification · real slice of a CY 3-fold"
      title="Calabi–Yau real 2-slice (Fermat-type, degree n)"
      formula={<M>{"X_n \\;=\\; \\{[z_0:\\dots:z_4] \\in \\mathbb{CP}^4 \\,:\\, z_0^n + z_1^n + z_2^n + z_3^n + z_4^n = 0\\}"}</M>}
      summary={<>For <M>{"n = 5"}</M> this is the Fermat quintic, the most-studied Calabi–Yau 3-fold (Hodge numbers <M>{"h^{1,1}=1,\\, h^{2,1}=101"}</M>, Euler <M>{"\\chi = -200"}</M>). We display a real 2-dimensional slice obtained by restricting two coordinates to a parametric curve and projecting via <M>{"(\\mathrm{Re}\\, u, \\mathrm{Re}\\, v, \\mathrm{Im}(uv))"}</M>; the <M>{"n^2"}</M> patches are the discrete <M>{"\\mathbb Z_n \\times \\mathbb Z_n"}</M> phase choices.</>}
      controls={<Slider label="degree n" value={n} min={2} max={6} step={1} onChange={setN} tone={C.violet} valueText={`n = ${n}`} />}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>The Fermat hypersurface <M>{"X_n"}</M> sits in projective space <M>{"\\mathbb{CP}^4"}</M> as the zero-locus of one degree-<M>{"n"}</M> homogeneous polynomial. By the adjunction formula, the canonical class is <M>{"K_{X_n} = (n - 5) H"}</M>, so the variety is Calabi–Yau (<M>{"K = 0"}</M>) <em>only at</em> <M>{"n = 5"}</M>. For other <M>{"n"}</M> you get Fano (<M>{"n &lt; 5"}</M>) or general-type (<M>{"n &gt; 5"}</M>) examples.</> },
        { head: "What you are seeing", body: <>A 6-real-dimensional complex variety can't fit in 3D, so we restrict to a 2-real-dimensional slice and project. The discrete <M>{"\\mathbb Z_n \\times \\mathbb Z_n"}</M> phase choices for two of the coordinates produce <M>{"n^2"}</M> overlapping coloured patches; their interlocking shows the discrete symmetry of the Fermat polynomial. As you crank <M>{"n"}</M> the geometry becomes increasingly intricate.</> },
        { head: "Why this matters", body: <>Heterotic string theory on the quintic produces a 4D <M>{"\\mathcal N = 1"}</M> supersymmetric gauge theory whose particle content is read off from cohomology of <M>{"X_5"}</M>: the Hodge numbers <M>{"h^{1,1} = 1, h^{2,1} = 101"}</M> count Kähler and complex-structure moduli, and the Euler characteristic <M>{"\\chi = -200"}</M> determines the number of chiral generations as <M>{"|\\chi|/2"}</M>. Mirror symmetry (Greene–Plesser) exchanges the quintic with another CY having Hodge numbers swapped.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 540 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function AdvancedGallery() {
  const responsive = useResponsive();
  return (
    <div style={{ marginTop: 36, marginBottom: 36 }}>
      <div style={{
        padding: responsive.isMobile ? "16px 18px" : "22px 26px",
        marginBottom: 22,
        background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panel} 100%)`,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.teal}`,
        borderRadius: 4,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10, color: C.teal,
          letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8,
        }}>Advanced gallery · Lie groups, gauge bundles, twistors, quantum geometry</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 17 : 22, color: C.ink, lineHeight: 1.4,
        }}>
          Six deeper exhibits taking the visual program from classical
          surfaces into the structures that actually carry the unification:
          the simply-connected group manifold <M>{"SU(2)"}</M>, its <M>{"\\mathbb Z_2"}</M> quotient
          <M>{" SO(3)"}</M>, a self-dual Yang–Mills instanton, twistor incidence
          in <M>{"\\mathbb{CP}^3"}</M>, a loop-quantum-gravity spin network, and a
          real slice of the Fermat quintic Calabi–Yau.
        </div>
      </div>
      <LazyMount minHeight={600}><SU2Manifold /></LazyMount>
      <LazyMount minHeight={600}><SO3Manifold /></LazyMount>
      <LazyMount minHeight={600}><BPSTInstanton /></LazyMount>
      <LazyMount minHeight={600}><TwistorIncidence /></LazyMount>
      <LazyMount minHeight={600}><SpinNetwork /></LazyMount>
      <LazyMount minHeight={600}><CalabiYauSlice /></LazyMount>
    </div>
  );
}
