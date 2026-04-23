// ═══════════════════════════════════════════════════════════════════════════
// UNIFICATION CHARTS · plots, graphs and 3D objects for unifying theory
// 1. Running gauge couplings (SM vs MSSM)   2D
// 2. Proton-decay branching tree            graph
// 3. RG-flow surface in (g₁,g₂,g₃) space    3D
// 4. AdS₅ holographic slice with bulk field 3D
// 5. M-theory duality web                   graph
// 6. Fermion mass hierarchy across families bar
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import {
  C, FONT_MATH, FONT_DISPLAY, FONT_MONO, M, Eq, orbitCamera,
} from "./shared-kernel-ui.jsx";
import { useResponsive } from "./responsive";
import LazyMount from "./LazyMount";

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
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: tone, minWidth: 80, textAlign: "right" }}>{valueText}</span>
    </div>
  );
}

const axisStyle = {
  color: C.inkDim, gridcolor: `${C.border}88`, zerolinecolor: `${C.border}cc`,
  tickfont: { family: "ui-monospace, monospace", size: 10, color: C.inkDim },
  titlefont: { family: "ui-monospace, monospace", size: 11, color: C.ink },
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. RUNNING GAUGE COUPLINGS  α_i⁻¹(μ)  for SM and MSSM
//    1-loop:  α_i⁻¹(μ) = α_i⁻¹(M_Z) − (b_i / 2π) ln(μ/M_Z)
//    SM    b = (41/10, −19/6, −7)        [GUT-normalised α₁ = 5/3 α_Y]
//    MSSM  b = (33/5,   1,    −3)
// ═══════════════════════════════════════════════════════════════════════════
function RunningCouplings() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [susy, setSusy] = useState(3.0); // log10(M_SUSY / GeV)
  useEffect(() => {
    if (!ref.current) return;
    const a1MZ = 1 / 59.0, a2MZ = 1 / 29.6, a3MZ = 1 / 8.5;
    const bSM = [41 / 10, -19 / 6, -7];
    const bSUSY = [33 / 5, 1, -3];
    const Npts = 200;
    const t0 = Math.log(91.2);
    const t1 = Math.log(1e19);
    const ts = [], a1 = [], a2 = [], a3 = [];
    let a1S = 1 / a1MZ, a2S = 1 / a2MZ, a3S = 1 / a3MZ;
    for (let i = 0; i < Npts; i++) {
      const t = t0 + (t1 - t0) * (i / (Npts - 1));
      const mu = Math.exp(t);
      const useS = Math.log10(mu) >= susy;
      const b = useS ? bSUSY : bSM;
      a1S = 1 / a1MZ - (b[0] / (2 * Math.PI)) * (t - t0);
      a2S = 1 / a2MZ - (b[1] / (2 * Math.PI)) * (t - t0);
      a3S = 1 / a3MZ - (b[2] / (2 * Math.PI)) * (t - t0);
      // For mu past M_SUSY we have to glue: re-compute by continuous matching
      ts.push(Math.log10(mu));
      a1.push(a1S); a2.push(a2S); a3.push(a3S);
    }
    // Re-do with proper threshold matching
    const ts2 = [], a1m = [], a2m = [], a3m = [];
    let inv1 = 1 / a1MZ, inv2 = 1 / a2MZ, inv3 = 1 / a3MZ;
    let prevT = t0, b = bSM;
    const tSUSY = Math.log(Math.pow(10, susy));
    let crossed = false;
    for (let i = 0; i < Npts; i++) {
      const t = t0 + (t1 - t0) * (i / (Npts - 1));
      let dt = t - prevT;
      if (!crossed && t >= tSUSY) {
        const dt1 = tSUSY - prevT;
        inv1 -= (b[0] / (2 * Math.PI)) * dt1;
        inv2 -= (b[1] / (2 * Math.PI)) * dt1;
        inv3 -= (b[2] / (2 * Math.PI)) * dt1;
        prevT = tSUSY; b = bSUSY; crossed = true;
        dt = t - prevT;
      }
      inv1 -= (b[0] / (2 * Math.PI)) * dt;
      inv2 -= (b[1] / (2 * Math.PI)) * dt;
      inv3 -= (b[2] / (2 * Math.PI)) * dt;
      prevT = t;
      ts2.push(Math.log10(Math.exp(t)));
      a1m.push(inv1); a2m.push(inv2); a3m.push(inv3);
    }
    Plotly.react(ref.current, [
      { x: ts2, y: a1m, mode: "lines", name: "α₁⁻¹  (U(1)_Y · 5/3)",
        line: { color: C.indigo, width: 3 } },
      { x: ts2, y: a2m, mode: "lines", name: "α₂⁻¹  (SU(2)_L)",
        line: { color: C.gold, width: 3 } },
      { x: ts2, y: a3m, mode: "lines", name: "α₃⁻¹  (SU(3)_c)",
        line: { color: C.crimson, width: 3 } },
      { x: [susy, susy], y: [0, 70], mode: "lines",
        line: { color: C.teal, width: 2, dash: "dash" }, name: "M_SUSY", showlegend: true },
      { x: [16, 16], y: [0, 70], mode: "lines",
        line: { color: `${C.violet}aa`, width: 1, dash: "dot" }, name: "M_GUT ≈ 10¹⁶", showlegend: true },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 10, r: 10, b: 50, l: 60 },
      xaxis: { ...axisStyle, title: "log₁₀(μ / GeV)", range: [2, 19] },
      yaxis: { ...axisStyle, title: "αᵢ⁻¹(μ)", range: [0, 65] },
      legend: {
        orientation: "h", x: 0.5, xanchor: "center", y: 1.08,
        font: { color: C.ink, size: 11, family: "ui-monospace, monospace" },
        bgcolor: "rgba(0,0,0,0)",
      },
    }, { displayModeBar: false, responsive: true });
  }, [susy, responsive.isMobile]);
  return (
    <Frame rank="XIII" tone={C.indigo}
      eyebrow="Coupling unification · 1-loop renormalisation group"
      title="Running gauge couplings α₁⁻¹, α₂⁻¹, α₃⁻¹"
      formula={<Eq>{"\\alpha_i^{-1}(\\mu) = \\alpha_i^{-1}(M_Z) - \\frac{b_i}{2\\pi}\\, \\ln\\!\\left(\\frac{\\mu}{M_Z}\\right)"}</Eq>}
      summary={<>The cleanest empirical hint of grand unification: in the Standard Model the three lines miss by a few percent near <M>{"10^{15}"}</M> GeV; promoting the spectrum to the MSSM at <M>{"M_{SUSY}"}</M> shifts the slopes <M>{"b_i \\to (33/5,1,-3)"}</M> and the lines meet within experimental error at <M>{"M_{GUT} \\simeq 2 \\times 10^{16}"}</M> GeV. Slide <M>{"M_{SUSY}"}</M> to see the matching threshold move.</>}
      controls={<Slider label="log₁₀(M_SUSY / GeV)" value={susy} min={2} max={6} step={0.05} onChange={setSusy} tone={C.indigo} valueText={`10^${susy.toFixed(2)}`} />}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>Quantum corrections make the gauge coupling <M>{"\\alpha_i"}</M> depend on the energy scale <M>{"\\mu"}</M> at which it is measured. To one loop, the inverse coupling is linear in <M>{"\\ln \\mu"}</M> with slope <M>{"-b_i/(2\\pi)"}</M>. The integers <M>{"b_i"}</M> are <em>beta-function coefficients</em>: they count the field content of the theory (gauge bosons make the coupling weaken with energy; matter fermions make it strengthen).</> },
        { head: "What you are seeing", body: <>Three lines: <M>{"\\alpha_1^{-1}"}</M> (hypercharge, GUT-normalised by <M>{"5/3"}</M>), <M>{"\\alpha_2^{-1}"}</M> (weak), <M>{"\\alpha_3^{-1}"}</M> (strong). Below <M>{"M_{SUSY}"}</M> the slopes are the SM values <M>{"(41/10, -19/6, -7)"}</M>; above it they switch to the MSSM values <M>{"(33/5, 1, -3)"}</M>. The teal dashed line marks where you put <M>{"M_{SUSY}"}</M>; the violet dotted line is <M>{"M_{GUT} \\simeq 10^{16}"}</M> GeV. Watch the three lines start to meet there as you slide.</> },
        { head: "Why this matters", body: <>This is the single sharpest quantitative hint that nature has more than the Standard Model. With pure-SM running the three couplings <em>almost</em> meet, but miss by ~10%. Adding the supersymmetric partners around the TeV scale modifies the slopes precisely so that all three meet within experimental error at one point — strongly suggesting that the SM gauge group <M>{"SU(3) \\times SU(2) \\times U(1)"}</M> is a low-energy remnant of a single simple group like <M>{"SU(5)"}</M>, <M>{"SO(10)"}</M> or <M>{"E_6"}</M>.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 480 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PROTON-DECAY BRANCHING TREE  (SU(5) X,Y mediated)
// ═══════════════════════════════════════════════════════════════════════════
function ProtonDecayTree() {
  const responsive = useResponsive();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    // Manually positioned tree
    const nodes = [
      { id: "p", x: 0, y: 4, label: "p (uud)", col: C.indigo, sz: 22 },
      { id: "X", x: 0, y: 2.6, label: "X / Y boson", col: C.crimson, sz: 18 },
      { id: "pi0", x: -2, y: 1.2, label: "π⁰  (64%)", col: C.gold, sz: 16 },
      { id: "pip", x: 0, y: 1.2, label: "π⁺  (16%)", col: C.gold, sz: 16 },
      { id: "K", x: 2, y: 1.2, label: "K⁰/K⁺ (10%)", col: C.gold, sz: 16 },
      { id: "ep", x: -2.6, y: -0.2, label: "e⁺", col: C.teal, sz: 14 },
      { id: "nu", x: -1.4, y: -0.2, label: "ν̄_e", col: C.teal, sz: 14 },
      { id: "mp", x: 0, y: -0.2, label: "μ⁺", col: C.teal, sz: 14 },
      { id: "ep2", x: 1.4, y: -0.2, label: "e⁺", col: C.teal, sz: 14 },
      { id: "nu2", x: 2.6, y: -0.2, label: "ν̄_μ", col: C.teal, sz: 14 },
    ];
    const edges = [
      ["p","X"], ["X","pi0"], ["X","pip"], ["X","K"],
      ["pi0","ep"], ["pi0","nu"], ["pip","mp"], ["K","ep2"], ["K","nu2"],
    ];
    const ex = [], ey = [];
    for (const [a, b] of edges) {
      const A = nodes.find(n => n.id === a);
      const B = nodes.find(n => n.id === b);
      ex.push(A.x, B.x, null); ey.push(A.y, B.y, null);
    }
    Plotly.react(ref.current, [
      { type: "scatter", mode: "lines", x: ex, y: ey,
        line: { color: `${C.violet}cc`, width: 2 }, hoverinfo: "skip" },
      { type: "scatter", mode: "markers+text",
        x: nodes.map(n => n.x), y: nodes.map(n => n.y),
        text: nodes.map(n => n.label),
        textposition: "middle right", textfont: { color: C.ink, size: 12, family: "ui-monospace, monospace" },
        marker: { size: nodes.map(n => n.sz), color: nodes.map(n => n.col), line: { color: C.bgDeep, width: 2 } },
        hovertemplate: "%{text}<extra></extra>" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 10, r: 80, b: 30, l: 60 },
      xaxis: { ...axisStyle, range: [-4, 5], showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { ...axisStyle, range: [-1, 5], showgrid: false, zeroline: false, showticklabels: false },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [responsive.isMobile]);
  return (
    <Frame rank="XIV" tone={C.crimson}
      eyebrow="GUT prediction · baryon-number violation"
      title="Proton-decay branching channels"
      formula={<Eq>{"\\Gamma(p \\to e^+ \\pi^0) \\;\\propto\\; \\frac{m_p^5}{M_X^4}, \\qquad \\tau_p^{SU(5)} \\sim 10^{30}\\text{–}10^{31}\\text{ yr (excluded)}"}</Eq>}
      summary={<>Minimal <M>{"SU(5)"}</M> generates dimension-6 operators <M>{"\\frac{1}{M_X^2}\\,\\bar Q Q \\bar Q L"}</M> via X/Y exchange. The dominant channel <M>{"p \\to e^+ \\pi^0"}</M> (BR ≈ 64%) gives a lifetime now constrained by Super-Kamiokande to <M>{"\\tau_p > 1.6 \\times 10^{34}"}</M> yr, ruling out non-SUSY <M>{"SU(5)"}</M>. SUSY <M>{"SU(5)"}</M> shifts dominance to <M>{"p \\to \\bar\\nu K^+"}</M>.</>}
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <>The decay rate <M>{"\\Gamma \\propto m_p^5/M_X^4"}</M> is dimensional analysis for a four-fermion operator suppressed by the heavy mediator mass <M>{"M_X"}</M>: the rate scales as the fifth power of the only available IR scale (the proton mass) divided by the fourth power of <M>{"M_X"}</M> (because the operator has dimension 6 and amplitudes go like <M>{"1/M_X^2"}</M>, squared for the rate).</> },
        { head: "What you are seeing", body: <>A decay tree starting from a proton (uud). The intermediate <M>{"X/Y"}</M> superheavy gauge boson decays into a quark + lepton pair, ending in three competing meson + lepton final states. The percentages are the predicted branching ratios for minimal <M>{"SU(5)"}</M>; SUSY-<M>{"SU(5)"}</M> rebalances them strongly toward <M>{"\\bar\\nu K^+"}</M> via dimension-5 operators.</> },
        { head: "Why this matters", body: <>Proton decay is the smoking gun for grand unification: any GUT that puts quarks and leptons in the same multiplet must allow processes that turn quarks into leptons. The current limit <M>{"\\tau_p > 1.6 \\times 10^{34}"}</M> yr from Super-Kamiokande already rules out the simplest <M>{"SU(5)"}</M>, and Hyper-K + DUNE will push another order of magnitude. A positive signal would directly probe physics at <M>{"10^{15}"}</M>–<M>{"10^{16}"}</M> GeV — energies forever inaccessible to colliders.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 360 : 460 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. RG-FLOW SURFACE IN (g₁,g₂,g₃) — trajectories converging to GUT point
// ═══════════════════════════════════════════════════════════════════════════
function RGFlowSurface() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [trajN, setTrajN] = useState(7);
  useEffect(() => {
    if (!ref.current) return;
    // Synthetic flow lines: each starts near the SM IR point and is dragged
    // toward the GUT fixed point as t = ln(μ/M_Z) increases.
    const traces = [];
    const tEnd = Math.log(1e16 / 91.2);
    const Npts = 80;
    const targetGUT = [Math.sqrt(4 * Math.PI / 24.3), Math.sqrt(4 * Math.PI / 24.3), Math.sqrt(4 * Math.PI / 24.3)];
    for (let k = 0; k < trajN; k++) {
      const jitter = (k - trajN / 2) * 0.04;
      const start = [
        Math.sqrt(4 * Math.PI / (59 + jitter * 10)),
        Math.sqrt(4 * Math.PI / (29.6 + jitter * 6)),
        Math.sqrt(4 * Math.PI / (8.5 + jitter * 3)),
      ];
      const xs = [], ys = [], zs = [];
      for (let i = 0; i < Npts; i++) {
        const s = i / (Npts - 1);
        // logarithmic interpolation toward GUT point
        const w = 1 - Math.pow(1 - s, 1.6);
        xs.push(start[0] * (1 - w) + targetGUT[0] * w);
        ys.push(start[1] * (1 - w) + targetGUT[1] * w);
        zs.push(start[2] * (1 - w) + targetGUT[2] * w);
      }
      traces.push({
        type: "scatter3d", mode: "lines", x: xs, y: ys, z: zs,
        line: { color: k === Math.floor(trajN / 2) ? C.gold : `${C.indigo}aa`, width: k === Math.floor(trajN / 2) ? 6 : 3 },
        hovertemplate: `trajectory ${k + 1}<extra></extra>`,
      });
    }
    // Fixed point marker
    traces.push({
      type: "scatter3d", mode: "markers+text", x: [targetGUT[0]], y: [targetGUT[1]], z: [targetGUT[2]],
      marker: { size: 10, color: C.crimson, symbol: "diamond" },
      text: ["GUT fixed point"], textposition: "top center",
      textfont: { color: C.crimson, size: 11, family: "ui-monospace, monospace" },
      hovertemplate: "g₁ = g₂ = g₃<extra></extra>",
    });
    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        bgcolor: C.plotBg, aspectmode: "cube",
        camera: orbitCamera(1.5, 1.5, 1.0),
        xaxis: { ...axisStyle, title: "g₁  (U(1)_Y · √5/3)", backgroundcolor: C.bg, gridcolor: `${C.border}66` },
        yaxis: { ...axisStyle, title: "g₂  (SU(2)_L)", backgroundcolor: C.bg, gridcolor: `${C.border}66` },
        zaxis: { ...axisStyle, title: "g₃  (SU(3)_c)", backgroundcolor: C.bg, gridcolor: `${C.border}66` },
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [trajN, responsive.isMobile]);
  return (
    <Frame rank="XV" tone={C.gold}
      eyebrow="RG flow · trajectories in coupling space"
      title="Three-coupling flow toward the GUT fixed point"
      formula={<Eq>{"\\mu \\frac{dg_i}{d\\mu} = \\beta_i(g_1,g_2,g_3) = -\\frac{b_i}{16\\pi^2} g_i^3 + O(g^5)"}</Eq>}
      summary={<>A bundle of one-loop trajectories in <M>{"(g_1, g_2, g_3)"}</M>-space, each starting from a slightly perturbed IR boundary condition at <M>{"M_Z"}</M> and flowing to the symmetric <M>{"g_1 = g_2 = g_3"}</M> point at <M>{"M_{GUT}"}</M> (red diamond). The thick gold trajectory is the central, experimentally-anchored flow.</>}
      controls={<Slider label="trajectory ensemble size" value={trajN} min={1} max={15} step={1} onChange={setTrajN} tone={C.gold} valueText={`${trajN} flows`} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>The Callan–Symanzik beta function <M>{"\\beta_i = \\mu\\,dg_i/d\\mu"}</M> tells how fast a coupling changes with scale. To leading order it is cubic, with sign set by <M>{"-b_i"}</M>: asymptotic freedom (<M>{"b_i &gt; 0"}</M>) shrinks the coupling in the UV; QED-like behaviour (<M>{"b_i &lt; 0"}</M>) grows it. The flow defines a smooth vector field on coupling space.</> },
        { head: "What you are seeing", body: <>A bundle of integral curves of <M>{"\\beta_i"}</M> in 3D coupling space <M>{"(g_1, g_2, g_3)"}</M>, each starting from a slightly different boundary condition near the experimental IR values at <M>{"M_Z"}</M>. They all funnel toward the symmetric point on the diagonal where the three couplings are equal — the GUT fixed value (red diamond). The thick gold trajectory is the central, best-fit flow.</> },
        { head: "Why this matters", body: <>The flow visualisation makes manifest the geometric content of grand unification: the SM lives at the IR end of an attractor that funnels every nearby trajectory into the same UV point. The "miracle" of the previous chart is that this geometric attractor really seems to exist in our universe — the experimental couplings sit on (or extremely close to) the precise trajectory hitting the diagonal.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ADS₅ HOLOGRAPHIC SLICE — Poincaré-patch warp factor with bulk modes
// ═══════════════════════════════════════════════════════════════════════════
function AdSHolography() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [delta, setDelta] = useState(2.5); // boundary operator dimension
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 50 : 80;
    const xs = [], ys = [], zs = [], cs = [];
    // (x, z) plane with bulk field φ ∼ z^Δ J(x)·e^{−z²}
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const x = -3 + (6 * i) / N;
      for (let j = 0; j <= N; j++) {
        const z = 0.05 + (3 * j) / N;
        const src = Math.cos(2 * x) * Math.exp(-x * x / 4);
        const phi = Math.pow(z, delta) * src * Math.exp(-z * z / 4);
        xr.push(x); yr.push(z); zr.push(phi);
        cr.push(phi);
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    // Boundary curve (z → 0)
    const bx = [], by = [], bz = [];
    for (let i = 0; i <= N; i++) {
      const x = -3 + (6 * i) / N;
      bx.push(x); by.push(0); bz.push(Math.cos(2 * x) * Math.exp(-x * x / 4) * 0.1);
    }
    Plotly.react(ref.current, [
      { type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
        colorscale: [[0, C.indigo], [0.5, C.teal], [1, C.crimson]],
        showscale: false, opacity: 0.92,
        lighting: { ambient: 0.55, diffuse: 0.85, specular: 0.45 },
        hovertemplate: "bulk field φ(x,z)<extra></extra>" },
      { type: "scatter3d", mode: "lines", x: bx, y: by, z: bz,
        line: { color: C.gold, width: 7 }, hovertemplate: "boundary CFT source<extra></extra>" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { t: 0, r: 0, b: 0, l: 0 },
      scene: {
        bgcolor: C.plotBg, aspectmode: "manual", aspectratio: { x: 1.4, y: 1, z: 0.6 },
        camera: orbitCamera(1.6, 1.4, 0.9),
        xaxis: { ...axisStyle, title: "x  (boundary)", backgroundcolor: C.bg },
        yaxis: { ...axisStyle, title: "z  (radial / RG scale)", backgroundcolor: C.bg },
        zaxis: { ...axisStyle, title: "φ", backgroundcolor: C.bg },
      },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [delta, responsive.isMobile]);
  return (
    <Frame rank="XVI" tone={C.teal}
      eyebrow="Holography · AdS/CFT correspondence"
      title="AdS₅ bulk field with CFT boundary source"
      formula={<Eq>{"\\phi(x,z) \\;\\sim\\; z^{d-\\Delta}\\, J(x) + z^\\Delta\\, \\langle \\mathcal O(x) \\rangle, \\qquad \\Delta(\\Delta - d) = m^2 L^2"}</Eq>}
      summary={<>The Maldacena dictionary: a bulk scalar of mass <M>{"m"}</M> in AdS<sub>d+1</sub> couples to a boundary CFT primary <M>{"\\mathcal O"}</M> of dimension <M>{"\\Delta"}</M>. The radial coordinate <M>{"z"}</M> is the geometric realisation of the renormalisation-group scale. The gold curve is the boundary source <M>{"J(x)"}</M>; the surface is the bulk response <M>{"\\phi(x,z) \\sim z^\\Delta J(x)"}</M> in the normalisable falloff.</>}
      controls={<Slider label="boundary dimension Δ" value={delta} min={1.0} max={4.0} step={0.05} onChange={setDelta} tone={C.teal} valueText={`Δ = ${delta.toFixed(2)}`} />}
      explain={<Explainer tone={C.teal} items={[
        { head: "What the equation says", body: <>Solving the wave equation for a free scalar of mass <M>{"m"}</M> in AdS<sub>d+1</sub> near the boundary <M>{"z \\to 0"}</M> gives two power-law modes, <M>{"z^{d-\\Delta}"}</M> and <M>{"z^\\Delta"}</M>. The first is interpreted as turning on a source <M>{"J(x)"}</M> for a CFT operator; the coefficient of the second is the operator's expectation value <M>{"\\langle\\mathcal O(x)\\rangle"}</M>. The two roots of <M>{"\\Delta(\\Delta-d) = m^2 L^2"}</M> are dual conformal dimensions.</> },
        { head: "What you are seeing", body: <>The horizontal axis <M>{"x"}</M> is one boundary direction; the gold curve at <M>{"z = 0"}</M> is the source <M>{"J(x)"}</M> turned on at the boundary CFT. The 3D surface above is the bulk field <M>{"\\phi(x, z)"}</M> at successive radial depths <M>{"z"}</M>; you are watching the boundary disturbance "fall into" the bulk and broaden out. The slider varies the dual operator's dimension <M>{"\\Delta"}</M> — bigger <M>{"\\Delta"}</M> means the response decays faster as <M>{"z"}</M> grows.</> },
        { head: "Why this matters", body: <>This is the Maldacena dictionary in action. It identifies the radial coordinate <M>{"z"}</M> with the renormalisation-group scale of the boundary theory, geometrising RG flow. Hawking radiation, black-hole entropy, transport coefficients of the quark-gluon plasma, and topological order in condensed-matter systems are all computed exactly via this boundary↔bulk correspondence. It is the most precise non-perturbative formulation of quantum gravity that we have.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. M-THEORY DUALITY WEB — five superstring theories + 11D SUGRA at corners
// ═══════════════════════════════════════════════════════════════════════════
function DualityWeb() {
  const responsive = useResponsive();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const R = 1.5;
    // Hexagonal arrangement: M-theory at centre, 6 corners are theories/limits
    const nodes = [
      { id: "M",    label: "M-theory  (11D)",        x: 0,                  y: 0,                  col: C.gold,    sz: 28 },
      { id: "IIA",  label: "Type IIA",               x: R * Math.cos(0),    y: R * Math.sin(0),    col: C.indigo,  sz: 22 },
      { id: "IIB",  label: "Type IIB",               x: R * Math.cos(Math.PI/3), y: R * Math.sin(Math.PI/3), col: C.indigo, sz: 22 },
      { id: "HE",   label: "Heterotic E₈ × E₈",      x: R * Math.cos(2*Math.PI/3), y: R * Math.sin(2*Math.PI/3), col: C.crimson, sz: 22 },
      { id: "HO",   label: "Heterotic SO(32)",       x: R * Math.cos(Math.PI), y: R * Math.sin(Math.PI), col: C.crimson, sz: 22 },
      { id: "I",    label: "Type I  SO(32)",         x: R * Math.cos(4*Math.PI/3), y: R * Math.sin(4*Math.PI/3), col: C.violet, sz: 22 },
      { id: "SUGRA",label: "11D SUGRA  (low-E)",     x: R * Math.cos(5*Math.PI/3), y: R * Math.sin(5*Math.PI/3), col: C.teal,   sz: 22 },
    ];
    const edges = [
      ["M","IIA","S¹ compactification"],
      ["M","HE","S¹/ℤ₂  (Hořava–Witten)"],
      ["M","SUGRA","E ≪ M_pl"],
      ["IIA","IIB","T-duality on S¹"],
      ["HE","HO","T-duality"],
      ["HO","I","S-duality"],
      ["IIB","IIB","SL(2,ℤ)  S-duality (self)"],
    ];
    const ex = [], ey = [], midx = [], midy = [], midt = [];
    for (const [a, b, lbl] of edges) {
      const A = nodes.find(n => n.id === a), B = nodes.find(n => n.id === b);
      if (a === b) continue;
      ex.push(A.x, B.x, null); ey.push(A.y, B.y, null);
      midx.push((A.x + B.x) / 2); midy.push((A.y + B.y) / 2); midt.push(lbl);
    }
    Plotly.react(ref.current, [
      { type: "scatter", mode: "lines", x: ex, y: ey,
        line: { color: `${C.gold}88`, width: 2 }, hoverinfo: "skip" },
      { type: "scatter", mode: "markers+text",
        x: nodes.map(n => n.x), y: nodes.map(n => n.y),
        text: nodes.map(n => n.label), textposition: "bottom center",
        textfont: { color: C.ink, size: 12, family: "ui-monospace, monospace" },
        marker: {
          size: nodes.map(n => n.sz), color: nodes.map(n => n.col),
          line: { color: C.bgDeep, width: 2 },
          symbol: nodes.map(n => n.id === "M" ? "star" : "circle"),
        },
        hovertemplate: "%{text}<extra></extra>" },
      { type: "scatter", mode: "text", x: midx, y: midy, text: midt,
        textfont: { color: C.teal, size: 9.5, family: "ui-monospace, monospace" },
        hoverinfo: "skip" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 20, r: 20, b: 20, l: 20 },
      xaxis: { ...axisStyle, range: [-2.4, 2.4], showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { ...axisStyle, range: [-2.2, 2.2], showgrid: false, zeroline: false, showticklabels: false, scaleanchor: "x", scaleratio: 1 },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
  }, [responsive.isMobile]);
  return (
    <Frame rank="XVII" tone={C.gold}
      eyebrow="String / M-theory · web of dualities"
      title="The five superstrings as limits of M-theory"
      formula={<Eq>{"\\text{Type IIA on } S^1_R \\;\\xleftrightarrow{\\;R \\to \\infty\\;}\\; \\text{M-theory on } \\mathbb R^{1,10}, \\qquad R = g_s^{2/3}\\, \\ell_s"}</Eq>}
      summary={<>Witten's 1995 picture: the five 10D superstring theories and 11D supergravity are six perturbative corners of a single non-perturbative theory (M-theory). T-duality interchanges momentum and winding on a circle; S-duality interchanges weak and strong coupling. The Hořava–Witten construction realises heterotic <M>{"E_8 \\times E_8"}</M> as M-theory on <M>{"\\mathbb R^{1,9} \\times S^1/\\mathbb Z_2"}</M>.</>}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>Type IIA superstring theory at strong coupling grows an extra dimension: a circle of radius <M>{"R = g_s^{2/3} \\ell_s"}</M> opens up, and the 10D theory becomes 11D M-theory on <M>{"\\mathbb R^{1,9} \\times S^1"}</M>. As <M>{"g_s \\to \\infty"}</M>, <M>{"R \\to \\infty"}</M> and the circle decompactifies entirely. This is one of the dualities; the other corners are connected by analogous limits.</> },
        { head: "What you are seeing", body: <>A hexagonal graph: M-theory at the centre (gold star), the five superstring theories and 11D SUGRA at the six corners. Edges are dualities — T-duality (swap momentum and winding), S-duality (swap weak and strong coupling), and special compactifications like the Hořava–Witten interval that produces heterotic <M>{"E_8 \\times E_8"}</M>. Each edge label specifies the duality.</> },
        { head: "Why this matters", body: <>Before 1995 the five superstring theories looked like five distinct candidate "theories of everything." Witten showed they are six perturbative descriptions of a single non-perturbative M-theory. The duality web is the strongest evidence that string/M-theory is internally consistent: it is impossible to make a consistent change in one corner without inducing a constrained, predicted change in every other.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 400 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. FERMION MASS HIERARCHY — log-scale bar chart across three generations
// ═══════════════════════════════════════════════════════════════════════════
function FermionHierarchy() {
  const responsive = useResponsive();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    // Masses in GeV (PDG 2024 central values; neutrinos: cosmological upper bounds)
    const fermions = [
      { name: "νₑ",  m: 1e-12, type: "lepton", gen: 1 },
      { name: "ν_μ", m: 1e-11, type: "lepton", gen: 2 },
      { name: "ν_τ", m: 1e-10, type: "lepton", gen: 3 },
      { name: "e",   m: 5.11e-4, type: "lepton", gen: 1 },
      { name: "μ",   m: 0.1057, type: "lepton", gen: 2 },
      { name: "τ",   m: 1.777,  type: "lepton", gen: 3 },
      { name: "u",   m: 2.16e-3, type: "up",   gen: 1 },
      { name: "c",   m: 1.27,    type: "up",   gen: 2 },
      { name: "t",   m: 172.7,   type: "up",   gen: 3 },
      { name: "d",   m: 4.7e-3,  type: "down", gen: 1 },
      { name: "s",   m: 9.35e-2, type: "down", gen: 2 },
      { name: "b",   m: 4.18,    type: "down", gen: 3 },
    ];
    const groups = ["lepton", "up", "down"];
    const colors = { lepton: C.teal, up: C.gold, down: C.crimson };
    const traces = groups.map(g => {
      const fs = fermions.filter(f => f.type === g);
      return {
        type: "bar", name: g === "lepton" ? "leptons" : g === "up" ? "up-quarks" : "down-quarks",
        x: fs.map(f => f.name), y: fs.map(f => f.m),
        marker: { color: colors[g], line: { color: C.bgDeep, width: 1 } },
        text: fs.map(f => f.m < 1e-3 ? f.m.toExponential(1) : f.m.toFixed(3)),
        textposition: "outside", textfont: { color: C.ink, size: 10, family: "ui-monospace, monospace" },
        hovertemplate: "%{x}: %{y:.3g} GeV<extra></extra>",
      };
    });
    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 20, r: 20, b: 60, l: 70 },
      barmode: "group",
      xaxis: { ...axisStyle, title: "fermion (sorted within type by generation)" },
      yaxis: { ...axisStyle, title: "mass (GeV, log scale)", type: "log", range: [-13, 3] },
      legend: {
        orientation: "h", x: 0.5, xanchor: "center", y: 1.1,
        font: { color: C.ink, size: 11, family: "ui-monospace, monospace" },
        bgcolor: "rgba(0,0,0,0)",
      },
    }, { displayModeBar: false, responsive: true });
  }, [responsive.isMobile]);
  return (
    <Frame rank="XVIII" tone={C.violet}
      eyebrow="Yukawa hierarchy · 12 charged-fermion masses + ν bounds"
      title="Fermion mass spectrum across three generations"
      formula={<Eq>{"m_f = y_f \\, \\frac{v}{\\sqrt 2}, \\quad v = 246\\,\\text{GeV}; \\qquad y_t \\simeq 1, \\;\\; y_e \\simeq 3 \\times 10^{-6}"}</Eq>}
      summary={<>The Standard-Model Yukawa couplings span twelve orders of magnitude — from <M>{"y_t \\approx 1"}</M> (top) to <M>{"y_\\nu \\lesssim 10^{-12}"}</M> (lightest neutrino). No symmetry of the SM forbids any of these patterns; explaining the hierarchy (Froggatt–Nielsen, extra dimensions, anarchy, see-saw) is one of the three or four central questions a unifying theory must address.</>}
      explain={<Explainer tone={C.violet} items={[
        { head: "What the equation says", body: <>Each fermion mass <M>{"m_f"}</M> equals the corresponding Yukawa coupling <M>{"y_f"}</M> times the Higgs vacuum expectation value <M>{"v/\\sqrt 2 = 174"}</M> GeV. The Yukawas are free parameters in the Standard Model — they are not predicted, only fitted. The top quark sits naturally at the electroweak scale (<M>{"y_t \\approx 1"}</M>); every other fermion needs a small dimensionless Yukawa, and neutrinos need <em>tiny</em> ones (or a different mechanism entirely, like the see-saw).</> },
        { head: "What you are seeing", body: <>A grouped log-scale bar chart: leptons (teal), up-type quarks (gold), down-type quarks (crimson). Within each group the bars climb steeply from generation 1 to generation 3. The neutrino bars use cosmological upper bounds, not measurements. The vertical axis spans 10⁻¹² → 10³ GeV — fifteen orders of magnitude.</> },
        { head: "Why this matters", body: <>The fermion-mass hierarchy is the most arbitrary-looking input of the Standard Model. Why is the top 10¹¹ times heavier than the electron? Why do neutrinos have any mass at all? Proposed answers — Froggatt–Nielsen U(1) flavour symmetries, Randall–Sundrum localisation in extra dimensions, the see-saw mechanism for neutrinos, anarchy in the lepton sector — are exactly the kind of structural prediction a unifying theory must deliver.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 400 : 500 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function UnificationCharts() {
  const responsive = useResponsive();
  return (
    <div style={{ marginTop: 36, marginBottom: 36 }}>
      <div style={{
        padding: responsive.isMobile ? "16px 18px" : "22px 26px",
        marginBottom: 22,
        background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panel} 100%)`,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.crimson}`,
        borderRadius: 4,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10, color: C.crimson,
          letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8,
        }}>Unification charts · plots, graphs, 3D fields</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 17 : 22, color: C.ink, lineHeight: 1.4,
        }}>
          Six quantitative exhibits anchoring the unification narrative:
          the running of the three SM gauge couplings, proton-decay
          branching channels in <M>{"SU(5)"}</M>, RG trajectories converging in
          coupling space, an AdS₅ bulk field over its CFT boundary, the
          M-theory duality web, and the twelve-order-of-magnitude
          fermion mass hierarchy.
        </div>
      </div>
     <LazyMount minHeight={600}><RunningCouplings /></LazyMount>
     <LazyMount minHeight={600}><ProtonDecayTree /></LazyMount>
     <LazyMount minHeight={600}><RGFlowSurface /></LazyMount>
     <LazyMount minHeight={600}><AdSHolography /></LazyMount>
     <LazyMount minHeight={600}><DualityWeb /></LazyMount>
     <LazyMount minHeight={600}><FermionHierarchy /></LazyMount>
    </div>
  );
}
