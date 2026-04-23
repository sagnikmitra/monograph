// ═══════════════════════════════════════════════════════════════════════════
// STRING THEORY GALLERY · 3D visualisations specific to perturbative strings
// 1. Open & closed string oscillation modes        animated 3D
// 2. Worldsheet — torus / genus-2 Riemann surface  3D
// 3. D-brane stack with stretched fundamental str. 3D
// 4. T-duality circle: momentum ↔ winding spectrum 2D + 3D
// 5. Compactification fibre over 4D spacetime      3D
// 6. Polyakov path-integral genus expansion        graph
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
// 1. OSCILLATING STRING MODES — open (Neumann) and closed (periodic)
//    X^μ(σ,τ) = x^μ + p^μ τ + i√(α'/2) Σ (1/n) α_n^μ e^{-inτ} cos(nσ)  (open)
//    Closed string: left + right movers, σ ∈ [0, 2π]
// ═══════════════════════════════════════════════════════════════════════════
function StringModes() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [n, setN] = useState(3);
  const [closed, setClosed] = useState(false);
  const tRef = useRef(0);
  useEffect(() => {
    if (!ref.current) return;
    let raf;
    const N = 140;
    const draw = () => {
      tRef.current += 0.04;
      const t = tRef.current;
      const xs = [], ys = [], zs = [];
      const sMax = closed ? 2 * Math.PI : Math.PI;
      for (let i = 0; i <= N; i++) {
        const s = (i / N) * sMax;
        if (closed) {
          // left + right movers — generates a travelling wave on the circle
          const yL = 0.45 * Math.sin(n * (s - t));
          const zL = 0.45 * Math.cos(n * (s - t));
          const yR = 0.35 * Math.sin(n * (s + t) + 1.0);
          const zR = 0.35 * Math.cos(n * (s + t) + 1.0);
          // base circle of radius 1
          xs.push(Math.cos(s) + 0.0);
          ys.push(Math.sin(s) + (yL + yR) * 0.5);
          zs.push((zL + zR) * 0.5);
        } else {
          // standing wave for open string with NN BCs
          xs.push(s / sMax * 2 - 1);
          ys.push(0.6 * Math.sin(n * s) * Math.cos(t));
          zs.push(0.45 * Math.sin(n * s) * Math.sin(t));
        }
      }
      Plotly.react(ref.current, [
        // string itself
        {
          type: "scatter3d", mode: "lines", x: xs, y: ys, z: zs,
          line: { color: closed ? C.crimson : C.gold, width: 7 },
          hovertemplate: closed ? "closed string · σ ∈ [0,2π]<extra></extra>"
                                : "open string · σ ∈ [0,π]<extra></extra>",
        },
        // endpoints (open) on D-branes
        ...(closed ? [] : [{
          type: "scatter3d", mode: "markers",
          x: [xs[0], xs[xs.length - 1]],
          y: [ys[0], ys[ys.length - 1]],
          z: [zs[0], zs[zs.length - 1]],
          marker: { size: 9, color: C.indigo, symbol: "square", line: { color: C.bgDeep, width: 1 } },
          hovertemplate: "endpoint on D-brane<extra></extra>",
        }]),
      ], baseScene(orbitCamera(1.4, 1.4, 1.0)),
        { displayModeBar: false, responsive: true });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [n, closed, responsive.isMobile]);
  return (
    <Frame rank="XIX" tone={C.gold}
      eyebrow="Worldsheet kinematics · transverse oscillations"
      title="Open and closed string oscillation modes"
      formula={<Eq>{"X^\\mu(\\sigma,\\tau) = x^\\mu + p^\\mu \\tau + i\\sqrt{\\tfrac{\\alpha'}{2}} \\sum_{n \\neq 0} \\frac{1}{n}\\, \\alpha_n^\\mu\\, e^{-in\\tau} \\cdot \\begin{cases} \\cos n\\sigma & \\text{(open, NN)} \\\\ e^{\\pm in\\sigma} & \\text{(closed)} \\end{cases}"}</Eq>}
      summary={<>Open strings carry a single set of oscillators <M>{"\\alpha_n^\\mu"}</M> and have endpoints attached to D-branes (square markers). Closed strings carry independent left- and right-movers <M>{"\\alpha_n^\\mu, \\tilde\\alpha_n^\\mu"}</M> and live on a circle. The <M>{"n=2"}</M> closed mode in the graviton multiplet is the perturbative origin of gravity in string theory.</>}
      controls={
        <div>
          <Slider label="oscillation level n" value={n} min={1} max={6} step={1} onChange={setN} tone={C.gold} valueText={`α_${n}`} />
          <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: C.panel, borderTop: `1px solid ${C.border}` }}>
            {[["open", false], ["closed", true]].map(([lbl, val]) => (
              <button key={lbl} onClick={() => setClosed(val)}
                style={{
                  padding: "6px 14px", background: closed === val ? C.gold : "transparent",
                  color: closed === val ? C.bgDeep : C.inkDim,
                  border: `1px solid ${closed === val ? C.gold : C.border}`,
                  fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.4,
                  textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
                }}>{lbl}</button>
            ))}
          </div>
        </div>
      }
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>The string's spacetime position <M>{"X^\\mu(\\sigma, \\tau)"}</M> is a function of two worldsheet coordinates: <M>{"\\sigma"}</M> along the string, <M>{"\\tau"}</M> along its worldline. The first two terms <M>{"x^\\mu + p^\\mu \\tau"}</M> describe the string's centre-of-mass motion. The infinite sum is a Fourier expansion: each <M>{"\\alpha_n^\\mu"}</M> is the amplitude of one transverse oscillation mode at frequency <M>{"n"}</M>. <M>{"\\alpha'"}</M> is the inverse string tension and sets the fundamental length scale.</> },
        { head: "What you are seeing", body: <>A live animation of one mode at level <M>{"n"}</M>. <strong>Open</strong> mode: a standing wave on a segment with both endpoints free (Neumann BC) — the endpoints stay pinned to the D-brane (square markers). <strong>Closed</strong> mode: a travelling wave on a circle, generated by combining left- and right-moving Fourier components. As you crank <M>{"n"}</M> you see higher harmonics with more nodes; toggling between open/closed switches the boundary conditions.</> },
        { head: "Why this matters", body: <>Quantising these oscillators gives the string spectrum: each excitation <M>{"\\alpha_{-n}^\\mu"}</M> raises the mass-squared by <M>{"n/\\alpha'"}</M>. The first excited state of the closed string contains a symmetric traceless tensor — <em>the graviton</em>. The fact that gravity emerges automatically from quantising a string (rather than being added by hand) is the central conceptual breakthrough of string theory.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 500 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WORLDSHEET — Σ_g Riemann surface (genus 1 = torus, genus 2 = double torus)
// ═══════════════════════════════════════════════════════════════════════════
function Worldsheet() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [genus, setGenus] = useState(1);
  useEffect(() => {
    if (!ref.current) return;
    const N = responsive.isMobile ? 60 : 100;
    const xs = [], ys = [], zs = [], cs = [];
    for (let i = 0; i <= N; i++) {
      const xr = [], yr = [], zr = [], cr = [];
      const u = (i / N) * 2 * Math.PI;
      for (let j = 0; j <= N; j++) {
        const v = (j / N) * 2 * Math.PI;
        let X, Y, Z;
        if (genus === 1) {
          // standard torus
          const R = 1.4, r = 0.55;
          X = (R + r * Math.cos(v)) * Math.cos(u);
          Y = (R + r * Math.cos(v)) * Math.sin(u);
          Z = r * Math.sin(v);
        } else if (genus === 2) {
          // genus-2: two tori glued — implicit-style parametric trick:
          // sweep two displaced tori, blend by sinusoid
          const R = 0.9, r = 0.35;
          const x1 = -1.0, x2 = 1.0;
          const w = 0.5 + 0.5 * Math.cos(u);
          const cu = Math.cos(2 * u), su = Math.sin(2 * u);
          const X1 = x1 + (R + r * Math.cos(v)) * cu;
          const X2 = x2 + (R + r * Math.cos(v)) * cu;
          X = X1 * w + X2 * (1 - w);
          Y = (R + r * Math.cos(v)) * su;
          Z = r * Math.sin(v);
        } else {
          // genus-3: triple loop
          const R = 0.7, r = 0.28;
          const k = 3;
          const cu = Math.cos(k * u), su = Math.sin(k * u);
          X = (1.5 + (R + r * Math.cos(v)) * cu * 0.6) * Math.cos(u);
          Y = (1.5 + (R + r * Math.cos(v)) * cu * 0.6) * Math.sin(u);
          Z = r * Math.sin(v) + 0.3 * su;
        }
        xr.push(X); yr.push(Y); zr.push(Z);
        cr.push(Math.sin(2 * u) * Math.cos(v));
      }
      xs.push(xr); ys.push(yr); zs.push(zr); cs.push(cr);
    }
    Plotly.react(ref.current, [{
      type: "surface", x: xs, y: ys, z: zs, surfacecolor: cs,
      colorscale: [[0, C.indigo], [0.5, C.violet], [1, C.crimson]],
      showscale: false, opacity: 0.94,
      lighting: { ambient: 0.55, diffuse: 0.9, roughness: 0.4, specular: 0.55 },
      contours: { x: { show: true, color: `${C.bgDeep}88`, width: 1 } },
      hovertemplate: `Σ_${genus} · χ = ${2 - 2 * genus}<extra></extra>`,
    }], baseScene(orbitCamera(1.4, 1.4, 1.1)),
      { displayModeBar: false, responsive: true });
  }, [genus, responsive.isMobile]);
  return (
    <Frame rank="XX" tone={C.violet}
      eyebrow="String perturbation theory · loop expansion"
      title="Worldsheet Σ_g — Riemann surface of genus g"
      formula={<Eq>{"\\mathcal A = \\sum_{g=0}^{\\infty} g_s^{2g-2} \\int_{\\mathcal M_g} [d\\tau]\\, \\langle V_1 \\cdots V_n \\rangle_{\\Sigma_g}, \\quad \\chi(\\Sigma_g) = 2 - 2g"}</Eq>}
      summary={<>Each order in string perturbation theory is an integral over the moduli space <M>{"\\mathcal M_g"}</M> of complex structures on a genus-<M>{"g"}</M> Riemann surface. The loop counting parameter is the string coupling <M>{"g_s"}</M>, weighted by <M>{"g_s^{-\\chi(\\Sigma_g)}"}</M>. Tree, one-loop, two-loop = sphere (g=0), torus (g=1), double torus (g=2).</>}
      controls={
        <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: C.panel, borderTop: `1px solid ${C.border}` }}>
          {[1, 2, 3].map(g => (
            <button key={g} onClick={() => setGenus(g)}
              style={{
                padding: "6px 14px", background: genus === g ? C.violet : "transparent",
                color: genus === g ? C.bgDeep : C.inkDim,
                border: `1px solid ${genus === g ? C.violet : C.border}`,
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.4,
                textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
              }}>genus {g} (χ = {2 - 2 * g})</button>
          ))}
        </div>
      }
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. D-BRANE STACK — N parallel D2-branes with stretched open strings
//    Open-string mass m = T·L = L/(2πα')   (Higgs / gauge symmetry breaking)
// ═══════════════════════════════════════════════════════════════════════════
function DBraneStack() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [Nb, setNb] = useState(4);
  const [sep, setSep] = useState(0.6);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // N parallel D2-branes (planes) at z = 0, sep, 2·sep, ...
    const L = 2.2, M2 = 2.2;
    for (let k = 0; k < Nb; k++) {
      const z0 = k * sep;
      const xs = [[-L, L], [-L, L]];
      const ys = [[-M2, -M2], [M2, M2]];
      const zs = [[z0, z0], [z0, z0]];
      const tone = k === 0 ? C.gold : k === Nb - 1 ? C.crimson : C.indigo;
      traces.push({
        type: "surface", x: xs, y: ys, z: zs,
        colorscale: [[0, tone], [1, tone]], showscale: false, opacity: 0.45,
        hovertemplate: `D-brane #${k + 1}<extra></extra>`,
        lighting: { ambient: 0.95, diffuse: 0.1 },
      });
    }
    // Stretched open strings between consecutive branes
    for (let k = 0; k < Nb; k++) {
      for (let l = k; l < Nb; l++) {
        // connect with a slightly curved segment
        const Ns = 30, sx = [], sy = [], sz = [];
        const x0 = (Math.random() - 0.5) * 1.4;
        const y0 = (Math.random() - 0.5) * 1.4;
        const x1 = x0 + (Math.random() - 0.5) * 0.4;
        const y1 = y0 + (Math.random() - 0.5) * 0.4;
        for (let i = 0; i <= Ns; i++) {
          const t = i / Ns;
          sx.push(x0 * (1 - t) + x1 * t);
          sy.push(y0 * (1 - t) + y1 * t + 0.15 * Math.sin(Math.PI * t));
          sz.push(k * sep * (1 - t) + l * sep * t + 0.05 * Math.sin(Math.PI * t));
        }
        const length = Math.abs(l - k) * sep;
        const color = k === l ? C.gold : C.teal;
        traces.push({
          type: "scatter3d", mode: "lines", x: sx, y: sy, z: sz,
          line: { color, width: k === l ? 2 : 4 }, opacity: 0.9,
          hovertemplate: `string (${k + 1}↔${l + 1}) · m = ${(length / (2 * Math.PI * 0.1)).toFixed(2)} M_s<extra></extra>`,
        });
      }
    }
    Plotly.react(ref.current, traces, baseScene(orbitCamera(1.6, 1.6, 0.8)),
      { displayModeBar: false, responsive: true });
  }, [Nb, sep, responsive.isMobile]);
  return (
    <Frame rank="XXI" tone={C.crimson}
      eyebrow="Non-perturbative · open-string sector"
      title="N parallel D-branes and stretched open strings"
      formula={<Eq>{"m_{ij}^2 = \\frac{|x_i - x_j|^2}{(2\\pi\\alpha')^2} \\;\\; \\Rightarrow \\;\\; U(N) \\xrightarrow{\\text{separation}} U(1)^N \\quad (\\text{Higgs branch})"}</Eq>}
      summary={<>A stack of <M>{"N"}</M> coincident D-branes carries a <M>{"U(N)"}</M> gauge theory on its worldvolume — one massless gauge boson per pair (i, j). Separating the branes gives strings stretched between distinct branes a tension-times-length mass, breaking the gauge symmetry exactly as a Higgs vev would. This is the geometric origin of the Standard-Model gauge structure in many string compactifications.</>}
      controls={
        <div>
          <Slider label="number of D-branes N" value={Nb} min={1} max={8} step={1} onChange={setNb} tone={C.crimson} valueText={`N = ${Nb}`} />
          <Slider label="brane separation" value={sep} min={0.0} max={1.2} step={0.02} onChange={setSep} tone={C.gold} valueText={sep.toFixed(2)} />
        </div>
      }
      explain={<Explainer tone={C.crimson} items={[
        { head: "What the equation says", body: <>The mass-squared of an open string stretched from brane <M>{"i"}</M> to brane <M>{"j"}</M> is the string tension <M>{"1/(2\\pi\\alpha')"}</M> times the squared length <M>{"|x_i - x_j|^2"}</M>. Coincident branes give massless strings and a <M>{"U(N)"}</M> gauge theory; pulling them apart gives off-diagonal gauge bosons mass — the Higgs mechanism, realised geometrically.</> },
        { head: "What you are seeing", body: <>A stack of <M>{"N"}</M> parallel D-brane sheets. Gold lines are massless strings; teal lines are stretched massive strings between distinct branes (hover for mass). Slide separation to 0 to restore the unbroken <M>{"U(N)"}</M> symmetry.</> },
        { head: "Why this matters", body: <>D-branes provide the geometric origin of every Standard-Model gauge group in string compactifications: brane stacks <em>are</em> gauge sectors, intersections give chiral fermions, separations are Higgs vevs. They also support AdS/CFT — a stack of <M>{"N"}</M> D3-branes in IIB is dual to <M>{"\\mathcal N = 4"}</M> super-Yang–Mills.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 520 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. T-DUALITY — closed-string spectrum on a circle of radius R
//    M² = (n/R)² + (wR/α')² + (oscillators), invariant under R ↔ α'/R, n ↔ w
// ═══════════════════════════════════════════════════════════════════════════
function TDuality() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [R, setR] = useState(1.0);
  useEffect(() => {
    if (!ref.current) return;
    const ap = 1.0; // α' = 1
    const Rd = ap / R; // dual radius
    const range = [];
    for (let r = 0.2; r <= 5.0; r += 0.04) range.push(r);
    const traces = [];
    // Momentum (n) and winding (w) levels
    for (let n = 0; n <= 3; n++) {
      const ys = range.map(r => Math.sqrt((n / r) ** 2));
      traces.push({
        x: range, y: ys, mode: "lines", name: `momentum n=${n}`,
        line: { color: `${C.indigo}${n === 0 ? "44" : "cc"}`, width: 2, dash: n === 0 ? "dot" : "solid" },
      });
    }
    for (let w = 1; w <= 3; w++) {
      const ys = range.map(r => Math.sqrt((w * r / ap) ** 2));
      traces.push({
        x: range, y: ys, mode: "lines", name: `winding w=${w}`,
        line: { color: C.crimson, width: 2, dash: "dash" },
      });
    }
    // Self-dual radius marker
    traces.push({
      x: [Math.sqrt(ap), Math.sqrt(ap)], y: [0, 6], mode: "lines",
      line: { color: C.gold, width: 2 }, name: "R = √α'  (self-dual)",
    });
    traces.push({
      x: [R, R], y: [0, 6], mode: "lines",
      line: { color: C.teal, width: 3 }, name: `R = ${R.toFixed(2)}`,
    });
    traces.push({
      x: [Rd, Rd], y: [0, 6], mode: "lines",
      line: { color: C.violet, width: 3, dash: "dot" }, name: `R̃ = α'/R = ${Rd.toFixed(2)}`,
    });
    Plotly.react(ref.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 10, r: 10, b: 50, l: 60 },
      xaxis: {
        color: C.inkDim, gridcolor: `${C.border}88`, title: "compactification radius R / √α'",
        titlefont: { color: C.ink, family: "ui-monospace, monospace", size: 11 },
        tickfont: { color: C.inkDim, family: "ui-monospace, monospace", size: 10 },
        type: "log",
      },
      yaxis: {
        color: C.inkDim, gridcolor: `${C.border}88`, title: "mass  M · √α'",
        titlefont: { color: C.ink, family: "ui-monospace, monospace", size: 11 },
        tickfont: { color: C.inkDim, family: "ui-monospace, monospace", size: 10 },
        range: [0, 6],
      },
      legend: {
        orientation: "h", x: 0.5, xanchor: "center", y: 1.12,
        font: { color: C.ink, size: 10, family: "ui-monospace, monospace" },
        bgcolor: "rgba(0,0,0,0)",
      },
    }, { displayModeBar: false, responsive: true });
  }, [R, responsive.isMobile]);
  return (
    <Frame rank="XXII" tone={C.teal}
      eyebrow="Stringy symmetry · momentum ↔ winding"
      title="T-duality on a circle:  R ↔ α'/R"
      formula={<Eq>{"M^2 = \\frac{n^2}{R^2} + \\frac{w^2 R^2}{\\alpha'^2} + \\frac{2}{\\alpha'}(N + \\tilde N - 2), \\quad (n,w,R) \\;\\to\\; (w,n,\\alpha'/R)"}</Eq>}
      summary={<>The closed-string spectrum on a circle is invariant under interchanging the radius with its inverse (in string units) together with momentum and winding quantum numbers. The self-dual radius <M>{"R = \\sqrt{\\alpha'}"}</M> is the fixed point — and the locus of an enhanced <M>{"SU(2)_L \\times SU(2)_R"}</M> gauge symmetry. T-duality is the foundation of mirror symmetry on Calabi–Yau manifolds.</>}
      controls={<Slider label="radius R / √α'" value={R} min={0.3} max={3.0} step={0.02} onChange={setR} tone={C.teal} valueText={`R = ${R.toFixed(2)}, R̃ = ${(1 / R).toFixed(2)}`} />}
      explain={<Explainer tone={C.teal} items={[
        { head: "What the equation says", body: <>A closed string on a circle of radius <M>{"R"}</M> has two integer quantum numbers: <M>{"n"}</M> (momentum, energy <M>{"n/R"}</M>) and <M>{"w"}</M> (winding, energy <M>{"wR/\\alpha'"}</M>). The mass formula is invariant under simultaneously swapping <M>{"n \\leftrightarrow w"}</M> and <M>{"R \\leftrightarrow \\alpha'/R"}</M>: a "small" circle of radius <M>{"R"}</M> is physically indistinguishable from a "large" circle of radius <M>{"\\alpha'/R"}</M>.</> },
        { head: "What you are seeing", body: <>Mass spectrum vs. radius. Indigo lines are momentum modes (rise as <M>{"1/R"}</M>); crimson dashed lines are winding modes (rise as <M>{"R"}</M>). The teal vertical line is your chosen <M>{"R"}</M>; the violet dotted line is its T-dual <M>{"R̃ = \\alpha'/R"}</M>; the gold line marks the self-dual radius <M>{"R = \\sqrt{\\alpha'}"}</M> where the spectra cross.</> },
        { head: "Why this matters", body: <>T-duality is a uniquely stringy symmetry: there is no point-particle analogue. It implies a minimum length in spacetime (you cannot probe distances below <M>{"\\sqrt{\\alpha'}"}</M> — making the radius smaller is equivalent to making it bigger). Generalised to Calabi–Yau manifolds, T-duality becomes mirror symmetry — the deep geometric duality at the heart of modern algebraic geometry.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 480 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. KK COMPACTIFICATION — 4D spacetime with internal CY-like fibre at each point
// ═══════════════════════════════════════════════════════════════════════════
function CompactificationFibre() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [shrink, setShrink] = useState(0.18);
  useEffect(() => {
    if (!ref.current) return;
    const traces = [];
    // 4D spacetime represented as a 2D plane (x, y); fibres drawn as small tori
    const grid = 4;
    const range = 3;
    for (let i = -grid; i <= grid; i++) {
      for (let j = -grid; j <= grid; j++) {
        const x0 = (i / grid) * range;
        const y0 = (j / grid) * range;
        // Tiny torus at (x0, y0, 0)
        const Nu = 16, Nv = 12;
        const xs = [], ys = [], zs = [];
        const Rt = shrink * 0.6, rt = shrink * 0.25;
        for (let a = 0; a <= Nu; a++) {
          const xr = [], yr = [], zr = [];
          const u = (a / Nu) * 2 * Math.PI;
          for (let b = 0; b <= Nv; b++) {
            const v = (b / Nv) * 2 * Math.PI;
            xr.push(x0 + (Rt + rt * Math.cos(v)) * Math.cos(u));
            yr.push(y0 + (Rt + rt * Math.cos(v)) * Math.sin(u));
            zr.push(rt * Math.sin(v));
          }
          xs.push(xr); ys.push(yr); zs.push(zr);
        }
        traces.push({
          type: "surface", x: xs, y: ys, z: zs,
          colorscale: [[0, C.gold], [1, C.crimson]], showscale: false, opacity: 0.85,
          lighting: { ambient: 0.7, diffuse: 0.5 },
          hovertemplate: `fibre at (${x0.toFixed(1)}, ${y0.toFixed(1)})<extra></extra>`,
        });
      }
    }
    // 4D base plane
    traces.push({
      type: "surface",
      x: [[-range - 0.4, range + 0.4], [-range - 0.4, range + 0.4]],
      y: [[-range - 0.4, -range - 0.4], [range + 0.4, range + 0.4]],
      z: [[-0.05, -0.05], [-0.05, -0.05]],
      colorscale: [[0, `${C.indigo}66`], [1, `${C.indigo}66`]],
      showscale: false, opacity: 0.35,
      hovertemplate: "4D Minkowski base<extra></extra>",
      lighting: { ambient: 1.0, diffuse: 0 },
    });
    Plotly.react(ref.current, traces, baseScene(orbitCamera(1.6, 1.6, 0.7)),
      { displayModeBar: false, responsive: true });
  }, [shrink, responsive.isMobile]);
  return (
    <Frame rank="XXIII" tone={C.gold}
      eyebrow="Kaluza–Klein · 10D = 4D × CY₃"
      title="Compactification fibre over 4D spacetime"
      formula={<Eq>{"\\mathcal M_{10} = \\mathbb R^{1,3} \\times X_6, \\qquad m_{KK} \\sim 1/L_{X_6}, \\qquad N_{\\text{gen}} = \\tfrac{1}{2} |\\chi(X_6)|"}</Eq>}
      summary={<>Heterotic / Type II string theory lives in 10 spacetime dimensions; to recover four-dimensional physics one compactifies the extra six on a small Calabi–Yau 3-fold (here schematised by a small torus at every point of the visible plane). The compactification scale <M>{"L"}</M> sets the Kaluza–Klein tower spacing, the holonomy fixes the surviving supersymmetry, and the topology of <M>{"X_6"}</M> dictates the number of fermion generations.</>}
      controls={<Slider label="fibre size  L / L_visible" value={shrink} min={0.05} max={0.4} step={0.01} onChange={setShrink} tone={C.gold} valueText={shrink.toFixed(2)} />}
      explain={<Explainer tone={C.gold} items={[
        { head: "What the equation says", body: <>String/M-theory requires 10 (or 11) spacetime dimensions for quantum consistency. Compactifying six of them on a small Calabi–Yau 3-fold <M>{"X_6"}</M> recovers 4D physics. Kaluza–Klein excitations on <M>{"X_6"}</M> have mass <M>{"\\sim 1/L"}</M>, invisible at low energies. The number of chiral fermion generations equals <M>{"|\\chi(X_6)|/2"}</M> — pure topology.</> },
        { head: "What you are seeing", body: <>The blue plane is 4D Minkowski; at every visible point sits a tiny torus standing in for the 6D internal manifold. Shrink the slider toward zero and the fibres become invisible — that is the actual physical regime, where <M>{"L \\sim \\ell_s \\sim 10^{-32}"}</M> cm.</> },
        { head: "Why this matters", body: <>The choice of <M>{"X_6"}</M> dictates the entire low-energy effective theory: gauge group, particle content, Yukawa couplings, cosmological constant. The famous "string landscape" of <M>{"\\sim 10^{500}"}</M> consistent flux compactifications is the moduli space of all such choices — and the central tension in string phenomenology.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 400 : 540 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. POLYAKOV PATH-INTEGRAL GENUS EXPANSION — graph showing surfaces by g
// ═══════════════════════════════════════════════════════════════════════════
function GenusExpansion() {
  const responsive = useResponsive();
  const ref = useRef(null);
  const [gs, setGs] = useState(0.3);
  useEffect(() => {
    if (!ref.current) return;
    const gens = [0, 1, 2, 3, 4];
    const weights = gens.map(g => Math.pow(gs, 2 * g - 2));
    const labels = ["sphere\n(tree)", "torus\n(1-loop)", "Σ₂\n(2-loop)", "Σ₃\n(3-loop)", "Σ₄\n(4-loop)"];
    Plotly.react(ref.current, [{
      type: "bar", x: labels, y: weights,
      marker: {
        color: gens.map(g => g === 0 ? C.gold : g === 1 ? C.indigo : g === 2 ? C.crimson : C.violet),
        line: { color: C.bgDeep, width: 1 },
      },
      text: weights.map(w => w.toExponential(2)),
      textposition: "outside",
      textfont: { color: C.ink, size: 10, family: "ui-monospace, monospace" },
      hovertemplate: "%{x}: g_s^(2g−2) = %{y:.2e}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: {
        color: C.inkDim, gridcolor: `${C.border}88`,
        tickfont: { color: C.inkDim, family: "ui-monospace, monospace", size: 10 },
      },
      yaxis: {
        color: C.inkDim, gridcolor: `${C.border}88`, title: "amplitude weight  g_s^(2g−2)",
        titlefont: { color: C.ink, family: "ui-monospace, monospace", size: 11 },
        tickfont: { color: C.inkDim, family: "ui-monospace, monospace", size: 10 },
        type: "log",
      },
    }, { displayModeBar: false, responsive: true });
  }, [gs, responsive.isMobile]);
  return (
    <Frame rank="XXIV" tone={C.indigo}
      eyebrow="Polyakov path integral · genus expansion"
      title="String coupling and the loop expansion"
      formula={<Eq>{"Z = \\sum_{g=0}^{\\infty} g_s^{2g-2} \\int \\frac{[Dh][DX]}{\\text{Diff} \\times \\text{Weyl}} \\, e^{-S_{P}[h, X]}, \\qquad g_s = e^{\\langle \\Phi \\rangle}"}</Eq>}
      summary={<>Each topology of the worldsheet contributes with weight <M>{"g_s^{2g-2} = g_s^{-\\chi}"}</M>, where <M>{"g_s"}</M> is the dilaton vacuum expectation value. At weak coupling tree-level dominates; at <M>{"g_s \\to 1"}</M> the perturbation series fails and one needs M-theory / strong-coupling duals. Slide <M>{"g_s"}</M> to see the relative weights of higher-loop surfaces grow.</>}
      controls={<Slider label="string coupling g_s" value={gs} min={0.05} max={1.2} step={0.01} onChange={setGs} tone={C.indigo} valueText={`g_s = ${gs.toFixed(2)}`} />}
      explain={<Explainer tone={C.indigo} items={[
        { head: "What the equation says", body: <>The Polyakov path integral sums over all worldsheet metrics <M>{"h"}</M> and embeddings <M>{"X"}</M>, modulo diffeomorphisms and Weyl rescalings. Each topology contributes with weight <M>{"g_s^{2g-2}"}</M>; <M>{"g_s = e^{\\langle\\Phi\\rangle}"}</M> is the exponential of the dilaton's vacuum value — the string coupling is dynamically determined by a field, not put in by hand.</> },
        { head: "What you are seeing", body: <>A log-scale bar chart: the relative amplitude weight of each genus contribution at your chosen <M>{"g_s"}</M>. At small <M>{"g_s"}</M> tree-level (sphere) dominates by orders of magnitude. As <M>{"g_s \\to 1"}</M> the bars equalise — the perturbative expansion fails and you need a non-perturbative completion.</> },
        { head: "Why this matters", body: <>The asymptotic nature of the genus expansion is what forced Witten in 1995 to recognise that string theory needs M-theory: the divergent series only makes sense if it is the perturbative expansion of a deeper non-perturbative object. AdS/CFT, matrix models, and topological string theory are different windows onto that completion.</> },
      ]} />}
    >
      <div ref={ref} style={{ width: "100%", height: responsive.isMobile ? 380 : 480 }} />
    </Frame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function StringTheoryGallery() {
  const responsive = useResponsive();
  return (
    <div style={{ marginTop: 36, marginBottom: 36 }}>
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
        }}>String theory gallery · perturbative & non-perturbative 3D</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: "italic",
          fontSize: responsive.isMobile ? 17 : 22, color: C.ink, lineHeight: 1.4,
        }}>
          Six exhibits covering the central geometric objects of string theory:
          oscillating open and closed strings, the worldsheet Riemann surface
          at successive loop orders, a stack of D-branes with stretched
          fundamental strings, T-duality on a circle, the Kaluza–Klein
          fibration <M>{"\\mathbb R^{1,3} \\times X_6"}</M>, and the Polyakov genus
          expansion in <M>{"g_s"}</M>.
        </div>
      </div>
     <LazyMount minHeight={600}><StringModes /></LazyMount>
     <LazyMount minHeight={600}><Worldsheet /></LazyMount>
     <LazyMount minHeight={600}><DBraneStack /></LazyMount>
     <LazyMount minHeight={600}><TDuality /></LazyMount>
     <LazyMount minHeight={600}><CompactificationFibre /></LazyMount>
     <LazyMount minHeight={600}><GenusExpansion /></LazyMount>
    </div>
  );
}
