import katex from "katex";
import { useResponsive } from "./responsive";

export const C = {
  bg: "#070b17",
  bgDeep: "#040710",
  panel: "#0d1324",
  panelAlt: "#121b30",
  panelHi: "#161f36",
  rule: "#2a3454",
  border: "#1e2a44",
  borderBr: "#34426a",
  ink: "#e8dfc7",
  inkBr: "#f8f0d8",
  inkDim: "#a89c82",
  inkFaint: "#6f6650",
  inkMuted: "#8a7f68",
  gold: "#d4a574",
  goldBr: "#e6b98a",
  goldDim: "#d4a57422",
  crimson: "#c45050",
  crimsonDim: "#c4505022",
  teal: "#5fa8a8",
  tealBr: "#7fc4c4",
  tealDim: "#5fa8a822",
  indigo: "#7a8fd4",
  indigoDim: "#7a8fd422",
  violet: "#9f7fc4",
  amber: "#e0b050",
  plotBg: "#050810",
};

export const FONT_MATH = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
export const FONT_DISPLAY = "'EB Garamond', Georgia, serif";
export const FONT_MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";
export const FONT_SANS = "'Inter', -apple-system, sans-serif";

export function generateScatterSample(M, maxPoints = 18000) {
  let total = 0;
  for (let x = 1; x <= M; x++) {
    for (let y = x; y <= M; y++) total += M - y + 1;
  }
  const rate = Math.min(1, maxPoints / total);
  const xs = [];
  const ys = [];
  const zs = [];
  const ss = [];
  for (let x = 1; x <= M; x++) {
    for (let y = x; y <= M; y++) {
      for (let z = y; z <= M; z++) {
        if (rate >= 1 || Math.random() < rate) {
          xs.push(x);
          ys.push(y);
          zs.push(z);
          ss.push(x + y + z);
        }
      }
    }
  }
  return { xs, ys, zs, ss, sampled: rate < 1, rate };
}

export function cayleySylvester(n) {
  return Math.round((n * n) / 12);
}

export function p3Corrected(S, M) {
  if (S < 3 || S > 3 * M) return 0;
  const mid = (3 + 3 * M) / 2;
  const eff = S <= mid ? S : 3 * M + 3 - S;
  return Math.round(((eff - 2) * (eff - 2)) / 12);
}

export function generateRegimeConstellation() {
  const names = [
    ["Kernel", "explicit"],
    ["Bose", "inferred"],
    ["Feynman", "analogical"],
    ["Young", "analogical"],
    ["NLO", "analogical"],
    ["Lorenz", "analogical"],
    ["K41", "analogical"],
    ["GR", "analogical"],
    ["BBN", "analogical"],
    ["SIS", "inferred"],
    ["QW", "inferred"],
  ];
  return names.map(([name, cls], i) => {
    const theta = (i / names.length) * Math.PI * 2;
    const radius = i === 0 ? 0 : 2.2 + 0.35 * Math.sin(i * 1.71);
    const z = i === 0 ? 0 : -1.35 + (i % 4) * 0.82;
    return {
      name,
      cls,
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      z,
    };
  });
}

export function generateLayerArchitecture() {
  const layers = [
    { name: "Defs", z: 0.0, size: 3.4, color: "#5fa8a8" },
    { name: "Safe", z: 1.0, size: 2.8, color: "#7a8fd4" },
    { name: "Mid", z: 2.0, size: 2.2, color: "#d4a574" },
    { name: "Flag", z: 3.0, size: 1.6, color: "#c45050" },
  ];
  const assumptions = [
    { name: "H1", x: -1.65, y: -1.65, z: 0.25 },
    { name: "H2", x: 1.65, y: -1.65, z: 0.55 },
    { name: "H3", x: 1.65, y: 1.65, z: 0.85 },
    { name: "H4", x: -1.65, y: 1.65, z: 1.15 },
    { name: "H5", x: -1.2, y: -1.2, z: 1.75 },
    { name: "H6", x: 1.2, y: -1.2, z: 2.05 },
    { name: "H7", x: 1.2, y: 1.2, z: 2.35 },
    { name: "H8", x: -1.2, y: 1.2, z: 2.65 },
  ];
  return { layers, assumptions };
}

export function generateTripShell(M) {
  const vx = [1, 1, 1, M];
  const vy = [1, 1, M, M];
  const vz = [1, M, M, M];
  const edgePairs = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  const edgeX = [];
  const edgeY = [];
  const edgeZ = [];
  edgePairs.forEach(([a, b]) => {
    edgeX.push(vx[a], vx[b], null);
    edgeY.push(vy[a], vy[b], null);
    edgeZ.push(vz[a], vz[b], null);
  });
  return { vx, vy, vz, edgeX, edgeY, edgeZ };
}

export function orbitCamera(theta, radius = 1.75, z = 0.9) {
  return {
    eye: { x: radius * Math.cos(theta), y: radius * Math.sin(theta), z },
    up: { x: 0, y: 0, z: 1 },
    center: { x: 0, y: 0, z: 0 },
  };
}

const _GREEK = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π", varpi: "ϖ", rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ", phi: "φ", varphi: "ϕ", chi: "χ", psi: "ψ", omega: "ω",
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ", Iota: "Ι", Kappa: "Κ", Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ", Omicron: "Ο", Pi: "Π", Rho: "Ρ", Sigma: "Σ", Tau: "Τ", Upsilon: "Υ", Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
};
const _OPS = {
  to: "→", mapsto: "↦", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔", leftrightarrow: "↔", hookrightarrow: "↪", twoheadrightarrow: "↠", longrightarrow: "⟶", longleftarrow: "⟵", longleftrightarrow: "⟷", Longrightarrow: "⟹", xrightarrow: "→", xleftarrow: "←", uparrow: "↑", downarrow: "↓", updownarrow: "↕",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", approx: "≈", sim: "∼", simeq: "≃", cong: "≅", equiv: "≡", propto: "∝", ll: "≪", gg: "≫", prec: "≺", succ: "≻", preceq: "⪯", succeq: "⪰",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", cup: "∪", cap: "∩", setminus: "∖", emptyset: "∅", varnothing: "∅",
  forall: "∀", exists: "∃", nexists: "∄", partial: "∂", nabla: "∇", infty: "∞",
  cdot: "·", cdots: "⋯", ldots: "…", vdots: "⋮", ddots: "⋱", dots: "…",
  times: "×", div: "÷", pm: "±", mp: "∓", otimes: "⊗", oplus: "⊕", ominus: "⊖", odot: "⊙", boxtimes: "⊠", bigotimes: "⨂", bigoplus: "⨁",
  sum: "∑", prod: "∏", coprod: "∐", int: "∫", oint: "∮", iint: "∬", iiint: "∭", bigcup: "⋃", bigcap: "⋂", bigsqcup: "⨆",
  langle: "⟨", rangle: "⟩", lceil: "⌈", rceil: "⌉", lfloor: "⌊", rfloor: "⌋", lVert: "‖", rVert: "‖", lvert: "|", rvert: "|",
  hbar: "ℏ", ell: "ℓ", Re: "ℜ", Im: "ℑ", aleph: "ℵ", beth: "ℶ", gimel: "ℷ", wp: "℘",
  circ: "∘", star: "⋆", ast: "∗", bullet: "•", dagger: "†", ddagger: "‡", sharp: "♯", flat: "♭", natural: "♮",
  angle: "∠", perp: "⊥", parallel: "∥", mid: "∣", vdash: "⊢", dashv: "⊣", models: "⊨",
  iff: "⇔", implies: "⇒",
  vee: "∨", wedge: "∧", neg: "¬", lnot: "¬", top: "⊤", bot: "⊥",
  sqcup: "⊔", sqcap: "⊓", triangleleft: "◁", triangleright: "▷", diamond: "⋄",
  hat: "̂", bar: "̄", tilde: "̃", vec: "⃗", dot: "̇", ddot: "̈",
  prime: "′", dprime: "″", tprime: "‴",
  ntimes: "×", amalg: "∐",
  Box: "□", square: "□", blacksquare: "■", triangle: "△", blacktriangle: "▲",
  natconj: "⁎", bot2: "⊥",
  colon: ":", semicolon: ";",
  quad: " ", qquad: "  ", backslash: "\\",
};
const _BB = { A: "𝔸", B: "𝔹", C: "ℂ", D: "𝔻", E: "𝔼", F: "𝔽", G: "𝔾", H: "ℍ", I: "𝕀", J: "𝕁", K: "𝕂", L: "𝕃", M: "𝕄", N: "ℕ", O: "𝕆", P: "ℙ", Q: "ℚ", R: "ℝ", S: "𝕊", T: "𝕋", U: "𝕌", V: "𝕍", W: "𝕎", X: "𝕏", Y: "𝕐", Z: "ℤ" };
const _CAL = { A: "𝒜", B: "ℬ", C: "𝒞", D: "𝒟", E: "ℰ", F: "ℱ", G: "𝒢", H: "ℋ", I: "ℐ", J: "𝒥", K: "𝒦", L: "ℒ", M: "ℳ", N: "𝒩", O: "𝒪", P: "𝒫", Q: "𝒬", R: "ℛ", S: "𝒮", T: "𝒯", U: "𝒰", V: "𝒱", W: "𝒲", X: "𝒳", Y: "𝒴", Z: "𝒵" };
const _FRAK = { A: "𝔄", B: "𝔅", C: "ℭ", D: "𝔇", E: "𝔈", F: "𝔉", G: "𝔊", H: "ℌ", I: "ℑ", J: "𝔍", K: "𝔎", L: "𝔏", M: "𝔐", N: "𝔑", O: "𝔒", P: "𝔓", Q: "𝔔", R: "ℜ", S: "𝔖", T: "𝔗", U: "𝔘", V: "𝔙", W: "𝔚", X: "𝔛", Y: "𝔜", Z: "ℨ", a: "𝔞", b: "𝔟", c: "𝔠", d: "𝔡", e: "𝔢", f: "𝔣", g: "𝔤", h: "𝔥", i: "𝔦", j: "𝔧", k: "𝔨", l: "𝔩", m: "𝔪", n: "𝔫", o: "𝔬", p: "𝔭", q: "𝔮", r: "𝔯", s: "𝔰", t: "𝔱", u: "𝔲", v: "𝔳", w: "𝔴", x: "𝔵", y: "𝔶", z: "𝔷" };

function _readBraced(str, start) {
  let depth = 1;
  let k = start + 1;
  let arg = "";
  while (k < str.length && depth > 0) {
    if (str[k] === "{") depth++;
    else if (str[k] === "}") {
      depth--;
      if (depth === 0) break;
    }
    arg += str[k];
    k++;
  }
  return [arg, k + 1];
}

function Frac({ n, d, size = "1em" }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: size, margin: "0 3px", lineHeight: 1.05 }}>
      <span style={{ borderBottom: `1px solid ${C.ink}`, padding: "0 6px" }}>{n}</span>
      <span style={{ padding: "0 6px" }}>{d}</span>
    </span>
  );
}

function _mathParse(str, keyBase = 0) {
  const out = [];
  let i = 0;
  let key = keyBase;
  const pushS = (s) => {
    const last = out[out.length - 1];
    if (typeof s === "string" && typeof last === "string") out[out.length - 1] = last + s;
    else out.push(s);
  };

  while (i < str.length) {
    const ch = str[i];
    if (ch === "\\") {
      let j = i + 1;
      let name = "";
      while (j < str.length && /[A-Za-z]/.test(str[j])) {
        name += str[j];
        j++;
      }
      if (!name) {
        pushS("\\");
        i++;
        continue;
      }
      if (["mathbb", "mathcal", "mathscr", "mathfrak", "mathrm", "mathbf", "mathit", "text", "mathsf", "mathtt", "operatorname"].includes(name) && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        let rendered = arg;
        if (name === "mathbb") rendered = [...arg].map((c) => _BB[c] || c).join("");
        else if (name === "mathcal" || name === "mathscr") rendered = [...arg].map((c) => _CAL[c] || c).join("");
        else if (name === "mathfrak") rendered = [...arg].map((c) => _FRAK[c] || c).join("");
        if (["mathrm", "text", "mathsf", "operatorname", "mathtt"].includes(name)) out.push(<span key={`m${key++}`} style={{ fontStyle: "normal", fontFamily: name === "mathtt" ? FONT_MONO : undefined }}>{rendered}</span>);
        else if (name === "mathbf") out.push(<span key={`m${key++}`} style={{ fontWeight: 700, fontStyle: "normal" }}>{rendered}</span>);
        else if (name === "mathit") out.push(<span key={`m${key++}`} style={{ fontStyle: "italic" }}>{rendered}</span>);
        else pushS(rendered);
        i = after;
        continue;
      }
      if (name === "frac" && str[j] === "{") {
        const [n, aft1] = _readBraced(str, j);
        if (str[aft1] === "{") {
          const [d, aft2] = _readBraced(str, aft1);
          out.push(<Frac key={`m${key++}`} n={<>{_mathParse(n)}</>} d={<>{_mathParse(d)}</>} />);
          i = aft2;
          continue;
        }
      }
      if (name === "sqrt" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`}>√<span style={{ borderTop: "1px solid currentColor", paddingTop: 1 }}>{_mathParse(arg)}</span></span>);
        i = after;
        continue;
      }
      if (name === "overline" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`} style={{ textDecoration: "overline" }}>{_mathParse(arg)}</span>);
        i = after;
        continue;
      }
      if (name === "underline" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`} style={{ textDecoration: "underline" }}>{_mathParse(arg)}</span>);
        i = after;
        continue;
      }
      const repl = _GREEK[name] || _OPS[name];
      if (repl !== undefined) {
        pushS(repl);
        i = j;
        continue;
      }
      pushS("\\" + name);
      i = j;
      continue;
    }
    if (ch === "_" || ch === "^") {
      const isSup = ch === "^";
      let j = i + 1;
      let arg;
      if (str[j] === "{") {
        const [a, after] = _readBraced(str, j);
        arg = a;
        i = after;
      } else if (j < str.length) {
        if (str[j] === "\\") {
          let k = j + 1;
          let name = "";
          while (k < str.length && /[A-Za-z]/.test(str[k])) {
            name += str[k];
            k++;
          }
          arg = "\\" + name;
          i = k;
        } else {
          arg = str[j];
          i = j + 1;
        }
      } else {
        pushS(ch);
        i++;
        continue;
      }
      const Tag = isSup ? "sup" : "sub";
      out.push(<Tag key={`m${key++}`} style={{ fontSize: "0.78em", fontStyle: "italic" }}>{_mathParse(arg)}</Tag>);
      continue;
    }
    pushS(ch);
    i++;
  }
  return out;
}

function _renderMathChildren(node) {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "string") return _mathParse(node);
  if (Array.isArray(node)) {
    const merged = [];
    for (const n of node) {
      const last = merged[merged.length - 1];
      if (typeof n === "string" && typeof last === "string") merged[merged.length - 1] = last + n;
      else merged.push(n);
    }
    return merged.map((n, i) => (typeof n === "string" ? <span key={`f${i}`}>{_mathParse(n, i * 1000)}</span> : <span key={`f${i}`}>{n}</span>));
  }
  return node;
}

function _toTexSource(node, depth = 0, seen) {
  if (depth > 32) return "";
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    let out = "";
    for (const n of node) out += _toTexSource(n, depth + 1, seen);
    return out;
  }
  if (typeof node === "object" && node.props && node.props.children != null) {
    const visited = seen || new WeakSet();
    if (visited.has(node)) return "";
    try {
      visited.add(node);
    } catch {
      // no-op
    }
    return _toTexSource(node.props.children, depth + 1, visited);
  }
  return "";
}

function _katexHtml(src, displayMode) {
  const safeSrc = String(src ?? "").trim();
  if (!safeSrc) return null;
  const subMap = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  const supMap = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
  let normalized = safeSrc
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "\\times ")
    .replace(/·/g, "\\cdot ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≈/g, "\\approx ")
    .replace(/∞/g, "\\infty ")
    .replace(/→/g, "\\to ")
    .replace(/↔/g, "\\leftrightarrow ");
  normalized = normalized
    .replace(/([A-Za-z)\]}])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, base, subs) => `${base}_{${[...subs].map((c) => subMap[c] || c).join("")}}`)
    .replace(/([A-Za-z)\]}])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, sups) => `${base}^{${[...sups].map((c) => supMap[c] || c).join("")}}`);

  const looksMathLike =
    /[\\^_{}=+\-*/<>|]/.test(normalized) ||
    /\d/.test(normalized) ||
    /[α-ωΑ-Ω]/.test(normalized) ||
    /\\(frac|sum|prod|int|sqrt|mathbb|mathcal|mathrm|text|to|le|ge|approx|infty|cdot|times)\b/.test(normalized);
  if (!looksMathLike) return null;

  try {
    return katex.renderToString(normalized, {
      displayMode,
      throwOnError: true,
      strict: "warn",
      trust: true,
      output: "html",
      macros: {
        "\\R": "\\mathbb{R}",
        "\\Z": "\\mathbb{Z}",
        "\\N": "\\mathbb{N}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}",
      },
    });
  } catch {
    return null;
  }
}

function MathBlock({ children }) {
  let src = "";
  try {
    src = _toTexSource(children);
  } catch {
    src = "";
  }
  const html = src ? _katexHtml(src, true) : null;
  if (html) return <div style={{ color: C.inkBr, overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
  return <div style={{ fontFamily: FONT_MATH, color: C.inkBr }}>{_renderMathChildren(children)}</div>;
}

export function M({ children, italic = true }) {
  let src = "";
  try {
    src = _toTexSource(children);
  } catch {
    src = "";
  }
  if (src) {
    const html = _katexHtml(src, false);
    if (html) return <span style={{ color: C.inkBr }} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span style={{ fontFamily: FONT_MATH, fontStyle: italic ? "italic" : "normal", fontSize: "1.14em", color: C.inkBr }}>{_renderMathChildren(children)}</span>;
}

export function Eq({ number, children, style }) {
  const responsive = useResponsive();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: responsive.isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) auto",
        alignItems: responsive.isMobile ? "center" : "center",
        padding: responsive.isMobile ? "14px 16px" : "18px 24px",
        margin: responsive.isMobile ? "14px 0" : "18px 0",
        background: C.bgDeep,
        borderLeft: `2px solid ${C.gold}`,
        fontFamily: FONT_MATH,
        fontSize: responsive.isMobile ? "1.2em" : "1.32em",
        color: C.ink,
        lineHeight: 1.4,
        maxWidth: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: responsive.isMobile && number ? 8 : 0, minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
        <MathBlock>{children}</MathBlock>
      </div>
      {number && (
        <div style={{ color: C.inkFaint, fontSize: responsive.isMobile ? "0.75em" : "0.85em", fontStyle: "italic", textAlign: responsive.isMobile ? "center" : "right" }}>
          ({number})
        </div>
      )}
    </div>
  );
}

export function Theorem({ kind = "Theorem", number, title, children, tone = "gold" }) {
  const responsive = useResponsive();
  const toneC = tone === "gold" ? C.gold : tone === "crimson" ? C.crimson : tone === "teal" ? C.teal : C.indigo;
  return (
    <div style={{ margin: responsive.isMobile ? "14px 0" : "18px 0", padding: responsive.isMobile ? "12px 14px 12px 16px" : "14px 18px 14px 22px", background: `${toneC}08`, borderLeft: `3px solid ${toneC}`, borderRadius: "0 3px 3px 0", position: "relative" }}>
      <div style={{ display: "flex", gap: responsive.isMobile ? 6 : 8, marginBottom: responsive.isMobile ? 4 : 6, flexDirection: responsive.isMobile ? "column" : "row", alignItems: responsive.isMobile ? "flex-start" : "baseline" }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: responsive.isMobile ? "1.08em" : "1.18em", color: toneC, letterSpacing: 0.3 }}>
          {kind}
          {number ? ` ${number}` : ""}.
        </span>
        {title && <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", color: C.ink, fontSize: responsive.isMobile ? "1.05em" : "1.12em" }}>{title}</span>}
      </div>
      <div style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? "1.08em" : "1.15em", color: C.ink, lineHeight: 1.6, overflowWrap: "anywhere", overflowX: "auto" }}>{children}</div>
    </div>
  );
}

export function SectionHead({ number, title, eyebrow, id }) {
  const responsive = useResponsive();
  const projectionWidth = responsive.isMobile ? 0 : responsive.isTablet ? 132 : 176;
  return (
    <div id={id} style={{ margin: responsive.isMobile ? "36px 0 14px" : "48px 0 18px", position: "relative", overflow: "hidden" }}>
      {!responsive.isMobile && (
        <div style={{ position: "absolute", right: 0, top: 0, width: projectionWidth, height: responsive.isTablet ? 76 : 92, pointerEvents: "none", opacity: 0.92, animation: "projectionFloat 10.5s ease-in-out infinite" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                right: i * 12,
                top: 8 + i * 7,
                width: responsive.isTablet ? 82 + i * 16 : 98 + i * 20,
                height: responsive.isTablet ? 42 + i * 8 : 50 + i * 10,
                borderRadius: 18,
                border: `1px solid ${i === 2 ? `${C.gold}88` : i === 1 ? `${C.indigo}66` : `${C.teal}55`}`,
                background: `linear-gradient(135deg, ${i === 2 ? `${C.gold}10` : `${C.indigo}0e`} 0%, transparent 72%)`,
                transform: `perspective(900px) rotateX(72deg) rotateZ(${i === 0 ? -20 : i === 1 ? -8 : 8}deg)`,
                boxShadow: `0 0 ${18 + i * 7}px ${i === 2 ? `${C.gold}26` : `${C.indigo}20`}`,
                animation: `projectionPulse ${3.8 + i * 0.9}s ease-in-out infinite`,
                animationDelay: `-${i * 1.1}s`,
              }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={`node-${i}`}
              style={{
                position: "absolute",
                right: 22 + i * 24,
                top: 16 + (i % 2) * 20,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: i % 2 === 0 ? C.gold : C.tealBr,
                boxShadow: `0 0 12px ${i % 2 === 0 ? C.gold : C.tealBr}`,
                animation: `projectionPulse ${2.6 + i * 0.45}s ease-in-out infinite`,
                animationDelay: `-${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
      {eyebrow && (
        <div style={{ fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 9 : 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: responsive.isMobile ? 4 : 6, position: "relative", zIndex: 1, paddingRight: responsive.isMobile ? 0 : Math.floor(projectionWidth * 0.5) }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", gap: responsive.isMobile ? 12 : 16, borderBottom: `1px solid ${C.rule}`, paddingBottom: responsive.isMobile ? 8 : 10, flexDirection: responsive.isMobile ? "column" : "row", alignItems: responsive.isMobile ? "flex-start" : "baseline", position: "relative", zIndex: 1, paddingRight: responsive.isMobile ? 0 : projectionWidth }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: responsive.isMobile ? 24 : 30, color: C.gold, fontWeight: 500 }}>§ {number}</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: responsive.isMobile ? 28 : responsive.isTablet ? 34 : 38, fontWeight: 500, color: C.inkBr, letterSpacing: responsive.isMobile ? -0.2 : -0.3, lineHeight: 1.1, margin: 0 }}>{title}</h2>
      </div>
    </div>
  );
}

export function Figure({ number, caption, children, noPad }) {
  const responsive = useResponsive();
  return (
    <figure style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, margin: responsive.isMobile ? "14px 0" : "18px 0", overflow: "hidden" }}>
      <div style={{ padding: responsive.isMobile ? "7px 12px" : "9px 16px", borderBottom: `1px solid ${C.border}`, background: C.panelAlt, display: "flex", alignItems: "baseline", gap: responsive.isMobile ? 6 : 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: responsive.isMobile ? 12 : 14, color: C.gold }}>
          Figure {number}.
        </span>
        <span style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: responsive.isMobile ? 13 : 15, color: C.inkDim, lineHeight: 1.45 }}>{caption}</span>
      </div>
      <div style={{ padding: noPad ? 0 : responsive.isMobile ? 10 : 14 }}>{children}</div>
    </figure>
  );
}

export function Prose({ children, style }) {
  const responsive = useResponsive();
  return (
    <p style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? "1.1em" : "1.24em", lineHeight: responsive.isMobile ? 1.6 : 1.72, color: C.ink, margin: responsive.isMobile ? "12px 0" : "14px 0", textAlign: "justify", ...style }}>
      {children}
    </p>
  );
}

export function Metric({ label, value, unit, tone = "gold", mono = true }) {
  const responsive = useResponsive();
  const col = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "indigo" ? C.indigo : tone === "crimson" ? C.crimson : C.inkBr;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: responsive.isMobile ? 1 : 2 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 8 : 10, letterSpacing: 1.7, color: C.inkFaint, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: mono ? FONT_MONO : FONT_DISPLAY, fontSize: responsive.isMobile ? 16 : 19, color: col }}>
        {value}
        {unit && <span style={{ color: C.inkDim, fontSize: responsive.isMobile ? "0.5em" : "0.65em", marginLeft: responsive.isMobile ? 2 : 3 }}>{unit}</span>}
      </span>
    </div>
  );
}
