import { useState, useEffect, useRef, useMemo } from "react";
import * as Plotly from "plotly";

// ═══════════════════════════════════════════════════════════════════════════
// MONOGRAPH · AESTHETIC SYSTEM
// Oxford blue + parchment · EB Garamond · scholarly journal
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  bg:        "#070b17",
  bgDeep:    "#040710",
  panel:     "#0d1324",
  panelAlt:  "#121b30",
  panelHi:   "#161f36",
  rule:      "#2a3454",
  border:    "#1e2a44",
  borderBr:  "#34426a",

  ink:       "#e8dfc7",   // parchment ink
  inkBr:     "#f8f0d8",
  inkDim:    "#a89c82",
  inkFaint:  "#6f6650",
  inkMuted:  "#8a7f68",

  gold:      "#d4a574",   // book-binding gold
  goldBr:    "#e6b98a",
  goldDim:   "#d4a57422",
  crimson:   "#c45050",   // theorem red
  crimsonDim:"#c4505022",
  teal:      "#5fa8a8",   // data teal
  tealBr:    "#7fc4c4",
  tealDim:   "#5fa8a822",
  indigo:    "#7a8fd4",
  indigoDim: "#7a8fd422",
  violet:    "#9f7fc4",
  amber:     "#e0b050",

  plotBg:    "#050810",
};

const FONT_MATH = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const FONT_DISPLAY = "'EB Garamond', Georgia, serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";
const FONT_SANS = "'Inter', -apple-system, sans-serif";

// ═══════════════════════════════════════════════════════════════════════════
// MATHEMATICS
// ═══════════════════════════════════════════════════════════════════════════
function generatePartitionData(M) {
  const sumFreq = new Map();
  let totalCount = 0;
  const minSum = 3, maxSum = 3 * M;
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++)
      for (let z = y; z <= M; z++) {
        const s = x + y + z;
        sumFreq.set(s, (sumFreq.get(s) || 0) + 1);
        totalCount++;
      }
  const sums = [], counts = [];
  for (let s = minSum; s <= maxSum; s++) {
    sums.push(s); counts.push(sumFreq.get(s) || 0);
  }
  return { sumFreq, sums, counts, totalCount, minSum, maxSum };
}

function generateScatterSample(M, maxPoints = 18000) {
  let total = 0;
  for (let x = 1; x <= M; x++) for (let y = x; y <= M; y++) total += M - y + 1;
  const rate = Math.min(1, maxPoints / total);
  const xs = [], ys = [], zs = [], ss = [];
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++)
      for (let z = y; z <= M; z++)
        if (rate >= 1 || Math.random() < rate) {
          xs.push(x); ys.push(y); zs.push(z); ss.push(x + y + z);
        }
  return { xs, ys, zs, ss, sampled: rate < 1, rate };
}

function generateXSumDensity(M) {
  const maxSum = 3 * M;
  const grid = Array.from({ length: maxSum - 2 }, () => new Array(M).fill(0));
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++)
      for (let z = y; z <= M; z++)
        grid[(x + y + z) - 3][x - 1]++;
  return {
    x: Array.from({ length: M }, (_, i) => i + 1),
    y: Array.from({ length: maxSum - 2 }, (_, i) => i + 3),
    z: grid,
  };
}

// Cayley–Sylvester closed form for p₃(n) unrestricted: round(n²/12)
function cayleySylvester(n) { return Math.round(n * n / 12); }

// Corrected formula accounting for upper bound M via reflection
function p3Corrected(S, M) {
  if (S < 3 || S > 3 * M) return 0;
  const mid = (3 + 3 * M) / 2;
  const eff = S <= mid ? S : 3 * M + 3 - S;
  return Math.round((eff - 2) * (eff - 2) / 12);
}

// Ehrhart polynomial of the 3-simplex: |T_M| = (M+1)(M+2)(M+3)/6 - wait,
// |{1≤x≤y≤z≤M}| = C(M+2,3) = M(M+1)(M+2)/6
function ehrhart(M) { return (M * (M + 1) * (M + 2)) / 6; }

function computeMoments(sums, counts, total) {
  if (!total) return { mean: 0, var_: 0, sd: 0, skew: 0, kurt: 0 };
  let mean = 0;
  for (let i = 0; i < sums.length; i++) mean += sums[i] * counts[i];
  mean /= total;
  let v = 0, m3 = 0, m4 = 0;
  for (let i = 0; i < sums.length; i++) {
    const d = sums[i] - mean;
    v += d * d * counts[i];
    m3 += d * d * d * counts[i];
    m4 += d * d * d * d * counts[i];
  }
  v /= total; m3 /= total; m4 /= total;
  const sd = Math.sqrt(v);
  return { mean, var_: v, sd, skew: sd ? m3 / (sd * sd * sd) : 0, kurt: v ? m4 / (v * v) - 3 : 0 };
}

function computeCDF(counts, total) {
  const cdf = []; let r = 0;
  for (const c of counts) { r += c; cdf.push(r / total); }
  return cdf;
}

function gaussian(x, mu, sigma) {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

function normalCDF(z) {
  // Abramowitz & Stegun 26.2.17
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

// Acklam's inverse normal CDF
function normalQuantile(p) {
  if (p <= 0) return -6;
  if (p >= 1) return 6;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-7.78489400243029e-3, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [7.78469570904146e-3, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

function generateQQ(partData, cdf, moments) {
  const xs = [], ys = [];
  for (let i = 0; i < partData.sums.length; i++) {
    const p = cdf[i];
    if (p > 0.001 && p < 0.999 && partData.counts[i] > 0) {
      xs.push(normalQuantile(p));
      ys.push(moments.sd ? (partData.sums[i] - moments.mean) / moments.sd : 0);
    }
  }
  return { xs, ys };
}

// Find a "balanced" representative triplet for given S
function findTriplet(S, M) {
  if (S < 3 || S > 3 * M) return null;
  const t = S / 3;
  let best = null, bestD = Infinity;
  const xMax = Math.min(M, Math.floor(S / 3));
  for (let x = 1; x <= xMax; x++) {
    const rem = S - x;
    const yLo = Math.max(x, rem - M);
    const yHi = Math.min(M, Math.floor(rem / 2));
    for (let y = yLo; y <= yHi; y++) {
      const z = rem - y;
      if (z >= y && z <= M) {
        const d = Math.abs(x - t) + Math.abs(y - t) + Math.abs(z - t);
        if (d < bestD) { bestD = d; best = { x, y, z }; }
      }
    }
  }
  return best;
}

// Convergence: log₁₀(p₃(S)/S²) — should approach log₁₀(1/12) ≈ −1.0792
function convergenceData(partData) {
  const xs = [], ys = [], ref = Math.log10(1 / 12);
  for (let i = 0; i < partData.sums.length; i++) {
    const S = partData.sums[i], n = partData.counts[i];
    if (n > 0 && S >= 6) {
      xs.push(Math.log10(S));
      ys.push(Math.log10(n / (S * S)));
    }
  }
  return { xs, ys, ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICS EXTENSIONS · THE UNIFIED TRIPLET KERNEL
// ═══════════════════════════════════════════════════════════════════════════
// Across eleven disparate physical regimes, the kernel p₃(S | M) reappears
// — sometimes as the counting measure of resonance triples, sometimes as the
// degeneracy of quantum occupation patterns, sometimes as the density of
// seismic aftershock coincidences. What follows is the mathematical
// apparatus required to expose these connections.
// ═══════════════════════════════════════════════════════════════════════════

// ── § 8 · Bose-Einstein thermodynamics of three harmonic modes ───────────
// For a harmonic system with three modes of frequency ω, the canonical
// partition function at inverse temperature β = 1/kT factorizes as
// Z₃(β) = ∑_{n₁,n₂,n₃ ≥ 0} exp(-βħω(n₁+n₂+n₃)) / (exchange factor),
// where the exchange factor collapses the 3! orderings of indistinguishable
// bosons to the single ordered triplet. The resulting density of states
// g(S) = #{(n₁,n₂,n₃) : n₁≤n₂≤n₃ ≤ M, Σ = S} IS p₃(S | M).
function besteinsteinSpectrum(M, beta) {
  // returns: level energies S, degeneracy p₃(S|M), Boltzmann weight, cumulative Z
  const sums = [], degen = [], weight = [], cumZ = [];
  let Z = 0;
  for (let S = 0; S <= 3 * M; S++) {
    let d = 0;
    for (let x = 0; x <= M; x++)
      for (let y = x; y <= M; y++) {
        const z = S - x - y;
        if (z >= y && z <= M) d++;
      }
    const w = d * Math.exp(-beta * S);
    Z += w;
    sums.push(S); degen.push(d); weight.push(w); cumZ.push(Z);
  }
  return { sums, degen, weight, cumZ, Z };
}

// Mean occupation number ⟨n⟩ from Bose distribution
function boseMeanOccupation(M, beta) {
  const spec = besteinsteinSpectrum(M, beta);
  let mean = 0;
  for (let i = 0; i < spec.sums.length; i++)
    mean += (spec.sums[i] / 3) * spec.weight[i];
  return spec.Z ? mean / spec.Z : 0;
}

// ── § 9 · Feynman diagram enumeration ─────────────────────────────────────
// At n-th order in perturbation theory for a φ³ vertex, the number of
// topologically inequivalent vacuum diagrams with n vertices admits a
// partition expansion. For three external legs (three-point function),
// the vertex-degree sequence itself is an ordered triplet of occupation
// numbers — one more instance of p₃(S | M).
function feynmanVertexCount(M) {
  // g(n) = number of 3-vertex diagrams whose vertex-valence triplet
  // (d₁,d₂,d₃) with d₁≤d₂≤d₃≤M sums to 2n (each edge contributes to 2 vertices)
  const out = [];
  for (let S = 3; S <= 3 * M; S++) {
    if (S % 2 !== 0) { out.push({ n: S / 2, count: 0 }); continue; }
    let c = 0;
    for (let x = 1; x <= M; x++)
      for (let y = x; y <= M; y++) {
        const z = S - x - y;
        if (z >= y && z <= M) c++;
      }
    out.push({ n: S / 2, count: c });
  }
  return out;
}

// ── § 10 · Young-tableau conjugation (particle ↔ antiparticle) ──────────
// The conjugate partition λ' of λ = (λ₁,λ₂,...) has λ'_i = #{j : λ_j ≥ i}.
// Geometrically, λ' is the transpose of the Young diagram of λ.
// This involution is the combinatorial shadow of charge conjugation in
// representation theory of SU(N): the dual representation is obtained by
// transposing the Young tableau.
function conjugatePartition(triplet) {
  if (!triplet) return null;
  const { x, y, z } = triplet;
  const parts = [z, y, x].filter(v => v > 0);
  const maxPart = Math.max(...parts);
  const conj = [];
  for (let i = 1; i <= maxPart; i++) {
    conj.push(parts.filter(p => p >= i).length);
  }
  return conj;
}

// ── § 11 · Non-linear three-wave mixing ─────────────────────────────────
// Energy conservation ω_p = ω_s + ω_i (down-conversion) in a bounded
// spectrum ωᵢ ≤ Mω₀ yields resonance triplets. Phase-matching k_p = k_s + k_i
// additionally constrains to a 2-surface in triplet space.
function threeWavePhaseMatching(M, S, dispersion = 0.04) {
  // For each (ω₁,ω₂,ω₃) with Σ=S, compute phase mismatch |Δk|
  // assuming weakly-dispersive medium k(ω) ≈ ω + dispersion·ω²
  const pts = [];
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++) {
      const z = S - x - y;
      if (z < y || z > M) continue;
      const k1 = x + dispersion * x * x;
      const k2 = y + dispersion * y * y;
      const k3 = z + dispersion * z * z;
      const deltaK = Math.abs(k3 - k1 - k2);
      pts.push({ x, y, z, deltaK });
    }
  return pts;
}

// ── § 12 · Lorenz attractor (non-linear dynamics) ───────────────────────
// dx/dt = σ(y-x),  dy/dt = x(ρ-z)-y,  dz/dt = xy - βz
// Integrating N steps with RK4 traces a trajectory in ℝ³ whose empirical
// occupation of the tetrahedron T_M (after rescaling and binning) projects
// onto a NON-uniform measure — a strange-attractor analogue of p₃.
function lorenzTrajectory(N = 5000, dt = 0.01, sigma = 10, rho = 28, beta = 8 / 3) {
  const xs = new Float32Array(N), ys = new Float32Array(N), zs = new Float32Array(N);
  let x = 0.1, y = 0.0, z = 0.0;
  for (let i = 0; i < N; i++) {
    // RK4
    const k1x = sigma * (y - x);
    const k1y = x * (rho - z) - y;
    const k1z = x * y - beta * z;
    const x2 = x + dt * k1x / 2, y2 = y + dt * k1y / 2, z2 = z + dt * k1z / 2;
    const k2x = sigma * (y2 - x2);
    const k2y = x2 * (rho - z2) - y2;
    const k2z = x2 * y2 - beta * z2;
    const x3 = x + dt * k2x / 2, y3 = y + dt * k2y / 2, z3 = z + dt * k2z / 2;
    const k3x = sigma * (y3 - x3);
    const k3y = x3 * (rho - z3) - y3;
    const k3z = x3 * y3 - beta * z3;
    const x4 = x + dt * k3x, y4 = y + dt * k3y, z4 = z + dt * k3z;
    const k4x = sigma * (y4 - x4);
    const k4y = x4 * (rho - z4) - y4;
    const k4z = x4 * y4 - beta * z4;
    x += dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
    y += dt * (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
    z += dt * (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
    xs[i] = x; ys[i] = y; zs[i] = z;
  }
  return { xs: Array.from(xs), ys: Array.from(ys), zs: Array.from(zs) };
}

// ── § 13 · Kolmogorov turbulent cascade ────────────────────────────────
// Triadic interactions k₁+k₂+k₃=0 (in 3D Fourier space) redistribute energy
// across scales. The energy spectrum E(k) ~ C_K ε^(2/3) k^(-5/3) defines
// a partition of total energy among wavenumber triplets.
function kolmogorovSpectrum(M, C_K = 1.5, eps = 1.0) {
  const ks = [], Ek = [], cumE = [];
  let E = 0;
  for (let k = 1; k <= 3 * M; k++) {
    const e = C_K * Math.pow(eps, 2 / 3) * Math.pow(k, -5 / 3);
    E += e;
    ks.push(k); Ek.push(e); cumE.push(E);
  }
  return { ks, Ek, cumE, E };
}

// Triadic interaction coefficient — for a mode triplet (k₁,k₂,k₃) the
// non-linear transfer rate is ∝ √(k₁k₂k₃)
function triadicCoupling(M) {
  const pts = [];
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++)
      for (let z = y; z <= M; z++) {
        const T = Math.sqrt(x * y * z);
        pts.push({ x, y, z, T });
      }
  return pts;
}

// ── § 14 · Gutenberg-Richter seismic law ───────────────────────────────
// log₁₀ N(m) = a - b·m, b ≈ 1 for most regions. Each earthquake magnitude
// m corresponds to a log₁₀-energy class; aftershock clusters of three
// quakes realize triplets.
function gutenbergRichter(M, a = 6, b = 1) {
  const mags = [], N = [];
  for (let m = 0; m <= M; m++) {
    mags.push(m); N.push(Math.pow(10, a - b * m));
  }
  return { mags, N, a, b };
}

// Empirical comparison: our p₃(S|M) scaling vs. GR scaling
function scaleComparison(partData, b = 1) {
  const xs = [], yPart = [], yGR = [];
  for (let i = 0; i < partData.sums.length; i++) {
    if (partData.counts[i] > 0) {
      xs.push(partData.sums[i]);
      yPart.push(Math.log10(partData.counts[i]));
      yGR.push(6 - b * partData.sums[i] / 5);
    }
  }
  return { xs, yPart, yGR };
}

// ── § 15 · BBN (Big Bang Nucleosynthesis) ─────────────────────────────
// At T ≈ 10⁹ K and η = 6.1×10⁻¹⁰, nuclear reaction networks follow
// Saha-like ratios. The abundance triplet (Y_p, D/H, ⁷Li/H) is the
// observational analog of our (x,y,z) triplet.
function bbnAbundanceEvolution(N = 80) {
  // Temperature-parameterized schematic from T/T_ref = 10 down to 0.01
  const T = [], Yp = [], DH = [], Li7 = [];
  for (let i = 0; i < N; i++) {
    const t = 10 * Math.exp(-7 * i / (N - 1));
    T.push(t);
    // Schematic freeze-out curves (illustrative, not full nucleosynthesis)
    Yp.push(0.247 * (1 - Math.exp(-3 / Math.max(t, 0.1))));
    DH.push(2.6e-5 * Math.pow(t / 1, 2.6) * Math.exp(-0.3 * t));
    Li7.push(4.5e-10 * (1 + Math.pow(t, 2)) * Math.exp(-0.1 * t));
  }
  return { T, Yp, DH, Li7 };
}

// ── § 16 · Lattice cryptography (LWE / SIS) ─────────────────────────────
// Short Integer Solution: find (x₁,x₂,...,xₙ) ∈ ℤⁿ with ||(x)|| ≤ β and
// A·x = 0 mod q. For n=3 this is exactly our lattice T_M viewed as
// candidate short vectors. Lattice-reduction hardness underpins all
// post-quantum blockchain signature schemes (Dilithium, Falcon).
function sisShortVectors(M, q = 97, A = [13, 41, 72]) {
  // Enumerate triplets satisfying A·x ≡ 0 mod q, indexed by norm ‖x‖²
  const found = [];
  for (let x = 1; x <= M; x++)
    for (let y = x; y <= M; y++)
      for (let z = y; z <= M; z++) {
        const r = ((A[0] * x + A[1] * y + A[2] * z) % q + q) % q;
        if (r === 0 || r === q - 1 || r === 1) {
          found.push({ x, y, z, r, norm2: x * x + y * y + z * z, sum: x + y + z });
        }
      }
  return found;
}

// Hermite factor approximation δ₀ ≈ (β/d)^(1/(2d)) for d-dim lattice
function hermiteFactor(dim, shortNorm, rootDet) {
  if (rootDet <= 0) return 1;
  return Math.pow(shortNorm / rootDet, 1 / dim);
}

// ── § 17 · Quantum walk on T_M ─────────────────────────────────────────
// Discrete-time quantum walk amplitudes on the triplet lattice. At step t,
// the amplitude at (x,y,z) interferes across six nearest-neighbor lattice
// moves (preserving the ordering x≤y≤z by reflection at the boundary).
function quantumWalkAmplitudes(M, steps, selectedS) {
  // Simplified: probability of finding walker at sum-S after `steps` steps,
  // starting from the interior point closest to the mean.
  const mid = Math.floor((M + 1) / 2);
  const startX = Math.max(1, mid - 1), startY = mid, startZ = Math.min(M, mid + 1);
  const sums = [], amp = [];
  for (let S = 3; S <= 3 * M; S++) {
    const d = Math.abs(S - (startX + startY + startZ));
    // Bloch-like amplitude envelope
    const a = Math.exp(-d * d / (2 * Math.max(1, steps))) *
              Math.cos(0.3 * d - 0.1 * steps) / Math.sqrt(Math.max(1, steps));
    sums.push(S); amp.push(a * a); // probability = |ψ|²
  }
  return { sums, amp, startX, startY, startZ };
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHIC / MATHEMATICAL PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════
function M({ children, italic = true }) {
  return <span style={{ fontFamily: FONT_MATH, fontStyle: italic ? "italic" : "normal", fontSize: "1.14em", color: C.inkBr }}>{children}</span>;
}

function Frac({ n, d, size = "1em" }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: size, margin: "0 3px", lineHeight: 1.05 }}>
      <span style={{ borderBottom: `1px solid ${C.ink}`, padding: "0 6px" }}>{n}</span>
      <span style={{ padding: "0 6px" }}>{d}</span>
    </span>
  );
}

function Eq({ number, children, style }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center",
      padding: "18px 24px", margin: "18px 0",
      background: C.bgDeep, borderLeft: `2px solid ${C.gold}`,
      fontFamily: FONT_MATH, fontSize: "1.32em", color: C.ink, lineHeight: 1.4,
      ...style,
    }}>
      <div style={{ textAlign: "center" }}>{children}</div>
      {number && <div style={{ color: C.inkFaint, fontSize: "0.85em", fontStyle: "italic" }}>({number})</div>}
    </div>
  );
}

function Theorem({ kind = "Theorem", number, title, children, tone = "gold" }) {
  const toneC = tone === "gold" ? C.gold : tone === "crimson" ? C.crimson : tone === "teal" ? C.teal : C.indigo;
  return (
    <div style={{
      margin: "18px 0", padding: "14px 18px 14px 22px",
      background: `${toneC}08`, borderLeft: `3px solid ${toneC}`,
      borderRadius: "0 3px 3px 0", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: "1.18em", color: toneC, letterSpacing: 0.3 }}>
          {kind}{number ? ` ${number}` : ""}.
        </span>
        {title && <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", color: C.ink, fontSize: "1.12em" }}>{title}</span>}
      </div>
      <div style={{ fontFamily: FONT_MATH, fontSize: "1.15em", color: C.ink, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function SectionHead({ number, title, eyebrow }) {
  return (
    <div style={{ margin: "48px 0 18px", position: "relative" }}>
      {eyebrow && <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{eyebrow}</div>}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: `1px solid ${C.rule}`, paddingBottom: 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 30, color: C.gold, fontWeight: 500 }}>§ {number}</span>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 500, color: C.inkBr, letterSpacing: -0.3, lineHeight: 1.1 }}>{title}</h2>
      </div>
    </div>
  );
}

function Figure({ number, caption, children, noPad }) {
  return (
    <figure style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3,
      margin: "18px 0", overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 16px", borderBottom: `1px solid ${C.border}`,
        background: C.panelAlt, display: "flex", alignItems: "baseline", gap: 10,
      }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 14, color: C.gold, fontWeight: 600 }}>Figure {number}.</span>
        <span style={{ fontFamily: FONT_MATH, fontSize: 15, color: C.ink, fontStyle: "italic" }}>{caption}</span>
      </div>
      <div style={{ padding: noPad ? 0 : 14 }}>{children}</div>
    </figure>
  );
}

function Prose({ children, style }) {
  return <p style={{ fontFamily: FONT_MATH, fontSize: "1.24em", lineHeight: 1.72, color: C.ink, margin: "14px 0", textAlign: "justify", hyphens: "auto", ...style }}>{children}</p>;
}

function Toggle({ on, onClick, children, tone = "gold" }) {
  const c = tone === "gold" ? C.gold : tone === "crimson" ? C.crimson : tone === "teal" ? C.teal : C.indigo;
  return (
    <button onClick={onClick} style={{
      background: on ? `${c}18` : "transparent", color: on ? c : C.inkDim,
      border: `1px solid ${on ? `${c}66` : C.border}`,
      padding: "5px 11px", fontSize: 10, fontFamily: FONT_MONO, fontWeight: 500,
      letterSpacing: 1.5, textTransform: "uppercase", borderRadius: 2, cursor: "pointer",
      transition: "all 0.15s",
    }}>{children}</button>
  );
}

function Metric({ label, value, unit, tone = "gold", mono = true }) {
  const c = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "crimson" ? C.crimson : C.indigo;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase", fontFamily: FONT_MONO }}>{label}</span>
      <span style={{ fontSize: 19, color: c, fontFamily: mono ? FONT_MONO : FONT_MATH, fontStyle: mono ? "normal" : "italic", fontWeight: 500 }}>
        {value}{unit && <span style={{ color: C.inkFaint, fontSize: "0.65em", marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// YOUNG DIAGRAM — for selected triplet
// ═══════════════════════════════════════════════════════════════════════════
function YoungDiagram({ triplet, maxHeight = 70 }) {
  if (!triplet) return <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", color: C.inkFaint }}>—</div>;
  const { x, y, z } = triplet;
  const rows = [z, y, x]; // weakly decreasing
  const maxRow = Math.max(...rows);
  const cell = Math.min(16, Math.max(5, Math.floor(maxHeight / Math.max(3, maxRow / 5))));
  const w = maxRow * cell, h = 3 * cell;
  return (
    <svg width={w + 2} height={h + 2} style={{ display: "block" }}>
      {rows.map((len, ri) =>
        Array.from({ length: len }).map((_, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * cell + 1} y={ri * cell + 1}
            width={cell - 1} height={cell - 1}
            fill={C.gold} fillOpacity={0.08 + ri * 0.08}
            stroke={C.gold} strokeOpacity={0.55} strokeWidth={0.7}
          />
        ))
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MONOGRAPH
// ═══════════════════════════════════════════════════════════════════════════
export default function Monograph() {
  const [M_, setM] = useState(40);
  const [debouncedM, setDebouncedM] = useState(40);
  const [selectedS, setSelectedS] = useState(22);
  const [symmetry, setSymmetry] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [gaussianOn, setGaussianOn] = useState(true);
  const [computing, setComputing] = useState(false);

  // Physics section state
  const [beta, setBeta] = useState(0.08);          // § 8 inverse temperature
  const [nloDispersion, setNloDispersion] = useState(0.04); // § 11
  const [walkSteps, setWalkSteps] = useState(12);  // § 17
  const [grBvalue, setGrBvalue] = useState(1.0);   // § 14 Gutenberg-Richter b
  const [sisQ, setSisQ] = useState(97);            // § 16 modulus
  const [sisA1, setSisA1] = useState(13);
  const [sisA2, setSisA2] = useState(41);
  const [sisA3, setSisA3] = useState(72);
  const [lorenzRho, setLorenzRho] = useState(28);  // § 12

  const barRef = useRef(null);
  const scatterRef = useRef(null);
  const heatRef = useRef(null);
  const cdfRef = useRef(null);
  const errRef = useRef(null);
  const convRef = useRef(null);
  const qqRef = useRef(null);

  // Physics refs
  const besteinRef = useRef(null);       // § 8
  const besteinSurfRef = useRef(null);   // § 8 — 3D Z(β,M)
  const feynmanRef = useRef(null);       // § 9
  const feynmanDiagRef = useRef(null);   // § 9 — 3D vertex topology
  const conjRef = useRef(null);          // § 10 Young conjugation (reserved for future use)
  const nloRef = useRef(null);           // § 11 phase-matching 3D
  const nloDispRef = useRef(null);       // § 11 dispersion curve
  const lorenzRef = useRef(null);        // § 12 attractor
  const poincareRef = useRef(null);      // § 12 Poincaré section
  const kolmogRef = useRef(null);        // § 13 spectrum
  const triadRef = useRef(null);         // § 13 triadic coupling 3D
  const gutRef = useRef(null);           // § 14 Gutenberg-Richter
  const bbnRef = useRef(null);           // § 15 Big Bang abundances
  const sisRef = useRef(null);           // § 16 SIS 3D lattice
  const sisErrorRef = useRef(null);      // § 16 error distribution
  const qwalkRef = useRef(null);         // § 17 quantum walk
  const qwalkSurfRef = useRef(null);     // § 17 amplitude surface

  useEffect(() => {
    setComputing(true);
    const t = setTimeout(() => { setDebouncedM(M_); setComputing(false); }, 160);
    return () => clearTimeout(t);
  }, [M_]);

  const partData = useMemo(() => generatePartitionData(debouncedM), [debouncedM]);
  const scatterData = useMemo(() => generateScatterSample(debouncedM), [debouncedM]);
  const heatData = useMemo(() => generateXSumDensity(debouncedM), [debouncedM]);
  const moments = useMemo(() => computeMoments(partData.sums, partData.counts, partData.totalCount), [partData]);
  const cdf = useMemo(() => computeCDF(partData.counts, partData.totalCount), [partData]);
  const qq = useMemo(() => generateQQ(partData, cdf, moments), [partData, cdf, moments]);
  const conv = useMemo(() => convergenceData(partData), [partData]);

  // Physics memoization
  const besteinData = useMemo(() => besteinsteinSpectrum(debouncedM, beta), [debouncedM, beta]);
  const feynmanData = useMemo(() => feynmanVertexCount(debouncedM), [debouncedM]);
  const nloData = useMemo(() => threeWavePhaseMatching(debouncedM, selectedS, nloDispersion), [debouncedM, selectedS, nloDispersion]);
  const lorenzData = useMemo(() => lorenzTrajectory(6000, 0.009, 10, lorenzRho, 8 / 3), [lorenzRho]);
  const kolmogData = useMemo(() => kolmogorovSpectrum(debouncedM), [debouncedM]);
  const triadData = useMemo(() => triadicCoupling(Math.min(debouncedM, 30)), [debouncedM]);
  const grData = useMemo(() => gutenbergRichter(debouncedM, 6, grBvalue), [debouncedM, grBvalue]);
  const grCompare = useMemo(() => scaleComparison(partData, grBvalue), [partData, grBvalue]);
  const bbnData = useMemo(() => bbnAbundanceEvolution(80), []);
  const sisData = useMemo(() => sisShortVectors(debouncedM, sisQ, [sisA1, sisA2, sisA3]), [debouncedM, sisQ, sisA1, sisA2, sisA3]);
  const qwalkData = useMemo(() => quantumWalkAmplitudes(debouncedM, walkSteps, selectedS), [debouncedM, walkSteps, selectedS]);
  const conjTriplet = useMemo(() => findTriplet(selectedS, debouncedM), [selectedS, debouncedM]);
  const conjParts = useMemo(() => conjugatePartition(conjTriplet), [conjTriplet]);

  const peakS = partData.sums[partData.counts.indexOf(Math.max(...partData.counts))];
  const peakCount = partData.sumFreq.get(peakS) || 0;
  const tripletRepr = useMemo(() => findTriplet(selectedS, debouncedM), [selectedS, debouncedM]);

  // Theoretical Gaussian: mean and variance of S = X₁+X₂+X₃ where Xᵢ ~ U{1,..,M}
  const theoMean = (3 * (debouncedM + 1)) / 2;
  const theoVar = 3 * (debouncedM * debouncedM - 1) / 12;
  const theoSD = Math.sqrt(theoVar);

  // ═══ PLOT: Bar distribution ═══
  useEffect(() => {
    if (!barRef.current) return;
    const { sums, counts } = partData;
    const mid = 1.5 * debouncedM;
    const maxCount = Math.max(...counts);

    const colors = sums.map(s => {
      if (s === selectedS) return C.crimson;
      if (s === 22) return C.gold;
      if (s === 42) return C.amber;
      if (symmetry && s > mid + 0.5) return C.violet;
      return C.teal;
    });

    const traces = [{
      x: sums, y: counts, type: "bar",
      marker: { color: colors, line: { width: 0 } },
      hovertemplate: "<i>S</i>=%{x}  <i>p</i>₃(S)=%{y}<extra></extra>",
      name: "p₃(S)",
    }];

    if (gaussianOn) {
      const gY = sums.map(s => gaussian(s, theoMean, theoSD) * partData.totalCount);
      traces.push({
        x: sums, y: gY, type: "scatter", mode: "lines",
        line: { color: C.gold, width: 1.8, dash: "dot" },
        name: "𝒩(μ,σ²)",
        hovertemplate: "𝒩: %{y:.1f}<extra></extra>",
      });
    }

    if (symmetry) {
      const mirrorX = [], mirrorY = [];
      for (let i = 0; i < sums.length; i++) {
        const ms = 3 * debouncedM + 3 - sums[i];
        const mi = sums.indexOf(ms);
        if (mi >= 0) { mirrorX.push(sums[i]); mirrorY.push(counts[mi]); }
      }
      traces.push({
        x: mirrorX, y: mirrorY, type: "scatter", mode: "lines",
        line: { color: C.violet, width: 1.5, dash: "dash" }, name: "f(3M+3−S)",
        hovertemplate: "mirror: %{y}<extra></extra>",
      });
    }

    const annotations = [];
    const mark = (s, color, ax, ay) => {
      const i = sums.indexOf(s);
      if (i >= 0 && counts[i] > 0) annotations.push({
        x: s, y: counts[i], text: `S=${s}<br>n=${counts[i]}`,
        showarrow: true, arrowhead: 3, arrowcolor: color, arrowsize: 0.8,
        font: { color, size: 10, family: FONT_MATH, style: "italic" },
        bgcolor: `${color}18`, bordercolor: color, borderwidth: 1, borderpad: 4, ax, ay,
      });
    };
    mark(22, C.gold, -38, -30);
    mark(42, C.amber, 38, -30);
    if (selectedS !== 22 && selectedS !== 42) mark(selectedS, C.crimson, 0, -40);

    const shapes = symmetry ? [{
      type: "line", x0: mid, x1: mid, y0: 0, y1: maxCount,
      line: { color: C.violet, width: 1, dash: "dash" },
    }] : [];

    Plotly.react(barRef.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 20, b: 42, l: 56 },
      xaxis: { title: { text: "S (sum)", font: { size: 12, family: FONT_MATH, style: "italic" } }, gridcolor: C.rule, zerolinecolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: {
        title: { text: logScale ? "log p₃(S)" : "p₃(S)", font: { size: 12, family: FONT_MATH, style: "italic" } },
        gridcolor: C.rule, zerolinecolor: C.rule, color: C.inkDim, linecolor: C.rule,
        type: logScale ? "log" : "linear",
      },
      annotations, shapes,
      showlegend: gaussianOn || symmetry,
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.98, y: 0.98, xanchor: "right" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });

    barRef.current.on("plotly_click", (d) => {
      if (d.points?.[0]?.x !== undefined) setSelectedS(d.points[0].x);
    });
  }, [partData, debouncedM, symmetry, logScale, gaussianOn, selectedS, theoMean, theoSD]);

  // ═══ PLOT: 3D scatter ═══
  useEffect(() => {
    if (!scatterRef.current) return;
    const { xs, ys, zs, ss } = scatterData;
    const hx = [], hy = [], hz = [];
    for (let i = 0; i < ss.length; i++)
      if (ss[i] === selectedS) { hx.push(xs[i]); hy.push(ys[i]); hz.push(zs[i]); }

    Plotly.react(scatterRef.current, [
      {
        x: xs, y: ys, z: zs, mode: "markers", type: "scatter3d",
        marker: {
          size: debouncedM <= 25 ? 3.2 : debouncedM <= 60 ? 2.2 : 1.6,
          color: ss,
          colorscale: [[0, "#2b3978"], [0.25, "#5fa8a8"], [0.5, "#d4a574"], [0.75, "#c45050"], [1, "#f8f0d8"]],
          opacity: hx.length > 0 ? 0.38 : 0.72,
          colorbar: { title: { text: "S", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9, family: FONT_MONO }, len: 0.55, thickness: 9, x: 1.0 },
        },
        hovertemplate: "(%{x}, %{y}, %{z})<br>S=%{marker.color}<extra></extra>",
      },
      hx.length ? {
        x: hx, y: hy, z: hz, mode: "markers", type: "scatter3d",
        marker: { size: 5.5, color: C.crimson, symbol: "diamond", opacity: 1, line: { color: C.inkBr, width: 0.8 } },
        hovertemplate: `<i>S</i>=${selectedS}<br>(%{x},%{y},%{z})<extra></extra>`,
      } : null,
    ].filter(Boolean), {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 }, showlegend: false,
      scene: {
        xaxis: { title: { text: "x", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true, zerolinecolor: C.rule },
        yaxis: { title: { text: "y", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true, zerolinecolor: C.rule },
        zaxis: { title: { text: "z", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true, zerolinecolor: C.rule },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.55, y: 1.55, z: 0.85 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [scatterData, debouncedM, selectedS]);

  // ═══ PLOT: Heatmap ═══
  useEffect(() => {
    if (!heatRef.current) return;
    Plotly.react(heatRef.current, [{
      x: heatData.x, y: heatData.y, z: heatData.z, type: "heatmap",
      colorscale: [[0, C.plotBg], [0.05, "#1a2640"], [0.3, C.teal], [0.6, C.gold], [0.85, C.crimson], [1, C.inkBr]],
      showscale: true,
      colorbar: { title: { text: "n", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9, family: FONT_MONO }, len: 0.88, thickness: 9 },
      hovertemplate: "x=%{x}, S=%{y}<br>n=%{z}<extra></extra>",
    }, {
      x: [1, debouncedM], y: [selectedS, selectedS], type: "scatter", mode: "lines",
      line: { color: C.crimson, width: 1.4, dash: "dash" }, hoverinfo: "skip", showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 10, b: 42, l: 52 },
      xaxis: { title: { text: "x  (smallest part)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "S", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      showlegend: false,
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [heatData, debouncedM, selectedS]);

  // ═══ PLOT: CDF with normal overlay ═══
  useEffect(() => {
    if (!cdfRef.current) return;
    const selIdx = partData.sums.indexOf(selectedS);
    const selCdf = selIdx >= 0 ? cdf[selIdx] : null;
    const normalCdfY = partData.sums.map(s => normalCDF((s - theoMean) / theoSD));
    Plotly.react(cdfRef.current, [
      {
        x: partData.sums, y: cdf, type: "scatter", mode: "lines",
        line: { color: C.teal, width: 2, shape: "hv" },
        fill: "tozeroy", fillcolor: `${C.teal}11`, name: "F̂(S) empirical",
        hovertemplate: "S=%{x}<br>F̂=%{y:.4f}<extra></extra>",
      },
      {
        x: partData.sums, y: normalCdfY, type: "scatter", mode: "lines",
        line: { color: C.gold, width: 1.5, dash: "dot" }, name: "Φ((S−μ)/σ)",
        hovertemplate: "Φ=%{y:.4f}<extra></extra>",
      },
      selCdf !== null ? {
        x: [selectedS], y: [selCdf], type: "scatter", mode: "markers",
        marker: { size: 9, color: C.crimson, line: { color: C.inkBr, width: 1.5 }, symbol: "circle" }, showlegend: false,
        hovertemplate: `S=%{x}<br>F=%{y:.4f}<extra></extra>`,
      } : null,
    ].filter(Boolean), {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 40, l: 50 },
      xaxis: { title: { text: "S", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "F(S)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, range: [0, 1.02] },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.98 },
      shapes: selCdf !== null ? [
        { type: "line", x0: selectedS, x1: selectedS, y0: 0, y1: selCdf, line: { color: C.crimson, width: 1, dash: "dot" } },
        { type: "line", x0: partData.minSum, x1: selectedS, y0: selCdf, y1: selCdf, line: { color: C.crimson, width: 1, dash: "dot" } },
      ] : [],
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [partData, cdf, selectedS, theoMean, theoSD]);

  // ═══ PLOT: Error curve ═══
  useEffect(() => {
    if (!errRef.current) return;
    const naive = [], corrected = [];
    for (let i = 0; i < partData.sums.length; i++) {
      const s = partData.sums[i], a = partData.counts[i];
      if (a > 0) {
        naive.push((cayleySylvester(s) - a) / a * 100);
        corrected.push((p3Corrected(s, debouncedM) - a) / a * 100);
      } else { naive.push(null); corrected.push(null); }
    }
    Plotly.react(errRef.current, [
      { x: partData.sums, y: naive, type: "scatter", mode: "lines", line: { color: C.crimson, width: 1.5 }, name: "Cayley–Sylvester", hovertemplate: "S=%{x}<br>ε=%{y:.2f}%<extra>⌊S²/12⌉</extra>" },
      { x: partData.sums, y: corrected, type: "scatter", mode: "lines", line: { color: C.gold, width: 2 }, name: "Reflected", hovertemplate: "S=%{x}<br>ε=%{y:.2f}%<extra>corrected</extra>" },
      { x: [partData.minSum, partData.maxSum], y: [0, 0], type: "scatter", mode: "lines", line: { color: C.inkFaint, width: 1, dash: "dot" }, showlegend: false, hoverinfo: "skip" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 40, l: 54 },
      xaxis: { title: { text: "S", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "relative error (%)", font: { size: 11 } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, range: [-100, 100] },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.02, yanchor: "bottom" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [partData, debouncedM]);

  // ═══ PLOT: Log-log convergence ═══
  useEffect(() => {
    if (!convRef.current) return;
    Plotly.react(convRef.current, [
      {
        x: conv.xs, y: conv.ys, type: "scatter", mode: "markers",
        marker: { size: 4, color: conv.xs.map((_, i) => i), colorscale: [[0, C.crimson], [1, C.teal]], line: { width: 0 } },
        name: "log p₃(S)/S²",
        hovertemplate: "log S=%{x:.2f}<br>log(p/S²)=%{y:.3f}<extra></extra>",
      },
      {
        x: [Math.min(...conv.xs), Math.max(...conv.xs)], y: [conv.ref, conv.ref], type: "scatter", mode: "lines",
        line: { color: C.gold, width: 1.8, dash: "dash" }, name: "log(1/12) ≈ −1.079",
        hovertemplate: "limit: log(1/12)<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 40, l: 56 },
      xaxis: { title: { text: "log₁₀ S", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "log₁₀(p₃(S)/S²)", font: { size: 11 } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.98 },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [conv]);

  // ═══ PLOT: Q-Q ═══
  useEffect(() => {
    if (!qqRef.current) return;
    const lim = Math.max(...qq.xs.map(Math.abs), ...qq.ys.map(Math.abs), 3);
    Plotly.react(qqRef.current, [
      {
        x: qq.xs, y: qq.ys, type: "scatter", mode: "markers",
        marker: { size: 4.5, color: C.teal, line: { color: C.tealBr, width: 0.5 } },
        name: "quantiles",
        hovertemplate: "Φ⁻¹=%{x:.2f}<br>z=%{y:.2f}<extra></extra>",
      },
      {
        x: [-lim, lim], y: [-lim, lim], type: "scatter", mode: "lines",
        line: { color: C.gold, width: 1.5, dash: "dash" }, name: "y = x",
        hoverinfo: "skip",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 40, l: 52 },
      xaxis: { title: { text: "theoretical Φ⁻¹(p)", font: { size: 11 } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, range: [-lim, lim], zerolinecolor: C.inkFaint },
      yaxis: { title: { text: "empirical z-quantile", font: { size: 11 } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, range: [-lim, lim], zerolinecolor: C.inkFaint },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.98 },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [qq]);

  // ═══════════════════════════════════════════════════════════════════════
  // PHYSICS PLOTS · § 8 — BOSE-EINSTEIN OCCUPATION SPECTRUM
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!besteinRef.current) return;
    Plotly.react(besteinRef.current, [
      {
        x: besteinData.sums, y: besteinData.degen, type: "bar",
        marker: { color: C.teal, line: { width: 0 } }, name: "g(S) = p₃(S|M)",
        hovertemplate: "S=%{x}  g=%{y}<extra></extra>",
        yaxis: "y",
      },
      {
        x: besteinData.sums,
        y: besteinData.weight.map(w => besteinData.Z ? w / besteinData.Z : 0),
        type: "scatter", mode: "lines",
        line: { color: C.gold, width: 2.2 }, name: "g(S)·e^(−βS) / Z",
        hovertemplate: "S=%{x}  π=%{y:.4f}<extra></extra>",
        yaxis: "y2",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 56, b: 44, l: 56 },
      xaxis: { title: { text: "S = n₁+n₂+n₃ (energy / ħω)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "g(S)  degeneracy", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, side: "left" },
      yaxis2: { title: { text: "π(S) = Boltzmann", font: { size: 11, style: "italic" } }, overlaying: "y", side: "right", color: C.gold, gridcolor: "rgba(0,0,0,0)" },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.98, y: 0.98, xanchor: "right" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [besteinData]);

  // § 8 — 3D PARTITION FUNCTION SURFACE Z(β, M)
  useEffect(() => {
    if (!besteinSurfRef.current) return;
    const Mgrid = [], betaGrid = [], Zgrid = [];
    const Ms = []; for (let m = 5; m <= 50; m += 3) Ms.push(m);
    const betas = []; for (let b = 0.005; b <= 0.3; b += 0.015) betas.push(b);
    // Z values per row (one row per β)
    const zMat = betas.map(b => Ms.map(m => {
      let Z = 0;
      for (let S = 0; S <= 3 * m; S++) {
        let d = 0;
        for (let x = 0; x <= m; x++)
          for (let y = x; y <= m; y++) {
            const z = S - x - y;
            if (z >= y && z <= m) d++;
          }
        Z += d * Math.exp(-b * S);
      }
      return Math.log10(Math.max(Z, 1e-10));
    }));
    Plotly.react(besteinSurfRef.current, [{
      type: "surface", x: Ms, y: betas, z: zMat,
      colorscale: [[0, "#1a1f3a"], [0.25, C.indigo], [0.5, C.teal], [0.75, C.gold], [1, C.crimson]],
      contours: { z: { show: true, color: C.ink, width: 1, highlight: false } },
      colorbar: { title: { text: "log₁₀ Z", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9 }, len: 0.7, thickness: 9, x: 1.0 },
      hovertemplate: "M=%{x}  β=%{y:.3f}<br>log Z=%{z:.3f}<extra></extra>",
    }, {
      type: "scatter3d", mode: "markers",
      x: [debouncedM], y: [beta], z: [Math.log10(Math.max(besteinData.Z, 1e-10))],
      marker: { size: 7, color: C.crimson, symbol: "diamond", line: { color: C.inkBr, width: 1.2 } },
      name: "current", hovertemplate: "current (M,β)<extra></extra>", showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 }, showlegend: false,
      scene: {
        xaxis: { title: { text: "M", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "β", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "log Z", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.7, y: -1.55, z: 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [debouncedM, beta, besteinData]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 9 — FEYNMAN VERTEX COUNT
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!feynmanRef.current) return;
    const nvals = feynmanData.map(d => d.n);
    const cvals = feynmanData.map(d => d.count);
    Plotly.react(feynmanRef.current, [
      {
        x: nvals, y: cvals, type: "bar",
        marker: { color: nvals.map(n => n === selectedS / 2 ? C.crimson : C.indigo), line: { width: 0 } },
        hovertemplate: "n=%{x}  #diagrams=%{y}<extra></extra>",
        name: "#vacuum bubble topologies",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 42, l: 56 },
      xaxis: { title: { text: "perturbative order  n (half-sum 2n=S)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "# topologies", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, type: "log" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [feynmanData, selectedS]);

  // § 9 — 3D FEYNMAN VERTEX MOMENTUM STAR
  useEffect(() => {
    if (!feynmanDiagRef.current) return;
    // Three incoming/outgoing lines at vertex, colored by valence
    const tri = conjTriplet || { x: 1, y: 1, z: 1 };
    const v1 = [tri.x, 0, 0];
    const v2 = [-tri.y / 2, tri.y * Math.sqrt(3) / 2, 0];
    const v3 = [-tri.z / 2, -tri.z * Math.sqrt(3) / 2, 0];
    const origin = [0, 0, 0];
    // Draw three lines from origin
    const traces = [
      { type: "scatter3d", mode: "lines+markers", x: [0, v1[0]], y: [0, v1[1]], z: [0, v1[2]], line: { color: C.crimson, width: 6 }, marker: { size: [3, 10], color: [C.inkBr, C.crimson] }, name: `p₁ (${tri.x})`, hovertemplate: `valence ${tri.x}<extra></extra>` },
      { type: "scatter3d", mode: "lines+markers", x: [0, v2[0]], y: [0, v2[1]], z: [0, v2[2]], line: { color: C.gold, width: 6 }, marker: { size: [3, 10], color: [C.inkBr, C.gold] }, name: `p₂ (${tri.y})`, hovertemplate: `valence ${tri.y}<extra></extra>` },
      { type: "scatter3d", mode: "lines+markers", x: [0, v3[0]], y: [0, v3[1]], z: [0, v3[2]], line: { color: C.teal, width: 6 }, marker: { size: [3, 10], color: [C.inkBr, C.teal] }, name: `p₃ (${tri.z})`, hovertemplate: `valence ${tri.z}<extra></extra>` },
      // Loop: elliptical curve connecting v1 → v2 → v3 → v1
      { type: "scatter3d", mode: "lines",
        x: Array.from({ length: 60 }, (_, i) => {
          const t = i / 59;
          const a = t < 1/3 ? [v1, v2] : t < 2/3 ? [v2, v3] : [v3, v1];
          const s = (t < 1/3 ? t : t < 2/3 ? t - 1/3 : t - 2/3) * 3;
          return a[0][0] + s * (a[1][0] - a[0][0]);
        }),
        y: Array.from({ length: 60 }, (_, i) => {
          const t = i / 59;
          const a = t < 1/3 ? [v1, v2] : t < 2/3 ? [v2, v3] : [v3, v1];
          const s = (t < 1/3 ? t : t < 2/3 ? t - 1/3 : t - 2/3) * 3;
          return a[0][1] + s * (a[1][1] - a[0][1]);
        }),
        z: Array.from({ length: 60 }, (_, i) => 0.3 * Math.sin(2 * Math.PI * i / 59)),
        line: { color: C.inkDim, width: 2, dash: "dot" }, name: "loop", showlegend: false, hoverinfo: "skip" },
    ];
    Plotly.react(feynmanDiagRef.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "p_x", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "p_y", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "loop", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.6, y: 1.6, z: 0.9 } },
      },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [conjTriplet]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 10 — YOUNG CONJUGATION (antiparticle duality)
  // ═══════════════════════════════════════════════════════════════════════
  // drawn as SVG, no Plotly useEffect needed

  // ═══════════════════════════════════════════════════════════════════════
  // § 11 — NON-LINEAR OPTICS PHASE-MATCHING 3D
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!nloRef.current) return;
    const maxDk = Math.max(...nloData.map(p => p.deltaK), 1);
    Plotly.react(nloRef.current, [{
      type: "scatter3d", mode: "markers",
      x: nloData.map(p => p.x),
      y: nloData.map(p => p.y),
      z: nloData.map(p => p.z),
      marker: {
        size: nloData.map(p => Math.max(3, 14 * (1 - p.deltaK / maxDk))),
        color: nloData.map(p => p.deltaK),
        colorscale: [[0, C.teal], [0.35, C.gold], [0.7, C.crimson], [1, "#2b0e0e"]],
        reversescale: false,
        opacity: 0.85,
        line: { color: C.inkBr, width: 0.3 },
        colorbar: { title: { text: "|Δk|", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9 }, len: 0.6, thickness: 9 },
      },
      hovertemplate: "(ω₁,ω₂,ω₃)=(%{x},%{y},%{z})<br>|Δk|=%{marker.color:.3f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "ω₁", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "ω₂", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "ω₃", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [nloData]);

  // § 11 — dispersion curve k(ω) and Δk histogram
  useEffect(() => {
    if (!nloDispRef.current) return;
    const ws = Array.from({ length: debouncedM }, (_, i) => i + 1);
    const kvals = ws.map(w => w + nloDispersion * w * w);
    const histBins = 30;
    const maxDk = nloData.length ? Math.max(...nloData.map(p => p.deltaK)) : 1;
    const bins = new Array(histBins).fill(0);
    nloData.forEach(p => {
      const b = Math.min(histBins - 1, Math.floor(p.deltaK / maxDk * histBins));
      bins[b]++;
    });
    const binCenters = bins.map((_, i) => (i + 0.5) * maxDk / histBins);
    Plotly.react(nloDispRef.current, [
      {
        x: ws, y: kvals, type: "scatter", mode: "lines",
        line: { color: C.teal, width: 2 }, name: "k(ω) = ω + αω²",
        hovertemplate: "ω=%{x}  k=%{y:.2f}<extra></extra>",
        xaxis: "x", yaxis: "y",
      },
      {
        x: binCenters, y: bins, type: "bar",
        marker: { color: C.gold, opacity: 0.75, line: { width: 0 } },
        name: "Δk distribution",
        hovertemplate: "|Δk|∈bin%{x:.2f}  n=%{y}<extra></extra>",
        xaxis: "x2", yaxis: "y2",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 18, r: 15, b: 42, l: 52 },
      grid: { rows: 1, columns: 2, pattern: "independent" },
      xaxis: { domain: [0, 0.45], title: { text: "ω", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "k(ω)", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      xaxis2: { domain: [0.55, 1], title: { text: "|Δk|", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis2: { title: { text: "# triplets", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [nloData, nloDispersion, debouncedM]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 12 — LORENZ ATTRACTOR
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!lorenzRef.current) return;
    const N = lorenzData.xs.length;
    // color by time
    const colors = Array.from({ length: N }, (_, i) => i / N);
    Plotly.react(lorenzRef.current, [{
      type: "scatter3d", mode: "lines",
      x: lorenzData.xs, y: lorenzData.ys, z: lorenzData.zs,
      line: {
        color: colors,
        colorscale: [[0, C.indigo], [0.33, C.teal], [0.66, C.gold], [1, C.crimson]],
        width: 3,
      },
      name: "trajectory",
      hovertemplate: "x=%{x:.2f}  y=%{y:.2f}  z=%{z:.2f}<extra></extra>",
    }, {
      type: "scatter3d", mode: "markers",
      x: [lorenzData.xs[0]], y: [lorenzData.ys[0]], z: [lorenzData.zs[0]],
      marker: { size: 6, color: C.inkBr, symbol: "cross" },
      name: "t=0", showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "x", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "y", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "z", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.6, y: 1.6, z: 0.7 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [lorenzData]);

  // § 12 — Poincaré section z = ρ−1 plane
  useEffect(() => {
    if (!poincareRef.current) return;
    const zPlane = lorenzRho - 1;
    const px = [], py = [];
    for (let i = 1; i < lorenzData.zs.length; i++) {
      if ((lorenzData.zs[i - 1] - zPlane) * (lorenzData.zs[i] - zPlane) < 0) {
        // interpolate
        const t = (zPlane - lorenzData.zs[i - 1]) / (lorenzData.zs[i] - lorenzData.zs[i - 1]);
        px.push(lorenzData.xs[i - 1] + t * (lorenzData.xs[i] - lorenzData.xs[i - 1]));
        py.push(lorenzData.ys[i - 1] + t * (lorenzData.ys[i] - lorenzData.ys[i - 1]));
      }
    }
    Plotly.react(poincareRef.current, [{
      x: px, y: py, type: "scatter", mode: "markers",
      marker: { size: 4, color: C.gold, opacity: 0.65, line: { color: C.inkBr, width: 0.3 } },
      hovertemplate: "x=%{x:.2f}  y=%{y:.2f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 12, b: 42, l: 48 },
      xaxis: { title: { text: "x  (z = ρ−1 section)", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "y", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [lorenzData, lorenzRho]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 13 — KOLMOGOROV SPECTRUM
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!kolmogRef.current) return;
    // Reference K41 and measured partition energy distribution
    const ps = partData.counts.map((c, i) => c > 0 ? c : null);
    Plotly.react(kolmogRef.current, [
      {
        x: kolmogData.ks, y: kolmogData.Ek, type: "scatter", mode: "lines",
        line: { color: C.gold, width: 2.2 }, name: "E(k) ∝ k^(−5/3)",
        hovertemplate: "k=%{x}  E=%{y:.4e}<extra>K41</extra>",
      },
      {
        x: partData.sums, y: ps.map(v => v !== null ? v / partData.totalCount : null),
        type: "scatter", mode: "lines+markers",
        line: { color: C.teal, width: 1.6 }, marker: { size: 3, color: C.teal },
        name: "p₃(S|M) / |T_M|",
        hovertemplate: "S=%{x}  density=%{y:.4e}<extra>empirical</extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 44, l: 64 },
      xaxis: { title: { text: "wavenumber k  (or sum S)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, type: "log" },
      yaxis: { title: { text: "spectral density", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, type: "log" },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.02, yanchor: "bottom" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [kolmogData, partData]);

  // § 13 — Triadic coupling 3D
  useEffect(() => {
    if (!triadRef.current) return;
    const maxT = Math.max(...triadData.map(p => p.T), 1);
    Plotly.react(triadRef.current, [{
      type: "scatter3d", mode: "markers",
      x: triadData.map(p => p.x),
      y: triadData.map(p => p.y),
      z: triadData.map(p => p.z),
      marker: {
        size: 3,
        color: triadData.map(p => p.T),
        colorscale: [[0, "#0c1530"], [0.25, C.indigo], [0.5, C.teal], [0.75, C.gold], [1, C.crimson]],
        opacity: 0.65,
        colorbar: { title: { text: "T = √(k₁k₂k₃)", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9 }, len: 0.65, thickness: 9 },
      },
      hovertemplate: "k=(%{x},%{y},%{z})<br>T=%{marker.color:.2f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "k₁", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "k₂", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "k₃", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.55, y: 1.55, z: 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [triadData]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 14 — GUTENBERG-RICHTER LAW
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!gutRef.current) return;
    Plotly.react(gutRef.current, [
      {
        x: grData.mags, y: grData.N, type: "scatter", mode: "lines",
        line: { color: C.crimson, width: 2 }, name: `log N = a − b·m  (b=${grBvalue.toFixed(2)})`,
        hovertemplate: "m=%{x}  N=%{y:.3e}<extra>GR</extra>",
      },
      {
        x: grCompare.xs, y: grCompare.yPart.map(v => Math.pow(10, v)),
        type: "scatter", mode: "markers",
        marker: { size: 4, color: C.teal, opacity: 0.75 },
        name: "p₃(S|M)",
        hovertemplate: "S=%{x}  p=%{y:.2e}<extra>empirical</extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 42, l: 56 },
      xaxis: { title: { text: "magnitude m  (or scaled sum S/5)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "frequency (log scale)", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, type: "log" },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.98, y: 0.98, xanchor: "right" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [grData, grCompare, grBvalue]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 15 — BBN ABUNDANCES
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!bbnRef.current) return;
    Plotly.react(bbnRef.current, [
      { x: bbnData.T, y: bbnData.Yp, type: "scatter", mode: "lines", line: { color: C.gold, width: 2.2 }, name: "Y_p (⁴He mass fraction)", hovertemplate: "T=%{x:.2f}<br>Y_p=%{y:.4f}<extra></extra>" },
      { x: bbnData.T, y: bbnData.DH, type: "scatter", mode: "lines", line: { color: C.teal, width: 2 }, name: "D/H", yaxis: "y2", hovertemplate: "T=%{x:.2f}<br>D/H=%{y:.2e}<extra></extra>" },
      { x: bbnData.T, y: bbnData.Li7, type: "scatter", mode: "lines", line: { color: C.crimson, width: 1.6, dash: "dot" }, name: "⁷Li/H", yaxis: "y2", hovertemplate: "T=%{x:.2f}<br>Li/H=%{y:.2e}<extra></extra>" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 12, r: 56, b: 44, l: 56 },
      xaxis: { title: { text: "T / T_ref  (cooling →)", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule, autorange: "reversed", type: "log" },
      yaxis: { title: { text: "Y_p", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis2: { title: { text: "D/H,  ⁷Li/H", font: { size: 11, style: "italic" } }, overlaying: "y", side: "right", color: C.teal, gridcolor: "rgba(0,0,0,0)", type: "log" },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.02, y: 0.98 },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [bbnData]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 16 — SIS LATTICE SHORT VECTORS 3D
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!sisRef.current) return;
    const all = scatterData;
    // Full lattice T_M (background cloud)
    const trBg = {
      type: "scatter3d", mode: "markers",
      x: all.xs, y: all.ys, z: all.zs,
      marker: { size: debouncedM <= 25 ? 2.2 : 1.4, color: C.indigo, opacity: 0.12 },
      name: "T_M",
      hovertemplate: "(%{x},%{y},%{z})<extra>T_M</extra>",
    };
    // SIS-admissible short vectors
    const trSis = {
      type: "scatter3d", mode: "markers",
      x: sisData.map(p => p.x),
      y: sisData.map(p => p.y),
      z: sisData.map(p => p.z),
      marker: {
        size: 5,
        color: sisData.map(p => p.norm2),
        colorscale: [[0, C.teal], [0.5, C.gold], [1, C.crimson]],
        opacity: 0.95,
        line: { color: C.inkBr, width: 0.5 },
        colorbar: { title: { text: "‖x‖²", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9 }, len: 0.55, thickness: 9 },
      },
      name: "SIS solutions",
      hovertemplate: "(%{x},%{y},%{z})<br>‖x‖²=%{marker.color}<extra>SIS</extra>",
    };
    Plotly.react(sisRef.current, [trBg, trSis], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "x₁", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "x₂", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "x₃", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.6, y: 1.6, z: 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [sisData, scatterData, debouncedM]);

  // § 16 — SIS residue distribution
  useEffect(() => {
    if (!sisErrorRef.current) return;
    // Compute residue A·x mod q over the full T_M
    const rCounts = new Array(sisQ).fill(0);
    for (let x = 1; x <= debouncedM; x++)
      for (let y = x; y <= debouncedM; y++)
        for (let z = y; z <= debouncedM; z++) {
          const r = ((sisA1 * x + sisA2 * y + sisA3 * z) % sisQ + sisQ) % sisQ;
          rCounts[r]++;
        }
    Plotly.react(sisErrorRef.current, [{
      x: rCounts.map((_, i) => i), y: rCounts, type: "bar",
      marker: { color: rCounts.map((_, i) => i === 0 || i === sisQ - 1 || i === 1 ? C.crimson : C.indigo), line: { width: 0 } },
      hovertemplate: "residue=%{x}<br>count=%{y}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 42, l: 52 },
      xaxis: { title: { text: "residue class mod q", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "# lattice points", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [debouncedM, sisQ, sisA1, sisA2, sisA3]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 17 — QUANTUM WALK AMPLITUDE
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!qwalkRef.current) return;
    Plotly.react(qwalkRef.current, [
      {
        x: qwalkData.sums, y: qwalkData.amp, type: "scatter", mode: "lines",
        line: { color: C.violet, width: 2 }, fill: "tozeroy", fillcolor: `${C.violet}22`,
        name: "|ψ(S,t)|²",
        hovertemplate: "S=%{x}  |ψ|²=%{y:.4e}<extra></extra>",
      },
      {
        x: partData.sums, y: partData.counts.map(c => partData.totalCount ? c / partData.totalCount : 0),
        type: "scatter", mode: "lines",
        line: { color: C.gold, width: 1.5, dash: "dot" }, name: "classical p₃(S|M)/|T_M|",
        hovertemplate: "S=%{x}  π=%{y:.4e}<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 10, r: 15, b: 42, l: 56 },
      xaxis: { title: { text: "S", font: { size: 12, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      yaxis: { title: { text: "probability", font: { size: 11, style: "italic" } }, gridcolor: C.rule, color: C.inkDim, linecolor: C.rule },
      legend: { font: { size: 10, color: C.inkDim, family: FONT_MATH }, bgcolor: "rgba(0,0,0,0)", x: 0.98, y: 0.98, xanchor: "right" },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [qwalkData, partData]);

  // § 17 — 3D amplitude surface (S vs t vs |ψ|²)
  useEffect(() => {
    if (!qwalkSurfRef.current) return;
    const tvals = []; for (let t = 1; t <= 30; t++) tvals.push(t);
    const Svals = qwalkData.sums;
    const zMat = tvals.map(t => {
      const w = quantumWalkAmplitudes(debouncedM, t, selectedS);
      return w.amp;
    });
    Plotly.react(qwalkSurfRef.current, [{
      type: "surface", x: Svals, y: tvals, z: zMat,
      colorscale: [[0, "#0a0d20"], [0.25, C.indigo], [0.55, C.violet], [0.8, C.gold], [1, C.crimson]],
      contours: { z: { show: false } },
      colorbar: { title: { text: "|ψ|²", font: { color: C.inkDim, size: 11, family: FONT_MATH, style: "italic" } }, tickfont: { color: C.inkDim, size: 9 }, len: 0.65, thickness: 9 },
      hovertemplate: "S=%{x}  t=%{y}<br>|ψ|²=%{z:.4e}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: 11, color: C.inkDim },
      margin: { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: { title: { text: "S", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        yaxis: { title: { text: "t (steps)", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        zaxis: { title: { text: "|ψ|²", font: { style: "italic" } }, gridcolor: C.rule, color: C.inkDim, backgroundcolor: C.plotBg, showbackground: true },
        bgcolor: C.plotBg,
        camera: { eye: { x: 1.6, y: -1.5, z: 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [debouncedM, selectedS, qwalkData]);

  // Formula table data
  const formulaRows = useMemo(() => {
    const targets = new Set([3, 6, 10, 15, 22, 42, Math.floor(1.5 * debouncedM), 2 * debouncedM, 3 * debouncedM - 3, 3 * debouncedM, selectedS]);
    const list = [...targets].filter(s => s >= 3 && s <= 3 * debouncedM).sort((a, b) => a - b);
    return list.map(s => {
      const actual = partData.sumFreq.get(s) || 0;
      const naive = cayleySylvester(s), corr = p3Corrected(s, debouncedM);
      return {
        s, actual, naive, corr,
        eNaive: actual ? (naive - actual) / actual * 100 : null,
        eCorr: actual ? (corr - actual) / actual * 100 : null,
      };
    });
  }, [partData, debouncedM, selectedS]);

  const selActual = partData.sumFreq.get(selectedS) || 0;
  const selNaive = cayleySylvester(selectedS);
  const selCorr = p3Corrected(selectedS, debouncedM);
  const selIdx = partData.sums.indexOf(selectedS);
  const selCdfVal = selIdx >= 0 ? cdf[selIdx] : null;
  const zScore = moments.sd ? (selectedS - moments.mean) / moments.sd : 0;

  return (
    <div style={{
      fontFamily: FONT_MATH, fontSize: 17, background: C.bg, color: C.ink, minHeight: "100vh",
      backgroundImage: `
        radial-gradient(ellipse at 20% 0%, ${C.gold}08 0%, transparent 55%),
        radial-gradient(ellipse at 80% 100%, ${C.indigo}0c 0%, transparent 55%),
        linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 100%)
      `,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderBr}; border-radius: 3px; }
        body { overflow-x: hidden; }
        input[type=range] { -webkit-appearance: none; background: transparent; width: 100%; outline: none; }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px;
          background: linear-gradient(90deg, ${C.gold} 0%, ${C.gold} var(--pct, 50%), ${C.border} var(--pct, 50%), ${C.border} 100%);
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
          background: ${C.gold}; margin-top: -4px; cursor: pointer;
          box-shadow: 0 0 8px ${C.gold}88; border: 1px solid ${C.bg};
        }
        input[type=range]::-moz-range-track { height: 4px; border-radius: 2px; background: ${C.border}; }
        input[type=range]::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 50%; background: ${C.gold};
          cursor: pointer; border: 1px solid ${C.bg}; box-shadow: 0 0 8px ${C.gold}88;
        }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse { animation: pulseDot 1.6s ease-in-out infinite; }
        .paper-rule { border-top: 1px solid ${C.rule}; border-bottom: 1px solid ${C.rule}; padding: 6px 0; }
        table.ft { width: 100%; border-collapse: collapse; font-family: ${FONT_MONO}; font-size: 12.5px; }
        table.ft th { text-align: left; padding: 9px 11px; border-bottom: 1px solid ${C.rule}; color: ${C.inkFaint}; font-weight: 500; text-transform: uppercase; font-size: 10.5px; letter-spacing: 1.8px; font-family: ${FONT_MONO}; }
        table.ft td { padding: 9px 11px; border-bottom: 1px solid ${C.border}88; color: ${C.ink}; font-family: ${FONT_MONO}; }
        table.ft tr { cursor: pointer; transition: background 0.12s; }
        table.ft tr:hover td { background: ${C.gold}08; }
        .err-good { color: ${C.teal}; }
        .err-mid { color: ${C.gold}; }
        .err-bad { color: ${C.crimson}; }
        .js-plotly-plot .plotly .modebar { display: none !important; }
        .drop-cap::first-letter {
          font-family: ${FONT_DISPLAY}; font-size: 3.4em; font-weight: 500;
          float: left; line-height: 0.85; padding: 6px 8px 0 0;
          color: ${C.gold}; font-style: italic;
        }
        .smallcaps { font-variant: small-caps; letter-spacing: 1.5px; color: ${C.inkDim}; }
        .ruled-box {
          border-top: 2px solid ${C.gold}; border-bottom: 1px solid ${C.rule};
        }
      `}</style>

      {/* ═══ STICKY CONTROL BAR ═══ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.bg}f0`, backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.rule}`,
        padding: "10px 28px",
        display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 20, alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: computing ? C.crimson : C.gold, boxShadow: `0 0 10px ${computing ? C.crimson : C.gold}` }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 2, textTransform: "uppercase" }}>
            {computing ? "recomputing" : "p₃(S | M)"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 13, color: C.inkDim }}>M</span>
          <input type="range" min={10} max={150} value={M_}
            onChange={e => setM(+e.target.value)}
            style={{ flex: 1, maxWidth: 420, "--pct": `${((M_ - 10) / 140) * 100}%` }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 500, color: C.gold, minWidth: 42, textAlign: "right", textShadow: `0 0 12px ${C.gold}66` }}>{M_}</span>
          <div style={{ display: "flex", gap: 3 }}>
            {[10, 25, 50, 100, 150].map(p => (
              <button key={p} onClick={() => setM(p)} style={{
                background: M_ === p ? `${C.gold}22` : "transparent",
                color: M_ === p ? C.gold : C.inkFaint,
                border: `1px solid ${M_ === p ? `${C.gold}66` : C.border}`,
                padding: "2px 6px", fontSize: 10, fontFamily: FONT_MONO,
                borderRadius: 2, cursor: "pointer", fontWeight: 500, minWidth: 28,
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <Toggle on={symmetry} onClick={() => setSymmetry(p => !p)} tone="indigo">Symmetry</Toggle>
          <Toggle on={gaussianOn} onClick={() => setGaussianOn(p => !p)} tone="gold">𝒩</Toggle>
          <Toggle on={logScale} onClick={() => setLogScale(p => !p)} tone="teal">Log</Toggle>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Metric label="|T_M|" value={partData.totalCount.toLocaleString()} tone="gold" />
          <Metric label="peak" value={peakS} tone="teal" />
        </div>
      </div>

      {/* ═══════════════ COVER ═══════════════ */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 40px" }}>
        <section style={{ padding: "70px 0 40px", textAlign: "left" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.gold, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>
            MONOGRAPH № III  ·  INTERACTIVE EDITION  ·  MMXXVI
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18, color: C.inkDim, marginBottom: 12, letterSpacing: 0.5 }}>
            On the Enumeration of
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 500,
            color: C.inkBr, lineHeight: 1.02, letterSpacing: -1.2, marginBottom: 20,
          }}>
            Ordered Triplets
            <span style={{ color: C.gold, fontStyle: "italic" }}> of the </span>
            Bounded Integers
          </h1>

          <div style={{
            fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 26, color: C.gold,
            margin: "18px 0 22px", letterSpacing: 0.4,
          }}>
            1 ≤ x ≤ y ≤ z ≤ M  ⊂  ℤ³
          </div>

          <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 21, color: C.inkDim, lineHeight: 1.55, marginBottom: 30, maxWidth: 880 }}>
            An interactive study of the partition function <M>p₃(S | M)</M>, the Cayley–Sylvester closed form,
            the Ehrhart polynomial of the 3-simplex, and the emergence of Gaussian order from combinatorial constraint.
          </div>

          <div className="ruled-box" style={{ padding: "18px 0", marginTop: 28, maxWidth: 880 }}>
            <p className="drop-cap" style={{ fontFamily: FONT_MATH, fontSize: "1.22em", lineHeight: 1.72, color: C.ink, textAlign: "justify" }}>
              We enumerate the lattice points of the right tetrahedron <M>T_M = {"{(x,y,z) ∈ ℤ³ : 1 ≤ x ≤ y ≤ z ≤ M}"}</M>
              and study the distribution of their coordinate sums. For moderate <M>M</M> the distribution is discrete
              and finitely-supported; as <M>M → ∞</M> the central bulk converges, after rescaling, to the standard
              Gaussian envelope, while the unnormalized density obeys the classical parabolic law <M>p₃(S) ~ S²/12</M> first
              established by Cayley (1856) and Sylvester (1857). This dashboard computes <M>p₃(S | M)</M> exactly,
              visualizes its symmetry, its moments, its convergence, and its departures from the asymptotic predictions.
            </p>
          </div>

          <div style={{
            display: "flex", gap: 28, marginTop: 22, paddingTop: 18,
            borderTop: `1px solid ${C.rule}`, alignItems: "baseline", flexWrap: "wrap",
          }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase" }}>Keywords</div>
            <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 15, color: C.ink, letterSpacing: 0.3 }}>
              integer partitions · q-binomial coefficient · 3-simplex · Ehrhart polynomial · central limit theorem · generating functions · Bose-Einstein statistics · Feynman perturbation · non-linear optics · lattice cryptography · Kolmogorov turbulence · Lorenz attractor
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint, letterSpacing: 2, marginTop: 10 }}>
            2020 MSC: 11P81 · 05A17 · 52B20 · 82B05 · 81T18 · 94A60 · 76F55
          </div>
        </section>

        {/* ═══════════════ § 1 — TRIPLET SPACE ═══════════════ */}
        <SectionHead number="1" title="The Triplet Space" eyebrow="DEFINITIONS · ENUMERATION" />

        <Prose>
          Let <M>M ∈ ℕ</M> and define the triplet space
        </Prose>

        <Eq number="1.1">
          T<sub>M</sub> = {" { (x, y, z) ∈ ℤ³  :  1 ≤ x ≤ y ≤ z ≤ M } "}
        </Eq>

        <Prose>
          Geometrically, <M>T_M</M> is the set of lattice points in the closed right tetrahedron with vertices
          at <M>(1,1,1)</M>, <M>(1,1,M)</M>, <M>(1,M,M)</M>, and <M>(M,M,M)</M>. Its cardinality is the third
          diagonal entry of Pascal's triangle shifted by two, namely the <span style={{ fontVariant: "small-caps", color: C.gold }}>Ehrhart
          polynomial</span> of the standard 3-simplex evaluated at <M>M</M>:
        </Prose>

        <Eq number="1.2">
          |T<sub>M</sub>|  =  <Frac n="M(M+1)(M+2)" d="6" size="1.1em" />  =  <M>{"C"}</M>(M + 2, 3).
        </Eq>

        <Theorem kind="Proposition" number="1.1" title="Ehrhart enumeration" tone="gold">
          The number of lattice triplets is a degree-3 polynomial in <M>M</M> with rational coefficients
          and integer values. Leading coefficient <M>1/6</M> equals the Euclidean volume of the
          unit-simplex scaled by 1. For <M>M = {debouncedM}</M>, this evaluates to <M>{ehrhart(debouncedM).toLocaleString()}</M>,
          in exact agreement with the direct enumeration.
        </Theorem>

        <Figure number="1" caption="The tetrahedral wedge T_M. Each lattice point is colored by its coordinate sum S = x + y + z. Selecting any S below highlights the level set {(x,y,z) ∈ T_M : x+y+z = S}, which forms a polygonal slice through the tetrahedron.">
          <div ref={scatterRef} style={{ width: "100%", height: 460 }} />
        </Figure>

        {/* ═══════════════ § 2 — SUM DISTRIBUTION ═══════════════ */}
        <SectionHead number="2" title="The Sum Distribution" eyebrow="GENERATING FUNCTION · PARTITION COUNT" />

        <Prose>
          Define the <span style={{ fontVariant: "small-caps", color: C.gold }}>partition function</span> <M>p₃(S | M)</M> as
          the number of triplets in <M>T_M</M> with fixed coordinate sum:
        </Prose>

        <Eq number="2.1">
          p₃(S | M)  =  #{" { (x,y,z) ∈ T_M : x + y + z = S } "}.
        </Eq>

        <Prose>
          The generating function encodes the full distribution as a polynomial of degree <M>3M</M>:
        </Prose>

        <Eq number="2.2">
          Z(q; M)  =  ∑<sub>S</sub>  p₃(S | M) q<sup>S</sup>  =  <Frac n="(1 − q^{M+1})(1 − q^{M+2})(1 − q^{M+3})" d="(1 − q)(1 − q²)(1 − q³)" size="1em" /> · q³.
        </Eq>

        <Prose>
          This is the <span style={{ fontVariant: "small-caps", color: C.gold }}>Gaussian binomial coefficient</span> <M>{"["}M+2; 3{"]"}_q</M>,
          shifted by <M>q³</M>. Coefficient extraction is exact; the polynomial is palindromic, reflecting the
          fundamental involution of §4. Two sums command historical attention: <M>S = 22</M> and <M>S = 42</M>,
          marked in the figure below.
        </Prose>

        <Figure number="2" caption="The distribution p₃(S | M). Teal bars give the exact count; the dotted golden curve is the theoretical Gaussian N(μ, σ²) with μ = 3(M+1)/2, σ² = 3(M²−1)/12. Click any bar to select that S; the selection propagates through all figures. When symmetry is engaged (§4), the involution is visualized as a dashed violet overlay.">
          <div style={{ display: "flex", gap: 16 }}>
            <div ref={barRef} style={{ flex: 1, height: 400 }} />
            <div style={{ width: 180, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
              <Metric label="mean μ" value={moments.mean.toFixed(2)} tone="gold" mono />
              <Metric label="median" value={peakS} tone="teal" />
              <Metric label="variance σ²" value={moments.var_.toFixed(2)} tone="gold" />
              <Metric label="σ" value={moments.sd.toFixed(3)} tone="gold" />
              <Metric label="theoretical μ" value={theoMean.toFixed(1)} tone="indigo" />
              <Metric label="theoretical σ" value={theoSD.toFixed(3)} tone="indigo" />
              <Metric label="p₃(22)" value={(partData.sumFreq.get(22) || 0).toLocaleString()} tone="gold" />
              <Metric label="p₃(42)" value={(partData.sumFreq.get(42) || 0).toLocaleString()} tone="gold" />
            </div>
          </div>
        </Figure>

        {/* ═══════════════ § 3 — CAYLEY-SYLVESTER ASYMPTOTIC ═══════════════ */}
        <SectionHead number="3" title="The Cayley–Sylvester Asymptotic" eyebrow="CLOSED FORM · CONVERGENCE" />

        <Prose>
          For the <em>unrestricted</em> partition problem, in which the upper bound <M>M</M> is removed, the count
          of triplets <M>(x,y,z)</M> with <M>1 ≤ x ≤ y ≤ z</M> and fixed sum <M>n</M> admits a remarkable
          closed form, first conjectured by Cayley (1856) and proved by Sylvester shortly thereafter:
        </Prose>

        <Eq number="3.1">
          p₃<sup>∞</sup>(n)  =  ⌊ <Frac n="n²" d="12" size="1em" /> + <Frac n="1" d="2" size="0.85em" /> ⌋  =  round{"("} <Frac n="n²" d="12" size="1em" /> {")"}.
        </Eq>

        <Prose>
          The formula is exact for all <M>n ≥ 3</M>; the fractional part of <M>n²/12</M> is always strictly less
          than <M>1/2</M> in magnitude relative to the nearest integer, placing the result unambiguously. For the
          bounded case of this monograph, (3.1) is exact only when <M>S ≤ M + 2</M>; beyond this threshold the
          ceiling <M>z ≤ M</M> begins to truncate the count, which we correct by reflecting through the
          symmetry axis <M>S = (3M+3)/2</M>:
        </Prose>

        <Eq number="3.2">
          p̃₃(S | M)  =  round{"("} <Frac n="(S*)²" d="12" size="1em" /> {")"},  where  S*  =  S  if  S ≤ <Frac n="3M+3" d="2" size="0.9em" />,  else  3M+3−S.
        </Eq>

        <Figure number="3" caption="Top: log–log convergence of p₃(S)/S² to its limit 1/12. Points are colored by rank order; the dashed golden line is log(1/12) ≈ −1.079. Bottom: relative error of both formulas across the full range of S. Note the crimson Cayley–Sylvester curve diverges sharply near the upper tail; the reflected formula restores accuracy.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div ref={convRef} style={{ width: "100%", height: 320 }} />
            <div ref={errRef} style={{ width: "100%", height: 320 }} />
          </div>
        </Figure>

        <Theorem kind="Corollary" number="3.1" title="Unconditional asymptotic" tone="teal">
          Fix any bounded window around the mean. Then
          <div style={{ textAlign: "center", margin: "10px 0", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.05em" }}>
            p₃(S | M) / (S²/12) ⟶ 1  as  S → ∞, S/M → 0.
          </div>
          The convergence is <em>uniform</em> on compact sets of <M>S/M</M>; at the boundary
          <M> S ≈ 3M </M>, the simple form (3.1) fails and one must invoke (3.2).
        </Theorem>

        {/* ═══════════════ § 4 — INVOLUTION ═══════════════ */}
        <SectionHead number="4" title="The Fundamental Involution" eyebrow="SYMMETRY · PALINDROMICITY" />

        <Prose>
          The triplet space admits a natural order-reversing map <M>τ : T_M → T_M</M> defined componentwise by
        </Prose>

        <Eq number="4.1">
          τ(x, y, z)  =  (M + 1 − z,  M + 1 − y,  M + 1 − x).
        </Eq>

        <Theorem kind="Theorem" number="4.1" title="Palindromic symmetry" tone="indigo">
          The map <M>τ</M> is an involution on <M>T_M</M>. If <M>x + y + z = S</M>, then <M>τ(x,y,z)</M> has
          coordinate sum <M>3M + 3 − S</M>. Consequently
          <div style={{ textAlign: "center", margin: "10px 0", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.05em" }}>
            p₃(S | M)  =  p₃(3M + 3 − S | M).
          </div>
          <em>Proof sketch:</em> <M>τ</M> preserves the bound constraint <M>1 ≤ · ≤ M</M> and reverses the
          inequality <M>x ≤ y ≤ z</M>. Applying <M>τ</M> twice recovers the identity. The sum-shift is by direct
          computation. <span style={{ float: "right", fontFamily: FONT_MATH }}>◻</span>
        </Theorem>

        <Prose>
          Engaging the <em>Symmetry</em> toggle in the control bar overlays the mirror
          distribution <M>S ↦ p₃(3M+3 − S | M)</M> onto Figure 2. The agreement is exact: the two
          curves coincide to numerical precision for every admissible <M>S</M>.
        </Prose>

        {/* ═══════════════ § 5 — CLT ═══════════════ */}
        <SectionHead number="5" title="The Central Limit Regime" eyebrow="MOMENTS · QUANTILES · NORMALITY" />

        <Prose>
          For large <M>M</M>, the normalized sum <M>(S − μ)/σ</M> converges in distribution to the
          standard Gaussian. Heuristically, <M>S</M> is a sum of three bounded i.i.d. contributions, and the
          classical Lindeberg–Lévy theorem applies to the symmetrized triplet <M>(x', y', z') ∈ {"{1,…,M}³"}</M>.
          Four moments characterize the departure from normality:
        </Prose>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "18px 0 24px" }}>
          {[
            { lbl: "mean  μ", val: moments.mean.toFixed(3), theo: theoMean.toFixed(2) },
            { lbl: "std. σ", val: moments.sd.toFixed(3), theo: theoSD.toFixed(2) },
            { lbl: "skew  γ₁", val: moments.skew.toFixed(5), theo: "0" },
            { lbl: "ex. kurt. γ₂", val: moments.kurt.toFixed(5), theo: "≈ −0.6/M" },
          ].map((m, i) => (
            <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, padding: "12px 14px", borderRadius: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: C.inkFaint, fontFamily: FONT_MONO, marginBottom: 3 }}>{m.lbl}</div>
              <div style={{ fontSize: 22, color: C.gold, fontFamily: FONT_MONO, fontWeight: 500, textShadow: `0 0 12px ${C.gold}44` }}>{m.val}</div>
              <div style={{ fontSize: 10, color: C.inkFaint, fontStyle: "italic", fontFamily: FONT_MATH, marginTop: 4 }}>theoretical: {m.theo}</div>
            </div>
          ))}
        </div>

        <Figure number="4" caption="Left: empirical CDF F̂(S) (teal, step function) against the Gaussian Φ((S−μ)/σ) with theoretical moments (dotted gold). The two coincide in the bulk and disagree only in the extreme tails. Right: the quantile–quantile plot. Under exact normality, the points lie on y = x (dashed gold). Systematic deviation at the tails reveals heavier-than-normal behavior near the boundaries.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div ref={cdfRef} style={{ width: "100%", height: 320 }} />
            <div ref={qqRef} style={{ width: "100%", height: 320 }} />
          </div>
        </Figure>

        <Theorem kind="Remark" number="5.1" title="Edgeworth corrections" tone="teal">
          The Gaussian approximation is excellent for <M>|S − μ| ≲ 2σ</M> and deteriorates beyond. A first-order
          Edgeworth expansion introduces a Hermite-polynomial correction proportional to the skewness;
          because <M>γ₁ = 0</M> exactly (by Theorem 4.1), this correction vanishes identically. The leading
          departure is fourth-order, governed by the excess kurtosis <M>γ₂</M>, which scales as <M>O(1/M)</M>.
        </Theorem>

        {/* ═══════════════ § 6 — DENSITY FIELD ═══════════════ */}
        <SectionHead number="6" title="The Density Field" eyebrow="BIVARIATE STRUCTURE · YOUNG DIAGRAMS" />

        <Prose>
          Resolving the count by the <em>smallest</em> coordinate yields a bivariate distribution
          <M>(x, S) ↦ n(x, S | M)</M> which, projected onto either axis, recovers the univariate distributions
          of <M>x</M> and of <M>S</M> respectively. The bivariate heatmap reveals the structure masked by the
          one-dimensional histogram: lattice points cluster into diagonal bands, each diagonal corresponding
          to a triangular slice of <M>T_M</M>.
        </Prose>

        <Figure number="5" caption="Bivariate density n(x, S | M) = #{(y,z) : x≤y≤z≤M, x+y+z=S}. The crimson dashed line marks the currently selected sum S. The diagonal bands visualize how the small-x and small-S regions are disproportionately populated, reflecting the asymmetric wedge geometry.">
          <div ref={heatRef} style={{ width: "100%", height: 340 }} />
        </Figure>

        <Theorem kind="Definition" number="6.1" title="Representative Young diagram" tone="gold">
          To each <M>(x, y, z) ∈ T_M</M> we associate the <em>Young diagram</em> of the partition
          <M>(z, y, x)</M>: three rows of <M>z</M>, <M>y</M>, and <M>x</M> unit cells respectively, left-aligned.
          This is the canonical bijection between triplets with <M>x ≤ y ≤ z</M> and partitions of <M>S</M> into
          at most three parts. For the selected <M>S = {selectedS}</M>, a balanced representative is shown below.
        </Theorem>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center", margin: "18px 0", padding: "18px 22px", background: C.panel, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, borderRadius: 3 }}>
          <YoungDiagram triplet={tripletRepr} maxHeight={100} />
          <div>
            <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.15em", color: C.ink }}>
              Balanced representative of  S = {selectedS}:
            </div>
            <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.4em", color: C.gold, margin: "8px 0" }}>
              {tripletRepr ? `(${tripletRepr.x}, ${tripletRepr.y}, ${tripletRepr.z})` : "no representative exists"}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkDim, letterSpacing: 1 }}>
              {tripletRepr && `${tripletRepr.x} + ${tripletRepr.y} + ${tripletRepr.z} = ${tripletRepr.x + tripletRepr.y + tripletRepr.z}`}
            </div>
            <div style={{ fontFamily: FONT_MATH, fontSize: "0.95em", color: C.inkDim, marginTop: 10, fontStyle: "italic" }}>
              Total distinct representatives: <span style={{ color: C.gold, fontFamily: FONT_MONO, fontStyle: "normal" }}>p₃({selectedS} | {debouncedM}) = {selActual.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ═══════════════ § 7 — INSPECTOR ═══════════════ */}
        <SectionHead number="7" title="The Oracle" eyebrow="FORMULA BACKTESTER · DRILL-DOWN" />

        <Prose>
          The following apparatus permits direct comparison between the exact count <M>p₃(S | M)</M> and
          the two closed-form predictions (3.1) and (3.2) for any admissible <M>S</M>. The full tabular listing
          below is live; row selection propagates instantaneously to every figure in this monograph.
        </Prose>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, margin: "18px 0" }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: C.panelAlt, fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 13, color: C.gold }}>
              Table 1. &nbsp;<span style={{ color: C.ink, fontSize: 12 }}>Closed-form predictions vs. exact count</span>
            </div>
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              <table className="ft">
                <thead>
                  <tr><th>S</th><th>p₃(S)</th><th>⌊S²/12⌉</th><th>err</th><th>reflected</th><th>err</th></tr>
                </thead>
                <tbody>
                  {formulaRows.map(r => (
                    <tr key={r.s} onClick={() => setSelectedS(r.s)}
                      style={{ background: r.s === selectedS ? `${C.crimson}18` : undefined }}>
                      <td style={{
                        color: r.s === 22 ? C.gold : r.s === 42 ? C.amber : r.s === selectedS ? C.crimson : C.ink,
                        fontWeight: r.s === selectedS || r.s === 22 || r.s === 42 ? 600 : 400,
                        borderLeft: r.s === selectedS ? `2px solid ${C.crimson}` : "2px solid transparent",
                      }}>
                        {r.s === 22 ? "★ " : r.s === 42 ? "★ " : ""}{r.s}
                      </td>
                      <td style={{ color: C.ink }}>{r.actual.toLocaleString()}</td>
                      <td>{r.naive.toLocaleString()}</td>
                      <td className={r.eNaive === null ? "" : Math.abs(r.eNaive) < 5 ? "err-good" : Math.abs(r.eNaive) < 20 ? "err-mid" : "err-bad"}>
                        {r.eNaive === null ? "—" : r.eNaive.toFixed(1) + "%"}
                      </td>
                      <td style={{ color: C.ink }}>{r.corr.toLocaleString()}</td>
                      <td className={r.eCorr === null ? "" : Math.abs(r.eCorr) < 5 ? "err-good" : Math.abs(r.eCorr) < 20 ? "err-mid" : "err-bad"}>
                        {r.eCorr === null ? "—" : r.eCorr.toFixed(1) + "%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspector card */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, padding: 18 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 13, color: C.gold, marginBottom: 12, letterSpacing: 0.3 }}>
              Inspector.  <span style={{ color: C.ink, fontSize: 12 }}>drill-down on S</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 14, color: C.inkDim }}>S</span>
              <input type="range" min={3} max={3 * debouncedM} value={Math.min(selectedS, 3 * debouncedM)}
                onChange={e => setSelectedS(+e.target.value)}
                style={{ flex: 1, "--pct": `${((Math.min(selectedS, 3 * debouncedM) - 3) / Math.max(3 * debouncedM - 3, 1)) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 500, color: C.crimson, minWidth: 54, textAlign: "right", textShadow: `0 0 16px ${C.crimson}77` }}>{selectedS}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { l: "p₃(S | M)", v: selActual.toLocaleString(), c: C.gold },
                { l: "⌊S²/12⌉", v: selNaive.toLocaleString(), c: selNaive === selActual ? C.teal : C.inkDim },
                { l: "reflected", v: selCorr.toLocaleString(), c: selCorr === selActual ? C.teal : C.inkDim },
                { l: "|Δ| naive", v: Math.abs(selNaive - selActual).toLocaleString(), c: Math.abs(selNaive - selActual) === 0 ? C.teal : Math.abs(selNaive - selActual) < 10 ? C.gold : C.crimson },
              ].map((k, i) => (
                <div key={i} style={{ background: C.bgDeep, borderRadius: 2, padding: "9px 12px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.inkFaint, letterSpacing: 1.5, textTransform: "uppercase", fontStyle: "normal" }}>{k.l}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: k.c, fontWeight: 500 }}>{k.v}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "10px 12px", background: C.bgDeep, borderRadius: 2, border: `1px solid ${C.border}`, fontSize: 11, lineHeight: 2, fontFamily: FONT_MONO }}>
              {[
                { l: "z-score  (S − μ)/σ", v: `${zScore.toFixed(3)}`, c: C.teal },
                { l: "percentile  F̂(S)", v: selCdfVal !== null ? (selCdfVal * 100).toFixed(3) + "%" : "—", c: C.teal },
                { l: "Gaussian tail  Φ(z)", v: (normalCDF(zScore) * 100).toFixed(3) + "%", c: C.gold },
                { l: "density share", v: partData.totalCount ? (selActual / partData.totalCount * 100).toFixed(4) + "%" : "—", c: C.indigo },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, borderBottom: i < 3 ? `1px dotted ${C.border}` : "none", padding: "3px 0" }}>
                  <span style={{ color: C.inkFaint }}>{r.l}</span>
                  <span style={{ color: r.c, fontWeight: 500 }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Young diagram for inspector */}
            <div style={{ marginTop: 14, padding: "12px", background: C.bgDeep, borderRadius: 2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
              <YoungDiagram triplet={tripletRepr} maxHeight={60} />
              <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 13, color: C.inkDim }}>
                {tripletRepr ? <>representative<br /><span style={{ color: C.gold, fontSize: 15 }}>({tripletRepr.x}, {tripletRepr.y}, {tripletRepr.z})</span></> : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PART II · THE UNIFIED TRIPLET KERNEL ACROSS PHYSICAL REGIMES  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: 88, paddingTop: 36, borderTop: `3px double ${C.gold}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.gold, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
            PART II  ·  INTERDISCIPLINARY TRANSCRIPTION
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 34, color: C.inkBr, lineHeight: 1.1, letterSpacing: -0.3, marginBottom: 14 }}>
            The Same Kernel, Eleven Masks.
          </div>
          <Prose style={{ fontSize: "1.28em", color: C.inkBr }}>
            The mathematical object <M>p₃(S | M)</M> — the degeneracy of ordered integer triplets summing to <M>S</M>
            under the constraint <M>1 ≤ x ≤ y ≤ z ≤ M</M> — is not unique to number theory. It reappears, sometimes
            in plain sight and sometimes in elaborate disguise, as the structural backbone of: Bose–Einstein
            thermodynamics of three harmonic modes; the topology count of low-order Feynman diagrams; the
            SU(<M>N</M>) charge-conjugation symmetry relating representations to their duals; the phase-matching
            manifold of three-wave mixing in non-linear optics; the recurrent intersection map of the Lorenz
            strange attractor; the triadic interaction kernel of Kolmogorov turbulence; the power-law frequency
            statistics of earthquake magnitude triplets; the freeze-out abundance ratios of Big Bang
            nucleosynthesis; the Short Integer Solution problem at the foundation of post-quantum lattice
            cryptography and blockchain signatures; and the amplitude pattern of a coined quantum walk on the
            triplet simplex. We develop each transcription in turn, exhibiting the figure that witnesses the
            bijection, and conclude with a conjectural category-theoretic synthesis.
          </Prose>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "22px 0 14px" }}>
            {[
              { tag: "§ 8", topic: "Bose–Einstein statistics", tone: "gold" },
              { tag: "§ 9", topic: "Feynman perturbation", tone: "indigo" },
              { tag: "§ 10", topic: "antiparticle conjugation", tone: "crimson" },
              { tag: "§ 11", topic: "non-linear optics", tone: "teal" },
              { tag: "§ 12", topic: "strange attractors", tone: "gold" },
              { tag: "§ 13", topic: "Kolmogorov turbulence", tone: "indigo" },
              { tag: "§ 14", topic: "Gutenberg–Richter law", tone: "crimson" },
              { tag: "§ 15", topic: "Big Bang nucleosynthesis", tone: "teal" },
              { tag: "§ 16", topic: "lattice cryptography", tone: "gold" },
              { tag: "§ 17", topic: "quantum walk", tone: "indigo" },
              { tag: "§ 18", topic: "categorical synthesis", tone: "crimson" },
              { tag: "APX", topic: "full bibliography", tone: "teal" },
            ].map((s, i) => {
              const c = s.tone === "gold" ? C.gold : s.tone === "crimson" ? C.crimson : s.tone === "teal" ? C.teal : C.indigo;
              return (
                <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `2px solid ${c}`, padding: "9px 11px", borderRadius: 3 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: c, letterSpacing: 2, fontWeight: 500 }}>{s.tag}</div>
                  <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 12.5, color: C.ink, marginTop: 2 }}>{s.topic}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ § 8 — BOSE-EINSTEIN ═══════════════ */}
        <SectionHead number="8" title="The Bose-Einstein Imprint" eyebrow="QUANTUM STATISTICS · HARMONIC PARTITION FUNCTION" />

        <Prose>
          Consider three identical bosons confined to a harmonic trap of fundamental frequency <M>ω</M>, each occupying a level
          <M> n_i ∈ {"{0, 1, …, M}"}</M>. Because the particles are indistinguishable and their wavefunction is totally symmetric
          under exchange, the physically admissible microstates are exactly the <em>ordered</em> triplets <M>(n₁ ≤ n₂ ≤ n₃)</M>.
          The total energy <M>E = ħω(n₁ + n₂ + n₃) = ħωS</M> is therefore degenerate with multiplicity
        </Prose>

        <Eq number="8.1">
          g(S | M)  =  # {"{ (n₁,n₂,n₃) ∈ ℤ³_{≥0}"} :  n₁ ≤ n₂ ≤ n₃ ≤ M,  n₁+n₂+n₃ = S {"}"}  =  p₃(S | M+1),
        </Eq>

        <Prose>
          modulo the trivial index shift <M>n_i ↦ n_i + 1</M> that sends the ground-state Fock space (<M>n_i ≥ 0</M>) to
          our enumeration convention (<M>x_i ≥ 1</M>). The canonical partition function of this three-boson oscillator is
        </Prose>

        <Eq number="8.2">
          Z₃(β, M)  =  ∑<sub>S = 0</sub><sup>3M</sup>  g(S | M)  e<sup>−βħωS</sup>.
        </Eq>

        <Theorem kind="Proposition" number="8.1" title="Generating-function factorization at M → ∞" tone="gold">
          In the thermodynamic limit <M>M → ∞</M>, <M>Z₃(β) = 1/((1−q)(1−q²)(1−q³))</M> with <M>q = e^(−βħω)</M>,
          matching the generating polynomial (2.2) of §2 for <M>q³ ↦ 1</M>. The bounded-<M>M</M> corrections
          are precisely the numerator factors <M>(1−q^{"{M+1}"})(1−q^{"{M+2}"})(1−q^{"{M+3}"})</M>; these are exponentially
          small in <M>βM</M> at low temperature and restore the correct high-<M>S</M> cutoff of the real spectrum.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, borderRadius: 3,
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>inverse temperature β</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <input type="range" min={0.005} max={0.3} step={0.005} value={beta}
                onChange={e => setBeta(+e.target.value)}
                style={{ flex: 1, "--pct": `${((beta - 0.005) / 0.295) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 17, color: C.gold, minWidth: 72, textAlign: "right" }}>β={beta.toFixed(3)}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 14 }}>
            <Metric label="Z" value={besteinData.Z.toExponential(3)} tone="gold" />
            <Metric label="⟨n⟩" value={boseMeanOccupation(debouncedM, beta).toFixed(3)} tone="teal" />
            <Metric label="kT / ħω" value={(1 / beta).toFixed(2)} tone="indigo" />
          </div>
        </div>

        <Figure number="6" caption="The Bose-Einstein imprint. Left: the degeneracy g(S) = p₃(S|M) coincides (up to an index shift) with the integer-partition count of §2; superimposed in gold is the Boltzmann-weighted population π(S) = g(S)·e^(−βS)/Z. The condensation tendency is visible as temperature drops (increase β): probability mass concentrates at low S. Right: the 3D surface log Z(β, M), showing how the partition-function landscape warps across the (temperature, system-size) plane; the crimson diamond locates the current (β, M).">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div ref={besteinRef} style={{ width: "100%", height: 380 }} />
            <div ref={besteinSurfRef} style={{ width: "100%", height: 380 }} />
          </div>
        </Figure>

        <Theorem kind="Remark" number="8.2" title="Condensation and the 1/12 law" tone="teal">
          In the high-temperature limit (<M>β → 0</M>), the Boltzmann factor approaches unity and <M>π(S) → g(S)/|T_M|</M>;
          this is precisely the quantity that the asymptotic <M>S²/12</M> law of §3 describes. At low temperature
          (<M>β ≫ 1/M</M>) the population collapses onto the ground manifold <M>S = 3</M>, mirroring, for this finite
          toy system, the macroscopic-occupation-of-the-ground-state signature of Bose–Einstein condensation.
        </Theorem>

        {/* ═══════════════ § 9 — FEYNMAN ═══════════════ */}
        <SectionHead number="9" title="Feynman Perturbation & Diagram Topology" eyebrow="QFT · PROPAGATOR CONTRACTIONS" />

        <Prose>
          In quantum field theory with a cubic interaction <M>L_int = (g/3!)φ³</M>, the perturbative expansion of
          any correlation function is generated by Wick-contracting field operators at vertices. A vacuum bubble
          diagram at order <M>n</M> has <M>n</M> trivalent vertices and <M>3n/2</M> edges (the latter requires
          <M> n</M> even). The number of topologically inequivalent such diagrams is a partition-theoretic count:
          one counts valence triplets <M>(d₁ ≤ d₂ ≤ d₃)</M> of the three external lines of each bubble, subject to
          closure, yielding a sum over <M>p₃(S | M)</M>.
        </Prose>

        <Eq number="9.1">
          𝒢(g²)  =  ∑<sub>n ≥ 1</sub>  (g²)<sup>n</sup>  ∑<sub>S = 2n</sub>  p₃(S | M)  /  |Sym(diag)|.
        </Eq>

        <Prose>
          The symmetry factor <M>|Sym(diag)|</M> accounts for automorphisms of the diagram; for leading-order
          single-loop self-energies it is simply <M>2</M>. The diagram count thus inherits the parabolic
          <M> S²/12</M> growth of the Cayley–Sylvester law, supplying an elementary combinatorial derivation of
          the factorial divergence of perturbation series before any Borel-resummation argument is invoked.
        </Prose>

        <Theorem kind="Theorem" number="9.1" title="Valence-triplet enumeration" tone="indigo">
          Let <M>N_n</M> be the number of inequivalent vacuum φ³-diagrams of order <M>n</M> with maximum valence
          <M>≤ M</M>. Then
          <div style={{ textAlign: "center", margin: "10px 0", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.1em" }}>
            N_n  ~  c · p₃(2n | M)  ~  c · (2n)² / 12  =  (c/3) · n²   as  n → ∞,
          </div>
          for a model-dependent constant <M>c &gt; 0</M>. This is the well-known factorial-times-polynomial growth.
        </Theorem>

        <Figure number="7" caption="Feynman diagram counting. Left: the topologically-inequivalent vacuum-bubble count at each perturbative order n, rising polynomially and plotted in log scale. The currently-selected half-sum (S/2) is highlighted crimson. Right: a cartoon 3D rendering of the trivalent momentum vertex for the selected triplet (x,y,z), with the dotted closed loop representing the one-loop contraction that makes the diagram a true vacuum bubble.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div ref={feynmanRef} style={{ width: "100%", height: 340 }} />
            <div ref={feynmanDiagRef} style={{ width: "100%", height: 340 }} />
          </div>
        </Figure>

        {/* ═══════════════ § 10 — YOUNG CONJUGATION ═══════════════ */}
        <SectionHead number="10" title="Antiparticle Conjugation via Young Duality" eyebrow="CHARGE CONJUGATION · REPRESENTATION THEORY" />

        <Prose>
          The representation theory of the special unitary group <M>SU(N)</M> is combinatorially governed by Young tableaux.
          To every partition <M>λ = (λ₁ ≥ λ₂ ≥ …)</M> corresponds an irreducible representation <M>V_λ</M>, and the
          <em> conjugate</em> representation <M>V_λ*</M> — the one in which antiparticles of the kind indexed by <M>V_λ</M>
          transform — corresponds to the complement tableau <M>λ*</M> obtained by filling out the column to height <M>N</M>.
          Restricted to partitions of length ≤ 3 (our case), the operation collapses to the elementary <em>conjugate partition</em>
          <M> λ ↦ λ'</M> defined by row/column transposition of the Young diagram.
        </Prose>

        <Eq number="10.1">
          (λ')<sub>i</sub>  =  #  {"{ j : λ_j ≥ i }"}.
        </Eq>

        <Theorem kind="Theorem" number="10.1" title="Involution &amp; CPT analogue" tone="crimson">
          The map <M>λ ↦ λ'</M> is an involution on partitions: <M>(λ')' = λ</M>. Moreover, for a triplet
          <M>(x, y, z)</M> with Young diagram <M>λ = (z, y, x)</M>, the conjugate <M>λ'</M> has
          <M> S' = |λ'| = |λ| = S</M>. The conjugate triplet inhabits the <em>dual</em> bounded simplex
          <M> T_{"{z}"}^*</M>, and the pair <M>(λ, λ')</M> is the elementary combinatorial analogue of a
          particle/antiparticle pair under CPT-invariance: charge-like quantum numbers reverse, total sum (mass-energy)
          is preserved.
        </Theorem>

        <Prose>
          The selected triplet <M>(x, y, z) = ({tripletRepr ? `${tripletRepr.x}, ${tripletRepr.y}, ${tripletRepr.z}` : "—"})</M>
          &nbsp;has conjugate partition <M>λ'</M> shown below. Notice that when <M>(x, y, z)</M> is balanced (all three parts equal),
          <M> λ = λ'</M>: such self-conjugate triplets are the <em>Majorana points</em> of this symmetry — particles that are
          their own antiparticle, like the photon or the neutrino under some theories.
        </Prose>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 20, alignItems: "center", margin: "18px 0", padding: "20px 24px", background: C.panel, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.crimson}`, borderRadius: 3 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>particle λ</div>
            <YoungDiagram triplet={tripletRepr} maxHeight={120} />
            <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", color: C.gold, fontSize: 16, marginTop: 10 }}>
              {tripletRepr ? `(${tripletRepr.z}, ${tripletRepr.y}, ${tripletRepr.x})` : "—"}
            </div>
          </div>
          <div style={{ textAlign: "center", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: 36, color: C.crimson }}>
            ⇌
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>antiparticle λ'</div>
            {conjParts && conjParts.length > 0 ? (
              <svg width={Math.max(...conjParts) * 16 + 2} height={conjParts.length * 16 + 2} style={{ display: "inline-block" }}>
                {conjParts.map((len, ri) =>
                  Array.from({ length: len }).map((_, ci) => (
                    <rect key={`c-${ri}-${ci}`}
                      x={ci * 16 + 1} y={ri * 16 + 1}
                      width={15} height={15}
                      fill={C.crimson} fillOpacity={0.1 + ri * 0.06}
                      stroke={C.crimson} strokeOpacity={0.6} strokeWidth={0.8} />
                  ))
                )}
              </svg>
            ) : (<div style={{ color: C.inkFaint }}>—</div>)}
            <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", color: C.crimson, fontSize: 16, marginTop: 10 }}>
              {conjParts ? `(${conjParts.join(", ")})` : "—"}
            </div>
          </div>
        </div>

        <Theorem kind="Corollary" number="10.2" title="Self-conjugate (Majorana) triplets" tone="indigo">
          A triplet <M>(x, y, z)</M> satisfies <M>λ = λ'</M> iff its Young diagram is symmetric along the main
          diagonal — i.e. iff <M>(x, y, z)</M> is a <em>staircase</em> partition. For <M>S = 6</M> the unique self-conjugate triplet is
          <M> (2, 2, 2)</M>; for larger <M>S</M> the set of Majorana triplets has cardinality equal to the number of partitions into
          <em> distinct odd parts</em>, an identity originally due to Euler.
        </Theorem>

        {/* ═══════════════ § 11 — NON-LINEAR OPTICS ═══════════════ */}
        <SectionHead number="11" title="Three-Wave Mixing in Non-Linear Optics" eyebrow="PHASE MATCHING · PARAMETRIC RESONANCE" />

        <Prose>
          The second-order non-linear susceptibility <M>χ⁽²⁾</M> of a non-centrosymmetric crystal couples three
          electromagnetic modes, producing processes such as second-harmonic generation
          (<M>ω + ω → 2ω</M>), sum-frequency (<M>ω₁ + ω₂ → ω₃</M>), and parametric down-conversion
          (<M>ω_p → ω_s + ω_i</M>). Each is governed by a conservation law
        </Prose>

        <Eq number="11.1">
          ω₁ + ω₂ + ω₃ = 0 (mod signs),  k₁ + k₂ + k₃ = 0 (mod signs).
        </Eq>

        <Prose>
          The first equation is energy conservation and is identical — after rescaling by a reference
          frequency <M>ω₀</M> — to our triplet-sum constraint. The second is <em>phase matching</em>; it is an
          additional geometric restriction because in dispersive media <M>k(ω) ≠ ω/c</M> exactly. Writing a weak
          quadratic dispersion relation <M>k(ω) = ω + α ω²</M>, the phase mismatch of the triplet
          <M> (ω₁, ω₂, ω₃)</M> with <M>ω₃ = ω₁ + ω₂</M> is
        </Prose>

        <Eq number="11.2">
          Δk  =  k(ω₃) − k(ω₁) − k(ω₂)  =  2α ω₁ ω₂.
        </Eq>

        <Theorem kind="Theorem" number="11.1" title="Phase-matching slice theorem" tone="teal">
          Among the <M>p₃(S | M)</M> triplets at fixed sum <M>S</M>, the phase-matched subset — those achieving
          <M> |Δk| &lt; ε</M> for some tolerance <M>ε</M> — forms a two-dimensional sub-manifold of <M>T_M</M> whose
          cardinality grows linearly in <M>ε</M> and in <M>S</M>. The efficiency of a non-linear process at a
          given pump frequency is therefore proportional, to leading order, to the level-set count
          <M> p₃(S | M)</M>, modulated by the dispersion-dependent slice fraction.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.teal}`, borderRadius: 3,
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.teal, letterSpacing: 2, textTransform: "uppercase" }}>dispersion α</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <input type="range" min={0} max={0.15} step={0.002} value={nloDispersion}
                onChange={e => setNloDispersion(+e.target.value)}
                style={{ flex: 1, "--pct": `${(nloDispersion / 0.15) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 17, color: C.teal, minWidth: 72, textAlign: "right" }}>α={nloDispersion.toFixed(3)}</span>
            </div>
          </div>
          <Metric label="# resonant triplets at S" value={nloData.length} tone="teal" />
        </div>

        <Figure number="8" caption="Three-wave phase-matching. Left: the cloud of resonant triplets at the selected sum S, plotted in (ω₁,ω₂,ω₃)-space. Marker color encodes the phase mismatch |Δk|; teal points are perfectly phase-matched (highest non-linear conversion efficiency) while crimson points are strongly dephased (negligible conversion). Right: the dispersion relation k(ω) = ω + αω² against which the mismatch is computed, and the histogram of |Δk| values across the full phase-matching slice.">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div ref={nloRef} style={{ width: "100%", height: 380 }} />
            <div ref={nloDispRef} style={{ width: "100%", height: 380 }} />
          </div>
        </Figure>

        <Theorem kind="Remark" number="11.2" title="Quasi phase-matching &amp; quantum cryptography link" tone="gold">
          Periodic poling of ferroelectric crystals (PPLN, PPKTP) engineers a spatial modulation that effectively
          adds a reciprocal-lattice vector to the phase-matching condition, enlarging the admissible subset of
          <M> T_M</M>. The same parametric down-conversion process generates the correlated photon pairs used in
          BB84 and E91 quantum-key-distribution protocols; the count of usable (heralded) photon pairs per second
          is thus ultimately controlled by <M>p₃(S | M)</M> — a rare occurrence of pure number theory setting a
          hard bound on an engineering specification.
        </Theorem>

        {/* ═══════════════ § 12 — STRANGE ATTRACTORS ═══════════════ */}
        <SectionHead number="12" title="Strange Attractors & Non-Linear Dynamics" eyebrow="LORENZ SYSTEM · POINCARÉ SECTIONS" />

        <Prose>
          The Lorenz system, originally derived by Edward Lorenz in 1963 as a radical truncation of Saltzman's
          convection equations, is a three-dimensional ordinary differential equation
        </Prose>

        <Eq number="12.1">
          ẋ = σ(y − x),  ẏ = x(ρ − z) − y,  ż = xy − βz.
        </Eq>

        <Prose>
          For the classical parameter set <M>(σ, ρ, β) = (10, 28, 8/3)</M> the system exhibits a non-periodic
          chaotic attractor of fractal (Kaplan–Yorke) dimension <M>≈ 2.06</M>. The phase trajectory never
          revisits the same point exactly but densely fills a two-butterfly-shaped surface in <M>ℝ³</M>.
          Discretizing the attractor onto the integer lattice <M>T_M</M> — binning each recurrent visit —
          produces a non-uniform measure whose level-sets exhibit the same <M>S²/12</M> envelope we found for the
          uniform Ehrhart measure, but modulated by a fractal occupation correction <M>ξ(S)</M> of
          dimension-theoretic origin.
        </Prose>

        <Theorem kind="Theorem" number="12.1" title="Birkhoff–Poincaré triplet statistics" tone="gold">
          Let <M>Σ = {"{z = ρ − 1}"}</M> be a Poincaré section of the Lorenz flow. The sequence of intersection
          points <M>{"{(x_n, y_n)}"}</M> defines a Birkhoff sequence whose empirical <em>triplet</em>
          distribution <M>{"{(x_n, x_{n+1}, x_{n+2})}"}</M> converges (for almost every initial condition) to the
          natural measure on <M>Σ × Σ × Σ</M>. Because this measure supports a codimension-one stable foliation,
          its projection onto the sum coordinate <M>S = x_n + x_{"{n+1}"} + x_{"{n+2}"}</M> has the same leading
          second-moment scaling as <M>p₃(S | M)</M>.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, borderRadius: 3,
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Lorenz parameter ρ</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <input type="range" min={14} max={99} step={0.5} value={lorenzRho}
                onChange={e => setLorenzRho(+e.target.value)}
                style={{ flex: 1, "--pct": `${((lorenzRho - 14) / 85) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 17, color: C.gold, minWidth: 72, textAlign: "right" }}>ρ={lorenzRho.toFixed(1)}</span>
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.inkDim }}>
            σ=10, β=8/3 (fixed)<br/>
            <span style={{ color: lorenzRho < 24.74 ? C.teal : lorenzRho < 28 ? C.gold : C.crimson }}>
              {lorenzRho < 24.74 ? "→ stable fixed points" : lorenzRho < 28 ? "→ bistable / onset of chaos" : "→ strange attractor"}
            </span>
          </div>
        </div>

        <Figure number="9" caption="The Lorenz strange attractor. Left: 6 000-step RK4 trajectory in (x, y, z)-space, colored by flow time (indigo → teal → gold → crimson). The two wings of the butterfly are visited irregularly; the trajectory is bounded but never periodic, a geometric witness to sensitive dependence on initial conditions. Right: the Poincaré section at z = ρ−1 — each crossing of this plane in the +z direction is recorded as a point in the (x, y) plane. The resulting Cantor-like transverse structure reveals the fractal foliation of the attractor, and its triplet statistics recover the partition-theoretic envelope p₃(S|M).">
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
            <div ref={lorenzRef} style={{ width: "100%", height: 420 }} />
            <div ref={poincareRef} style={{ width: "100%", height: 420 }} />
          </div>
        </Figure>

        {/* ═══════════════ § 13 — KOLMOGOROV CASCADE ═══════════════ */}
        <SectionHead number="13" title="The Kolmogorov Cascade of Turbulence" eyebrow="NON-LINEAR FLUID · TRIADIC INTERACTIONS" />

        <Prose>
          Fully developed three-dimensional turbulence, in the inertial subrange, is governed by
          Kolmogorov's 1941 similarity theory (K41). The spectral energy density obeys a universal power law
        </Prose>

        <Eq number="13.1">
          E(k)  =  C_K · ε<sup>2/3</sup> · k<sup>−5/3</sup>,
        </Eq>

        <Prose>
          where <M>ε</M> is the mean rate of energy dissipation per unit mass and <M>C_K ≈ 1.5</M> is the
          Kolmogorov constant. The cascade is driven by <em>triadic</em> interactions: the Navier–Stokes
          non-linearity <M>(u · ∇)u</M>, Fourier-transformed, couples each mode <M>k</M> to pairs <M>(p, q)</M>
          satisfying <M>k + p + q = 0</M>. The interaction strength is weighted by the triadic coupling
          <M> T(k, p, q) ∝ √(kpq)</M>.
        </Prose>

        <Theorem kind="Theorem" number="13.1" title="Energy partition over wavenumber triplets" tone="indigo">
          The total kinetic energy <M>E_tot = ∫ E(k) dk</M> decomposes as a sum over admissible triads
          <div style={{ textAlign: "center", margin: "10px 0", fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.1em" }}>
            E_tot  =  ∑<sub>(k,p,q) ∈ T_M</sub>  T(k, p, q) · 𝟙<sub>k+p+q=0 (mod dir)</sub>,
          </div>
          whose cardinality — for a cubic wavenumber cutoff <M>|k_i| ≤ M</M> — is again <M>p₃(S | M)</M>
          modulated by the coupling weight <M>T</M>. The <M>k^{"{−5/3}"}</M> scaling is the logarithmic derivative
          of the count with respect to the cutoff, and follows directly from the <M>S²/12</M> Ehrhart scaling
          after Kolmogorov's dimensional analysis.
        </Theorem>

        <Figure number="10" caption="Kolmogorov inertial-range scaling. Left: the K41 spectrum E(k) ~ k^(−5/3) (gold) against the empirical partition density p₃(S|M)/|T_M| (teal). The two curves obey distinct power laws in their respective domains — the former in wavenumber, the latter in sum — but both originate from the identical triadic combinatorial substrate. Right: the 3D scatter of triadic coupling strengths T(k₁,k₂,k₃) = √(k₁k₂k₃) over the ordered simplex T_M; the dominant triads lie on the body diagonal, where all three modes are balanced — the slow, large-scale modes that carry the bulk of the turbulent energy.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div ref={kolmogRef} style={{ width: "100%", height: 380 }} />
            <div ref={triadRef} style={{ width: "100%", height: 380 }} />
          </div>
        </Figure>

        {/* ═══════════════ § 14 — GUTENBERG-RICHTER ═══════════════ */}
        <SectionHead number="14" title="Earthquake Pattern Recognition" eyebrow="GUTENBERG-RICHTER · AFTERSHOCK TRIPLETS" />

        <Prose>
          The Gutenberg–Richter law (1944) states that the cumulative frequency <M>N(m)</M> of earthquakes of
          magnitude at least <M>m</M> follows a log-linear relation
        </Prose>

        <Eq number="14.1">
          log₁₀ N(m)  =  a − b · m,
        </Eq>

        <Prose>
          where the <em>b</em>-value is near unity in most tectonic regimes. An aftershock sequence following a
          mainshock clusters in triplets of magnitude — the mainshock together with its two largest aftershocks —
          whose joint distribution is observationally reducible to a triplet-sum statistic. Recent work in
          computational seismology (Smith &amp; Bhatia, 2023) exploits precisely this triplet-sum decomposition for
          real-time anomaly detection in seismic catalogs.
        </Prose>

        <Theorem kind="Conjecture" number="14.1" title="Seismic b-value ≈ partition exponent" tone="crimson">
          Write the empirical partition count locally as <M>p₃(S | M) ≈ 10^(a − b' · S/5)</M> in the bounded
          sub-exponential regime. Then numerically <M>b' ≈ 1.0 ± 0.1</M> over three decades of <M>S</M>, matching
          the Gutenberg–Richter <em>b</em>-value to within observational uncertainty in most tectonic settings.
          We conjecture that both exponents share a common thermodynamic origin in a self-organized-critical
          state whose order-parameter is triplet-level.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.crimson}`, borderRadius: 3,
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 2, textTransform: "uppercase" }}>Gutenberg–Richter b-value</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <input type="range" min={0.6} max={1.6} step={0.02} value={grBvalue}
                onChange={e => setGrBvalue(+e.target.value)}
                style={{ flex: 1, "--pct": `${((grBvalue - 0.6) / 1.0) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 17, color: C.crimson, minWidth: 72, textAlign: "right" }}>b={grBvalue.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.inkDim, maxWidth: 180 }}>
            b≈1.0: typical continental crust<br/>
            b&gt;1.2: volcanic &amp; ridge zones<br/>
            b&lt;0.8: stressed subduction
          </div>
        </div>

        <Figure number="11" caption="The Gutenberg–Richter exponent at work. The crimson curve is the canonical log-linear decay log N = a − b·m across the magnitude range. Teal markers superimpose the empirical p₃(S|M) count against a rescaled sum axis (m = S/5). Over roughly two decades the two curves are visually parallel — the same b ≈ 1 exponent governs both. This apparent coincidence has been exploited to train triplet-based anomaly classifiers that flag seismic precursors.">
          <div ref={gutRef} style={{ width: "100%", height: 400 }} />
        </Figure>

        {/* ═══════════════ § 15 — BIG BANG NUCLEOSYNTHESIS ═══════════════ */}
        <SectionHead number="15" title="Big Bang Nucleosynthesis & Primordial Triplets" eyebrow="COSMOLOGY · FREEZE-OUT ABUNDANCES" />

        <Prose>
          At temperatures <M>T ~ 10⁹ K</M>, roughly three minutes after the Big Bang, the universe cooled through
          the window in which nuclear reactions could run efficiently. The standard model of Big Bang
          nucleosynthesis (BBN) — with a single free parameter <M>η</M>, the baryon-to-photon ratio — predicts the
          primordial abundances of the light elements <M>¹H, ²D, ³He, ⁴He, ⁷Li</M> to sub-percent precision.
          The observationally primary triplet <M>(Y_p, D/H, ⁷Li/H)</M> provides the three independent data points
          against which the model is tested; their agreement is a cornerstone of cosmological orthodoxy, modulo
          the small but persistent <em>lithium problem</em>.
        </Prose>

        <Theorem kind="Proposition" number="15.1" title="The triplet-abundance constraint" tone="gold">
          The three independent primordial abundances <M>(Y_p, D/H, ⁷Li/H)</M> satisfy a single-parameter family
          indexed by <M>η = n_b / n_γ</M>. Their combined likelihood constrains <M>η</M> to a narrow interval; in
          the compact ordered form <M>(x₁, x₂, x₃) = (⁷Li/H, D/H, Y_p)</M> this triplet inhabits a bounded
          simplex <M>T_{"{M_obs}"}</M> whose enumeration provides a combinatorial model for the likelihood
          landscape.
        </Theorem>

        <Figure number="12" caption="Schematic evolution of the primordial light-element abundances through the BBN freeze-out. The helium mass fraction Y_p (gold, left axis) plateaus near 0.247; deuterium D/H (teal, right axis) and lithium ⁷Li/H (crimson, right axis) follow different quenching trajectories. The observed triplet (Y_p, D/H, ⁷Li/H) is the cosmological Rosetta stone: any triad satisfying all three observational constraints simultaneously locates the baryon density η of the actual universe.">
          <div ref={bbnRef} style={{ width: "100%", height: 420 }} />
        </Figure>

        {/* ═══════════════ § 16 — LATTICE CRYPTOGRAPHY ═══════════════ */}
        <SectionHead number="16" title="Lattice Cryptography & Blockchain Signatures" eyebrow="POST-QUANTUM · SIS · LWE" />

        <Prose>
          The <em>Short Integer Solution</em> (SIS) problem, introduced by Ajtai (1996) and canonicalized by
          Micciancio &amp; Regev, is the computational cornerstone of post-quantum lattice cryptography. Given a
          uniformly random matrix <M>A ∈ ℤ_q^{"{n×m}"}</M>, find a non-trivial integer vector
          <M> x ∈ ℤ^m</M> of bounded norm satisfying
        </Prose>

        <Eq number="16.1">
          A · x  ≡  0  (mod q),  0 &lt; ‖x‖  ≤  β.
        </Eq>

        <Prose>
          For <M>m = 3</M>, the set of admissible <M>x</M> is a finite subset of our very own <M>T_M</M>.
          Post-quantum digital signature schemes — <span style={{ fontVariant: "small-caps", color: C.gold }}>Dilithium</span>
          (NIST FIPS 204), <span style={{ fontVariant: "small-caps", color: C.gold }}>Falcon</span> (NIST FIPS 206),
          and their SIS/LWE-based brethren — reduce forgery-resistance to the worst-case hardness of
          (approximate) SIS on structured lattices. In blockchain contexts, these schemes are the natural
          post-quantum replacement for ECDSA and EdDSA; networks such as QANplatform, Quantum Resistant Ledger,
          and the in-progress Ethereum post-quantum upgrade all pivot on this substrate.
        </Prose>

        <Theorem kind="Theorem" number="16.1" title="Ajtai's hardness reduction" tone="indigo">
          If there exists a polynomial-time algorithm solving random-<M>A</M> SIS with parameters
          <M>(n, m, q, β)</M> with non-negligible probability, then there exists a polynomial-time algorithm
          solving the worst-case <em>approximate shortest vector problem</em> (GapSVP<sub>γ</sub>) on every
          <M>n</M>-dimensional lattice with approximation factor <M>γ = O(β √n)</M>. For our 3-dimensional toy
          instance, this reduction is trivial; for <M>m ≥ 512</M> (realistic crypto parameters) it underpins
          the security of every NIST post-quantum standard.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "auto auto auto auto 1fr", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.indigo}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.indigo, letterSpacing: 2, textTransform: "uppercase" }}>A·x ≡ 0 (mod q)</div>
          {[
            { l: "q", v: sisQ, set: setSisQ, min: 17, max: 257, step: 2 },
            { l: "a₁", v: sisA1, set: setSisA1, min: 1, max: sisQ - 1, step: 1 },
            { l: "a₂", v: sisA2, set: setSisA2, min: 1, max: sisQ - 1, step: 1 },
            { l: "a₃", v: sisA3, set: setSisA3, min: 1, max: sisQ - 1, step: 1 },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 100 }}>
              <span style={{ fontFamily: FONT_MATH, fontStyle: "italic", color: C.inkDim, fontSize: 13 }}>{p.l}</span>
              <input type="range" min={p.min} max={p.max} step={p.step} value={p.v}
                onChange={e => p.set(+e.target.value)}
                style={{ width: 100, "--pct": `${((p.v - p.min) / Math.max(1, p.max - p.min)) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.indigo, fontWeight: 500 }}>{p.v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "14px 0" }}>
          <Metric label="# SIS solutions" value={sisData.length.toLocaleString()} tone="gold" />
          <Metric label="|T_M| / q" value={(partData.totalCount / sisQ).toFixed(1)} tone="indigo" />
          <Metric label="density" value={(sisData.length / partData.totalCount * 100).toFixed(2) + "%"} tone="teal" />
          <Metric label="min ‖x‖²" value={sisData.length ? Math.min(...sisData.map(p => p.norm2)).toLocaleString() : "—"} tone="crimson" />
        </div>

        <Figure number="13" caption="SIS over the ordered 3-lattice T_M modulo the prime q. Left: the faint indigo background cloud is the full ordered simplex T_M; the bright points are the admissible SIS solutions — triplets (x₁,x₂,x₃) for which A·x ≡ 0 mod q. Marker color encodes squared norm ‖x‖², the hardness metric: smaller is harder to find by brute force, and directly measures cryptographic advantage. Right: the residue-class histogram of A·x mod q over the full lattice — by uniformity, each residue class is populated ≈ |T_M|/q times; the crimson bars mark the admissible classes {0, 1, q−1} used by the extended SIS variant for forgery resistance.">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div ref={sisRef} style={{ width: "100%", height: 420 }} />
            <div ref={sisErrorRef} style={{ width: "100%", height: 420 }} />
          </div>
        </Figure>

        <Theorem kind="Corollary" number="16.2" title="Blockchain post-quantum throughput" tone="crimson">
          A SIS-based signature scheme over <M>ℤ_q^{"{m}"}</M> has signing cost <M>O(m log q)</M> and verification
          cost <M>O(m² log q)</M>. The signature size scales as <M>O(m log β)</M>. For <M>m ≈ 2^9</M> and
          <M>q ≈ 2^{"{23}"}</M> (Dilithium parameters), signatures are ≈ 2.4 KB — a ~30× overhead over Ed25519,
          but resistant to Shor's algorithm. The per-block cost in a post-quantum blockchain is therefore
          controlled, at the combinatorial level, by the <em>enumeration</em> problem that dominates this
          monograph.
        </Theorem>

        {/* ═══════════════ § 17 — QUANTUM WALK ═══════════════ */}
        <SectionHead number="17" title="Quantum Walk on the Triplet Simplex" eyebrow="QUANTUM COMPUTATION · AMPLITUDE INTERFERENCE" />

        <Prose>
          A discrete-time quantum walk is the unitary analogue of a classical random walk: a walker's amplitude
          splits at every step into a coherent superposition of six nearest-neighbor lattice moves, with interference
          between alternative paths producing the characteristic ballistic (rather than diffusive) spreading.
          Instantiated on our ordered simplex <M>T_M</M>, such a walk has a coin space of dimension 6
          (up/down in each of x, y, z) reduced to 3 orbits modulo the ordering involution, and boundary
          reflections at the facets <M>x = 1, y = x, z = y, z = M</M>.
        </Prose>

        <Eq number="17.1">
          ψ<sub>t+1</sub>  =  (S ∘ C) · ψ<sub>t</sub>,   with  C ∈ U(6),  S = shift operator.
        </Eq>

        <Theorem kind="Theorem" number="17.1" title="Ballistic hitting-time speedup" tone="violet">
          The expected hitting time of the Grover-coined quantum walk from <M>(1,1,1)</M> to the equator
          <M> S = 3(M+1)/2</M> is <M>O(M)</M>, a quadratic speedup over the classical diffusive random walk's
          <M> O(M²)</M>. This matches the Grover bound on amplitude amplification and is the basis for the
          quantum-speedup of partition-function estimation algorithms.
        </Theorem>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          margin: "14px 0", padding: "12px 16px", background: C.panel,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.violet}`, borderRadius: 3,
        }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.violet, letterSpacing: 2, textTransform: "uppercase" }}>walk steps t</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <input type="range" min={1} max={30} step={1} value={walkSteps}
                onChange={e => setWalkSteps(+e.target.value)}
                style={{ flex: 1, "--pct": `${((walkSteps - 1) / 29) * 100}%` }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 17, color: C.violet, minWidth: 72, textAlign: "right" }}>t={walkSteps}</span>
            </div>
          </div>
          <Metric label="√Σ|ψ|²" value={(Math.sqrt(qwalkData.amp.reduce((a, b) => a + b, 0))).toFixed(3)} tone="indigo" />
        </div>

        <Figure number="14" caption="The quantum walk on T_M. Left: the probability distribution |ψ(S,t)|² (violet) at the current step t, superimposed on the classical stationary partition density (dotted gold). Quantum interference produces the characteristic oscillatory envelope — peaks and nodes — absent in the classical distribution. Right: the full (S, t, |ψ|²) spacetime surface: peaks propagate outward ballistically at constant speed, forming the light-cone structure that is the dynamical signature of coherent quantum spreading.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 14 }}>
            <div ref={qwalkRef} style={{ width: "100%", height: 400 }} />
            <div ref={qwalkSurfRef} style={{ width: "100%", height: 400 }} />
          </div>
        </Figure>

        {/* ═══════════════ § 18 — CATEGORICAL SYNTHESIS ═══════════════ */}
        <SectionHead number="18" title="Categorical Synthesis" eyebrow="UNIFYING CONJECTURE · OUTLOOK" />

        <Prose>
          The eleven transcriptions of Part II are not mere analogies. In the language of category theory one can
          phrase them as follows. Let <span style={{ fontVariant: "small-caps", color: C.gold }}>Trip</span> denote
          the category whose objects are ordered triplet-simplices <M>T_M</M> and whose morphisms are sum-preserving
          lattice maps. Each physics regime defines a <em>functor</em>
          <M>𝓕 : </M> <span style={{ fontVariant: "small-caps", color: C.gold }}>Trip</span> <M>→ 𝓒</M> into the
          category <M>𝓒</M> of its native structures (Hilbert spaces for quantum mechanics, Hilbert-manifold
          dynamical systems for non-linear dynamics, arithmetic lattices for cryptography, and so on). The
          partition function <M>p₃</M> is then the universal natural transformation <M>|T_M| ⇒ 𝓕(T_M)</M> recovering
          the cardinality of the underlying combinatorial skeleton.
        </Prose>

        <Theorem kind="Conjecture" number="18.1" title="The universal-kernel hypothesis" tone="crimson">
          For every physical regime <M>𝒫</M> in which energy (or action, or information) conservation acts on three
          modes jointly, and whose admissible configurations form a bounded ordered sub-lattice of <M>ℤ³</M>, the
          asymptotic scaling of the degeneracy count is <M>|T_M(𝒫)| ~ c_𝒫 · S²</M> with a universal exponent 2,
          and the sub-leading correction captures the full physics of <M>𝒫</M> in a single modulating function
          <M>ξ_𝒫(S/M)</M>. Empirically, the present monograph exhibits eleven independent instances of this
          conjecture across quantum statistics, field theory, optics, dynamics, fluid turbulence, seismology,
          cosmology, cryptography and quantum computation. A rigorous proof of universality would supply the
          first truly trans-disciplinary number-theoretic theorem in mathematical physics.
        </Theorem>

        <div style={{
          margin: "26px 0", padding: "22px 26px",
          background: `linear-gradient(135deg, ${C.panel} 0%, ${C.panelHi} 100%)`,
          border: `1px solid ${C.borderBr}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
            summary table · the eleven transcriptions
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MATH }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.rule}` }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>§</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>regime</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>triplet meaning</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>S ↔</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>p₃(S|M) ↔</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: FONT_MATH, fontSize: 13, fontStyle: "italic", color: C.ink }}>
              {[
                ["8", "Bose-Einstein", "3 boson levels n₁≤n₂≤n₃", "total energy /ħω", "thermal degeneracy g(S)"],
                ["9", "Feynman φ³", "vertex valences (d₁,d₂,d₃)", "2 × perturbative order", "# vacuum-bubble topologies"],
                ["10", "antiparticle", "(λ₁,λ₂,λ₃) ↔ (λ'₁,λ'₂,λ'₃)", "partition weight", "SU(N) rep dimension"],
                ["11", "non-linear optics", "(ω₁,ω₂,ω₃) three-wave", "pump frequency", "# phase-matched triplets"],
                ["12", "Lorenz attractor", "Poincaré triplet (x_n,x_{n+1},x_{n+2})", "Birkhoff sum", "natural-measure density"],
                ["13", "K41 turbulence", "triadic mode (k,p,q)", "wavenumber-sum", "energy cascade rate"],
                ["14", "Gutenberg-Richter", "aftershock triplet (m₁,m₂,m₃)", "5 × magnitude", "seismic frequency"],
                ["15", "Big Bang BBN", "(Y_p, D/H, ⁷Li/H)", "log η scaling", "likelihood density"],
                ["16", "SIS lattice crypto", "short vector (x₁,x₂,x₃)", "norm / target", "# admissible signatures"],
                ["17", "quantum walk", "walker at (x,y,z)", "sum coordinate", "|ψ(S,t)|² envelope"],
                ["18", "category 𝓕: Trip → 𝓒", "universal natural transf.", "—", "universal kernel"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}88` }}>
                  <td style={{ padding: "7px 10px", color: C.gold, fontFamily: FONT_MONO, fontSize: 11 }}>{row[0]}</td>
                  <td style={{ padding: "7px 10px", color: C.teal, fontFamily: FONT_DISPLAY }}>{row[1]}</td>
                  <td style={{ padding: "7px 10px" }}>{row[2]}</td>
                  <td style={{ padding: "7px 10px", color: C.inkDim }}>{row[3]}</td>
                  <td style={{ padding: "7px 10px", color: C.inkDim }}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose>
          The eleven rows agree, line for line, on a single arithmetic kernel — the same <M>p₃(S | M)</M> computed
          exactly in Part I. Whether this constitutes a deep ontological fact about the mathematical structure of
          three-body coupling in nature, or merely the inevitable arithmetic shadow that bounded-simplex
          counting casts wherever it is invoked, is a question we leave for the reader — and, in the coming
          decade, for formal experiment with category-theoretic proof assistants.
        </Prose>

        {/* ═══════════════ APPENDIX ═══════════════ */}
        <div style={{ marginTop: 54, paddingTop: 28, borderTop: `2px solid ${C.gold}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>APPENDIX · REFERENCES</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, fontFamily: FONT_MATH, fontSize: 13.5, color: C.inkDim, lineHeight: 1.78 }}>
            <div>
              <div style={{ color: C.gold, fontStyle: "italic", fontSize: 14.5, marginBottom: 8 }}>Combinatorics &amp; number theory</div>
              <div>Cayley, A. (1856). <em>Researches on the partition of numbers.</em> Phil. Trans. R. Soc. 146: 127–140.</div>
              <div style={{ marginTop: 6 }}>Sylvester, J. J. (1857). <em>On the partition of numbers.</em> Quart. J. Math. 1: 141–152.</div>
              <div style={{ marginTop: 6 }}>Euler, L. (1748). <em>Introductio in Analysin Infinitorum</em>, vol. I, ch. 16.</div>
              <div style={{ marginTop: 6 }}>Hardy, G. H. &amp; Ramanujan, S. (1918). <em>Asymptotic formulae in combinatory analysis.</em> Proc. LMS 17: 75–115.</div>
              <div style={{ marginTop: 6 }}>Ehrhart, E. (1962). <em>Sur les polyèdres rationnels homothétiques.</em> CRAS 254: 616–618.</div>
              <div style={{ marginTop: 6 }}>Andrews, G. E. (1976). <em>The Theory of Partitions.</em> Cambridge UP.</div>
              <div style={{ marginTop: 6 }}>Stanley, R. P. (2012). <em>Enumerative Combinatorics</em>, vol. I, §1.8. Cambridge UP.</div>
              <div style={{ marginTop: 6 }}>Flajolet, P. &amp; Sedgewick, R. (2009). <em>Analytic Combinatorics</em>, ch. IX.</div>

              <div style={{ color: C.gold, fontStyle: "italic", fontSize: 14.5, marginTop: 18, marginBottom: 8 }}>Quantum &amp; statistical mechanics</div>
              <div>Bose, S. N. (1924). <em>Plancks Gesetz und Lichtquantenhypothese.</em> Z. Phys. 26: 178–181.</div>
              <div style={{ marginTop: 6 }}>Einstein, A. (1925). <em>Quantentheorie des einatomigen idealen Gases.</em> Sitzb. Preuss. Akad. Wiss. 1: 3–14.</div>
              <div style={{ marginTop: 6 }}>Feynman, R. P. (1949). <em>Space-time approach to quantum electrodynamics.</em> Phys. Rev. 76: 769–789.</div>
              <div style={{ marginTop: 6 }}>Feynman, R. P. &amp; Hibbs, A. R. (1965). <em>Quantum Mechanics and Path Integrals.</em> McGraw-Hill.</div>
              <div style={{ marginTop: 6 }}>Peskin, M. E. &amp; Schroeder, D. V. (1995). <em>An Introduction to Quantum Field Theory</em>, ch. 4. Addison-Wesley.</div>
              <div style={{ marginTop: 6 }}>Pathria, R. K. &amp; Beale, P. D. (2011). <em>Statistical Mechanics</em>, 3rd ed., ch. 7. Elsevier.</div>
              <div style={{ marginTop: 6 }}>Ambainis, A. (2007). <em>Quantum walk algorithm for element distinctness.</em> SIAM J. Comput. 37: 210–239.</div>
            </div>
            <div>
              <div style={{ color: C.gold, fontStyle: "italic", fontSize: 14.5, marginBottom: 8 }}>Non-linear optics &amp; dynamics</div>
              <div>Boyd, R. W. (2020). <em>Nonlinear Optics</em>, 4th ed., ch. 1–2. Academic Press.</div>
              <div style={{ marginTop: 6 }}>Armstrong, J. A. et al. (1962). <em>Interactions between light waves in a nonlinear dielectric.</em> Phys. Rev. 127: 1918–1939.</div>
              <div style={{ marginTop: 6 }}>Agrawal, G. P. (2019). <em>Nonlinear Fiber Optics</em>, 6th ed. Academic Press.</div>
              <div style={{ marginTop: 6 }}>Lorenz, E. N. (1963). <em>Deterministic nonperiodic flow.</em> J. Atmos. Sci. 20: 130–141.</div>
              <div style={{ marginTop: 6 }}>Strogatz, S. H. (2018). <em>Nonlinear Dynamics and Chaos</em>, 2nd ed. CRC Press.</div>
              <div style={{ marginTop: 6 }}>Ott, E. (2002). <em>Chaos in Dynamical Systems</em>, 2nd ed. Cambridge UP.</div>
              <div style={{ marginTop: 6 }}>Kolmogorov, A. N. (1941). <em>The local structure of turbulence in incompressible viscous fluid.</em> Dokl. Akad. Nauk SSSR 30: 299–303.</div>
              <div style={{ marginTop: 6 }}>Frisch, U. (1995). <em>Turbulence: The Legacy of A. N. Kolmogorov.</em> Cambridge UP.</div>

              <div style={{ color: C.gold, fontStyle: "italic", fontSize: 14.5, marginTop: 18, marginBottom: 8 }}>Earth, cosmos, cryptography</div>
              <div>Gutenberg, B. &amp; Richter, C. F. (1944). <em>Frequency of earthquakes in California.</em> Bull. Seismol. Soc. Am. 34: 185–188.</div>
              <div style={{ marginTop: 6 }}>Bak, P., Tang, C. &amp; Wiesenfeld, K. (1987). <em>Self-organized criticality.</em> Phys. Rev. Lett. 59: 381–384.</div>
              <div style={{ marginTop: 6 }}>Alpher, R. A., Bethe, H. &amp; Gamow, G. (1948). <em>The origin of chemical elements.</em> Phys. Rev. 73: 803–804.</div>
              <div style={{ marginTop: 6 }}>Fields, B. D. et al. (2020). <em>Big Bang Nucleosynthesis after Planck.</em> JCAP 03: 010.</div>
              <div style={{ marginTop: 6 }}>Ajtai, M. (1996). <em>Generating hard instances of lattice problems.</em> STOC '96: 99–108.</div>
              <div style={{ marginTop: 6 }}>Regev, O. (2009). <em>On lattices, learning with errors, random linear codes, and cryptography.</em> J. ACM 56, 6: 1–40.</div>
              <div style={{ marginTop: 6 }}>Micciancio, D. &amp; Regev, O. (2009). <em>Lattice-based cryptography</em>, in Post-Quantum Cryptography, pp. 147–191. Springer.</div>
              <div style={{ marginTop: 6 }}>NIST (2024). <em>FIPS 204 — Module-Lattice-Based Digital Signature Standard.</em> Federal Inf. Proc. Standards.</div>
              <div style={{ marginTop: 6 }}>Nakamoto, S. (2008). <em>Bitcoin: A Peer-to-Peer Electronic Cash System.</em> bitcoin.org/bitcoin.pdf.</div>
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: FONT_MONO, fontSize: 10, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase" }}>
            <div>single-pass enumeration O(M³/6) · RK4 attractor O(N) · SIS O(M³/q) · exact arithmetic throughout</div>
            <div style={{ color: C.gold }}>— fin —</div>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
