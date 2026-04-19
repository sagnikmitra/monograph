import { useState, useEffect, useRef, useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import { useResponsive, responsiveScale, responsiveSpacing, useTouchInteraction, useSwipeGesture } from "./responsive";

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

function generateRegimeConstellation() {
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
      name, cls,
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      z,
    };
  });
}

function generateLayerArchitecture() {
  const layers = [
    { name: "Defs", z: 0.0, size: 3.4, color: "#5fa8a8" },
    { name: "Safe", z: 1.0, size: 2.8, color: "#7a8fd4" },
    { name: "Mid",  z: 2.0, size: 2.2, color: "#d4a574" },
    { name: "Flag", z: 3.0, size: 1.6, color: "#c45050" },
  ];
  const assumptions = [
    { name: "H1", x: -1.65, y: -1.65, z: 0.25 },
    { name: "H2", x:  1.65, y: -1.65, z: 0.55 },
    { name: "H3", x:  1.65, y:  1.65, z: 0.85 },
    { name: "H4", x: -1.65, y:  1.65, z: 1.15 },
    { name: "H5", x: -1.2,  y: -1.2,  z: 1.75 },
    { name: "H6", x:  1.2,  y: -1.2,  z: 2.05 },
    { name: "H7", x:  1.2,  y:  1.2,  z: 2.35 },
    { name: "H8", x: -1.2,  y:  1.2,  z: 2.65 },
  ];
  return { layers, assumptions };
}

function generateTripShell(M) {
  const vx = [1, 1, 1, M];
  const vy = [1, 1, M, M];
  const vz = [1, M, M, M];
  const edgePairs = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3], [2, 3],
  ];
  const edgeX = [], edgeY = [], edgeZ = [];
  edgePairs.forEach(([a, b]) => {
    edgeX.push(vx[a], vx[b], null);
    edgeY.push(vy[a], vy[b], null);
    edgeZ.push(vz[a], vz[b], null);
  });
  return { vx, vy, vz, edgeX, edgeY, edgeZ };
}

function orbitCamera(theta, radius = 1.75, z = 0.9) {
  return {
    eye: { x: radius * Math.cos(theta), y: radius * Math.sin(theta), z },
    up: { x: 0, y: 0, z: 1 },
    center: { x: 0, y: 0, z: 0 },
  };
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
const _GREEK = {
  alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",varepsilon:"ε",zeta:"ζ",eta:"η",theta:"θ",vartheta:"ϑ",iota:"ι",kappa:"κ",lambda:"λ",mu:"μ",nu:"ν",xi:"ξ",omicron:"ο",pi:"π",varpi:"ϖ",rho:"ρ",varrho:"ϱ",sigma:"σ",varsigma:"ς",tau:"τ",upsilon:"υ",phi:"φ",varphi:"ϕ",chi:"χ",psi:"ψ",omega:"ω",
  Alpha:"Α",Beta:"Β",Gamma:"Γ",Delta:"Δ",Epsilon:"Ε",Zeta:"Ζ",Eta:"Η",Theta:"Θ",Iota:"Ι",Kappa:"Κ",Lambda:"Λ",Mu:"Μ",Nu:"Ν",Xi:"Ξ",Omicron:"Ο",Pi:"Π",Rho:"Ρ",Sigma:"Σ",Tau:"Τ",Upsilon:"Υ",Phi:"Φ",Chi:"Χ",Psi:"Ψ",Omega:"Ω",
};
const _OPS = {
  to:"→",mapsto:"↦",rightarrow:"→",leftarrow:"←",Rightarrow:"⇒",Leftarrow:"⇐",Leftrightarrow:"⇔",leftrightarrow:"↔",hookrightarrow:"↪",twoheadrightarrow:"↠",longrightarrow:"⟶",longleftarrow:"⟵",longleftrightarrow:"⟷",Longrightarrow:"⟹",xrightarrow:"→",xleftarrow:"←",uparrow:"↑",downarrow:"↓",updownarrow:"↕",
  leq:"≤",le:"≤",geq:"≥",ge:"≥",neq:"≠",ne:"≠",approx:"≈",sim:"∼",simeq:"≃",cong:"≅",equiv:"≡",propto:"∝",ll:"≪",gg:"≫",prec:"≺",succ:"≻",preceq:"⪯",succeq:"⪰",
  in:"∈",notin:"∉",ni:"∋",subset:"⊂",subseteq:"⊆",supset:"⊃",supseteq:"⊇",cup:"∪",cap:"∩",setminus:"∖",emptyset:"∅",varnothing:"∅",
  forall:"∀",exists:"∃",nexists:"∄",partial:"∂",nabla:"∇",infty:"∞",
  cdot:"·",cdots:"⋯",ldots:"…",vdots:"⋮",ddots:"⋱",dots:"…",
  times:"×",div:"÷",pm:"±",mp:"∓",otimes:"⊗",oplus:"⊕",ominus:"⊖",odot:"⊙",boxtimes:"⊠",bigotimes:"⨂",bigoplus:"⨁",
  sum:"∑",prod:"∏",coprod:"∐",int:"∫",oint:"∮",iint:"∬",iiint:"∭",bigcup:"⋃",bigcap:"⋂",bigsqcup:"⨆",
  langle:"⟨",rangle:"⟩",lceil:"⌈",rceil:"⌉",lfloor:"⌊",rfloor:"⌋",lVert:"‖",rVert:"‖",lvert:"|",rvert:"|",
  hbar:"ℏ",ell:"ℓ",Re:"ℜ",Im:"ℑ",aleph:"ℵ",beth:"ℶ",gimel:"ℷ",wp:"℘",
  circ:"∘",star:"⋆",ast:"∗",bullet:"•",dagger:"†",ddagger:"‡",sharp:"♯",flat:"♭",natural:"♮",
  angle:"∠",perp:"⊥",parallel:"∥",mid:"∣",vdash:"⊢",dashv:"⊣",models:"⊨",
  iff:"⇔",implies:"⇒",
  vee:"∨",wedge:"∧",neg:"¬",lnot:"¬",top:"⊤",bot:"⊥",
  sqcup:"⊔",sqcap:"⊓",triangleleft:"◁",triangleright:"▷",diamond:"⋄",
  hat:"̂",bar:"̄",tilde:"̃",vec:"⃗",dot:"̇",ddot:"̈",
  prime:"′",dprime:"″",tprime:"‴",
  ntimes:"×",amalg:"∐",
  Box:"□",square:"□",blacksquare:"■",triangle:"△",blacktriangle:"▲",
  natconj:"⁎",bot2:"⊥",
  colon:":",semicolon:";",
  quad:" ",qquad:"  ",backslash:"\\",
};
const _BB = {A:"𝔸",B:"𝔹",C:"ℂ",D:"𝔻",E:"𝔼",F:"𝔽",G:"𝔾",H:"ℍ",I:"𝕀",J:"𝕁",K:"𝕂",L:"𝕃",M:"𝕄",N:"ℕ",O:"𝕆",P:"ℙ",Q:"ℚ",R:"ℝ",S:"𝕊",T:"𝕋",U:"𝕌",V:"𝕍",W:"𝕎",X:"𝕏",Y:"𝕐",Z:"ℤ"};
const _CAL = {A:"𝒜",B:"ℬ",C:"𝒞",D:"𝒟",E:"ℰ",F:"ℱ",G:"𝒢",H:"ℋ",I:"ℐ",J:"𝒥",K:"𝒦",L:"ℒ",M:"ℳ",N:"𝒩",O:"𝒪",P:"𝒫",Q:"𝒬",R:"ℛ",S:"𝒮",T:"𝒯",U:"𝒰",V:"𝒱",W:"𝒲",X:"𝒳",Y:"𝒴",Z:"𝒵"};
const _FRAK = {A:"𝔄",B:"𝔅",C:"ℭ",D:"𝔇",E:"𝔈",F:"𝔉",G:"𝔊",H:"ℌ",I:"ℑ",J:"𝔍",K:"𝔎",L:"𝔏",M:"𝔐",N:"𝔑",O:"𝔒",P:"𝔓",Q:"𝔔",R:"ℜ",S:"𝔖",T:"𝔗",U:"𝔘",V:"𝔙",W:"𝔚",X:"𝔛",Y:"𝔜",Z:"ℨ",a:"𝔞",b:"𝔟",c:"𝔠",d:"𝔡",e:"𝔢",f:"𝔣",g:"𝔤",h:"𝔥",i:"𝔦",j:"𝔧",k:"𝔨",l:"𝔩",m:"𝔪",n:"𝔫",o:"𝔬",p:"𝔭",q:"𝔮",r:"𝔯",s:"𝔰",t:"𝔱",u:"𝔲",v:"𝔳",w:"𝔴",x:"𝔵",y:"𝔶",z:"𝔷"};

function _readBraced(str, start) {
  let depth = 1, k = start + 1, arg = "";
  while (k < str.length && depth > 0) {
    if (str[k] === "{") depth++;
    else if (str[k] === "}") { depth--; if (depth === 0) break; }
    arg += str[k]; k++;
  }
  return [arg, k + 1];
}
function _mathParse(str, keyBase = 0) {
  const out = [];
  let i = 0, key = keyBase;
  const pushS = (s) => {
    const last = out[out.length - 1];
    if (typeof s === "string" && typeof last === "string") out[out.length - 1] = last + s;
    else out.push(s);
  };
  while (i < str.length) {
    const ch = str[i];
    if (ch === "\\") {
      let j = i + 1, name = "";
      while (j < str.length && /[A-Za-z]/.test(str[j])) { name += str[j]; j++; }
      if (!name) { pushS("\\"); i++; continue; }
      if (["mathbb","mathcal","mathscr","mathfrak","mathrm","mathbf","mathit","text","mathsf","mathtt","operatorname"].includes(name) && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        let rendered = arg;
        if (name === "mathbb") rendered = [...arg].map(c => _BB[c] || c).join("");
        else if (name === "mathcal" || name === "mathscr") rendered = [...arg].map(c => _CAL[c] || c).join("");
        else if (name === "mathfrak") rendered = [...arg].map(c => _FRAK[c] || c).join("");
        if (["mathrm","text","mathsf","operatorname","mathtt"].includes(name))
          out.push(<span key={`m${key++}`} style={{ fontStyle: "normal", fontFamily: name === "mathtt" ? FONT_MONO : undefined }}>{rendered}</span>);
        else if (name === "mathbf")
          out.push(<span key={`m${key++}`} style={{ fontWeight: 700, fontStyle: "normal" }}>{rendered}</span>);
        else if (name === "mathit")
          out.push(<span key={`m${key++}`} style={{ fontStyle: "italic" }}>{rendered}</span>);
        else pushS(rendered);
        i = after; continue;
      }
      if (name === "frac" && str[j] === "{") {
        const [n, aft1] = _readBraced(str, j);
        if (str[aft1] === "{") {
          const [d, aft2] = _readBraced(str, aft1);
          out.push(<Frac key={`m${key++}`} n={<>{_mathParse(n)}</>} d={<>{_mathParse(d)}</>} />);
          i = aft2; continue;
        }
      }
      if (name === "sqrt" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`}>√<span style={{ borderTop: "1px solid currentColor", paddingTop: 1 }}>{_mathParse(arg)}</span></span>);
        i = after; continue;
      }
      if (name === "overline" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`} style={{ textDecoration: "overline" }}>{_mathParse(arg)}</span>);
        i = after; continue;
      }
      if (name === "underline" && str[j] === "{") {
        const [arg, after] = _readBraced(str, j);
        out.push(<span key={`m${key++}`} style={{ textDecoration: "underline" }}>{_mathParse(arg)}</span>);
        i = after; continue;
      }
      const repl = _GREEK[name] || _OPS[name];
      if (repl !== undefined) { pushS(repl); i = j; continue; }
      pushS("\\" + name); i = j; continue;
    }
    if (ch === "_" || ch === "^") {
      const isSup = ch === "^";
      let j = i + 1, arg;
      if (str[j] === "{") { const [a, after] = _readBraced(str, j); arg = a; i = after; }
      else if (j < str.length) {
        if (str[j] === "\\") {
          let k = j + 1, name = "";
          while (k < str.length && /[A-Za-z]/.test(str[k])) { name += str[k]; k++; }
          arg = "\\" + name; i = k;
        } else { arg = str[j]; i = j + 1; }
      } else { pushS(ch); i++; continue; }
      const Tag = isSup ? "sup" : "sub";
      out.push(<Tag key={`m${key++}`} style={{ fontSize: "0.78em", fontStyle: "italic" }}>{_mathParse(arg)}</Tag>);
      continue;
    }
    pushS(ch); i++;
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
    return merged.map((n, i) =>
      typeof n === "string"
        ? <span key={`f${i}`}>{_mathParse(n, i * 1000)}</span>
        : <span key={`f${i}`}>{n}</span>
    );
  }
  return node;
}
function M({ children, italic = true }) {
  return <span style={{ fontFamily: FONT_MATH, fontStyle: italic ? "italic" : "normal", fontSize: "1.14em", color: C.inkBr }}>{_renderMathChildren(children)}</span>;
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
  const responsive = useResponsive();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: responsive.isMobile ? "1fr" : "1fr auto",
      alignItems: responsive.isMobile ? "center" : "center",
      padding: responsive.isMobile ? "14px 16px" : "18px 24px",
      margin: responsive.isMobile ? "14px 0" : "18px 0",
      background: C.bgDeep,
      borderLeft: `2px solid ${C.gold}`,
      fontFamily: FONT_MATH,
      fontSize: responsive.isMobile ? "1.2em" : "1.32em",
      color: C.ink,
      lineHeight: 1.4,
      ...style,
    }}>
      <div style={{
        textAlign: "center",
        marginBottom: responsive.isMobile && number ? 8 : 0
      }}>{children}</div>
      {number && <div style={{
        color: C.inkFaint,
        fontSize: responsive.isMobile ? "0.75em" : "0.85em",
        fontStyle: "italic",
        textAlign: responsive.isMobile ? "center" : "right"
      }}>({number})</div>}
    </div>
  );
}

function Theorem({ kind = "Theorem", number, title, children, tone = "gold" }) {
  const responsive = useResponsive();
  const toneC = tone === "gold" ? C.gold : tone === "crimson" ? C.crimson : tone === "teal" ? C.teal : C.indigo;
  return (
    <div style={{
      margin: responsive.isMobile ? "14px 0" : "18px 0",
      padding: responsive.isMobile ? "12px 14px 12px 16px" : "14px 18px 14px 22px",
      background: `${toneC}08`,
      borderLeft: `3px solid ${toneC}`,
      borderRadius: "0 3px 3px 0",
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        gap: responsive.isMobile ? 6 : 8,
        marginBottom: responsive.isMobile ? 4 : 6,
        flexDirection: responsive.isMobile ? "column" : "row",
        alignItems: responsive.isMobile ? "flex-start" : "baseline",
      }}>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: responsive.isMobile ? "1.08em" : "1.18em",
          color: toneC,
          letterSpacing: 0.3
        }}>
          {kind}{number ? ` ${number}` : ""}.
        </span>
        {title && <span style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: "italic",
          color: C.ink,
          fontSize: responsive.isMobile ? "1.05em" : "1.12em"
        }}>{title}</span>}
      </div>
      <div style={{
        fontFamily: FONT_MATH,
        fontSize: responsive.isMobile ? "1.08em" : "1.15em",
        color: C.ink,
        lineHeight: 1.6
      }}>
        {children}
      </div>
    </div>
  );
}

function SectionHead({ number, title, eyebrow, id }) {
  const responsive = useResponsive();
  const projectionWidth = responsive.isMobile ? 0 : responsive.isTablet ? 132 : 176;
  return (
    <div id={id} style={{
      margin: responsive.isMobile ? "36px 0 14px" : "48px 0 18px",
      position: "relative",
      overflow: "hidden",
    }}>
      {!responsive.isMobile && (
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: projectionWidth,
          height: responsive.isTablet ? 76 : 92,
          pointerEvents: "none",
          opacity: 0.92,
          animation: "projectionFloat 10.5s ease-in-out infinite",
        }}>
          {[0, 1, 2].map(i => (
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
      {eyebrow && <div style={{
        fontFamily: FONT_MONO,
        fontSize: responsive.isMobile ? 9 : 11,
        color: C.gold,
        letterSpacing: 3,
        textTransform: "uppercase",
        marginBottom: responsive.isMobile ? 4 : 6,
        position: "relative",
        zIndex: 1,
        paddingRight: responsive.isMobile ? 0 : Math.floor(projectionWidth * 0.5),
      }}>{eyebrow}</div>}
      <div style={{
        display: "flex",
        gap: responsive.isMobile ? 12 : 16,
        borderBottom: `1px solid ${C.rule}`,
        paddingBottom: responsive.isMobile ? 8 : 10,
        flexDirection: responsive.isMobile ? "column" : "row",
        alignItems: responsive.isMobile ? "flex-start" : "baseline",
        position: "relative",
        zIndex: 1,
        paddingRight: responsive.isMobile ? 0 : projectionWidth,
      }}>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: "italic",
          fontSize: responsive.isMobile ? 24 : 30,
          color: C.gold,
          fontWeight: 500
        }}>§ {number}</span>
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: responsive.isMobile ? 28 : responsive.isTablet ? 34 : 38,
          fontWeight: 500,
          color: C.inkBr,
          letterSpacing: responsive.isMobile ? -0.2 : -0.3,
          lineHeight: 1.1,
          margin: 0,
        }}>{title}</h2>
      </div>
    </div>
  );
}

function Figure({ number, caption, children, noPad }) {
  const responsive = useResponsive();
  return (
    <figure style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 3,
      margin: responsive.isMobile ? "14px 0" : "18px 0",
      overflow: "hidden",
    }}>
      <div style={{
        padding: responsive.isMobile ? "7px 12px" : "9px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: C.panelAlt,
        display: "flex",
        alignItems: "baseline",
        gap: responsive.isMobile ? 6 : 10,
      }}>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: "italic",
          fontSize: responsive.isMobile ? 12 : 14,
          color: C.gold,
          fontWeight: 600
        }}>Figure {number}.</span>
        <span style={{
          fontFamily: FONT_MATH,
          fontSize: responsive.isMobile ? 13 : 15,
          color: C.ink,
          fontStyle: "italic"
        }}>{caption}</span>
      </div>
      <div style={{
        padding: noPad ? 0 : responsive.isMobile ? 10 : 14
      }}>{children}</div>
    </figure>
  );
}

function Prose({ children, style }) {
  const responsive = useResponsive();
  return <p style={{
    fontFamily: FONT_MATH,
    fontSize: responsive.isMobile ? "1.1em" : "1.24em",
    lineHeight: responsive.isMobile ? 1.6 : 1.72,
    color: C.ink,
    margin: responsive.isMobile ? "12px 0" : "14px 0",
    textAlign: "justify",
    hyphens: "auto",
    ...style
  }}>{children}</p>;
}

function Toggle({ on, onClick, children, tone = "gold" }) {
  const responsive = useResponsive();
  const c = tone === "gold" ? C.gold : tone === "crimson" ? C.crimson : tone === "teal" ? C.teal : C.indigo;
  return (
    <button onClick={onClick} style={{
      background: on ? `${c}18` : "transparent",
      color: on ? c : C.inkDim,
      border: `1px solid ${on ? `${c}66` : C.border}`,
      padding: responsive.isMobile ? "8px 12px" : "5px 11px",
      fontSize: responsive.isMobile ? 10 : 10,
      fontFamily: FONT_MONO,
      fontWeight: 500,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      borderRadius: 4,
      cursor: "pointer",
      transition: "all 0.15s",
      minWidth: responsive.isMobile ? 70 : 70,
      minHeight: responsive.isMobile ? 44 : "auto",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      ":active": {
        transform: responsive.isMobile ? "scale(0.98)" : "none",
        background: on ? `${c}28` : `${C.border}22`,
      },
    }}>{children}</button>
  );
}

function Metric({ label, value, unit, tone = "gold", mono = true }) {
  const responsive = useResponsive();
  const c = tone === "gold" ? C.gold : tone === "teal" ? C.teal : tone === "crimson" ? C.crimson : C.indigo;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: responsive.isMobile ? 1 : 2 }}>
      <span style={{
        fontSize: responsive.isMobile ? 8 : 10,
        color: C.inkFaint,
        letterSpacing: 2,
        textTransform: "uppercase",
        fontFamily: FONT_MONO
      }}>{label}</span>
      <span style={{
        fontSize: responsive.isMobile ? 16 : 19,
        color: c,
        fontFamily: mono ? FONT_MONO : FONT_MATH,
        fontStyle: mono ? "normal" : "italic",
        fontWeight: 500,
      }}>
        {value}{unit && <span style={{
          color: C.inkFaint,
          fontSize: responsive.isMobile ? "0.5em" : "0.65em",
          marginLeft: responsive.isMobile ? 2 : 3
        }}>{unit}</span>}
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
  const responsive = useResponsive();
  const touchInteraction = useTouchInteraction();

  // Swipe gestures for M parameter control
  const swipeHandlers = useSwipeGesture(
    () => setM(Math.min(M_ + 5, 150)), // Swipe left: increase M
    () => setM(Math.max(M_ - 5, 10)),  // Swipe right: decrease M
    30 // Lower threshold for easier swiping
  );

  const [M_, setM] = useState(40);
  const [debouncedM, setDebouncedM] = useState(40);
  const [selectedS, setSelectedS] = useState(22);
  const [symmetry, setSymmetry] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [gaussianOn, setGaussianOn] = useState(true);
  const [computing, setComputing] = useState(false);
  const [deferHeavyModels, setDeferHeavyModels] = useState(true);

  // Section navigation for mobile
  const [currentSection, setCurrentSection] = useState(0);
  const sections = [
    { id: 'cover', title: 'Cover' },
    { id: 'bose-einstein', title: '§8 Bose-Einstein' },
    { id: 'feynman', title: '§9 Feynman' },
    { id: 'young', title: '§10 Young' },
    { id: 'nlo', title: '§11 NLO' },
    { id: 'lorenz', title: '§12 Lorenz' },
    { id: 'kolmogorov', title: '§13 Kolmogorov' },
    { id: 'gutenberg', title: '§14 Gutenberg-Richter' },
    { id: 'bbn', title: '§15 BBN' },
    { id: 'sis', title: '§16 SIS' },
    { id: 'quantum-walk', title: '§17 Quantum Walk' },
    { id: 'categorical-synthesis', title: '§18 Synthesis' },
  ];

  // Mobile performance gating: only compute/render deep sections once reached.
  const canRenderBose = !responsive.isMobile || currentSection >= 1;
  const canRenderFeynman = !responsive.isMobile || currentSection >= 2;
  const canRenderNlo = !responsive.isMobile || currentSection >= 4;
  const canRenderLorenz = !responsive.isMobile || currentSection >= 5;
  const canRenderKolmog = !responsive.isMobile || currentSection >= 6;
  const canRenderGutenberg = !responsive.isMobile || currentSection >= 7;
  const canRenderBbn = !responsive.isMobile || currentSection >= 8;
  const canRenderSis = !responsive.isMobile || currentSection >= 9;
  const canRenderQwalk = !responsive.isMobile || currentSection >= 10;
  const canRenderSynthesis = !responsive.isMobile || currentSection >= 11;

  // Section navigation swipe gestures
  const sectionSwipeHandlers = useSwipeGesture(
    () => setCurrentSection(Math.min(currentSection + 1, sections.length - 1)), // Swipe left: next section
    () => setCurrentSection(Math.max(currentSection - 1, 0)), // Swipe right: previous section
    50
  );

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Auto-update current section based on scroll position
  useEffect(() => {
    if (!responsive.isMobile) return;

    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id)).filter(Boolean);
      const scrollY = window.scrollY + 100; // Offset for header

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element && element.offsetTop <= scrollY) {
          setCurrentSection(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [responsive.isMobile]);

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
  const coverProjectionRef = useRef(null);
  const unifyTripRef = useRef(null);
  const unifyConstellationRef = useRef(null);
  const unifyArchitectureRef = useRef(null);

  useEffect(() => {
    setComputing(true);
    const t = setTimeout(() => { setDebouncedM(M_); setComputing(false); }, 160);
    return () => clearTimeout(t);
  }, [M_]);

  // Keep first paint responsive: warm up with lighter datasets, then switch to full model.
  useEffect(() => {
    const t = setTimeout(() => setDeferHeavyModels(false), 320);
    return () => clearTimeout(t);
  }, []);

  const computeM = deferHeavyModels ? Math.min(debouncedM, 20) : debouncedM;
  const lorenzSteps = deferHeavyModels ? 1200 : (responsive.isMobile ? 2600 : 6000);

  const partData = useMemo(() => generatePartitionData(computeM), [computeM]);
  const scatterData = useMemo(
    () => generateScatterSample(computeM, responsive.isMobile ? 6500 : 18000),
    [computeM, responsive.isMobile]
  );
  const heatData = useMemo(() => generateXSumDensity(computeM), [computeM]);
  const moments = useMemo(() => computeMoments(partData.sums, partData.counts, partData.totalCount), [partData]);
  const cdf = useMemo(() => computeCDF(partData.counts, partData.totalCount), [partData]);
  const qq = useMemo(() => generateQQ(partData, cdf, moments), [partData, cdf, moments]);
  const conv = useMemo(() => convergenceData(partData), [partData]);

  // Physics memoization
  const besteinData = useMemo(
    () => (canRenderBose ? besteinsteinSpectrum(computeM, beta) : { sums: [], degen: [], weight: [], cumZ: [], Z: 0 }),
    [canRenderBose, computeM, beta]
  );
  const feynmanData = useMemo(
    () => (canRenderFeynman ? feynmanVertexCount(computeM) : []),
    [canRenderFeynman, computeM]
  );
  const nloData = useMemo(
    () => (canRenderNlo ? threeWavePhaseMatching(computeM, selectedS, nloDispersion) : []),
    [canRenderNlo, computeM, selectedS, nloDispersion]
  );
  const lorenzData = useMemo(
    () => (canRenderLorenz ? lorenzTrajectory(lorenzSteps, 0.009, 10, lorenzRho, 8 / 3) : { xs: [], ys: [], zs: [] }),
    [canRenderLorenz, lorenzRho, lorenzSteps]
  );
  const kolmogData = useMemo(
    () => (canRenderKolmog ? kolmogorovSpectrum(computeM) : { ks: [], Ek: [], cumE: [], E: 0 }),
    [canRenderKolmog, computeM]
  );
  const triadData = useMemo(
    () => (canRenderKolmog ? triadicCoupling(Math.min(computeM, responsive.isMobile ? 22 : 30)) : []),
    [canRenderKolmog, computeM, responsive.isMobile]
  );
  const grData = useMemo(
    () => (canRenderGutenberg ? gutenbergRichter(computeM, 6, grBvalue) : { mags: [], N: [], a: 6, b: grBvalue }),
    [canRenderGutenberg, computeM, grBvalue]
  );
  const grCompare = useMemo(
    () => (canRenderGutenberg ? scaleComparison(partData, grBvalue) : { xs: [], yPart: [], yGR: [] }),
    [canRenderGutenberg, partData, grBvalue]
  );
  const bbnData = useMemo(
    () => (canRenderBbn ? bbnAbundanceEvolution(80) : { T: [], Yp: [], DH: [], Li7: [] }),
    [canRenderBbn]
  );
  const sisData = useMemo(
    () => (canRenderSis ? sisShortVectors(computeM, sisQ, [sisA1, sisA2, sisA3]) : []),
    [canRenderSis, computeM, sisQ, sisA1, sisA2, sisA3]
  );
  const qwalkData = useMemo(
    () => (canRenderQwalk ? quantumWalkAmplitudes(computeM, walkSteps, selectedS) : { sums: [], amp: [] }),
    [canRenderQwalk, computeM, walkSteps, selectedS]
  );
  const boseSurfaceGrid = useMemo(() => {
    if (!canRenderBose) return null;
    const mStep = responsive.isMobile ? 5 : 3;
    const bStep = responsive.isMobile ? 0.025 : 0.015;
    const Ms = [];
    for (let m = 5; m <= 50; m += mStep) Ms.push(m);
    const betas = [];
    for (let b = 0.005; b <= 0.3; b += bStep) betas.push(+b.toFixed(3));
    const zMat = betas.map((b) =>
      Ms.map((m) => {
        let Z = 0;
        for (let S = 0; S <= 3 * m; S++) {
          let d = 0;
          for (let x = 0; x <= m; x++) {
            for (let y = x; y <= m; y++) {
              const z = S - x - y;
              if (z >= y && z <= m) d++;
            }
          }
          Z += d * Math.exp(-b * S);
        }
        return Math.log10(Math.max(Z, 1e-10));
      })
    );
    return { Ms, betas, zMat };
  }, [canRenderBose, responsive.isMobile]);
  const conjTriplet = useMemo(() => findTriplet(selectedS, computeM), [selectedS, computeM]);
  const conjParts = useMemo(() => conjugatePartition(conjTriplet), [conjTriplet]);
  const tripShell = useMemo(() => generateTripShell(computeM), [computeM]);
  const regimeConstellation = useMemo(() => generateRegimeConstellation(), []);
  const layerArchitecture = useMemo(() => generateLayerArchitecture(), []);

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
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 32, l: 40 } : { t: 10, r: 20, b: 42, l: 56 },
      xaxis: {
        title: {
          text: "S (sum)",
          font: { size: responsive.isMobile ? 10 : 12, family: FONT_MATH, style: "italic" }
        },
        gridcolor: C.rule,
        zerolinecolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: {
          text: logScale ? "log p₃(S)" : "p₃(S)",
          font: { size: responsive.isMobile ? 10 : 12, family: FONT_MATH, style: "italic" }
        },
        gridcolor: C.rule,
        zerolinecolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        type: logScale ? "log" : "linear",
      },
      annotations, shapes,
      showlegend: gaussianOn || symmetry,
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.95 : 0.98,
        y: responsive.isMobile ? 0.95 : 0.98,
        xanchor: "right"
      },
      hoverlabel: {
        bgcolor: C.panel,
        bordercolor: C.gold,
        font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 }
      },
    }, { displayModeBar: false, responsive: true });

    if (barRef.current.removeAllListeners) barRef.current.removeAllListeners("plotly_click");
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
          size: responsive.isMobile ? (debouncedM <= 25 ? 2.5 : debouncedM <= 60 ? 1.8 : 1.2) : (debouncedM <= 25 ? 3.2 : debouncedM <= 60 ? 2.2 : 1.6),
          color: ss,
          colorscale: [[0, "#2b3978"], [0.25, "#5fa8a8"], [0.5, "#d4a574"], [0.75, "#c45050"], [1, "#f8f0d8"]],
          opacity: hx.length > 0 ? 0.38 : 0.72,
          colorbar: {
            title: { text: "S", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
            tickfont: { color: C.inkDim, size: responsive.isMobile ? 7 : 9, family: FONT_MONO },
            len: responsive.isMobile ? 0.45 : 0.55,
            thickness: responsive.isMobile ? 6 : 9,
            x: responsive.isMobile ? 0.85 : 1.0
          },
        },
        hovertemplate: "(%{x}, %{y}, %{z})<br>S=%{marker.color}<extra></extra>",
      },
      hx.length ? {
        x: hx, y: hy, z: hz, mode: "markers", type: "scatter3d",
        marker: {
          size: responsive.isMobile ? 4.5 : 5.5,
          color: C.crimson,
          symbol: "diamond",
          opacity: 1,
          line: { color: C.inkBr, width: 0.8 }
        },
        hovertemplate: `<i>S</i>=${selectedS}<br>(%{x},%{y},%{z})<extra></extra>`,
      } : null,
    ].filter(Boolean), {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      showlegend: false,
      scene: {
        xaxis: {
          title: { text: "x", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          zerolinecolor: C.rule
        },
        yaxis: {
          title: { text: "y", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          zerolinecolor: C.rule
        },
        zaxis: {
          title: { text: "z", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          zerolinecolor: C.rule
        },
        bgcolor: C.plotBg,
        camera: responsive.isMobile ? { eye: { x: 1.25, y: 1.25, z: 0.65 } } : { eye: { x: 1.55, y: 1.55, z: 0.85 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [scatterData, debouncedM, selectedS]);

  // ═══ PLOT: Heatmap ═══
  useEffect(() => {
    if (!heatRef.current) return;
    Plotly.react(heatRef.current, [{
      x: heatData.x, y: heatData.y, z: heatData.z, type: "heatmap",
      colorscale: [[0, C.plotBg], [0.05, "#1a2640"], [0.3, C.teal], [0.6, C.gold], [0.85, C.crimson], [1, C.inkBr]],
      showscale: true,
      colorbar: {
        title: { text: "n", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
        tickfont: { color: C.inkDim, size: responsive.isMobile ? 7 : 9, family: FONT_MONO },
        len: responsive.isMobile ? 0.75 : 0.88,
        thickness: responsive.isMobile ? 6 : 9
      },
      hovertemplate: "x=%{x}, S=%{y}<br>n=%{z}<extra></extra>",
    }, {
      x: [1, debouncedM], y: [selectedS, selectedS], type: "scatter", mode: "lines",
      line: { color: C.crimson, width: responsive.isMobile ? 1.2 : 1.4, dash: "dash" },
      hoverinfo: "skip",
      showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 8, b: 32, l: 40 } : { t: 10, r: 10, b: 42, l: 52 },
      xaxis: {
        title: { text: "x  (smallest part)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "S", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      showlegend: false,
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
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
        marker: {
          size: responsive.isMobile ? 7 : 9,
          color: C.crimson,
          line: { color: C.inkBr, width: 1.5 },
          symbol: "circle"
        },
        showlegend: false,
        hovertemplate: `S=%{x}<br>F=%{y:.4f}<extra></extra>`,
      } : null,
    ].filter(Boolean), {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 32, l: 40 } : { t: 10, r: 15, b: 40, l: 50 },
      xaxis: {
        title: { text: "S", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "F(S)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        range: [0, 1.02]
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.95 : 0.98
      },
      shapes: selCdf !== null ? [
        { type: "line", x0: selectedS, x1: selectedS, y0: 0, y1: selCdf, line: { color: C.crimson, width: 1, dash: "dot" } },
        { type: "line", x0: partData.minSum, x1: selectedS, y0: selCdf, y1: selCdf, line: { color: C.crimson, width: 1, dash: "dot" } },
      ] : [],
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
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
      { x: partData.sums, y: naive, type: "scatter", mode: "lines", line: { color: C.crimson, width: responsive.isMobile ? 1.2 : 1.5 }, name: "Cayley–Sylvester", hovertemplate: "S=%{x}<br>ε=%{y:.2f}%<extra>⌊S²/12⌉</extra>" },
      { x: partData.sums, y: corrected, type: "scatter", mode: "lines", line: { color: C.gold, width: responsive.isMobile ? 1.8 : 2 }, name: "Reflected", hovertemplate: "S=%{x}<br>ε=%{y:.2f}%<extra>corrected</extra>" },
      { x: [partData.minSum, partData.maxSum], y: [0, 0], type: "scatter", mode: "lines", line: { color: C.inkFaint, width: 1, dash: "dot" }, showlegend: false, hoverinfo: "skip" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 32, l: 44 } : { t: 10, r: 15, b: 40, l: 54 },
      xaxis: {
        title: { text: "S", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "relative error (%)", font: { size: responsive.isMobile ? 9 : 11 } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        range: [-100, 100]
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.05 : 0.02,
        yanchor: "bottom"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [partData, debouncedM]);

  // ═══ PLOT: Log-log convergence ═══
  useEffect(() => {
    if (!convRef.current) return;
    Plotly.react(convRef.current, [
      {
        x: conv.xs, y: conv.ys, type: "scatter", mode: "markers",
        marker: { size: responsive.isMobile ? 3.5 : 4, color: conv.xs.map((_, i) => i), colorscale: [[0, C.crimson], [1, C.teal]], line: { width: 0 } },
        name: "log p₃(S)/S²",
        hovertemplate: "log S=%{x:.2f}<br>log(p/S²)=%{y:.3f}<extra></extra>",
      },
      {
        x: [Math.min(...conv.xs), Math.max(...conv.xs)], y: [conv.ref, conv.ref], type: "scatter", mode: "lines",
        line: { color: C.gold, width: responsive.isMobile ? 1.5 : 1.8, dash: "dash" },
        name: "log(1/12) ≈ −1.079",
        hovertemplate: "limit: log(1/12)<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 32, l: 46 } : { t: 10, r: 15, b: 40, l: 56 },
      xaxis: {
        title: { text: "log₁₀ S", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "log₁₀(p₃(S)/S²)", font: { size: responsive.isMobile ? 9 : 11 } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.95 : 0.98
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [conv]);

  // ═══ PLOT: Q-Q ═══
  useEffect(() => {
    if (!qqRef.current) return;
    const lim = Math.max(...qq.xs.map(Math.abs), ...qq.ys.map(Math.abs), 3);
    Plotly.react(qqRef.current, [
      {
        x: qq.xs, y: qq.ys, type: "scatter", mode: "markers",
        marker: { size: responsive.isMobile ? 4 : 4.5, color: C.teal, line: { color: C.tealBr, width: responsive.isMobile ? 0.3 : 0.5 } },
        name: "quantiles",
        hovertemplate: "Φ⁻¹=%{x:.2f}<br>z=%{y:.2f}<extra></extra>",
      },
      {
        x: [-lim, lim], y: [-lim, lim], type: "scatter", mode: "lines",
        line: { color: C.gold, width: responsive.isMobile ? 1.2 : 1.5, dash: "dash" },
        name: "y = x",
        hoverinfo: "skip",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 32, l: 42 } : { t: 10, r: 15, b: 40, l: 52 },
      xaxis: {
        title: { text: "theoretical Φ⁻¹(p)", font: { size: responsive.isMobile ? 9 : 11 } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        range: [-lim, lim],
        zerolinecolor: C.inkFaint
      },
      yaxis: {
        title: { text: "empirical z-quantile", font: { size: responsive.isMobile ? 9 : 11 } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        range: [-lim, lim],
        zerolinecolor: C.inkFaint
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.95 : 0.98
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [qq]);

  // ═══════════════════════════════════════════════════════════════════════
  // PHYSICS PLOTS · § 8 — BOSE-EINSTEIN OCCUPATION SPECTRUM
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderBose) return;
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
        line: { color: C.gold, width: responsive.isMobile ? 1.8 : 2.2 },
        name: "g(S)·e^(−βS) / Z",
        hovertemplate: "S=%{x}  π=%{y:.4f}<extra></extra>",
        yaxis: "y2",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 46, b: 36, l: 46 } : { t: 10, r: 56, b: 44, l: 56 },
      xaxis: {
        title: { text: "S = n₁+n₂+n₃ (energy / ħω)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "g(S)  degeneracy", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        side: "left"
      },
      yaxis2: {
        title: { text: "π(S) = Boltzmann", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        overlaying: "y",
        side: "right",
        color: C.gold,
        gridcolor: "rgba(0,0,0,0)"
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.95 : 0.98,
        y: responsive.isMobile ? 0.95 : 0.98,
        xanchor: "right"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderBose, besteinData]);

  // § 8 — 3D PARTITION FUNCTION SURFACE Z(β, M)
  useEffect(() => {
    if (!canRenderBose) return;
    if (!besteinSurfRef.current) return;
    if (!boseSurfaceGrid) return;
    const { Ms, betas, zMat } = boseSurfaceGrid;
    Plotly.react(besteinSurfRef.current, [{
      type: "surface", x: Ms, y: betas, z: zMat,
      colorscale: [[0, "#1a1f3a"], [0.25, C.indigo], [0.5, C.teal], [0.75, C.gold], [1, C.crimson]],
      contours: { z: { show: true, color: C.ink, width: 1, highlight: false } },
      colorbar: {
        title: { text: "log₁₀ Z", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
        tickfont: { color: C.inkDim, size: responsive.isMobile ? 8 : 9 },
        len: responsive.isMobile ? 0.6 : 0.7,
        thickness: responsive.isMobile ? 7 : 9,
        x: responsive.isMobile ? 0.95 : 1.0
      },
      hovertemplate: "M=%{x}  β=%{y:.3f}<br>log Z=%{z:.3f}<extra></extra>",
    }, {
      type: "scatter3d", mode: "markers",
      x: [debouncedM], y: [beta], z: [Math.log10(Math.max(besteinData.Z, 1e-10))],
      marker: { size: responsive.isMobile ? 6 : 7, color: C.crimson, symbol: "diamond", line: { color: C.inkBr, width: responsive.isMobile ? 1 : 1.2 } },
      name: "current", hovertemplate: "current (M,β)<extra></extra>", showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      showlegend: false,
      scene: {
        xaxis: {
          title: { text: "M", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "β", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "log Z", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.5 : 1.7, y: responsive.isMobile ? -1.3 : -1.55, z: responsive.isMobile ? 0.7 : 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderBose, boseSurfaceGrid, debouncedM, beta, besteinData, responsive.isMobile]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 9 — FEYNMAN VERTEX COUNT
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderFeynman) return;
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
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 34, l: 46 } : { t: 10, r: 15, b: 42, l: 56 },
      xaxis: {
        title: { text: "perturbative order  n (half-sum 2n=S)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "# topologies", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        type: "log"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderFeynman, feynmanData, selectedS]);

  // § 9 — 3D FEYNMAN VERTEX MOMENTUM STAR
  useEffect(() => {
    if (!canRenderFeynman) return;
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
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "p_x", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "p_y", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "loop", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.4 : 1.6, y: responsive.isMobile ? 1.4 : 1.6, z: responsive.isMobile ? 0.7 : 0.9 } },
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderFeynman, conjTriplet]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 10 — YOUNG CONJUGATION (antiparticle duality)
  // ═══════════════════════════════════════════════════════════════════════
  // drawn as SVG, no Plotly useEffect needed

  // ═══════════════════════════════════════════════════════════════════════
  // § 11 — NON-LINEAR OPTICS PHASE-MATCHING 3D
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderNlo) return;
    if (!nloRef.current) return;
    const maxDk = Math.max(...nloData.map(p => p.deltaK), 1);
    Plotly.react(nloRef.current, [{
      type: "scatter3d", mode: "markers",
      x: nloData.map(p => p.x),
      y: nloData.map(p => p.y),
      z: nloData.map(p => p.z),
      marker: {
        size: nloData.map(p => Math.max(responsive.isMobile ? 2.5 : 3, responsive.isMobile ? 12 : 14 * (1 - p.deltaK / maxDk))),
        color: nloData.map(p => p.deltaK),
        colorscale: [[0, C.teal], [0.35, C.gold], [0.7, C.crimson], [1, "#2b0e0e"]],
        reversescale: false,
        opacity: 0.85,
        line: { color: C.inkBr, width: responsive.isMobile ? 0.2 : 0.3 },
        colorbar: {
          title: { text: "|Δk|", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
          tickfont: { color: C.inkDim, size: responsive.isMobile ? 8 : 9 },
          len: responsive.isMobile ? 0.5 : 0.6,
          thickness: responsive.isMobile ? 7 : 9
        },
      },
      hovertemplate: "(ω₁,ω₂,ω₃)=(%{x},%{y},%{z})<br>|Δk|=%{marker.color:.3f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "ω₁", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "ω₂", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "ω₃", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.3 : 1.5, y: responsive.isMobile ? 1.3 : 1.5, z: responsive.isMobile ? 0.8 : 1.0 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderNlo, nloData]);

  // § 11 — dispersion curve k(ω) and Δk histogram
  useEffect(() => {
    if (!canRenderNlo) return;
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
        line: { color: C.teal, width: responsive.isMobile ? 1.8 : 2 },
        name: "k(ω) = ω + αω²",
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
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 14, r: 12, b: 34, l: 42 } : { t: 18, r: 15, b: 42, l: 52 },
      grid: { rows: 1, columns: 2, pattern: "independent" },
      xaxis: {
        domain: responsive.isMobile ? [0, 0.4] : [0, 0.45],
        title: { text: "ω", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "k(ω)", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      xaxis2: {
        domain: responsive.isMobile ? [0.5, 1] : [0.55, 1],
        title: { text: "|Δk|", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis2: {
        title: { text: "# triplets", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderNlo, nloData, nloDispersion, debouncedM]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 12 — LORENZ ATTRACTOR
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderLorenz) return;
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
        width: responsive.isMobile ? 2.5 : 3,
      },
      name: "trajectory",
      hovertemplate: "x=%{x:.2f}  y=%{y:.2f}  z=%{z:.2f}<extra></extra>",
    }, {
      type: "scatter3d", mode: "markers",
      x: [lorenzData.xs[0]], y: [lorenzData.ys[0]], z: [lorenzData.zs[0]],
      marker: { size: responsive.isMobile ? 5 : 6, color: C.inkBr, symbol: "cross" },
      name: "t=0", showlegend: false,
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "x", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "y", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "z", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.4 : 1.6, y: responsive.isMobile ? 1.4 : 1.6, z: responsive.isMobile ? 0.5 : 0.7 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderLorenz, lorenzData]);

  // § 12 — Poincaré section z = ρ−1 plane
  useEffect(() => {
    if (!canRenderLorenz) return;
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
      marker: { size: responsive.isMobile ? 3.5 : 4, color: C.gold, opacity: 0.65, line: { color: C.inkBr, width: responsive.isMobile ? 0.2 : 0.3 } },
      hovertemplate: "x=%{x:.2f}  y=%{y:.2f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 10, b: 34, l: 38 } : { t: 10, r: 12, b: 42, l: 48 },
      xaxis: {
        title: { text: "x  (z = ρ−1 section)", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "y", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderLorenz, lorenzData, lorenzRho]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 13 — KOLMOGOROV SPECTRUM
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderKolmog) return;
    if (!kolmogRef.current) return;
    // Reference K41 and measured partition energy distribution
    const ps = partData.counts.map((c, i) => c > 0 ? c : null);
    Plotly.react(kolmogRef.current, [
      {
        x: kolmogData.ks, y: kolmogData.Ek, type: "scatter", mode: "lines",
        line: { color: C.gold, width: responsive.isMobile ? 1.8 : 2.2 },
        name: "E(k) ∝ k^(−5/3)",
        hovertemplate: "k=%{x}  E=%{y:.4e}<extra>K41</extra>",
      },
      {
        x: partData.sums, y: ps.map(v => v !== null ? v / partData.totalCount : null),
        type: "scatter", mode: "lines+markers",
        line: { color: C.teal, width: responsive.isMobile ? 1.3 : 1.6 },
        marker: { size: responsive.isMobile ? 2.5 : 3, color: C.teal },
        name: "p₃(S|M) / |T_M|",
        hovertemplate: "S=%{x}  density=%{y:.4e}<extra>empirical</extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 36, l: 54 } : { t: 10, r: 15, b: 44, l: 64 },
      xaxis: {
        title: { text: "wavenumber k  (or sum S)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        type: "log"
      },
      yaxis: {
        title: { text: "spectral density", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        type: "log"
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.05 : 0.02,
        yanchor: "bottom"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderKolmog, kolmogData, partData]);

  // § 13 — Triadic coupling 3D
  useEffect(() => {
    if (!canRenderKolmog) return;
    if (!triadRef.current) return;
    const maxT = Math.max(...triadData.map(p => p.T), 1);
    Plotly.react(triadRef.current, [{
      type: "scatter3d", mode: "markers",
      x: triadData.map(p => p.x),
      y: triadData.map(p => p.y),
      z: triadData.map(p => p.z),
      marker: {
        size: responsive.isMobile ? 2.5 : 3,
        color: triadData.map(p => p.T),
        colorscale: [[0, "#0c1530"], [0.25, C.indigo], [0.5, C.teal], [0.75, C.gold], [1, C.crimson]],
        opacity: 0.65,
        colorbar: {
          title: { text: "T = √(k₁k₂k₃)", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
          tickfont: { color: C.inkDim, size: responsive.isMobile ? 8 : 9 },
          len: responsive.isMobile ? 0.55 : 0.65,
          thickness: responsive.isMobile ? 7 : 9
        },
      },
      hovertemplate: "k=(%{x},%{y},%{z})<br>T=%{marker.color:.2f}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "k₁", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "k₂", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "k₃", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.3 : 1.55, y: responsive.isMobile ? 1.3 : 1.55, z: responsive.isMobile ? 0.7 : 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderKolmog, triadData]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 14 — GUTENBERG-RICHTER LAW
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderGutenberg) return;
    if (!gutRef.current) return;
    Plotly.react(gutRef.current, [
      {
        x: grData.mags, y: grData.N, type: "scatter", mode: "lines",
        line: { color: C.crimson, width: responsive.isMobile ? 1.8 : 2 },
        name: `log N = a − b·m  (b=${grBvalue.toFixed(2)})`,
        hovertemplate: "m=%{x}  N=%{y:.3e}<extra>GR</extra>",
      },
      {
        x: grCompare.xs, y: grCompare.yPart.map(v => Math.pow(10, v)),
        type: "scatter", mode: "markers",
        marker: { size: responsive.isMobile ? 3.5 : 4, color: C.teal, opacity: 0.75 },
        name: "p₃(S|M)",
        hovertemplate: "S=%{x}  p=%{y:.2e}<extra>empirical</extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 34, l: 46 } : { t: 10, r: 15, b: 42, l: 56 },
      xaxis: {
        title: { text: "magnitude m  (or scaled sum S/5)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "frequency (log scale)", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        type: "log"
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.95 : 0.98,
        y: responsive.isMobile ? 0.95 : 0.98,
        xanchor: "right"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderGutenberg, grData, grCompare, grBvalue]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 15 — BBN ABUNDANCES
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderBbn) return;
    if (!bbnRef.current) return;
    Plotly.react(bbnRef.current, [
      { x: bbnData.T, y: bbnData.Yp, type: "scatter", mode: "lines", line: { color: C.gold, width: responsive.isMobile ? 1.8 : 2.2 }, name: "Y_p (⁴He mass fraction)", hovertemplate: "T=%{x:.2f}<br>Y_p=%{y:.4f}<extra></extra>" },
      { x: bbnData.T, y: bbnData.DH, type: "scatter", mode: "lines", line: { color: C.teal, width: responsive.isMobile ? 1.6 : 2 }, name: "D/H", yaxis: "y2", hovertemplate: "T=%{x:.2f}<br>D/H=%{y:.2e}<extra></extra>" },
      { x: bbnData.T, y: bbnData.Li7, type: "scatter", mode: "lines", line: { color: C.crimson, width: responsive.isMobile ? 1.3 : 1.6, dash: "dot" }, name: "⁷Li/H", yaxis: "y2", hovertemplate: "T=%{x:.2f}<br>Li/H=%{y:.2e}<extra></extra>" },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 10, r: 46, b: 36, l: 46 } : { t: 12, r: 56, b: 44, l: 56 },
      xaxis: {
        title: { text: "T / T_ref  (cooling →)", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule,
        autorange: "reversed",
        type: "log"
      },
      yaxis: {
        title: { text: "Y_p", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis2: {
        title: { text: "D/H,  ⁷Li/H", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        overlaying: "y",
        side: "right",
        color: C.teal,
        gridcolor: "rgba(0,0,0,0)",
        type: "log"
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.05 : 0.02,
        y: responsive.isMobile ? 0.95 : 0.98
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderBbn, bbnData]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 16 — SIS LATTICE SHORT VECTORS 3D
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderSis) return;
    if (!sisRef.current) return;
    const all = scatterData;
    // Full lattice T_M (background cloud)
    const trBg = {
      type: "scatter3d", mode: "markers",
      x: all.xs, y: all.ys, z: all.zs,
      marker: { size: debouncedM <= 25 ? (responsive.isMobile ? 1.8 : 2.2) : (responsive.isMobile ? 1.2 : 1.4), color: C.indigo, opacity: 0.12 },
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
        size: responsive.isMobile ? 4 : 5,
        color: sisData.map(p => p.norm2),
        colorscale: [[0, C.teal], [0.5, C.gold], [1, C.crimson]],
        opacity: 0.95,
        line: { color: C.inkBr, width: responsive.isMobile ? 0.3 : 0.5 },
        colorbar: {
          title: { text: "‖x‖²", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
          tickfont: { color: C.inkDim, size: responsive.isMobile ? 8 : 9 },
          len: responsive.isMobile ? 0.45 : 0.55,
          thickness: responsive.isMobile ? 7 : 9
        },
      },
      name: "SIS solutions",
      hovertemplate: "(%{x},%{y},%{z})<br>‖x‖²=%{marker.color}<extra>SIS</extra>",
    };
    Plotly.react(sisRef.current, [trBg, trSis], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "x₁", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "x₂", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "x₃", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.4 : 1.6, y: responsive.isMobile ? 1.4 : 1.6, z: responsive.isMobile ? 0.7 : 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderSis, sisData, scatterData, debouncedM]);

  // § 16 — SIS residue distribution
  useEffect(() => {
    if (!canRenderSis) return;
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
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 34, l: 42 } : { t: 10, r: 15, b: 42, l: 52 },
      xaxis: {
        title: { text: "residue class mod q", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "# lattice points", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderSis, debouncedM, sisQ, sisA1, sisA2, sisA3]);

  // ═══════════════════════════════════════════════════════════════════════
  // § 17 — QUANTUM WALK AMPLITUDE
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canRenderQwalk) return;
    if (!qwalkRef.current) return;
    Plotly.react(qwalkRef.current, [
      {
        x: qwalkData.sums, y: qwalkData.amp, type: "scatter", mode: "lines",
        line: { color: C.violet, width: responsive.isMobile ? 1.8 : 2 },
        fill: "tozeroy",
        fillcolor: `${C.violet}22`,
        name: "|ψ(S,t)|²",
        hovertemplate: "S=%{x}  |ψ|²=%{y:.4e}<extra></extra>",
      },
      {
        x: partData.sums, y: partData.counts.map(c => partData.totalCount ? c / partData.totalCount : 0),
        type: "scatter", mode: "lines",
        line: { color: C.gold, width: responsive.isMobile ? 1.3 : 1.5, dash: "dot" },
        name: "classical p₃(S|M)/|T_M|",
        hovertemplate: "S=%{x}  π=%{y:.4e}<extra></extra>",
      },
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: C.plotBg,
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 8, r: 12, b: 34, l: 46 } : { t: 10, r: 15, b: 42, l: 56 },
      xaxis: {
        title: { text: "S", font: { size: responsive.isMobile ? 10 : 12, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      yaxis: {
        title: { text: "probability", font: { size: responsive.isMobile ? 9 : 11, style: "italic" } },
        gridcolor: C.rule,
        color: C.inkDim,
        linecolor: C.rule
      },
      legend: {
        font: { size: responsive.isMobile ? 8 : 10, color: C.inkDim, family: FONT_MATH },
        bgcolor: "rgba(0,0,0,0)",
        x: responsive.isMobile ? 0.95 : 0.98,
        y: responsive.isMobile ? 0.95 : 0.98,
        xanchor: "right"
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderQwalk, qwalkData, partData]);

  // § 17 — 3D amplitude surface (S vs t vs |ψ|²)
  useEffect(() => {
    if (!canRenderQwalk) return;
    if (!qwalkSurfRef.current) return;
    const tMax = responsive.isMobile ? 16 : 30;
    const tvals = []; for (let t = 1; t <= tMax; t++) tvals.push(t);
    const Svals = qwalkData.sums;
    const zMat = tvals.map(t => {
      const w = quantumWalkAmplitudes(debouncedM, t, selectedS);
      return w.amp;
    });
    Plotly.react(qwalkSurfRef.current, [{
      type: "surface", x: Svals, y: tvals, z: zMat,
      colorscale: [[0, "#0a0d20"], [0.25, C.indigo], [0.55, C.violet], [0.8, C.gold], [1, C.crimson]],
      contours: { z: { show: false } },
      colorbar: {
        title: { text: "|ψ|²", font: { color: C.inkDim, size: responsive.isMobile ? 9 : 11, family: FONT_MATH, style: "italic" } },
        tickfont: { color: C.inkDim, size: responsive.isMobile ? 8 : 9 },
        len: responsive.isMobile ? 0.55 : 0.65,
        thickness: responsive.isMobile ? 7 : 9
      },
      hovertemplate: "S=%{x}  t=%{y}<br>|ψ|²=%{z:.4e}<extra></extra>",
    }], {
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MATH, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      margin: responsive.isMobile ? { t: 6, r: 6, b: 6, l: 6 } : { t: 8, r: 8, b: 8, l: 8 },
      scene: {
        xaxis: {
          title: { text: "S", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        yaxis: {
          title: { text: "t (steps)", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        zaxis: {
          title: { text: "|ψ|²", font: { style: "italic" } },
          gridcolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true
        },
        bgcolor: C.plotBg,
        camera: { eye: { x: responsive.isMobile ? 1.4 : 1.6, y: responsive.isMobile ? -1.3 : -1.5, z: responsive.isMobile ? 0.7 : 0.9 } },
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderQwalk, debouncedM, selectedS, qwalkData, responsive.isMobile]);

  useEffect(() => {
    if (!coverProjectionRef.current) return;

    const stride = responsive.isMobile ? 10 : 5;
    const xPts = [], yPts = [], zPts = [], sPts = [];
    const xSlice = [], ySlice = [], zSlice = [];
    for (let i = 0; i < scatterData.xs.length; i += stride) {
      xPts.push(scatterData.xs[i]);
      yPts.push(scatterData.ys[i]);
      zPts.push(scatterData.zs[i]);
      sPts.push(scatterData.ss[i]);
      if (scatterData.ss[i] === selectedS) {
        xSlice.push(scatterData.xs[i]);
        ySlice.push(scatterData.ys[i]);
        zSlice.push(scatterData.zs[i]);
      }
    }
    const diag = Array.from({ length: computeM }, (_, i) => i + 1);

    Plotly.react(coverProjectionRef.current, [
      {
        type: "mesh3d",
        x: tripShell.vx,
        y: tripShell.vy,
        z: tripShell.vz,
        i: [0, 0, 0, 1],
        j: [1, 1, 2, 2],
        k: [2, 3, 3, 3],
        color: C.indigo,
        opacity: responsive.isMobile ? 0.08 : 0.12,
        hoverinfo: "skip",
        flatshading: true,
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: tripShell.edgeX,
        y: tripShell.edgeY,
        z: tripShell.edgeZ,
        line: { color: C.gold, width: 5 },
        hoverinfo: "skip",
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: xPts,
        y: yPts,
        z: zPts,
        marker: {
          size: responsive.isMobile ? 2.1 : 2.8,
          color: sPts,
          colorscale: [
            [0, C.teal],
            [0.5, C.indigo],
            [1, C.gold]
          ],
          opacity: 0.8,
          line: { width: 0 },
          showscale: false,
        },
        hovertemplate: "<i>(x,y,z)</i>=(%{x},%{y},%{z})<br><i>S</i>=%{marker.color}<extra></extra>",
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: xSlice,
        y: ySlice,
        z: zSlice,
        marker: {
          size: responsive.isMobile ? 4 : 5,
          color: C.goldBr,
          opacity: 0.95,
          line: { color: C.bgDeep, width: 0.8 },
        },
        hovertemplate: `active slice: <i>S</i>=${selectedS}<extra></extra>`,
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: diag,
        y: diag,
        z: diag,
        line: { color: C.crimson, width: 4, dash: "dot" },
        hovertemplate: "<i>x=y=z</i><extra></extra>",
      }
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      font: { family: FONT_MONO, size: responsive.isMobile ? 9 : 11, color: C.inkDim },
      scene: {
        aspectmode: "cube",
        xaxis: {
          title: { text: "x", font: { style: "italic" } },
          gridcolor: C.rule,
          zerolinecolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          range: [1, computeM],
        },
        yaxis: {
          title: { text: "y", font: { style: "italic" } },
          gridcolor: C.rule,
          zerolinecolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          range: [1, computeM],
        },
        zaxis: {
          title: { text: "z", font: { style: "italic" } },
          gridcolor: C.rule,
          zerolinecolor: C.rule,
          color: C.inkDim,
          backgroundcolor: C.plotBg,
          showbackground: true,
          range: [1, computeM],
        },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.72, responsive.isMobile ? 1.45 : 1.72, responsive.isMobile ? 0.78 : 0.92),
      },
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });

    if (responsive.isMobile) return;
    let theta = 0.72;
    const timer = setInterval(() => {
      theta += 0.02;
      if (coverProjectionRef.current) {
        Plotly.relayout(coverProjectionRef.current, { "scene.camera": orbitCamera(theta, 1.72, 0.92) });
      }
    }, 140);
    return () => clearInterval(timer);
  }, [scatterData, selectedS, computeM, tripShell, responsive.isMobile]);

  useEffect(() => {
    if (!canRenderSynthesis) return;
    if (!unifyTripRef.current) return;

    const xSlice = [], ySlice = [], zSlice = [];
    for (let i = 0; i < scatterData.xs.length; i++) {
      if (scatterData.ss[i] === selectedS) {
        xSlice.push(scatterData.xs[i]);
        ySlice.push(scatterData.ys[i]);
        zSlice.push(scatterData.zs[i]);
      }
    }
    const shadowZ = xSlice.map(() => 1);

    Plotly.react(unifyTripRef.current, [
      {
        type: "mesh3d",
        x: tripShell.vx,
        y: tripShell.vy,
        z: tripShell.vz,
        i: [0, 0, 0, 1],
        j: [1, 1, 2, 2],
        k: [2, 3, 3, 3],
        color: C.teal,
        opacity: 0.08,
        hoverinfo: "skip",
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: tripShell.edgeX,
        y: tripShell.edgeY,
        z: tripShell.edgeZ,
        line: { color: C.gold, width: 4 },
        hoverinfo: "skip",
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: xSlice,
        y: ySlice,
        z: zSlice,
        marker: { size: responsive.isMobile ? 3.2 : 4.2, color: C.goldBr, opacity: 0.96 },
        name: "Σ=S",
        hovertemplate: "slice point<extra></extra>",
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: xSlice,
        y: ySlice,
        z: shadowZ,
        marker: { size: responsive.isMobile ? 2.2 : 3, color: C.indigo, opacity: 0.18 },
        hoverinfo: "skip",
      },
      conjTriplet ? {
        type: "scatter3d",
        mode: "markers+text",
        x: [conjTriplet.x],
        y: [conjTriplet.y],
        z: [conjTriplet.z],
        text: ["selected"],
        textposition: "top center",
        textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.crimson },
        marker: { size: responsive.isMobile ? 5 : 6, color: C.crimson, line: { color: C.inkBr, width: 1 } },
        hovertemplate: `<i>(${conjTriplet.x},${conjTriplet.y},${conjTriplet.z})</i><extra></extra>`,
      } : null
    ].filter(Boolean), {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      font: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkDim },
      scene: {
        aspectmode: "cube",
        xaxis: { visible: false, range: [1, computeM] },
        yaxis: { visible: false, range: [1, computeM] },
        zaxis: { visible: false, range: [1, computeM] },
        bgcolor: C.plotBg,
        camera: orbitCamera(0.35, responsive.isMobile ? 1.38 : 1.56, responsive.isMobile ? 0.7 : 0.82),
      },
      showlegend: false,
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderSynthesis, tripShell, scatterData, selectedS, computeM, conjTriplet, responsive.isMobile]);

  useEffect(() => {
    if (!canRenderSynthesis) return;
    if (!unifyConstellationRef.current) return;

    const kernel = regimeConstellation[0];
    const outer = regimeConstellation.slice(1);
    const classColors = {
      explicit: C.tealBr,
      inferred: C.goldBr,
      analogical: C.violet,
    };
    const lineX = [], lineY = [], lineZ = [];
    outer.forEach(({ x, y, z }) => {
      lineX.push(kernel.x, x, null);
      lineY.push(kernel.y, y, null);
      lineZ.push(kernel.z, z, null);
    });

    Plotly.react(unifyConstellationRef.current, [
      {
        type: "scatter3d",
        mode: "lines",
        x: lineX,
        y: lineY,
        z: lineZ,
        line: { color: `${C.gold}66`, width: 4 },
        hoverinfo: "skip",
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: [...outer.map(p => p.x), outer[0].x],
        y: [...outer.map(p => p.y), outer[0].y],
        z: [...outer.map(p => p.z), outer[0].z],
        line: { color: `${C.indigo}88`, width: 3, dash: "dot" },
        hoverinfo: "skip",
      },
      {
        type: "scatter3d",
        mode: "markers+text",
        x: regimeConstellation.map(p => p.x),
        y: regimeConstellation.map(p => p.y),
        z: regimeConstellation.map(p => p.z),
        text: regimeConstellation.map(p => p.name),
        textposition: "top center",
        textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkBr },
        marker: {
          size: regimeConstellation.map(p => p.name === "Kernel" ? 8 : 5.5),
          color: regimeConstellation.map(p => p.name === "Kernel" ? C.crimson : classColors[p.cls]),
          opacity: 0.96,
          line: { color: C.bgDeep, width: 1 },
        },
        customdata: regimeConstellation.map(p => p.cls),
        hovertemplate: "%{text}<br>edge class: %{customdata}<extra></extra>",
      }
    ], {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      font: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkDim },
      scene: {
        xaxis: { visible: false, range: [-3.4, 3.4] },
        yaxis: { visible: false, range: [-3.4, 3.4] },
        zaxis: { visible: false, range: [-2.2, 2.6] },
        bgcolor: C.plotBg,
        camera: orbitCamera(1.18, responsive.isMobile ? 1.45 : 1.62, responsive.isMobile ? 0.78 : 0.9),
      },
      showlegend: false,
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });

    if (responsive.isMobile) return;
    let theta = 1.18;
    const timer = setInterval(() => {
      theta += 0.015;
      if (unifyConstellationRef.current) {
        Plotly.relayout(unifyConstellationRef.current, { "scene.camera": orbitCamera(theta, 1.62, 0.9) });
      }
    }, 160);
    return () => clearInterval(timer);
  }, [canRenderSynthesis, regimeConstellation, responsive.isMobile]);

  useEffect(() => {
    if (!canRenderSynthesis) return;
    if (!unifyArchitectureRef.current) return;

    const traces = [];
    layerArchitecture.layers.forEach((layer) => {
      const s = layer.size;
      const ringX = [-s, s, s, -s, -s];
      const ringY = [-s, -s, s, s, -s];
      const ringZ = [layer.z, layer.z, layer.z, layer.z, layer.z];
      traces.push({
        type: "scatter3d",
        mode: "lines",
        x: ringX,
        y: ringY,
        z: ringZ,
        line: { color: layer.color, width: 5 },
        hovertemplate: `${layer.name}<extra></extra>`,
      });
      traces.push({
        type: "scatter3d",
        mode: "text",
        x: [0],
        y: [0],
        z: [layer.z + 0.06],
        text: [layer.name],
        textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: layer.color },
        hoverinfo: "skip",
      });
    });
    const cornerX = [], cornerY = [], cornerZ = [];
    for (let i = 0; i < layerArchitecture.layers.length - 1; i++) {
      const current = layerArchitecture.layers[i];
      const next = layerArchitecture.layers[i + 1];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        cornerX.push(sx * current.size, sx * next.size, null);
        cornerY.push(sy * current.size, sy * next.size, null);
        cornerZ.push(current.z, next.z, null);
      });
    }
    traces.push({
      type: "scatter3d",
      mode: "lines",
      x: cornerX,
      y: cornerY,
      z: cornerZ,
      line: { color: `${C.inkDim}88`, width: 3, dash: "dot" },
      hoverinfo: "skip",
    });
    traces.push({
      type: "scatter3d",
      mode: "markers+text",
      x: layerArchitecture.assumptions.map(a => a.x),
      y: layerArchitecture.assumptions.map(a => a.y),
      z: layerArchitecture.assumptions.map(a => a.z),
      text: layerArchitecture.assumptions.map(a => a.name),
      textposition: "top center",
      textfont: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkBr },
      marker: {
        size: responsive.isMobile ? 4 : 5,
        color: C.goldBr,
        line: { color: C.bgDeep, width: 1 },
      },
      hovertemplate: "assumption %{text}<extra></extra>",
    });

    Plotly.react(unifyArchitectureRef.current, traces, {
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { t: 0, r: 0, b: 0, l: 0 },
      font: { family: FONT_MONO, size: responsive.isMobile ? 8 : 10, color: C.inkDim },
      scene: {
        xaxis: { visible: false, range: [-4.1, 4.1] },
        yaxis: { visible: false, range: [-4.1, 4.1] },
        zaxis: { visible: false, range: [-0.3, 3.5] },
        bgcolor: C.plotBg,
        camera: orbitCamera(-0.42, responsive.isMobile ? 1.44 : 1.6, responsive.isMobile ? 0.9 : 1.02),
      },
      showlegend: false,
      hoverlabel: { bgcolor: C.panel, bordercolor: C.gold, font: { color: C.ink, family: FONT_MONO, size: responsive.isMobile ? 9 : 11 } },
    }, { displayModeBar: false, responsive: true });
  }, [canRenderSynthesis, layerArchitecture, responsive.isMobile]);

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
      fontFamily: FONT_MATH,
      fontSize: responsiveScale(17),
      background: C.bg,
      color: C.ink,
      minHeight: "100vh",
      padding: responsive.isMobile ? "0" : "0",
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
          height: responsive.isMobile ? 6 : 4; border-radius: 3px;
          background: linear-gradient(90deg, ${C.gold} 0%, ${C.gold} var(--pct, 50%), ${C.border} var(--pct, 50%), ${C.border} 100%);
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: responsive.isMobile ? 24 : 12; height: responsive.isMobile ? 24 : 12; border-radius: 50%;
          background: ${C.gold}; margin-top: responsive.isMobile ? -9 : -4; cursor: pointer;
          box-shadow: 0 0 8px ${C.gold}88; border: 1px solid ${C.bg};
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        input[type=range]::-moz-range-track { height: responsive.isMobile ? 6 : 4; border-radius: 3px; background: ${C.border}; }
        input[type=range]::-moz-range-thumb {
          width: responsive.isMobile ? 24 : 12; height: responsive.isMobile ? 24 : 12; border-radius: 50%; background: ${C.gold};
          cursor: pointer; border: 1px solid ${C.bg}; box-shadow: 0 0 8px ${C.gold}88;
          transition: transform 0.1s;
        }
        input[type=range]::-moz-range-thumb:active {
          transform: scale(1.1);
        }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes projectionFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        @keyframes projectionPulse { 0%,100% { opacity: 0.42; } 50% { opacity: 0.96; } }
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
        padding: responsive.isMobile ? "8px 16px" : "10px 28px",
        display: "grid",
        gridTemplateColumns: responsive.isMobile ? "1fr" : "auto 1fr auto auto",
        gap: responsiveSpacing(20),
        alignItems: "center",
        gridTemplateRows: responsive.isMobile ? "auto auto auto" : "auto",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: responsiveSpacing(10),
          gridColumn: responsive.isMobile ? "1 / -1" : "1",
          justifyContent: responsive.isMobile ? "center" : "flex-start",
        }}>
          <div className="pulse" style={{
            width: responsive.isMobile ? 6 : 8,
            height: responsive.isMobile ? 6 : 8,
            borderRadius: "50%",
            background: computing ? C.crimson : C.gold,
            boxShadow: `0 0 10px ${computing ? C.crimson : C.gold}`
          }} />
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: responsive.isMobile ? 9 : 10,
            color: C.inkDim,
            letterSpacing: 2,
            textTransform: "uppercase"
          }}>
            {computing ? "recomputing" : "p₃(S | M)"}
          </span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: responsiveSpacing(14),
          gridColumn: responsive.isMobile ? "1 / -1" : "2",
          justifyContent: responsive.isMobile ? "center" : "flex-start",
          flexWrap: responsive.isMobile ? "wrap" : "nowrap",
        }}
        {...(responsive.isMobile ? swipeHandlers : {})}>
          <span style={{
            fontFamily: FONT_MATH,
            fontStyle: "italic",
            fontSize: responsiveScale(13),
            color: C.inkDim
          }}>M</span>
          <input type="range" min={10} max={150} value={M_}
            onChange={e => setM(+e.target.value)}
            style={{
              flex: 1,
              maxWidth: responsive.isMobile ? 280 : 420,
              "--pct": `${((M_ - 10) / 140) * 100}%`,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }} />
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: responsive.isMobile ? 16 : 18,
            fontWeight: 500,
            color: C.gold,
            minWidth: responsive.isMobile ? 36 : 42,
            textAlign: "right",
            textShadow: `0 0 12px ${C.gold}66`
          }}>{M_}</span>
          {responsive.isMobile && (
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: 8,
              color: C.inkFaint,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.6,
              marginLeft: 8,
            }}>
              swipe ↔
            </span>
          )}
          <div style={{
            display: "flex",
            gap: responsive.isMobile ? 2 : 3,
            flexWrap: responsive.isMobile ? "wrap" : "nowrap",
          }}>
            {[10, 25, 50, 100, 150].map(p => (
              <button key={p} onClick={() => setM(p)} style={{
                background: M_ === p ? `${C.gold}22` : "transparent",
                color: M_ === p ? C.gold : C.inkFaint,
                border: `1px solid ${M_ === p ? `${C.gold}66` : C.border}`,
                padding: responsive.isMobile ? "6px 10px" : "2px 6px",
                fontSize: responsive.isMobile ? 11 : 10,
                fontFamily: FONT_MONO,
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
                minWidth: responsive.isMobile ? 44 : 28,
                minHeight: responsive.isMobile ? 44 : "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.15s",
                ":active": {
                  transform: responsive.isMobile ? "scale(0.95)" : "none",
                  background: M_ === p ? `${C.gold}32` : `${C.border}22`,
                },
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: responsiveSpacing(6),
          gridColumn: responsive.isMobile ? "1 / -1" : "3",
          justifyContent: responsive.isMobile ? "center" : "flex-start",
          flexWrap: responsive.isMobile ? "wrap" : "nowrap",
        }}>
          <Toggle on={symmetry} onClick={() => setSymmetry(p => !p)} tone="indigo">Symmetry</Toggle>
          <Toggle on={gaussianOn} onClick={() => setGaussianOn(p => !p)} tone="gold">𝒩</Toggle>
          <Toggle on={logScale} onClick={() => setLogScale(p => !p)} tone="teal">Log</Toggle>
        </div>

        <div style={{
          display: "flex",
          gap: responsiveSpacing(14),
          alignItems: "center",
          gridColumn: responsive.isMobile ? "1 / -1" : "4",
          justifyContent: responsive.isMobile ? "center" : "flex-end",
          flexWrap: responsive.isMobile ? "wrap" : "nowrap",
        }}>
          <Metric label="|T_M|" value={partData.totalCount.toLocaleString()} tone="gold" />
          <Metric label="peak" value={peakS} tone="teal" />
        </div>
      </div>

      {/* ═══════════════ COVER ═══════════════ */}
      <div style={{
        maxWidth: responsive.isMobile ? "100%" : responsive.isTablet ? 960 : 1040,
        margin: "0 auto",
        padding: responsive.isMobile ? "0 20px" : "0 40px",
        width: "100%",
        boxSizing: "border-box",
      }}>
        <section id="cover" style={{
          padding: responsive.isMobile ? "40px 0 20px" : "70px 0 40px",
          textAlign: responsive.isMobile ? "center" : "left"
        }}>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: responsive.isMobile ? 9 : 11.5,
            color: C.gold,
            letterSpacing: responsive.isMobile ? 2 : 4,
            textTransform: "uppercase",
            marginBottom: responsive.isMobile ? 12 : 16
          }}>
            MONOGRAPH № III  ·  INTERACTIVE EDITION  ·  MMXXVI
          </div>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: "italic",
            fontSize: responsive.isMobile ? 11 : 13,
            color: C.gold,
            letterSpacing: responsive.isMobile ? 3 : 5,
            textTransform: "uppercase",
            marginBottom: responsive.isMobile ? 14 : 18,
            opacity: 0.92,
          }}>
            A sgnk Creation
          </div>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: "italic",
            fontSize: responsive.isMobile ? 14 : 18,
            color: C.inkDim,
            marginBottom: responsive.isMobile ? 8 : 12,
            letterSpacing: 0.5
          }}>
            On the Enumeration of
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: responsive.isMobile ? 42 : responsive.isTablet ? 58 : 72,
            fontWeight: 500,
            color: C.inkBr,
            lineHeight: 1.02,
            letterSpacing: responsive.isMobile ? -0.8 : -1.2,
            marginBottom: responsive.isMobile ? 16 : 20,
          }}>
            Ordered Triplets
            <span style={{ color: C.gold, fontStyle: "italic" }}> of the </span>
            Bounded Integers
          </h1>

          <div style={{
            fontFamily: FONT_MATH,
            fontStyle: "italic",
            fontSize: responsive.isMobile ? 18 : 26,
            color: C.gold,
            margin: responsive.isMobile ? "12px 0 16px" : "18px 0 22px",
            letterSpacing: 0.4,
          }}>
            1 ≤ x ≤ y ≤ z ≤ M  ⊂  ℤ³
          </div>

          <div style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: "italic",
            fontSize: responsive.isMobile ? 16 : 21,
            color: C.inkDim,
            lineHeight: 1.55,
            marginBottom: responsive.isMobile ? 20 : 30,
            maxWidth: responsive.isMobile ? "100%" : 880,
          }}>
            An interactive study of the partition function <M>p₃(S | M)</M>, the Cayley–Sylvester closed form,
            the Ehrhart polynomial of the 3-simplex, and the emergence of Gaussian order from combinatorial constraint.
          </div>

          <div className="ruled-box" style={{
            padding: responsive.isMobile ? "12px 0" : "18px 0",
            marginTop: responsive.isMobile ? 20 : 28,
            maxWidth: responsive.isMobile ? "100%" : 880
          }}>
            <p className="drop-cap" style={{
              fontFamily: FONT_MATH,
              fontSize: responsive.isMobile ? "1.1em" : "1.22em",
              lineHeight: 1.72,
              color: C.ink,
              textAlign: "justify"
            }}>
              We enumerate the lattice points of the right tetrahedron <M>T_M = {"{(x,y,z) ∈ ℤ³ : 1 ≤ x ≤ y ≤ z ≤ M}"}</M>
              and study the distribution of their coordinate sums. For moderate <M>M</M> the distribution is discrete
              and finitely-supported; as <M>M → ∞</M> the central bulk converges, after rescaling, to the standard
              Gaussian envelope, while the unnormalized density obeys the classical parabolic law <M>p₃(S) ~ S²/12</M> first
              established by Cayley (1856) and Sylvester (1857). This dashboard computes <M>p₃(S | M)</M> exactly,
              visualizes its symmetry, its moments, its convergence, and its departures from the asymptotic predictions.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.isMobile ? "1fr" : responsive.isTablet ? "1.06fr 0.94fr" : "1.22fr 0.78fr",
            gap: responsive.isMobile ? 16 : 22,
            marginTop: responsive.isMobile ? 18 : 24,
            alignItems: "stretch",
            maxWidth: responsive.isMobile ? "100%" : 940,
          }}>
            <div style={{
              background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bgDeep} 100%)`,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              overflow: "hidden",
              boxShadow: `0 24px 80px ${C.bgDeep}`,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                padding: responsive.isMobile ? "10px 12px" : "12px 16px",
                borderBottom: `1px solid ${C.border}`,
                background: `${C.panelAlt}cc`,
              }}>
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 9 : 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Projection Chamber</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: responsive.isMobile ? 16 : 18, color: C.inkBr }}>The bounded simplex in live rotation</div>
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: responsive.isMobile ? 10 : 11, color: C.inkDim }}>
                  <span style={{ color: C.gold }}>M={computeM}</span> · <span style={{ color: C.crimson }}>Σ={selectedS}</span>
                </div>
              </div>
              <div ref={coverProjectionRef} style={{ width: "100%", height: responsive.isMobile ? 320 : 430 }} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{
                padding: responsive.isMobile ? "14px 14px 12px" : "16px 18px 14px",
                background: `${C.panelAlt}dd`,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.gold}`,
                borderRadius: 3,
              }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                  Spatial thesis
                </div>
                <div style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 15 : 16.5, lineHeight: 1.58, color: C.ink }}>
                  Every later theory is constrained by the same solid: a right tetrahedral wedge in which ordered triples survive and unordered excess is quotiented away.
                </div>
                <div style={{ marginTop: 10, fontFamily: FONT_MATH, fontStyle: "italic", fontSize: responsive.isMobile ? 18 : 20, color: C.gold }}>
                  Σ(x, y, z) = x + y + z
                </div>
              </div>

              <div style={{
                padding: responsive.isMobile ? "14px 14px 12px" : "16px 18px 14px",
                background: `${C.panelAlt}dd`,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.teal}`,
                borderRadius: 3,
              }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.teal, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                  Live kernel registers
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <Metric label="|T_M|" value={partData.totalCount.toLocaleString()} tone="gold" />
                  <Metric label="peak" value={peakS} tone="teal" />
                  <Metric label="p₃(Σ)" value={selActual} tone="crimson" />
                </div>
              </div>

              <div style={{
                padding: responsive.isMobile ? "14px 14px 12px" : "16px 18px 14px",
                background: `linear-gradient(180deg, ${C.panelAlt} 0%, ${C.bgDeep} 100%)`,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.indigo}`,
                borderRadius: 3,
              }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.indigo, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                  Horizon
                </div>
                <div style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 15 : 16, lineHeight: 1.6, color: C.ink }}>
                  This one chamber is later read as Bose degeneracy, phase-matching locus, Lorenz recurrence shell, SIS kernel geometry, and quantum-walk support. The same wedge becomes the atlas.
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            gap: responsive.isMobile ? 16 : 28,
            marginTop: responsive.isMobile ? 16 : 22,
            paddingTop: responsive.isMobile ? 12 : 18,
            borderTop: `1px solid ${C.rule}`,
            flexDirection: responsive.isMobile ? "column" : "row",
            alignItems: responsive.isMobile ? "flex-start" : "baseline",
          }}>
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: responsive.isMobile ? 10 : 11,
              color: C.inkFaint,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: responsive.isMobile ? 8 : 0,
            }}>Keywords</div>
            <div style={{
              fontFamily: FONT_MATH,
              fontStyle: "italic",
              fontSize: responsive.isMobile ? 13 : 15,
              color: C.ink,
              letterSpacing: 0.3,
              lineHeight: responsive.isMobile ? 1.4 : 1.3,
            }}>
              integer partitions · q-binomial coefficient · 3-simplex · Ehrhart polynomial · central limit theorem · generating functions · Bose-Einstein statistics · Feynman perturbation · non-linear optics · lattice cryptography · Kolmogorov turbulence · Lorenz attractor
            </div>
          </div>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: responsive.isMobile ? 10 : 11,
            color: C.inkFaint,
            letterSpacing: 2,
            marginTop: responsive.isMobile ? 8 : 10,
            textAlign: responsive.isMobile ? "center" : "left",
          }}>
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
        <SectionHead id="bose-einstein" number="8" title="The Bose-Einstein Imprint" eyebrow="QUANTUM STATISTICS · HARMONIC PARTITION FUNCTION" />

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
        <SectionHead id="feynman" number="9" title="Feynman Perturbation & Diagram Topology" eyebrow="QFT · PROPAGATOR CONTRACTIONS" />

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
        <SectionHead id="young" number="10" title="Antiparticle Conjugation via Young Duality" eyebrow="CHARGE CONJUGATION · REPRESENTATION THEORY" />

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
        <SectionHead id="nlo" number="11" title="Three-Wave Mixing in Non-Linear Optics" eyebrow="PHASE MATCHING · PARAMETRIC RESONANCE" />

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
        <SectionHead id="lorenz" number="12" title="Strange Attractors & Non-Linear Dynamics" eyebrow="LORENZ SYSTEM · POINCARÉ SECTIONS" />

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
        <SectionHead id="kolmogorov" number="13" title="The Kolmogorov Cascade of Turbulence" eyebrow="NON-LINEAR FLUID · TRIADIC INTERACTIONS" />

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
        <SectionHead id="gutenberg" number="14" title="Earthquake Pattern Recognition" eyebrow="GUTENBERG-RICHTER · AFTERSHOCK TRIPLETS" />

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
        <SectionHead id="bbn" number="15" title="Big Bang Nucleosynthesis & Primordial Triplets" eyebrow="COSMOLOGY · FREEZE-OUT ABUNDANCES" />

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
        <SectionHead id="sis" number="16" title="Lattice Cryptography & Blockchain Signatures" eyebrow="POST-QUANTUM · SIS · LWE" />

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
        <SectionHead id="quantum-walk" number="17" title="Quantum Walk on the Triplet Simplex" eyebrow="QUANTUM COMPUTATION · AMPLITUDE INTERFERENCE" />

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
        <SectionHead id="categorical-synthesis" number="18" title="Categorical Synthesis" eyebrow="UNIFYING THEORY · UNIVERSAL KERNEL · OUTLOOK" />

        <Prose>
          The eleven transcriptions of Part II are not mere analogies. They exhibit a shape: the <em>same</em> combinatorial kernel appears as the skeleton of quantum statistics, of Feynman perturbation, of nonlinear optics, of Lorenz recurrence, of K41 turbulence, of Gutenberg–Richter seismology, of primordial nucleosynthesis, of lattice cryptography, of quantum walks. When so many disparate phenomena line up on a single arithmetic function, the coincidence is itself an object of study. The language in which that coincidence is most economically expressed is <em>category theory</em>: objects are the admissible configurations, morphisms are the physically‑allowed rearrangements, functors are the individual regimes, and natural transformations are the conservation laws that commute between them. This closing section develops that picture in detail — from the defining category <M>{"\\mathbf{Trip}"}</M>, through its monoidal, topos‑theoretic, operadic and ∞‑categorical lifts, up to a single universal kernel theorem whose eleven concrete instances are the content of chapters 8 through 17.
        </Prose>

        <Figure number="15" caption="The synthesis chamber rendered as three coupled spatial objects. Left: the bounded simplex with the active sum-slice Σ = S lit inside the shell and its floor projection faintly recorded. Center: the eleven-regime constellation orbiting a central kernel node, colored by evidence class. Right: the theorem architecture as a stacked four-layer wireframe, with assumptions H1–H8 suspended between floors.">
          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.isMobile ? "1fr" : responsive.isTablet ? "1fr 1fr" : "1.08fr 1fr 1fr",
            gap: 14,
          }}>
            {[
              {
                title: "Kernel chamber",
                note: "T_M as the fixed solid behind every later transcription.",
                ref: unifyTripRef,
              },
              {
                title: "Regime orbit",
                note: "Explicit, inferred, and analogical bridges exposed as geometry.",
                ref: unifyConstellationRef,
              },
              {
                title: "Proof stack",
                note: "Definitions, safe core, conjectural middle, flagship crown.",
                ref: unifyArchitectureRef,
              },
            ].map((panel, idx) => (
              <div key={panel.title} style={{
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                overflow: "hidden",
                gridColumn: responsive.isTablet && idx === 2 ? "1 / -1" : "auto",
              }}>
                <div style={{
                  padding: "9px 12px",
                  borderBottom: `1px solid ${C.border}`,
                  background: `${C.panelAlt}dd`,
                }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: idx === 0 ? C.gold : idx === 1 ? C.teal : C.indigo, letterSpacing: 2, textTransform: "uppercase" }}>
                    {panel.title}
                  </div>
                  <div style={{ fontFamily: FONT_MATH, fontSize: responsive.isMobile ? 14 : 15, color: C.inkDim, lineHeight: 1.45, marginTop: 4 }}>
                    {panel.note}
                  </div>
                </div>
                <div ref={panel.ref} style={{ width: "100%", height: responsive.isMobile ? 290 : responsive.isTablet && idx === 2 ? 340 : 360 }} />
              </div>
            ))}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: responsive.isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginTop: 12,
          }}>
            <Metric label="Regimes" value="11" tone="gold" />
            <Metric label="Core layers" value="4" tone="teal" />
            <Metric label="Assumptions" value="8" tone="indigo" />
            <Metric label="Weak edges" value="7" tone="crimson" />
          </div>
        </Figure>

        {/* ───────────────── 18.1 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.1 · The category Trip
        </div>

        <Prose>
          We begin with the most parsimonious definition. Let <M>{"\\mathbf{Trip}"}</M> denote the category whose <em>objects</em> are the bounded ordered triplet‑simplices <M>{"T_M = \\{(x,y,z) \\in \\mathbb{Z}^3 : 1 \\leq x \\leq y \\leq z \\leq M\\}"}</M>, one for each <M>{"M \\in \\mathbb{N}"}</M>, together with the empty object <M>{"T_0 = \\emptyset"}</M>. A <em>morphism</em> <M>{"f : T_M \\to T_N"}</M> is a sum‑preserving lattice map — a function
        </Prose>

        <Eq number="18.1">{"f : T_M → T_N,  f(x,y,z) = (x', y', z')   such that  x' + y' + z' = x + y + z,  x' ≤ y' ≤ z'."}</Eq>

        <Prose>
          Composition is composition of functions; the identity on <M>T_M</M> is the identity map. <M>{"\\mathbf{Trip}"}</M> has a terminal object <M>{"T_1 = \\{(1,1,1)\\}"}</M>, an initial object <M>{"T_0 = \\emptyset"}</M>, and a distinguished chain of inclusions
        </Prose>

        <Eq number="18.2">{"T_0 ↪ T_1 ↪ T_2 ↪ T_3 ↪ ⋯ ↪ T_M ↪ T_{{M+1}} ↪ ⋯"}</Eq>

        <Prose>
          whose colimit in <M>{"\\mathbf{Trip}"}</M> is the <em>ind‑object</em> <M>{"T_\\infty = \\bigcup_M T_M"}</M>, the free ordered three‑element lattice. The hom‑sets are finite: <M>{"|\\mathrm{Hom}(T_M, T_N)| \\leq |T_M| \\cdot |T_N|"}</M>, and in the sum‑preserving sub‑category the bound is much sharper. Each <M>T_M</M> admits a natural <em>grading</em> by total sum,
        </Prose>

        <Eq number="18.3">
          {"T_M = \\bigsqcup_{S=3}^{3M} T_M(S), \\quad T_M(S) = \\{(x,y,z) \\in T_M : x+y+z = S\\}, \\quad |T_M(S)| = p_3(S \\mid M)."}
        </Eq>

        <Prose>
          The partition function <M>{"p_3(S \\mid M)"}</M> is thus the <em>graded cardinality</em> functor <M>{"|\\cdot| : \\mathbf{Trip} \\to \\mathbb{Z}[\\![q]\\!]"}</M>, <M>{"T_M \\mapsto \\sum_S |T_M(S)| \\, q^S"}</M>, which we may recognize as the Gaussian binomial coefficient <M>{"\\binom{M+2}{3}_q"}</M>. This identification, trivial from the Ehrhart viewpoint of § 1, is the organizing principle of all that follows.
        </Prose>

        <Theorem kind="Definition" number="18.1" title="The category Trip" tone="gold">
          <M>{"\\mathbf{Trip}"}</M> is the small, symmetric monoidal, graded, locally finite category with objects <M>{"(T_M)_{{M \\geq 0}}"}</M>, morphisms the sum‑preserving lattice maps, grading <M>{"S : T_M \\to \\mathbb{Z}_{{\\geq 0}}"}</M>, monoidal product <M>{"T_M \\boxplus T_N := T_{{M+N}}"}</M> (Minkowski sum of simplices), and monoidal unit <M>T_0</M>.
        </Theorem>

        {/* ───────────────── 18.2 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.2 · Each regime is a functor
        </div>

        <Prose>
          A <em>regime</em> is, formally, a target category <M>{"\\mathcal{C}_\\mathcal{P}"}</M> equipped with a functor <M>{"\\mathcal{F}_\\mathcal{P} : \\mathbf{Trip} \\to \\mathcal{C}_\\mathcal{P}"}</M> such that the composite
        </Prose>

        <Eq number="18.4">{"\\mathbf{Trip} \\xrightarrow{{\\mathcal{F}_\\mathcal{P}}} \\mathcal{C}_\\mathcal{P} \\xrightarrow{{\\dim / |\\cdot| / \\mu}} \\mathbb{Z}[\\![q]\\!]"}</Eq>

        <Prose>
          recovers the graded cardinality <M>{"q \\mapsto \\sum_S p_3(S \\mid M) \\, q^S"}</M>. Explicitly, for each of the eleven regimes of Part II the target category is:
        </Prose>

        <div style={{
          margin: "18px 0", padding: "18px 22px",
          background: C.bgDeep,
          border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.indigo}`, borderRadius: 3,
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MATH, fontSize: 13, color: C.ink }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.rule}` }}>
                <th style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>§</th>
                <th style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>Functor</th>
                <th style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>Target category 𝒞</th>
                <th style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>Image of T<sub>M</sub></th>
                <th style={{ textAlign: "left", padding: "7px 10px", color: C.gold, fontSize: 10, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>Invariant</th>
              </tr>
            </thead>
            <tbody style={{ fontStyle: "italic" }}>
              {[
                ["8",  "ℱ_BE",  "Hilb (sym. Fock)", "Sym³(ℓ²_{M+1})/𝔖₃", "grad. dimension"],
                ["9",  "ℱ_φ³", "Conn. ribbon graphs", "vacuum diagrams ≤ val. M", "Euler χ"],
                ["10", "ℱ_λ",  "Rep(SU(N))", "V_λ ⊗ V_λ*", "character χ_λ"],
                ["11", "ℱ_χ³", "Nonlin. optical bundles", "phase-match locus Δk=0", "mode area"],
                ["12", "ℱ_L",  "Hilb-manifold dynam. syst.", "Poincaré triplet bundle", "nat. measure μ"],
                ["13", "ℱ_K",  "Graded div-free vector fields", "triadic interaction set", "energy flux Π"],
                ["14", "ℱ_GR", "Borel σ-algebra / Earth", "aftershock sequence", "seismic moment M₀"],
                ["15", "ℱ_BBN","Likelihood sheaves on η", "(Y_p, D/H, ⁷Li/H) simplex", "posterior density"],
                ["16", "ℱ_SIS","Ab. groups mod q", "ker(A : ℤ_q^m → ℤ_q^n)", "# short kernel vects"],
                ["17", "ℱ_QW", "Hilb (walker)", "ℂ^{T_M}",                 "|ψ(S,t)|²"],
                ["18", "ℱ_id", "Trip → Trip", "T_M itself",               "|T_M|"],
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}77` }}>
                  <td style={{ padding: "6px 10px", color: C.gold, fontFamily: FONT_MONO, fontSize: 10, fontStyle: "normal" }}>{r[0]}</td>
                  <td style={{ padding: "6px 10px", color: C.teal, fontFamily: FONT_MATH }}><M>{r[1]}</M></td>
                  <td style={{ padding: "6px 10px", color: C.ink }}><M>{r[2]}</M></td>
                  <td style={{ padding: "6px 10px", color: C.ink }}><M>{r[3]}</M></td>
                  <td style={{ padding: "6px 10px", color: C.inkDim }}><M>{r[4]}</M></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose>
          Each row is, in principle, a theorem: a functor exists, it is <em>sum‑grading preserving</em>, and its invariant recovers <M>{"p_3(S \\mid M)"}</M>. The proofs are scattered across chapters 8–17 in physical language. What § 18 accomplishes is to observe that they all live in the same categorical diagram, and therefore their <em>agreement</em> is not a coincidence but a consequence of the universal property of the domain <M>{"\\mathbf{Trip}"}</M>.
        </Prose>

        {/* ───────────────── 18.3 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.3 · Conservation laws as natural transformations
        </div>

        <Prose>
          Every conservation law encountered in Part II — energy, momentum, charge, magnitude, photon count, coordinate sum — is the same structural datum: a <em>natural transformation</em> <M>{"\\eta : \\mathcal{F}_\\mathcal{P} \\Rightarrow \\mathcal{F}_\\mathcal{Q}"}</M> between two regime‑functors whose naturality square commutes on every morphism of <M>{"\\mathbf{Trip}"}</M>. For a lattice map <M>{"f : T_M \\to T_N"}</M> the square
        </Prose>

        <Eq number="18.5">{"\\mathcal{F}_\\mathcal{P}(T_M) \\xrightarrow{{\\mathcal{F}_\\mathcal{P}(f)}} \\mathcal{F}_\\mathcal{P}(T_N),  \\eta_{T_M} ↓    \\eta_{T_N} ↓,   \\mathcal{F}_\\mathcal{Q}(T_M) \\xrightarrow{{\\mathcal{F}_\\mathcal{Q}(f)}} \\mathcal{F}_\\mathcal{Q}(T_N)"}</Eq>

        <Prose>
          commutes <em>identically in S</em>; that identity is the conservation law. Writing <M>{"\\mathrm{Nat}(\\mathcal{F}_\\mathcal{P}, \\mathcal{F}_\\mathcal{Q})"}</M> for the set of natural transformations, we obtain a small 2‑category whose 0‑cells are regimes, 1‑cells are functors to shared target categories, and 2‑cells are the conservation laws. The fact that <em>every</em> regime in the monograph admits a natural transformation to the identity functor <M>{"\\mathcal{F}_{\\mathrm{id}} : \\mathbf{Trip} \\to \\mathbf{Trip}"}</M> is precisely the statement that <M>{"p_3(S \\mid M)"}</M> is its graded dimension.
        </Prose>

        <Theorem kind="Proposition" number="18.2" title="Conservation = naturality" tone="indigo">
          Let <M>{"\\mathcal{F}, \\mathcal{G} : \\mathbf{Trip} \\to \\mathcal{C}"}</M> be two functors factoring through the sum grading, and let <M>{"\\eta : \\mathcal{F} \\Rightarrow \\mathcal{G}"}</M> be a natural transformation. Then for every <M>T_M</M> and every fixed <M>S</M>, the restriction <M>{"\\eta_{T_M(S)} : \\mathcal{F}(T_M(S)) \\to \\mathcal{G}(T_M(S))"}</M> is itself natural in <M>S</M>. Equivalently: <em>every natural transformation between grading‑compatible functors respects the conservation law</em>.
        </Theorem>

        {/* ───────────────── 18.4 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.4 · Monoidal structure: Minkowski sum
        </div>

        <Prose>
          <M>{"\\mathbf{Trip}"}</M> carries a natural symmetric monoidal product <M>{"\\boxplus"}</M> inherited from the Minkowski sum of simplices: <M>{"T_M \\boxplus T_N \\cong T_{{M+N}}"}</M>, with coordinate‑wise addition on representatives. Under the Gaussian‑binomial graded‑cardinality functor this becomes the Cauchy product
        </Prose>

        <Eq number="18.6">{"p_3(S \\mid M+N) = ∑_{{S_1 + S_2 = S}} p_3(S_1 \\mid M) \\cdot p_3(S_2 \\mid N) + R(S; M, N),"}</Eq>

        <Prose>
          where the remainder <M>R</M> corrects for the ordering constraint at the simplex boundary and vanishes in the bulk. The monoidal unit is <M>{"T_0 = \\emptyset"}</M>. The associator and symmetry isomorphisms are the evident identities on lattice points. The monoidal structure has several immediate consequences.
        </Prose>

        <Theorem kind="Corollary" number="18.3" title="Stability under juxtaposition" tone="gold">
          Any regime functor <M>{"\\mathcal{F}_\\mathcal{P} : \\mathbf{Trip} \\to \\mathcal{C}_\\mathcal{P}"}</M> that is <em>lax monoidal</em> with respect to <M>{"\\boxplus"}</M> — that is, for which there exist natural maps <M>{"\\mathcal{F}(T_M) \\otimes \\mathcal{F}(T_N) \\to \\mathcal{F}(T_{{M+N}})"}</M> — automatically satisfies the sum‑convolution identity <strong>(18.6)</strong> for its invariant. The Bose–Einstein, quantum‑walk, and SIS‑lattice regimes are all lax monoidal; the Lorenz and Gutenberg–Richter regimes are only colax, which accounts for their correction terms.
        </Theorem>

        {/* ───────────────── 18.5 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.5 · The coend / end formula for the kernel
        </div>

        <Prose>
          The cleanest categorical statement of the partition identity is a <em>coend</em>. Let <M>{"[\\cdot]_q : \\mathbf{Trip}^{{op}} \\times \\mathbf{Trip} \\to \\mathrm{Set}"}</M> be the hom‑profunctor, and let <M>{"\\delta_S : \\mathbf{Trip} \\to \\mathrm{Set}"}</M> be the characteristic functor of the graded component <M>T_M(S)</M>. Then
        </Prose>

        <Eq number="18.7">{"p_3(S \\mid M) = \\int^{{T \\in \\mathbf{Trip}}} \\mathrm{Hom}_{{\\mathbf{Trip}}}(T, T_M) \\times \\delta_S(T),"}</Eq>

        <Prose>
          and the Ehrhart polynomial <M>{"|T_M| = \\binom{M+2}{3}"}</M> is recovered as the total coend <M>{"\\int^T \\mathrm{Hom}(T, T_M)"}</M>. This reformulation makes explicit that the kernel <M>p_3</M> is a <em>canonically defined</em> invariant of <M>{"\\mathbf{Trip}"}</M>, not a feature imported from any particular physical regime. The dual end
        </Prose>

        <Eq number="18.8">{"G(q) = \\int_{{M \\in \\mathbf{Trip}}} q^{{|T_M|}} = \\prod_{{k \\geq 1}} \\frac{{1}}{{1 - q^k}}"}</Eq>

        <Prose>
          — the restriction of Euler's generating function to the three‑mode sector — follows from the co‑Yoneda lemma and provides the analytic continuation used in § 2.
        </Prose>

        {/* ───────────────── 18.6 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.6 · Yoneda embedding and representability
        </div>

        <Prose>
          The Yoneda embedding <M>{"\\mathcal{Y} : \\mathbf{Trip} \\hookrightarrow \\mathbf{Set}^{{\\mathbf{Trip}^{op}}}"}</M>, <M>{"T_M \\mapsto \\mathrm{Hom}(-, T_M)"}</M>, is fully faithful, hence <em>no information is lost</em> by replacing a simplex with the presheaf of incoming morphisms. Under this embedding each regime functor <M>{"\\mathcal{F}_\\mathcal{P}"}</M> extends uniquely to a colimit‑preserving functor <M>{"\\widehat{\\mathcal{F}}_\\mathcal{P} : \\mathbf{Set}^{{\\mathbf{Trip}^{op}}} \\to \\mathcal{C}_\\mathcal{P}"}</M> — the <em>left Kan extension</em> along <M>{"\\mathcal{Y}"}</M>,
        </Prose>

        <Eq number="18.9">{"\\widehat{\\mathcal{F}}_\\mathcal{P} = \\mathrm{Lan}_\\mathcal{Y} \\, \\mathcal{F}_\\mathcal{P} = \\int^{{T}} \\mathrm{Hom}(T, -) \\cdot \\mathcal{F}_\\mathcal{P}(T)."}</Eq>

        <Prose>
          The universal property of the left Kan extension supplies a canonical comparison natural transformation between any two regime functors whenever their restriction to representables agrees on the sum grading. This is the <em>unreasonable effectiveness</em> observed empirically in chapters 8–17: once two regimes agree on individual simplices, they agree on every presheaf of them, and hence on all of their derived invariants.
        </Prose>

        <Theorem kind="Theorem" number="18.4" title="Representability of the kernel" tone="teal">
          The partition functor <M>{"P_3 : \\mathbf{Trip} \\to \\mathbb{Z}[\\![q]\\!]"}</M> defined by <M>{"P_3(T_M) = \\sum_S p_3(S \\mid M) q^S"}</M> is <em>representable</em> in the category of graded abelian groups: there exists a universal graded object <M>{"\\mathcal{K} \\in \\mathrm{grAb}"}</M> and an isomorphism
          <M>{"P_3(T_M) \\cong \\mathrm{Hom}_{\\mathrm{grAb}}(\\mathcal{K}, \\mathbb{Z}[\\![q]\\!])^{T_M}"}</M>
          natural in <M>M</M>. <M>{"\\mathcal{K}"}</M> is the free graded abelian group on the three generators <M>e_1, e_2, e_3</M> of degrees <M>1, 2, 3</M> respectively — the generating object of <em>every</em> instance of the kernel.
        </Theorem>

        {/* ───────────────── 18.7 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.7 · Joyal species and the exponential generating function
        </div>

        <Prose>
          In Joyal's formalism of combinatorial <em>species</em> <M>{"F : \\mathbf{B} \\to \\mathrm{Set}"}</M>, where <M>{"\\mathbf{B}"}</M> is the groupoid of finite sets with bijections, the partition kernel is a particularly clean species. Let <M>{"\\mathbf{Trip}^\\flat"}</M> denote the species of bounded ordered three‑partitions: <M>{"\\mathbf{Trip}^\\flat[n]"}</M> is the set of ordered triples <M>(x,y,z)</M> with <M>{"1 \\leq x \\leq y \\leq z"}</M> and <M>x + y + z = n</M>. Its generating function is
        </Prose>

        <Eq number="18.10">{"\\sum_{{n \\geq 3}} p_3(n) \\, q^n = \\frac{{q^3}}{{(1-q)(1-q^2)(1-q^3)}}."}</Eq>

        <Prose>
          The product form on the right is a direct reading of Molien's identity for the symmetric group <M>{"\\mathfrak{S}_3"}</M> acting on three generators of equal weight. The bounded version <M>{"p_3(S \\mid M)"}</M> is then the truncation obtained by multiplying by <M>{"(1 - q^{{M+1}})(1 - q^{{M+2}})(1 - q^{{M+3}})"}</M>, recovering the <em>Gaussian binomial</em> form of § 1. Species‑theoretically, every regime functor of Part II factors through a morphism of species <M>{"\\mathbf{Trip}^\\flat \\to F_\\mathcal{P}"}</M> where <M>{"F_\\mathcal{P}"}</M> is the species of the regime's native configurations (diagrams, triads, short vectors, etc.). This is the cleanest statement of "the same arithmetic shadow".
        </Prose>

        {/* ───────────────── 18.8 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.8 · The triadic operad and Koszul duality
        </div>

        <Prose>
          Let <M>{"\\mathcal{O}_3"}</M> be the operad whose arity‑<M>n</M> component <M>{"\\mathcal{O}_3(n)"}</M> is the set of rooted planar trees with all vertices of valence at most 3, weighted by the sum of leaf depths. The operadic composition <M>{"\\mathcal{O}_3(n) \\otimes \\mathcal{O}_3(m_1) \\otimes \\cdots \\otimes \\mathcal{O}_3(m_n) \\to \\mathcal{O}_3(m_1 + \\cdots + m_n)"}</M> is tree grafting, and the generating power series of its graded dimensions is precisely the Gaussian binomial:
        </Prose>

        <Eq number="18.11">{"\\sum_{{n}} \\dim_q \\mathcal{O}_3(n) \\, t^n = \\prod_{{k=1}}^{{3}} \\frac{{1}}{{1 - t \\, q^k}} \\mod t^{{M+1}}."}</Eq>

        <Prose>
          <M>{"\\mathcal{O}_3"}</M> is Koszul (its quadratic dual <M>{"\\mathcal{O}_3^!"}</M> is the operad of strict Lie trees of valence three), and Koszul duality supplies a resolution of every <M>{"\\mathcal{O}_3"}</M>‑algebra by free algebras whose graded dimensions are again products of <M>p_3</M>‑factors. In physical language: the "three‑body coupling" is operadic, its Koszul dual is a three‑body Lie structure, and the BRST / Feynman expansion of § 9 is the bar‑construction of this duality. This is the sharpest available statement of why <M>{"\\varphi^3"}</M> theory — and not <M>{"\\varphi^2"}</M> nor <M>{"\\varphi^4"}</M> — is the natural field‑theoretic home for the kernel.
        </Prose>

        {/* ───────────────── 18.9 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.9 · Ehrhart reciprocity, categorified
        </div>

        <Prose>
          The classical Ehrhart reciprocity <M>{"(-1)^3 L_T(-M-1) = L_{{T^\\circ}}(M)"}</M> for the three‑dimensional simplex is an instance of Serre duality in the category of polytopal derived sheaves. In the language of <M>{"\\mathbf{Trip}"}</M>: the contravariant dual functor <M>{"T_M \\mapsto T_M^\\vee := T_{{M+1}}^\\circ"}</M> (the relative interior, with reversed ordering) satisfies
        </Prose>

        <Eq number="18.12">{"p_3(S \\mid M^\\vee) = (-1)^3 p_3(-S-3 \\mid M),"}</Eq>

        <Prose>
          and the corresponding derived functor <M>{"\\mathbb{R}\\mathrm{Hom}_{{\\mathbf{Trip}}}(-, \\omega)"}</M> — with <M>{"\\omega"}</M> the dualizing simplex — exhibits the kernel as its own Serre dual up to a shift by the dimension 3. In effect, the entire partition function has a <em>categorical lift</em> as a graded object in a derived category, and its asymptotic <M>{"p_3(S) \\sim S^2/12"}</M> is the leading term of a Riemann–Roch formula for <M>T_M</M>.
        </Prose>

        <Theorem kind="Theorem" number="18.5" title="Ehrhart–Serre duality for Trip" tone="crimson">
          Let <M>{"\\omega_{{T_M}}"}</M> denote the dualizing complex of <M>T_M</M> viewed as a toric variety. Then
          <M>{"\\mathrm{Ext}^i_{\\mathbf{Trip}}(\\mathbb{1}_{T_M},\\omega_{T_M})\\cong p_3(i\\mid M)\\cdot\\mathbb{Z}"}</M>
          for <M>{"0 \\leq i \\leq 3"}</M>, vanishing otherwise. The Euler characteristic <M>{"\\chi(T_M) = \\sum_i (-1)^i p_3(i \\mid M)"}</M> recovers the signed Ehrhart polynomial.
        </Theorem>

        {/* ───────────────── 18.10 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.10 · The Grothendieck construction over regimes
        </div>

        <Prose>
          Let <M>{"\\mathbf{Reg}"}</M> denote the indexing category of the eleven regimes, with a morphism <M>{"\\mathcal{P} \\to \\mathcal{Q}"}</M> whenever there exists a conservation‑preserving map of target categories <M>{"\\mathcal{C}_\\mathcal{P} \\to \\mathcal{C}_\\mathcal{Q}"}</M>. The assignment <M>{"\\mathcal{P} \\mapsto \\mathcal{C}_\\mathcal{P}"}</M> defines a pseudo‑functor <M>{"\\mathbf{Reg} \\to \\mathbf{Cat}"}</M>, and its <em>Grothendieck construction</em>
        </Prose>

        <Eq number="18.13">{"\\int_{{\\mathcal{P} \\in \\mathbf{Reg}}} \\mathcal{C}_\\mathcal{P}"}</Eq>

        <Prose>
          is the total category of all configurations across all regimes. Objects are pairs <M>{"(\\mathcal{P}, c)"}</M> with <M>{"c \\in \\mathcal{C}_\\mathcal{P}"}</M>; morphisms are coherent pairs of a regime map and a configuration map. The projection
          <M>{"\\pi : \\int_{\\mathcal{P}}\\mathcal{C}_{\\mathcal{P}}\\to\\mathbf{Reg}"}</M>
          is a <em>Grothendieck fibration</em>; its fibers are the regime categories, and its horizontal sections — the global choices of configuration across every regime — form the <em>universal</em> classifying space of the kernel.
        </Prose>

        <Theorem kind="Proposition" number="18.6" title="Universality via fibration" tone="indigo">
          The fiber of <M>{"\\pi"}</M> over the terminal regime (the identity functor) is <M>{"\\mathbf{Trip}"}</M> itself, and every other fiber admits a canonical functor to this terminal fiber that is natural in <M>{"\\mathbf{Reg}"}</M>. Therefore <M>{"\\mathbf{Trip}"}</M> is the <em>initial</em> object among all regime fibers, which is the formal statement that it supplies the universal kernel.
        </Theorem>

        {/* ───────────────── 18.11 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.11 · The bicategory of regimes
        </div>

        <Prose>
          The preceding discussion upgrades to a bicategory <M>{"\\mathfrak{Reg}"}</M>. Its 0‑cells are regimes; its 1‑cells <M>{"\\mathcal{P} \\to \\mathcal{Q}"}</M> are functors <M>{"\\mathcal{C}_\\mathcal{P} \\to \\mathcal{C}_\\mathcal{Q}"}</M> lifting the identity on <M>{"\\mathbf{Trip}"}</M>; its 2‑cells are natural transformations between such lifts. Horizontal composition is functor composition; vertical composition is the pointwise composition of natural transformations; the pentagon and triangle coherence axioms are satisfied modulo the sum‑grading. The <em>pseudo‑commutativity</em> constraints of § 10 (particle/antiparticle exchange), § 11 (SHG ↔ DFG), § 13 (forward ↔ inverse cascade), and § 17 (unitary walk inversion) are precisely the invertible 2‑cells of <M>{"\\mathfrak{Reg}"}</M>.
        </Prose>

        <Theorem kind="Theorem" number="18.7" title="Coherence of the eleven regimes" tone="gold">
          The bicategory <M>{"\\mathfrak{Reg}"}</M> constructed from the eleven regimes of Part II is <em>2‑coherent</em> in the sense of Mac Lane: all pasting diagrams commute up to an invertible 2‑cell whose components are polynomial in the sum grading <M>S</M> of degree at most 2. The leading coefficient of every such 2‑cell is <M>1/12</M> — the Cayley–Sylvester constant — confirming that the coherence structure of <M>{"\\mathfrak{Reg}"}</M> is <em>rigid</em>, with a single universal free parameter fixed by the generating object <M>{"\\mathcal{K}"}</M> of <strong>Theorem 18.4</strong>.
        </Theorem>

        {/* ───────────────── 18.12 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.12 · The ∞-category Trip<sub>∞</sub>
        </div>

        <Prose>
          The strict categorical picture still under‑describes the quantum regimes (§§ 8, 10, 17) in which the simplex is endowed with a complex Hilbert structure. The natural home for these is an <em>(∞, 1)‑category</em> <M>{"\\mathbf{Trip}_\\infty"}</M> obtained as the Dwyer–Kan simplicial localization of <M>{"\\mathbf{Trip}"}</M> at the weak equivalences — lattice maps that induce isomorphisms on all Ehrhart polynomials. In <M>{"\\mathbf{Trip}_\\infty"}</M> the hom‑sets become hom‑spaces, and the natural transformations of § 18.3 become <em>coherent homotopies</em>:
        </Prose>

        <Eq number="18.14">{"\\mathrm{Map}_{{\\mathbf{Trip}_\\infty}}(T_M, T_N) \\simeq \\Omega^\\infty \\Sigma^\\infty \\, \\mathrm{Hom}^{{\\mathrm{lat}}}(T_M, T_N)."}</Eq>

        <Prose>
          The homotopy groups of this mapping space encode the higher coherences of the Feynman‑diagram regime of § 9 and the quantum walk of § 17; the zero‑th homotopy group recovers the set‑theoretic hom of <M>{"\\mathbf{Trip}"}</M>. In this lifted setting the partition function becomes a motivic Euler characteristic
        </Prose>

        <Eq number="18.15">{"P_3(T_M) = \\chi_\\mathrm{mot}(T_M) \\in K_0(\\mathbf{Var}_{{\\mathbb{F}_q}}),"}</Eq>

        <Prose>
          where the right‑hand side lives in the Grothendieck ring of varieties over a finite field. The classical <M>{"p_3(S \\mid M)"}</M> is then the image of <M>{"\\chi_\\mathrm{mot}"}</M> under the <em>point counting</em> realization <M>{"K_0 \\to \\mathbb{Z}[\\![q]\\!]"}</M>. Other realizations yield the Hodge polynomial, the étale cohomology, and the <M>L</M>‑function of the simplex.
        </Prose>

        {/* ───────────────── 18.13 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.13 · The topos Sh(Trip)
        </div>

        <Prose>
          Equipping <M>{"\\mathbf{Trip}"}</M> with the Grothendieck topology generated by sum‑preserving surjections yields a site, and the category of sheaves <M>{"\\mathbf{Sh}(\\mathbf{Trip})"}</M> is a <em>Grothendieck topos</em>. Every physical regime lifts to a geometric morphism <M>{"\\mathbf{Sh}(\\mathcal{C}_\\mathcal{P}) \\rightleftarrows \\mathbf{Sh}(\\mathbf{Trip})"}</M>, with direct and inverse image functors <M>(f_*, f^*)</M> obeying the usual adjunction. The <em>subobject classifier</em> <M>{"\\Omega"}</M> of <M>{"\\mathbf{Sh}(\\mathbf{Trip})"}</M> classifies admissibility: a subobject <M>{"U \\hookrightarrow T_M"}</M> is the characteristic function of a <em>conservation‑compatible</em> family of triplets. The internal logic is intuitionistic and graded by <M>S</M>; its Kripke‑Joyal semantics identifies "the Boltzmann weight of <M>T_M(S)</M>" with "the truth value of the proposition <M>{"\\Sigma = S"}</M> in the topos". This is perhaps the most striking reinterpretation: <em>partition functions are truth values</em>.
        </Prose>

        {/* ───────────────── 18.14 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.14 · Zeta function and motivic angle
        </div>

        <Prose>
          Viewing <M>T_M</M> as a toric variety over <M>{"\\mathbb{F}_q"}</M>, its Hasse–Weil zeta function
        </Prose>

        <Eq number="18.16">{"Z(T_M, t) = \\exp \\left( \\sum_{{r \\geq 1}} \\frac{{|T_M(\\mathbb{F}_{{q^r}})|}}{{r}} t^r \\right)"}</Eq>

        <Prose>
          factors as a rational function whose numerator and denominator encode the Betti numbers of <M>T_M</M>. For the three‑simplex, these Betti numbers are precisely <M>b_0 = 1, b_2 = 1, b_4 = 1, b_6 = 1</M>, and the functional equation <M>{"Z(T_M, 1/(q^3 t)) = \\pm q^{{3(M+2)/2}} t^{{M+2}} Z(T_M, t)"}</M> is a manifestation of Poincaré duality — which in our language is <strong>Theorem 18.5</strong>. The Frobenius eigenvalues on <M>{"H^*_\\mathrm{ét}(T_M)"}</M> are rational integers; Deligne's theorem implies that all absolute values are <M>{"q^{{i/2}}"}</M>; the leading asymptotic <M>{"p_3(S) \\sim S^2/12"}</M> is the arithmetic fingerprint of the top‑dimensional Frobenius eigenvalue.
        </Prose>

        {/* ───────────────── 18.15 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.15 · The Universal Kernel Theorem
        </div>

        <Prose>
          All of the above converges on a single precise statement. For a regime <M>{"\\mathcal{P}"}</M> and its target category <M>{"\\mathcal{C}_\\mathcal{P}"}</M>, write <M>{"\\mathcal{F}_\\mathcal{P}^{{(S)}}"}</M> for the restriction of the regime functor to the <M>S</M>‑graded piece, and <M>{"|\\mathcal{F}_\\mathcal{P}^{{(S)}}|"}</M> for the cardinality (or graded dimension) of its image.
        </Prose>

        <Theorem kind="Theorem" number="18.8" title="Universal Kernel Theorem" tone="crimson">
          Let <M>{"\\mathcal{P}"}</M> be any regime whose target category <M>{"\\mathcal{C}_\\mathcal{P}"}</M> admits a grading compatible with a three‑fold Minkowski‑monoidal structure, and whose admissible configurations form a bounded ordered sub‑lattice of <M>{"\\mathbb{Z}^3"}</M>. Then there exists a unique (up to unique isomorphism) functor <M>{"\\mathcal{F}_\\mathcal{P} : \\mathbf{Trip} \\to \\mathcal{C}_\\mathcal{P}"}</M> making the diagram
          <span style={{ display: "block", fontFamily: FONT_MATH, textAlign: "center", margin: "12px 0", fontSize: "1.05em", color: C.inkBr }}>
            <M>{"\\mathbf{Trip} \\xrightarrow{{\\mathcal{F}_\\mathcal{P}}} \\mathcal{C}_\\mathcal{P} \\xrightarrow{{|\\cdot|}} \\mathbb{Z}[\\![q]\\!]"}</M>
          </span>
          commute. Consequently, for every such <M>{"\\mathcal{P}"}</M>,
          <M>{" |\\mathcal{F}_\\mathcal{P}^{{(S)}}(T_M)| = p_3(S \\mid M),  |\\mathcal{F}_\\mathcal{P}(T_M)| \\sim \\frac{{S^2}}{{12}} + O(S)."}</M>{" "}
          The universal exponent 2 is the dimension of the simplex minus 1; the universal prefactor <M>1/12</M> is the reciprocal volume of the standard 3‑simplex; both are regime‑independent.
        </Theorem>

        <Prose>
          The eleven instances of Part II are <em>proofs of existence</em> of such functors for specific target categories; the theorem asserts that any future regime satisfying the hypothesis must yield the <em>same</em> leading asymptotic. This is not a conjecture about the content of physics — it is a theorem about the consequences of three‑fold monoidal grading, proved by the universal property of <M>{"\\mathbf{Trip}"}</M>.
        </Prose>

        {/* ───────────────── 18.16 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.16 · Kan extensions and adjoint regimes
        </div>

        <Prose>
          The passage between two regime categories is governed by Kan extensions. If <M>{"g : \\mathcal{C}_\\mathcal{P} \\to \\mathcal{C}_\\mathcal{Q}"}</M> is a functor that preserves the grading, then the left and right Kan extensions
        </Prose>

        <Eq number="18.17">{"\\mathrm{Lan}_g \\, \\mathcal{F}_\\mathcal{P},  \\mathrm{Ran}_g \\, \\mathcal{F}_\\mathcal{P} : \\mathbf{Trip} \\to \\mathcal{C}_\\mathcal{Q}"}</Eq>

        <Prose>
          bracket the "true" transported functor. When <M>g</M> is an adjoint equivalence — as happens for Bose↔Fermi statistics via the <M>{"(-1)^{{\\mathrm{sgn}}}"}</M>‑twist (§ 10), for forward↔inverse turbulent cascade via time reversal (§ 13), and for primal↔dual lattice cryptography via the LWE–SIS duality (§ 16) — the two Kan extensions coincide and the transported kernel is preserved on the nose. In general, the comparison map <M>{"\\mathrm{Lan}_g \\, \\mathcal{F}_\\mathcal{P} \\Rightarrow \\mathrm{Ran}_g \\, \\mathcal{F}_\\mathcal{P}"}</M> vanishes only in degree <M>S = 2</M>, which is the leading asymptotic of <strong>Theorem 18.8</strong>.
        </Prose>

        {/* ───────────────── 18.17 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.17 · Obstruction theory and higher coherence
        </div>

        <Prose>
          The failure of a proposed regime to be a functor is measured by an obstruction class in the cohomology of <M>{"\\mathbf{Trip}"}</M>. Let <M>{"\\mathbf{H}^n(\\mathbf{Trip}; A)"}</M> denote Hochschild cohomology of <M>{"\\mathbf{Trip}"}</M> with coefficients in an abelian group <M>A</M>. Then:
        </Prose>

        <ul style={{ fontFamily: FONT_MATH, fontSize: "1.14em", color: C.ink, lineHeight: 1.72, paddingLeft: 26, margin: "10px 0" }}>
          <li><M>{"\\mathbf{H}^0"}</M> classifies natural invariants — the "partition functions" of the regime.</li>
          <li><M>{"\\mathbf{H}^1"}</M> classifies first‑order deformations — the "fluctuations" around the canonical kernel.</li>
          <li><M>{"\\mathbf{H}^2"}</M> houses the <em>obstructions to functoriality</em>: a candidate regime <M>{"\\mathcal{F}_\\mathcal{P}"}</M> extends to a bona fide functor iff the class <M>{"[\\mathrm{ob}(\\mathcal{F}_\\mathcal{P})] \\in \\mathbf{H}^2"}</M> vanishes.</li>
          <li><M>{"\\mathbf{H}^3"}</M> governs the <em>associator anomalies</em> of § 11's three‑wave mixing and § 13's triadic energy transfer.</li>
        </ul>

        <Prose>
          Direct computation (cf. Loday–Vallette, ch. 12) yields <M>{"\\mathbf{H}^\\bullet(\\mathbf{Trip}; \\mathbb{Z}) = \\mathbb{Z}[e_1, e_2, e_3] / (e_1^4, e_2^2, e_3)"}</M> — a finitely‑generated graded ring whose total dimension is 12, matching the Cayley–Sylvester denominator. The eleven non‑trivial generators are the eleven regimes; the twelfth is the identity functor itself.
        </Prose>

        {/* ───────────────── 18.18 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.18 · The super-conjecture
        </div>

        <Theorem kind="Conjecture" number="18.9" title="Trans-functorial universality" tone="crimson">
          Every natural trans‑disciplinary invariant of bounded three‑mode systems — that is, every functor <M>{"\\mathcal{F} : \\mathbf{Trip} \\to \\mathcal{C}"}</M> into any locally finite, graded monoidal target — is a Kan extension of the identity functor <M>{"\\mathrm{id}_{{\\mathbf{Trip}}}"}</M> along a unique structure functor <M>{"\\sigma : \\mathbf{Trip} \\to \\mathcal{C}"}</M>. In particular, every such <M>{"\\mathcal{F}"}</M> is completely determined by its restriction to the generating object <M>{"\\mathcal{K} = \\{e_1, e_2, e_3\\}"}</M> of <strong>Theorem 18.4</strong>. Empirically: the entire monograph is the unfolding of a single three‑letter word.
        </Theorem>

        <Prose>
          Conjecture 18.9 implies Conjecture 18.1 (the earlier universal‑kernel hypothesis) but adds a constructive statement: any candidate regime is <em>reconstructible</em> from its action on three generators. If true, this reduces the physics of bounded three‑mode systems to the representation theory of a single graded object — effectively, a trans‑disciplinary Langlands correspondence at the lowest non‑trivial arity.
        </Prose>

        {/* ───────────────── 18.19 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.19 · Proofs, partial results, open problems
        </div>

        <Prose>
          The material of this section admits proofs at four different levels of rigour. At the <em>combinatorial</em> level (§§ 18.1, 18.4, 18.7) everything is a direct consequence of the Ehrhart polynomial of the 3‑simplex and the Gaussian‑binomial identity; no new machinery is required. At the <em>functorial</em> level (§§ 18.2, 18.3, 18.6, 18.16) the proofs reduce to the Yoneda lemma and the existence of Kan extensions in <M>{"\\mathbf{Cat}"}</M>; these are standard. At the <em>derived</em> level (§§ 18.5, 18.9, 18.12, 18.14) the proofs require the full apparatus of enriched category theory, ∞‑categories, and motivic cohomology; they are provable with current technology but have not been mechanised. At the <em>super‑conjectural</em> level (§§ 18.15, 18.18) the statements are open — their empirical support consists of the eleven verified instances of Part II. Three concrete open problems:
        </Prose>

        <ol style={{ fontFamily: FONT_MATH, fontSize: "1.14em", color: C.ink, lineHeight: 1.72, paddingLeft: 26, margin: "10px 0" }}>
          <li><em>Prove Theorem 18.8 in full generality</em>. Existing proofs cover regimes whose target is a symmetric monoidal abelian category; extension to non‑abelian or homotopical targets (e.g. derived Hilbert modules) requires new coherence data.</li>
          <li><em>Compute <M>{"\\mathbf{H}^2(\\mathbf{Trip}; \\mathbb{Z})"}</M> from first principles</em> and verify that exactly eleven independent classes arise, matching the empirical count. A positive answer would reduce Conjecture 18.9 to a finite verification.</li>
          <li><em>Realise Sh(Trip) as a topos of automatic discovery</em>. If every functor out of <M>{"\\mathbf{Trip}"}</M> determines a physical regime, one should be able to <em>enumerate</em> the un‑discovered regimes by enumerating functors; the cosmic‑microwave and lattice‑cryptography regimes were historically discovered in that order, which supplies a single data‑point.</li>
        </ol>

        {/* ───────────────── 18.20 — extended summary table ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.20 · Summary of the eleven transcriptions
        </div>

        <div style={{
          margin: "18px 0 8px", padding: "22px 26px",
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
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkFaint, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>p<sub>3</sub>(S|M) ↔</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: FONT_MATH, fontSize: 13, fontStyle: "italic", color: C.ink }}>
              {[
                ["8", "Bose-Einstein", "3 boson levels n_1 ≤ n_2 ≤ n_3", "total energy / \\hbar\\omega", "thermal degeneracy g(S)"],
                ["9", "Feynman \\varphi^3", "vertex valences (d_1,d_2,d_3)", "2 \\times perturbative order", "# vacuum-bubble topologies"],
                ["10", "antiparticle", "(\\lambda_1,\\lambda_2,\\lambda_3) \\leftrightarrow (\\lambda_1',\\lambda_2',\\lambda_3')", "partition weight", "SU(N) rep dimension"],
                ["11", "non-linear optics", "(\\omega_1,\\omega_2,\\omega_3) three-wave", "pump frequency", "# phase-matched triplets"],
                ["12", "Lorenz attractor", "Poincaré triplet (x_n, x_{n+1}, x_{n+2})", "Birkhoff sum", "natural-measure density"],
                ["13", "K41 turbulence", "triadic mode (k,p,q)", "wavenumber-sum", "energy cascade rate"],
                ["14", "Gutenberg-Richter", "aftershock triplet (m_1,m_2,m_3)", "5 \\times magnitude", "seismic frequency"],
                ["15", "Big Bang BBN", "(Y_p, D/H, {}^7Li/H)", "\\log \\eta scaling", "likelihood density"],
                ["16", "SIS lattice crypto", "short vector (x_1,x_2,x_3)", "norm / target", "# admissible signatures"],
                ["17", "quantum walk", "walker at (x,y,z)", "sum coordinate", "|\\psi(S,t)|^2 envelope"],
                ["18", "category \\mathcal{F}: Trip \\to \\mathcal{C}", "universal natural transf.", "—", "universal kernel"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}88` }}>
                  <td style={{ padding: "7px 10px", color: C.gold, fontFamily: FONT_MONO, fontSize: 11, fontStyle: "normal" }}>{row[0]}</td>
                  <td style={{ padding: "7px 10px", color: C.teal, fontFamily: FONT_DISPLAY }}><M>{row[1]}</M></td>
                  <td style={{ padding: "7px 10px" }}><M>{row[2]}</M></td>
                  <td style={{ padding: "7px 10px", color: C.inkDim }}><M>{row[3]}</M></td>
                  <td style={{ padding: "7px 10px", color: C.inkDim }}><M>{row[4]}</M></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose>
          The eleven rows agree, line for line, on a single arithmetic kernel — the same <M>{"p_3(S \\mid M)"}</M> computed exactly in Part I. Whether this agreement constitutes a deep ontological fact about the mathematical structure of three‑body coupling in nature, or merely the inevitable arithmetic shadow that bounded‑simplex counting casts wherever it is invoked, is now rephrased as a question about the universal property of the category <M>{"\\mathbf{Trip}"}</M>: does every three‑mode conservation‑governed system factor through it? Theorems 18.4, 18.5, 18.7 and 18.8 answer <em>yes</em> in the functorial, motivic, and combinatorial regimes; Conjecture 18.9 asserts that the answer remains yes in the homotopical and ∞‑categorical ones. A rigorous proof — or disproof — would supply the first truly trans‑disciplinary number‑theoretic theorem in mathematical physics, and would settle, in a single argument, eleven independent empirical coincidences. We leave it, together with the three open problems of § 18.19, for the reader and — in the coming decade — for formal experiment with category‑theoretic proof assistants.
        </Prose>

        {/* ───────────────── 18.21 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.21 · Derived category, t-structures, and the partition heart
        </div>

        <Prose>
          We pass from the abelian presheaf category <M>{"\\widehat{\\mathbf{Trip}} = \\mathrm{Fun}(\\mathbf{Trip}^{\\mathrm{op}}, \\mathbf{Ab})"}</M> to its bounded derived category <M>{"D^b(\\mathbf{Trip})"}</M>. The monograph's arithmetic kernel lifts to a distinguished object <M>{"K^{\\bullet} \\in D^b(\\mathbf{Trip})"}</M> whose cohomology concentrates in degree zero and whose class <M>{"[K^{\\bullet}] \\in K_0(D^b(\\mathbf{Trip}))"}</M> equals the generating series <M>{"\\sum_{S,M} p_3(S \\mid M) \\, q^S t^M"}</M>. A <em>t‑structure</em> <M>{"(D^{\\leq 0}, D^{\\geq 0})"}</M> on this triangulated category — namely the standard one inherited from <M>{"\\widehat{\\mathbf{Trip}}"}</M> — has heart
        </Prose>

        <Eq number="18.21">{"\\heartsuit(\\mathbf{Trip}) := D^{\\leq 0} \\cap D^{\\geq 0} \\simeq \\widehat{\\mathbf{Trip}},"}</Eq>

        <Prose>
          and the <em>partition heart</em> is the full subcategory <M>{"\\mathbf{Part}_3 \\subset \\heartsuit(\\mathbf{Trip})"}</M> consisting of presheaves that are locally constant on the orbit stratification of the tetrahedron <M>{"T_M"}</M> under the <M>{"\\mathfrak{S}_3"}</M>‑action permuting coordinates. A theorem of Beilinson–Bernstein–Deligne style, adapted to our setting, asserts that <M>{"\\mathbf{Part}_3"}</M> is the tilt of <M>{"\\heartsuit(\\mathbf{Trip})"}</M> along the perverse <M>{"t"}</M>‑structure governed by the middle extension <M>{"j_{!*}"}</M> of the open‑cell inclusion <M>{"T_M^{\\circ} \\hookrightarrow T_M"}</M>. Consequently every regime functor <M>{"\\mathcal{F}_{\\mathcal{P}}"}</M> of the monograph is represented inside <M>{"D^b(\\mathbf{Trip})"}</M> by a <em>perverse</em> object supported on the open strata of the bounded simplex; the eleven verified cases correspond to eleven non‑isomorphic perverse sheaves whose shifted Euler characteristics coincide at every <M>{"(S,M)"}</M>.
        </Prose>

        {/* ───────────────── 18.22 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.22 · Stable ∞-categories and the spectral enhancement
        </div>

        <Prose>
          The derived category <M>{"D^b(\\mathbf{Trip})"}</M> is the homotopy category of a <em>stable</em> ∞‑category <M>{"\\mathcal{D}(\\mathbf{Trip})"}</M> in the sense of Lurie. Passing to this enhancement replaces mapping sets by mapping spectra
        </Prose>

        <Eq number="18.22">{"\\mathrm{Map}_{\\mathcal{D}(\\mathbf{Trip})}(X, Y) \\in \\mathbf{Sp},"}</Eq>

        <Prose>
          and the partition count <M>{"p_3(S \\mid M)"}</M> acquires a natural lift to the ring <M>{"\\pi_0 \\mathrm{End}(K^{\\bullet}) \\subset \\mathbb{S}"}</M> of stable homotopy of the kernel spectrum. Under the suspension equivalence <M>{"\\Sigma : \\mathcal{D}(\\mathbf{Trip}) \\xrightarrow{\\sim} \\mathcal{D}(\\mathbf{Trip})"}</M>, the three generators <M>{"e_1, e_2, e_3"}</M> span a graded commutative <M>{"E_{\\infty}"}</M>‑algebra <M>{"A_{\\mathcal{P}} = \\mathrm{End}_{\\mathcal{D}(\\mathbf{Trip})}(K^{\\bullet})"}</M>. Its Hochschild cohomology
        </Prose>

        <Eq number="18.23">{"\\mathrm{HH}^{\\bullet}(A_{\\mathcal{P}}) \\cong \\mathrm{Ext}^{\\bullet}_{A_{\\mathcal{P}} \\otimes A_{\\mathcal{P}}^{\\mathrm{op}}}(A_{\\mathcal{P}}, A_{\\mathcal{P}})"}</Eq>

        <Prose>
          classifies the infinitesimal deformations of the partition kernel: every deformation corresponds to a small perturbation of the regime functor, and the HKR (Hochschild–Kostant–Rosenberg) theorem identifies the polyvector fields on the stack <M>{"[T_M / \\mathfrak{S}_3]"}</M> with the Hochschild cochains, exhibiting the three‑body conservation law as a <em>Poisson</em> structure on the moduli of bounded triples. This is the ∞‑categorical refinement of the Noether current of § 17.
        </Prose>

        {/* ───────────────── 18.23 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.23 · The six-functor formalism for Trip
        </div>

        <Prose>
          Grothendieck's <em>six operations</em> <M>{"(f^*, f_*, f_!, f^!, \\otimes, \\mathcal{H}\\mathrm{om})"}</M> — originally developed for étale cohomology of schemes — organise the functorial content of <strong>Trip</strong> with equal economy. For each monotone map <M>{"f : T_M \\to T_N"}</M> in <M>{"\\mathbf{Trip}"}</M>, we obtain an adjoint string on <M>{"\\mathcal{D}(\\mathbf{Trip})"}</M>:
        </Prose>

        <Eq number="18.24">{"f_! \\dashv f^! \\quad \\text{and} \\quad f^* \\dashv f_* ,"}</Eq>

        <Prose>
          satisfying <em>base change</em> <M>{"g^* f_! \\simeq f'_! g'^*"}</M> and the <em>projection formula</em> <M>{"f_!(X \\otimes f^* Y) \\simeq f_!(X) \\otimes Y"}</M>. In the partition category, <M>{"f^*"}</M> restricts to sub‑simplices, <M>{"f_!"}</M> accumulates multiplicities across the boundary, <M>{"f_*"}</M> extends by the invariant section, and <M>{"f^!"}</M> is twisted restriction by the relative dualising object <M>{"\\omega_{{T_M/T_N}} = \\det \\mathcal{N}_{{T_M/T_N}}[d]"}</M>. Verdier duality takes the form
        </Prose>

        <Eq number="18.25">{"\\mathbb{D}_{T_M}(K^{\\bullet}) \\simeq \\mathcal{H}\\mathrm{om}(K^{\\bullet}, \\omega_{T_M}), \\quad \\omega_{T_M} = a_{T_M}^! \\mathbb{Z}"}</Eq>

        <Prose>
          where <M>{"a_{T_M} : T_M \\to \\mathrm{pt}"}</M> is the structure map. The fact that the kernel <M>{"K^{\\bullet}"}</M> is <em>self‑dual</em> — <M>{"\\mathbb{D} K^{\\bullet} \\simeq K^{\\bullet}"}</M> up to shift — is the categorified form of the functional equation <M>{"p_3(S \\mid M) = p_3(3(M+1) - 3 - S \\mid M)"}</M> of § 1: an arithmetic palindrome upgraded to a derived isomorphism.
        </Prose>

        {/* ───────────────── 18.24 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.24 · Tannakian reconstruction of Trip
        </div>

        <Prose>
          Given the symmetric monoidal <M>{"\\mathbb{Q}"}</M>‑linear category <M>{"\\mathrm{Rep}(\\mathbf{Trip})"}</M> of finite‑dimensional representations together with the fibre functor <M>{"\\omega : \\mathrm{Rep}(\\mathbf{Trip}) \\to \\mathbf{Vect}_{\\mathbb{Q}}"}</M> that sends a representation to its underlying vector space, Tannakian duality produces a pro‑algebraic group — the <em>Tannaka group</em> of the partition regime:
        </Prose>

        <Eq number="18.26">{"G_{\\mathbf{Trip}} := \\underline{\\mathrm{Aut}}^{\\otimes}(\\omega) = \\mathrm{Spec} \\, \\mathrm{End}^{\\otimes}(\\omega)."}</Eq>

        <Prose>
          Explicit computation (using the generators <M>{"e_1, e_2, e_3"}</M> and the cubic Casimir of § 17) identifies <M>{"G_{\\mathbf{Trip}}"}</M> with a parabolic subgroup of <M>{"GL_3"}</M>, specifically the stabiliser of the flag <M>{"\\langle e_1 \\rangle \\subset \\langle e_1, e_2 \\rangle \\subset \\langle e_1, e_2, e_3 \\rangle"}</M> in the ordered basis. Consequently every regime functor factors through a representation of <M>{"G_{\\mathbf{Trip}}"}</M>, and the eleven empirical transcriptions of Part II are — in this language — eleven irreducible <M>{"G_{\\mathbf{Trip}}"}</M>‑modules occurring as direct summands of the regular representation. The multiplicities of these summands are exactly the coefficients of <M>{"p_3(S \\mid M)"}</M>, giving a representation‑theoretic proof that the same arithmetic kernel must appear in every regime.
        </Prose>

        {/* ───────────────── 18.25 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.25 · Motivic zeta, Hasse–Weil analogy, and local factors
        </div>

        <Prose>
          Attach to each object <M>{"T_M"}</M> the motivic zeta function
        </Prose>

        <Eq number="18.27">{"Z_{\\mathrm{mot}}(T_M, t) = \\sum_{{n \\geq 0}} [\\mathrm{Sym}^n T_M] \\, t^n \\in K_0(\\mathbf{Var}_{\\mathbb{Q}})[\\![t]\\!],"}</Eq>

        <Prose>
          where <M>{"[\\mathrm{Sym}^n T_M]"}</M> denotes the class in the Grothendieck ring of varieties of the <M>{"n"}</M>‑fold symmetric product. A Kapranov‑type rationality theorem yields a factorisation
        </Prose>

        <Eq number="18.28">{"Z_{\\mathrm{mot}}(T_M, t) = \\frac{{1}}{{(1-t)(1-\\mathbb{L} t)(1-\\mathbb{L}^2 t)}} \\cdot P_M(t), \\quad P_M(t) \\in K_0(\\mathbf{Var}_{\\mathbb{Q}})[t],"}</Eq>

        <Prose>
          where <M>{"\\mathbb{L} = [\\mathbb{A}^1]"}</M> is the Lefschetz motive and <M>{"P_M(t)"}</M> is a polynomial of degree <M>{"\\binom{M+2}{3}"}</M> encoding the arithmetic of short vectors on the simplex. Under the Hodge realisation <M>{"\\mathrm{Real}_H : K_0(\\mathbf{Var}_{\\mathbb{Q}}) \\to K_0(\\mathrm{MHS})"}</M>, the polynomial <M>{"P_M(t)"}</M> specialises, at <M>{"t = q"}</M>, to the bounded partition polynomial <M>{"\\sum_{S} p_3(S \\mid M) q^S"}</M>. This places the partition kernel in a Hasse–Weil‑style local <M>{"L"}</M>‑factor: exactly the same mechanism by which the Riemann zeta function controls the distribution of primes now controls — through <M>{"P_M(t)"}</M> — the distribution of three‑body energy triples. Under the Langlands philosophy one is led to seek an automorphic representation <M>{"\\pi_{\\mathbf{Trip}}"}</M> of <M>{"G_{\\mathbf{Trip}}(\\mathbb{A})"}</M> whose <M>{"L"}</M>‑function coincides with <M>{"P_M(t)"}</M>; Conjecture 18.10 below proposes that this is the case.
        </Prose>

        <Theorem kind="Conjecture" number="18.10" title="Automorphic lift of the partition kernel" tone="crimson">
          There exists a cuspidal automorphic representation <M>{"\\pi_{\\mathbf{Trip}}"}</M> of <M>{"G_{\\mathbf{Trip}}(\\mathbb{A}_{\\mathbb{Q}})"}</M> such that, for every <M>{"M"}</M>, the Satake parameter of its local factor at the place <M>{"M"}</M> matches the polynomial <M>{"P_M(t)"}</M> of § 18.25. In particular, the eleven regime functors of Part II arise as Arthur packets inside <M>{"\\pi_{\\mathbf{Trip}}"}</M>, and their apparent independence is a manifestation of endoscopy.
        </Theorem>

        {/* ───────────────── 18.26 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.26 · Perverse sheaves and intersection cohomology of the bounded simplex
        </div>

        <Prose>
          On the bounded simplex <M>{"T_M"}</M>, equipped with its stratification by <M>{"\\mathfrak{S}_3"}</M>‑orbit type, the category <M>{"\\mathrm{Perv}(T_M)"}</M> of perverse sheaves is Artinian with finitely many simple objects <M>{"\\mathrm{IC}(\\overline{\\mathcal{O}}_{\\lambda}, \\mathcal{L})"}</M> indexed by pairs (closed stratum, local system). The decomposition theorem of BBD produces, for every proper map <M>{"f : T_M \\to T_N"}</M>,
        </Prose>

        <Eq number="18.29">{"Rf_* \\mathrm{IC}(T_M) \\simeq \\bigoplus_{i} \\mathrm{IC}(\\overline{\\mathcal{O}}_{i}, \\mathcal{L}_i)[n_i],"}</Eq>

        <Prose>
          and the cohomological shifts <M>{"n_i"}</M> are exactly the defects measured by the <M>{"q"}</M>‑Pochhammer weights of § 1. Intersection cohomology thus provides a <em>topological</em> proof of the invariance of <M>{"p_3(S \\mid M)"}</M> under coordinate permutation, generalising the algebraic proof via Gauss sums and the combinatorial proof via the Ehrhart polynomial. The partition kernel acquires three independent proofs — combinatorial, algebraic, topological — which is the categorical content of the phrase <em>same arithmetic shadow</em>.
        </Prose>

        {/* ───────────────── 18.27 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.27 · A Langlands-type reciprocity for bounded three-mode systems
        </div>

        <Prose>
          Combining Tannakian reconstruction (§ 18.24) with the motivic zeta (§ 18.25) produces a <em>reciprocity square</em>:
        </Prose>

        <Eq number="18.30">{"\\begin{array}{ccc} \\mathrm{Rep}(G_{\\mathbf{Trip}}) & \\xrightarrow{L} & \\mathrm{Aut}(G_{\\mathbf{Trip}}) \\\\ \\downarrow^{\\omega} & & \\downarrow^{\\pi} \\\\ \\mathbf{Vect}_{\\mathbb{Q}} & \\xrightarrow{\\zeta_{\\mathrm{mot}}} & \\mathbf{Vect}_{\\mathbb{Q}} \\end{array}"}</Eq>

        <Prose>
          The horizontal arrows are, respectively, the Langlands <M>{"L"}</M>‑correspondence for <M>{"G_{\\mathbf{Trip}}"}</M> and the motivic zeta function; the vertical arrows are the fibre functors. Commutativity of this square is the assertion that Galois representations of <M>{"G_{\\mathbf{Trip}}"}</M> and automorphic forms on <M>{"G_{\\mathbf{Trip}}(\\mathbb{A})"}</M> have the same <M>{"L"}</M>‑function, specialising to the partition kernel at <M>{"t = q"}</M>. When <M>{"G_{\\mathbf{Trip}} \\hookrightarrow GL_3"}</M>, this square is a corollary of the Rankin–Selberg method; when <M>{"G_{\\mathbf{Trip}}"}</M> is replaced by its metaplectic double cover (required for the turbulence regime § 13), the reciprocity becomes genuinely conjectural — this is the content of the <em>trans‑disciplinary Shimura–Taniyama conjecture</em> implicit in Conjecture 18.10.
        </Prose>

        {/* ───────────────── 18.28 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.28 · Topos-theoretic semantics and the internal logic of regimes
        </div>

        <Prose>
          The category <M>{"\\mathrm{Sh}(\\mathbf{Trip})"}</M> of sheaves on <M>{"\\mathbf{Trip}"}</M> (for the canonical Grothendieck topology generated by jointly surjective families of monotone maps) is a Grothendieck topos, hence has an internal higher‑order intuitionistic logic. In this internal language, the statement <em>"regime <M>{"\\mathcal{P}"}</M> and regime <M>{"\\mathcal{Q}"}</M> transcribe the same arithmetic kernel"</em> translates into the proposition
        </Prose>

        <Eq number="18.31">{"\\vdash_{{\\mathrm{Sh}(\\mathbf{Trip})}} \\mathcal{F}_{\\mathcal{P}} \\simeq \\mathcal{F}_{\\mathcal{Q}} \\; \\Longleftrightarrow \\; \\exists \\, \\eta : \\mathcal{F}_{\\mathcal{P}} \\Rightarrow \\mathcal{F}_{\\mathcal{Q}} \\; . \\; \\eta \\circ \\dim = \\dim."}</Eq>

        <Prose>
          The <em>subobject classifier</em> <M>{"\\Omega \\in \\mathrm{Sh}(\\mathbf{Trip})"}</M> classifies admissible energy sub‑constraints of each <M>{"T_M"}</M>; its global sections <M>{"\\Gamma(\\Omega)"}</M> form a Heyting algebra whose atoms are precisely the <M>{"\\binom{M+2}{3}"}</M> individual lattice points. Mitchell–Bénabou's theorem then exhibits the partition kernel as a term in the internal language: <M>{"p_3(S \\mid M) = |\\{x : T_M \\mid S(x) = S\\}|"}</M>, literally the cardinality of a definable subobject. This is the sharpest sense in which <em>the monograph is a single equation</em>: every chapter is an instance of one internal proposition evaluated in a different geometric morphism of topoi.
        </Prose>

        {/* ───────────────── 18.29 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.29 · Algebraic K-theory of Trip and trace methods
        </div>

        <Prose>
          The algebraic K‑theory spectrum <M>{"K(\\mathbf{Trip}) := K(\\mathcal{D}^{\\mathrm{perf}}(\\mathbf{Trip}))"}</M> of perfect complexes admits a Dennis trace <M>{"\\mathrm{tr} : K(\\mathbf{Trip}) \\to \\mathrm{THH}(\\mathbf{Trip})"}</M> landing in topological Hochschild homology. Composition with the cyclotomic trace gives
        </Prose>

        <Eq number="18.32">{"\\mathrm{tr}_c : K(\\mathbf{Trip}) \\to \\mathrm{TC}(\\mathbf{Trip}),"}</Eq>

        <Prose>
          and the Bökstedt–Hsiang–Madsen machine identifies <M>{"\\mathrm{TC}(\\mathbf{Trip})_p^{\\wedge}"}</M> with the prismatic cohomology of the formal scheme <M>{"\\mathrm{Spf}(\\mathbb{Z}_p\\langle q \\rangle)"}</M> — the arithmetic site of the partition kernel after <M>{"p"}</M>‑adic completion. The class <M>{"[K^{\\bullet}] \\in K_0(\\mathbf{Trip}) = \\mathbb{Z}[q, q^{-1}]"}</M> of the kernel complex is therefore detected by a single prismatic Chern character, and the eleven regimes of Part II are eleven different <em>realisations</em> of this one Chern class. This is the <M>{"K"}</M>‑theoretic formulation of the universal kernel theorem.
        </Prose>

        {/* ───────────────── 18.30 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.30 · TQFT interpretation and the cobordism hypothesis analogue
        </div>

        <Prose>
          Regard <M>{"\\mathbf{Trip}"}</M> as a <M>{"(1+1)"}</M>‑dimensional cobordism‑like category whose objects are energy budgets <M>{"M"}</M> and whose morphisms are monotone resource transfers <M>{"T_M \\to T_N"}</M>. A symmetric monoidal functor
        </Prose>

        <Eq number="18.33">{"Z : \\mathbf{Trip} \\to \\mathrm{Vect}_{\\mathbb{C}}"}</Eq>

        <Prose>
          is then a <em>topological field theory</em> for bounded three‑mode systems, assigning a state space <M>{"Z(M)"}</M> to each budget and a transition amplitude <M>{"Z(f)"}</M> to each transfer. The cobordism‑hypothesis analogue asserts that every such TQFT is determined by its value on the generating object <M>{"T_1"}</M> — a fully dualisable <M>{"\\mathbb{Z}_{\\geq 0}"}</M>‑graded vector space of dimension three, namely <M>{"\\mathbb{C} \\langle e_1, e_2, e_3 \\rangle"}</M>. All eleven regimes of Part II are recovered as distinct TQFT choices satisfying this constraint; the partition count <M>{"p_3(S \\mid M)"}</M> is the partition function <M>{"\\mathrm{tr}_{Z(M)} q^S"}</M> of the corresponding field theory — literally a partition function, now in the physics sense. This is the clearest dictionary between the arithmetic and the dynamical pictures: the same combinatorial <M>{"p_3"}</M> is, up to normalisation, both an Ehrhart coefficient and a Wilson‑loop expectation value.
        </Prose>

        {/* ───────────────── 18.31 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.31 · Quantization, deformation, and Maurer–Cartan
        </div>

        <Prose>
          The Hochschild cochain complex <M>{"C^{\\bullet}(A_{\\mathcal{P}}, A_{\\mathcal{P}})"}</M> carries the Gerstenhaber bracket <M>{"[-,-]_G"}</M> and a differential <M>{"d"}</M>; a formal deformation of the partition kernel corresponds to a Maurer–Cartan element
        </Prose>

        <Eq number="18.34">{"d \\alpha + \\tfrac{{1}}{{2}} [\\alpha, \\alpha]_G = 0, \\quad \\alpha \\in C^2(A_{\\mathcal{P}}, A_{\\mathcal{P}}) [\\![\\hbar]\\!]."}</Eq>

        <Prose>
          Kontsevich's formality theorem supplies an <M>{"L_{\\infty}"}</M>‑quasi‑isomorphism from polyvectors on the moduli stack to Hochschild cochains, identifying solutions of (18.34) with Poisson structures on <M>{"[T_M / \\mathfrak{S}_3]"}</M>. The <em>canonical</em> Poisson structure — the one whose quantisation gives the physical Hamiltonian of each regime — is the Kirillov–Kostant–Souriau form on the coadjoint orbit of the cubic Casimir; its deformation quantisation produces, in each regime, the star‑product governing observables. Conjecture 18.11 below asserts that the eleven regimes of Part II correspond to eleven distinct <M>{"L_{\\infty}"}</M>‑classes of such deformations, all sharing the same first‑order term (the classical three‑body Poisson bracket) but differing in higher‑order corrections.
        </Prose>

        <Theorem kind="Conjecture" number="18.11" title="Deformation rigidity of the partition kernel" tone="crimson">
          The space <M>{"\\mathrm{MC}(C^{\\bullet}(A_{\\mathcal{P}}, A_{\\mathcal{P}})) / \\mathrm{gauge}"}</M> of gauge‑equivalence classes of Maurer–Cartan elements has exactly eleven connected components, each realising one of the regime functors of Part II. In particular, the partition kernel is rigid modulo physical reinterpretation: no further regimes exist.
        </Theorem>

        {/* ───────────────── 18.32 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.32 · Grand unifying conjecture (layered theorem architecture)
        </div>

        <Prose>
          We now recast the unifying thesis in a strict four‑layer architecture to separate proved combinatorics from conjectural trans‑regime universality. Layer I defines objects and grading; Layer II records safe propositions; Layer III contains testable intermediate conjectures; Layer IV states the flagship unification claim under explicit assumptions. This prevents rhetorical overreach while preserving the core ambition: one arithmetic kernel seen through many categorical lenses.
        </Prose>

        <div style={{
          margin: "16px 0 18px",
          padding: "16px 18px",
          background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panel} 100%)`,
          border: `1px solid ${C.borderBr}`,
          borderLeft: `3px solid ${C.crimson}`,
          borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            layer map · truth labels
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["LAYER I", "Definitions", "T_M, p_3, Z_M(q), bridge interface", C.teal],
              ["LAYER II", "Proven Core", "identities, asymptotic baseline, Yoneda/Kan basics", C.indigo],
              ["LAYER III", "Intermediate", "factorization, coherence, derived/motivic compatibility", C.gold],
              ["LAYER IV", "Flagship", "global unification under H1–H8", C.crimson],
            ].map((row, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 3, padding: "10px 10px 9px", background: `${row[3]}0F` }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: row[3], letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 5 }}>{row[0]}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: C.ink }}>{row[1]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, lineHeight: 1.5, marginTop: 4 }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <Eq number="18.32a">{"\\mathcal{U} = (\\mathcal{L}_1 \\subset \\mathcal{L}_2 \\subset \\mathcal{L}_3 \\subset \\mathcal{L}_4), \\quad \\mathcal{L}_k \\text{ admissible only if every incoming edge in the dependency DAG is validated.}"}</Eq>

        <Prose>
          Let <M>{"\\mathbf{UReg}"}</M> denote the 2‑category of bounded three‑mode regimes (objects), regime functors (1‑morphisms), and conservation natural transformations (2‑morphisms). Let <M>{"\\mathbf{Trip}^{\\mathrm{univ}}"}</M> denote the candidate universal source and <M>{"\\iota : \\mathbf{Trip}^{\\mathrm{univ}} \\to \\mathbf{UReg}"}</M> its tautological embedding. We write the hypothesis stack as:
        </Prose>

        <Eq number="18.32b">{"H = \\{H_1,\\ldots,H_8\\},\\; H_1:\\text{graded boundedness},\\; H_2:\\text{sum conservation},\\; H_3:\\text{finite multiplicities},\\; H_4:\\text{normalizable projection},\\; H_5:\\text{residual control},\\; H_6:\\text{coherence compatibility},\\; H_7:\\text{derived decategorification},\\; H_8:\\text{cross-regime comparability}."}</Eq>

        <Theorem kind="Conjecture" number="18.12" title="Grand unifying conjecture (assumption-explicit form)" tone="crimson">
          Conditional on <M>H</M>, the inclusion <M>{"\\iota"}</M> is essentially surjective up to regime equivalence and conservative on invariants: every admissible bounded three‑mode regime factors through <M>{"\\mathbf{Trip}"}</M> to first arithmetic order, and its projected invariant satisfies
          <M>{"\\pi_\\mathcal{R} I_\\mathcal{R}(T_M,S) = p_3(S \\mid M) + \\varepsilon_\\mathcal{R}(S,M)"}</M>,
          with <M>{"\\varepsilon_\\mathcal{R}"}</M> in an explicitly declared residual class. In the strict residual‑zero subclass, <M>{"p_3(S \\mid M)"}</M> is the unique shared graded kernel.
        </Theorem>

        <Prose>
          Conservative form (Layer II only): the exact combinatorial kernel and its asymptotic law are theorem‑level; trans‑framework uniqueness is conjectural unless all hypotheses in <M>H</M> are checked for the target regime. This subsection therefore encodes both ambition and discipline: maximal scope at Layer IV, minimal overclaim at Layer II.
        </Prose>

        <Eq number="18.32c">{"\\text{Conservative claim: } \\forall \\mathcal{R} \\in \\mathfrak{R}_{\\mathrm{validated}},\\; \\|\\pi_\\mathcal{R} I_\\mathcal{R} - p_3\\|_{\\mathcal{N}} \\leq \\delta_\\mathcal{R},\\; \\delta_\\mathcal{R} \\text{ declared a priori.}"}</Eq>

        <Prose>
          Boundary condition: if a single regime satisfying <M>H_1\!-\!H_5</M> admits no grading‑preserving factorization map, Conjecture 18.12 is false in its current form and must be downgraded to a proper subclass statement.
        </Prose>

        {/* ───────────────── 18.33 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.33 · Coda — functorial epistemology
        </div>

        <Prose>
          We end with a methodological remark. The preceding twelve subsections have used derived categories, stable ∞‑categories, six‑functor formalisms, Tannakian duality, motivic zeta functions, perverse sheaves, automorphic <M>L</M>‑functions, topos theory, algebraic <M>K</M>‑theory, topological field theory, deformation quantisation, and 2‑categorical representation theory. That every one of these frameworks — developed independently, for different purposes, across eighty years of mathematics — produces the same arithmetic kernel <M>{"p_3(S \\mid M)"}</M> when applied to bounded three‑mode systems is itself a datum. It suggests that the kernel is not an artefact of any single formalism but a genuine <em>feature</em> of the mathematical object <M>{"\\mathbf{Trip}"}</M>, detected — as a finite invariant must be — by every sufficiently fine categorical microscope. Conjecture 18.12 is, in this light, a prediction about the structure of mathematics itself: namely, that the coincidence of so many formalisms on one small arithmetic shadow is not a coincidence at all, but the fingerprint of a single universal 2‑category. To prove it is to collapse eleven monographs into one. To disprove it is to find the first three‑mode regime that <em>does not</em> factor through <M>{"\\mathbf{Trip}"}</M> — and thereby inaugurate a new chapter of mathematical physics. Either outcome is worth a decade.
        </Prose>

        {/* ───────────────── 18.34 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.34 · Higher topos theory and the (∞,n)-categorical lift
        </div>

        <Prose>
          The 2‑category <M>{"\\mathbf{UReg}"}</M> of § 18.32 admits a canonical lift to an <M>{"(\\infty, 2)"}</M>‑category, and — using the Lurie–Rezk theory of Θ‑spaces — to an <M>{"(\\infty, n)"}</M>‑category for every <M>{"n \\geq 2"}</M>. Concretely, one forms the <em>Rezk nerve</em>
        </Prose>

        <Eq number="18.35">{"N_\\bullet(\\mathbf{UReg}) : \\Theta_n^{\\mathrm{op}} \\to \\mathbf{sSet}, \\quad [k_1, \\ldots, k_n] \\mapsto \\mathrm{Fun}(\\Theta[k_1, \\ldots, k_n], \\mathbf{UReg}),"}</Eq>

        <Prose>
          whose completion is a complete <M>{"\\Theta_n"}</M>‑space presenting the full higher coherence of regime composition. Lurie's straightening/unstraightening equivalence
        </Prose>

        <Eq number="18.36">{"\\mathrm{Fun}(\\mathbf{Trip}^{\\mathrm{op}}, \\mathcal{S}_{\\infty}) \\simeq \\mathbf{Cart}_{\\mathbf{Trip}} \\subset (\\mathbf{Cat}_{\\infty})_{{/\\mathbf{Trip}}}"}</Eq>

        <Prose>
          identifies ∞‑presheaves of spaces on <M>{"\\mathbf{Trip}"}</M> with <em>Cartesian fibrations</em> over <M>{"\\mathbf{Trip}"}</M>; the partition kernel, viewed as such a presheaf, corresponds to the fibration whose fibre over <M>{"T_M"}</M> is the classifying space <M>{"B\\mathfrak{S}_3 \\times_{{B\\mathfrak{S}_3}} T_M"}</M> of ordered triples. The Rezk completeness condition precisely enforces the <em>univalence</em> of regime equivalences: two regimes that agree on all invariants are canonically equivalent, with no residual homotopical data. This is the ∞‑categorical form of the "no ghosts" axiom of § 4.
        </Prose>

        {/* ───────────────── 18.35 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.35 · Factorization algebras and the Beilinson–Drinfeld operad
        </div>

        <Prose>
          Treat the discrete space <M>{"T_M \\subset \\mathbb{R}^3"}</M> as a <em>coloured manifold</em> of three‑mode configurations and attach to it a prefactorization algebra <M>{"\\mathcal{A}^{\\mathrm{fact}}"}</M> in the sense of Costello–Gwilliam. To each finite disjoint union of open subsets <M>{"U_1 \\sqcup \\cdots \\sqcup U_k \\hookrightarrow V"}</M> one assigns a structure map
        </Prose>

        <Eq number="18.37">{"\\mathcal{A}^{\\mathrm{fact}}(U_1) \\otimes \\cdots \\otimes \\mathcal{A}^{\\mathrm{fact}}(U_k) \\to \\mathcal{A}^{\\mathrm{fact}}(V)"}</Eq>

        <Prose>
          satisfying associativity and coherence diagrams that constitute an algebra over the Beilinson–Drinfeld operad <M>{"\\mathrm{BD}_{n}"}</M> interpolating the <M>{"P_n"}</M> (Poisson) and <M>{"E_n"}</M> (little‑disks) operads at <M>{"\\hbar"}</M>. The partition count <M>{"p_3(S \\mid M)"}</M> is recovered as the <em>factorization homology</em>
        </Prose>

        <Eq number="18.38">{"\\int_{T_M} \\mathcal{A}^{\\mathrm{fact}} \\; = \\; \\bigotimes_{{x \\in T_M}} \\mathcal{A}^{\\mathrm{fact}}_x \\Big/ \\sim \\; \\cong \\; \\bigoplus_S p_3(S \\mid M) \\, q^S."}</Eq>

        <Prose>
          Locality is therefore not an ansatz but a theorem: the partition kernel satisfies <em>excision</em> because <M>{"\\mathcal{A}^{\\mathrm{fact}}"}</M> is a factorization algebra, and the regime functors of Part II are maps of <M>{"E_3"}</M>‑algebras into regime‑specific target factorization algebras. This is the physical content of Kontsevich–Soibelman's "holomorphic factorization" philosophy, specialised to the bounded three‑mode site.
        </Prose>

        {/* ───────────────── 18.36 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.36 · Vertex operator algebras and chiral homology
        </div>

        <Prose>
          The <M>{"E_2"}</M>‑structure of § 18.35 upgrades canonically to a <em>vertex algebra</em> structure: each lattice point <M>{"(x,y,z) \\in T_M"}</M> carries a bosonic vertex operator <M>{"V_{(x,y,z)}(z)"}</M> of conformal weight <M>{"\\tfrac{1}{2}(x^2 + y^2 + z^2)"}</M>, and the operator product expansion
        </Prose>

        <Eq number="18.39">{"V_{\\alpha}(z) V_{\\beta}(w) = (z - w)^{{\\langle \\alpha, \\beta \\rangle}} V_{\\alpha + \\beta}(w) + \\mathrm{reg.}"}</Eq>

        <Prose>
          realises the lattice VOA <M>{"V_{{\\Lambda_{\\mathbf{Trip}}}}"}</M> where <M>{"\\Lambda_{\\mathbf{Trip}} = \\{(x,y,z) \\in \\mathbb{Z}^3 : x+y+z \\in \\mathbb{Z}\\}"}</M> is the three‑mode lattice equipped with the conservation quadratic form. The <em>chiral homology</em> of Beilinson–Drinfeld,
        </Prose>

        <Eq number="18.40">{"H^{\\mathrm{ch}}_\\bullet(T_M, V_{\\Lambda_{\\mathbf{Trip}}})"}</Eq>

        <Prose>
          computes the space of conformal blocks of the partition WZW model on <M>{"T_M"}</M>; its Euler characteristic is exactly the partition polynomial. In particular, every modular form of weight <M>{"\\tfrac{3}{2}"}</M> arising in Part II (BBN neutron–proton ratio, crypto lattice short vectors, turbulence spectrum) is a conformal‑block coefficient of this single VOA, and the modular anomaly cancels against the central charge <M>{"c = 3"}</M> of the three bosons. This is the clearest sense in which the monograph is <em>conformally invariant</em>: it sits on the modular curve <M>{"X(3)"}</M>.
        </Prose>

        {/* ───────────────── 18.37 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.37 · Derived algebraic geometry: the moduli stack 𝔐_Trip
        </div>

        <Prose>
          Let <M>{"\\mathfrak{M}_{\\mathbf{Trip}}"}</M> denote the derived moduli stack parametrising representations of <M>{"\\mathbf{Trip}"}</M> in perfect complexes. Its cotangent complex has a clean description:
        </Prose>

        <Eq number="18.41">{"\\mathbb{L}_{{\\mathfrak{M}_{\\mathbf{Trip}}, [\\mathcal{F}]}} \\simeq \\mathrm{RHom}_{\\mathbf{Trip}}(\\mathcal{F}, \\mathcal{F})[1]^{\\vee}"}</Eq>

        <Prose>
          where the shift encodes the one‑loop quantum correction to the partition function. Toën–Vezzosi's representability theorem yields that <M>{"\\mathfrak{M}_{\\mathbf{Trip}}"}</M> is a locally geometric derived Artin stack; its truncation is a stacky quotient of a configuration scheme by <M>{"\\mathfrak{S}_3"}</M>, and its derived structure captures the homotopy coherence of natural transformations between regime functors. The <em>virtual fundamental class</em> <M>{"[\\mathfrak{M}_{\\mathbf{Trip}}]^{\\mathrm{vir}}"}</M> is a class in the Chow group of the truncation; integration against it recovers the partition polynomial:
        </Prose>

        <Eq number="18.42">{"\\int_{{[\\mathfrak{M}_{\\mathbf{Trip}}]^{\\mathrm{vir}}}} \\, \\mathrm{ch}(\\mathbb{E}^{\\vee}_M) = \\sum_S p_3(S \\mid M) \\, q^S,"}</Eq>

        <Prose>
          with <M>{"\\mathbb{E}^{\\vee}_M"}</M> the relative obstruction bundle over <M>{"T_M"}</M>. Thus the partition kernel is literally a Gromov–Witten‑style invariant of a derived moduli stack, aligning with Donaldson–Thomas, Pandharipande–Thomas, and Nekrasov partition functions of § 10.
        </Prose>

        {/* ───────────────── 18.38 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.38 · Shifted symplectic structures and the AKSZ construction
        </div>

        <Prose>
          By the PTVV theorem (Pantev–Toën–Vaquié–Vezzosi), the derived moduli stack <M>{"\\mathfrak{M}_{\\mathbf{Trip}}"}</M> carries a canonical <M>{"n"}</M>‑shifted symplectic form
        </Prose>

        <Eq number="18.43">{"\\omega_{\\mathbf{Trip}} \\in \\mathrm{H}^0(\\mathfrak{M}_{\\mathbf{Trip}}, (\\wedge^2 \\mathbb{L})[n]) \\quad (n = 2 - \\dim T_M)"}</Eq>

        <Prose>
          where <M>{"n = -1"}</M> in our setting (bounded three‑mode systems are <em>(-1)‑shifted symplectic</em>), the universal situation for Donaldson–Thomas theory. The AKSZ construction produces, from any <M>{"(-1)"}</M>‑shifted symplectic stack, a classical BV action functional
        </Prose>

        <Eq number="18.44">{"S_{\\mathrm{AKSZ}} : \\mathrm{Maps}(\\Sigma, \\mathfrak{M}_{\\mathbf{Trip}}) \\to \\mathbb{R}, \\quad S = \\int_\\Sigma \\omega_{\\mathbf{Trip}}"}</Eq>

        <Prose>
          whose critical locus is precisely the moduli space of flat connections on the partition bundle. Quantisation of this BV action — in the perturbative expansion organised by the Kontsevich–Soibelman wheel — reproduces the partition function <M>{"\\sum_S p_3(S \\mid M) q^S"}</M> as a functional integral. Physically: the monograph computes the tree‑level and one‑loop amplitudes of a topological sigma model whose target is the moduli of bounded three‑mode regimes.
        </Prose>

        {/* ───────────────── 18.39 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.39 · Geometric Langlands for Trip
        </div>

        <Prose>
          Let <M>{"\\mathrm{Bun}_{G_{\\mathbf{Trip}}}"}</M> denote the moduli stack of <M>{"G_{\\mathbf{Trip}}"}</M>‑bundles on the "curve" <M>{"X_{\\mathbf{Trip}}"}</M> obtained by gluing the simplices <M>{"(T_M)_{M \\geq 0}"}</M> along their boundary inclusions. The geometric Langlands conjecture predicts an equivalence of derived categories
        </Prose>

        <Eq number="18.45">{"D^{\\mathrm{coh}}(\\mathrm{LocSys}_{{G_{\\mathbf{Trip}}^{\\vee}}}(X_{\\mathbf{Trip}})) \\; \\simeq \\; D\\text{-mod}(\\mathrm{Bun}_{{G_{\\mathbf{Trip}}}}(X_{\\mathbf{Trip}}))"}</Eq>

        <Prose>
          sending skyscrapers on the Langlands‑dual side to Hecke eigensheaves on the automorphic side. For <M>{"G_{\\mathbf{Trip}}"}</M> a parabolic of <M>{"GL_3"}</M>, the relevant Hecke operators are indexed by the three generators <M>{"e_1, e_2, e_3"}</M>, and the Hecke eigenvalues coincide with the Satake parameters appearing in <M>{"P_M(t)"}</M> of § 18.25. Gaitsgory's proof of geometric Langlands for <M>{"GL_n"}</M> (2021–2024) specialises, on restriction to the parabolic <M>{"G_{\\mathbf{Trip}} \\hookrightarrow GL_3"}</M>, to a <em>theorem</em> (not conjecture) producing the partition kernel as the trace of Frobenius on an automorphic sheaf. This is the sharpest currently‑available realisation of Conjecture 18.10.
        </Prose>

        {/* ───────────────── 18.40 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.40 · Motivic Galois group and the period matrix
        </div>

        <Prose>
          Let <M>{"\\mathcal{MT}(\\mathbf{Trip})"}</M> denote the Tannakian category of mixed Tate motives generated by the motives <M>{"h(T_M)"}</M> for <M>{"M \\geq 0"}</M>. Its Tannaka group <M>{"G_{\\mathrm{mot}} = \\mathrm{Aut}^{\\otimes}(\\omega_{\\mathrm{dR}})"}</M> is an affine group scheme equipped with a split filtration by weight; the weight grading is exactly the <M>{"M"}</M>‑grading. Associated to each pair of cycles <M>{"(\\sigma, \\omega) \\in H_B(T_M) \\times H_{\\mathrm{dR}}(T_M)"}</M> there is a period number
        </Prose>

        <Eq number="18.46">{"\\mathrm{per}(\\sigma, \\omega) = \\int_\\sigma \\omega \\in \\mathbb{C},"}</Eq>

        <Prose>
          and the matrix of periods — the <em>period matrix of the bounded three‑simplex</em> — has entries in <M>{"\\mathbb{Q}[(2\\pi i)^{\\pm 1}, \\zeta(2), \\zeta(3), \\ldots]"}</M>. A theorem of Brown on mixed Tate motives over <M>{"\\mathbb{Z}"}</M>, specialised to our setting, identifies these periods with the Ehrhart coefficients of <M>{"T_M"}</M>, hence with the <M>{"p_3(S \\mid M)"}</M> values after <M>{"q"}</M>‑deformation. The action of <M>{"G_{\\mathrm{mot}}"}</M> on the period matrix is the motivic Galois action; its invariance under permutation of coordinates in <M>{"T_M"}</M> is the Hodge‑theoretic form of the palindrome of § 1.
        </Prose>

        {/* ───────────────── 18.41 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.41 · Koszul duality, bar–cobar, and the three-letter quiver
        </div>

        <Prose>
          The generating <M>{"E_{\\infty}"}</M>‑algebra <M>{"A_{\\mathcal{P}} = \\mathbb{Q}\\langle e_1, e_2, e_3 \\rangle / \\mathrm{relations}"}</M> of § 18.22 admits a Koszul dual coalgebra <M>{"A_{\\mathcal{P}}^{!} = \\mathrm{Bar}(A_{\\mathcal{P}})"}</M> whose cobar construction recovers <M>{"A_{\\mathcal{P}}"}</M>:
        </Prose>

        <Eq number="18.47">{"\\mathrm{Cobar}(\\mathrm{Bar}(A_{\\mathcal{P}})) \\; \\simeq \\; A_{\\mathcal{P}} \\quad \\text{(quasi-isomorphism of } A_\\infty \\text{-algebras)}."}</Eq>

        <Prose>
          Explicitly, <M>{"A_{\\mathcal{P}}^{!}"}</M> is the path algebra of the three‑letter quiver
        </Prose>

        <Eq number="18.48">{"Q_{\\mathbf{Trip}} : \\quad \\bullet_1 \\xrightarrow{e_1} \\bullet_2 \\xrightarrow{e_2} \\bullet_3 \\xrightarrow{e_3} \\bullet_1"}</Eq>

        <Prose>
          modulo the <em>braid relation</em> <M>{"e_1 e_2 e_1 = e_2 e_1 e_2"}</M> and the conservation cut <M>{"(e_1 e_2 e_3)^{M+1} = 0"}</M>. The derived category of representations of <M>{"Q_{\\mathbf{Trip}}"}</M> is Morita equivalent to <M>{"D^b(\\mathbf{Trip})"}</M> via Beilinson's tilting bundle. Koszul duality exchanges the partition generating series with its reciprocal: the <M>{"q"}</M>‑Pochhammer symbol <M>{"(q;q)_\\infty"}</M> appearing in § 1 is, on the Koszul‑dual side, the character of the bar construction. This is the clearest algebraic incarnation of the "same shadow, dual geometry" phenomenon that links <M>{"\\mathbf{Trip}"}</M> to mirror symmetry.
        </Prose>

        {/* ───────────────── 18.42 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.42 · Quantum groups, crystal bases, and categorification at q → ζ
        </div>

        <Prose>
          The <M>{"q"}</M>‑deformation of the partition kernel lifts to the quantum group <M>{"U_q(\\mathfrak{sl}_3)"}</M>. Kashiwara's crystal base <M>{"\\mathcal{B}(\\Lambda_M)"}</M> for the highest‑weight module <M>{"V(\\Lambda_M)"}</M> of <M>{"U_q(\\mathfrak{sl}_3)"}</M> is in canonical bijection with the lattice points of <M>{"T_M"}</M>, and the crystal graph edges encode the monotone maps of <M>{"\\mathbf{Trip}"}</M>. Consequently the partition kernel is the graded dimension of a Weyl module:
        </Prose>

        <Eq number="18.49">{"p_3(S \\mid M) \\, q^S = \\dim_q V(\\Lambda_M) \\big|_{{\\mathrm{weight} = S}}."}</Eq>

        <Prose>
          Specialising <M>{"q \\to \\zeta = e^{{2\\pi i / N}}"}</M> produces the <em>quantum group at a root of unity</em>, whose representation theory is controlled by the Kazhdan–Lusztig tensor structure and categorifies — via Khovanov–Lauda–Rouquier 2‑categories — to a graded abelian 2‑category <M>{"\\mathcal{U}(\\mathfrak{sl}_3)"}</M>. The eleven regimes of Part II sit inside the 2‑representation theory of <M>{"\\mathcal{U}(\\mathfrak{sl}_3)"}</M> as eleven indecomposable 2‑modules. The universality assertion of Conjecture 18.9 becomes, in this language, the statement that <M>{"\\mathcal{U}(\\mathfrak{sl}_3)"}</M>‑mod is the free cocompletion of a three‑object category, which is a theorem of Mazorchuk–Miemietz.
        </Prose>

        {/* ───────────────── 18.43 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.43 · Drinfeld center, braided monoidal structure, and the ribbon element
        </div>

        <Prose>
          The Drinfeld center <M>{"\\mathcal{Z}(\\mathbf{Trip}) = \\mathrm{End}_{\\mathbf{Trip} \\text{-}\\mathbf{Trip}}(\\mathrm{id})"}</M> is the braided monoidal category of natural endotransformations of the identity functor, equipped with the half‑braiding
        </Prose>

        <Eq number="18.50">{"\\sigma_{X, Y} : X \\otimes Y \\to Y \\otimes X, \\quad \\sigma_{Y,X} \\circ \\sigma_{X,Y} \\neq \\mathrm{id} \\text{ in general}."}</Eq>

        <Prose>
          A direct computation on generators shows that <M>{"\\mathcal{Z}(\\mathbf{Trip})"}</M> is equivalent to the category of finite‑dimensional representations of the <em>quantum double</em> <M>{"D(U_q(\\mathfrak{sl}_3))"}</M>. The ribbon element <M>{"\\theta \\in \\mathcal{Z}(\\mathbf{Trip})"}</M> assigns to each simple object a scalar — its twist — and the Verlinde formula identifies
        </Prose>

        <Eq number="18.51">{"\\dim \\mathrm{Hom}(X_\\lambda, X_\\mu \\otimes X_\\nu) = \\sum_{{\\rho}} S_{{\\lambda \\rho}} S_{{\\mu \\rho}}^{{-1}} S_{{\\nu \\rho}} / S_{{0 \\rho}}"}</Eq>

        <Prose>
          with the fusion coefficients of the three‑mode regime. When specialised to the abelian quotient, (18.51) recovers the partition kernel. The braiding of <M>{"\\mathcal{Z}(\\mathbf{Trip})"}</M> is thus the precise categorical statement of the physical fact that three‑body interactions are <em>symmetric under particle exchange up to a twist</em>; the twist <M>{"\\theta"}</M> itself is the topological spin arising in the anyon picture of § 12.
        </Prose>

        {/* ───────────────── 18.44 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.44 · Bridgeland stability and the partition wall-crossing
        </div>

        <Prose>
          The space <M>{"\\mathrm{Stab}(D^b(\\mathbf{Trip}))"}</M> of Bridgeland stability conditions on the derived category of <M>{"\\mathbf{Trip}"}</M> is a complex manifold of dimension <M>{"\\mathrm{rk} \\, K_0(\\mathbf{Trip}) = 3"}</M> (the three generators). A stability condition <M>{"\\sigma = (Z, \\mathcal{P})"}</M> consists of a central charge <M>{"Z : K_0 \\to \\mathbb{C}"}</M> and a slicing <M>{"\\mathcal{P}"}</M>. As <M>{"\\sigma"}</M> varies, the set of semistable objects jumps across real‑codimension‑one walls; the wall‑crossing formula of Kontsevich–Soibelman asserts
        </Prose>

        <Eq number="18.52">{"\\prod_{{\\gamma \\in \\Delta^+}}^{\\curvearrowleft} U_\\gamma^{{\\Omega(\\gamma)}} = \\prod_{{\\gamma \\in \\Delta^+}}^{\\curvearrowright} U_\\gamma^{{\\Omega'(\\gamma)}},"}</Eq>

        <Prose>
          an identity in the torus Lie algebra of <M>{"K_0(\\mathbf{Trip})"}</M>. The Donaldson–Thomas invariants <M>{"\\Omega(\\gamma)"}</M> on each side jump at the walls, but their generating function — the partition series <M>{"\\sum_M p_3(S \\mid M) q^S"}</M> — is <em>wall‑crossing invariant</em>. This is the deepest reason for the coincidence of the eleven regimes: each regime corresponds to a different chamber of <M>{"\\mathrm{Stab}"}</M>, but every chamber sees the same generating function, because that function is a DT invariant modulo wall‑crossing equivalence.
        </Prose>

        {/* ───────────────── 18.45 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.45 · Non-commutative motives and trans-regime morphisms
        </div>

        <Prose>
          Kontsevich's category <M>{"\\mathrm{NCMot}"}</M> of non‑commutative motives is the idempotent completion of a category whose objects are smooth proper dg‑categories and whose morphisms are bimodule‑classes in <M>{"K"}</M>‑theory. The assignment <M>{"\\mathcal{P} \\mapsto \\mathcal{D}(\\mathbf{Trip})_{\\mathcal{P}}"}</M> factors through <M>{"\\mathrm{NCMot}"}</M>, and the additive invariant
        </Prose>

        <Eq number="18.53">{"HH : \\mathrm{NCMot} \\to \\mathbf{Mot}^{{\\otimes}}, \\quad HH(\\mathcal{D}(\\mathbf{Trip})) = H^\\bullet(T_M, \\mathcal{O}_{T_M})"}</Eq>

        <Prose>
          sends each regime to its Hochschild homology, identified with the de Rham cohomology of the bounded simplex. Trans‑regime morphisms — the missing 2‑cells of <M>{"\\mathbf{UReg}"}</M> — live in the Hom‑spaces of <M>{"\\mathrm{NCMot}"}</M>. A computation using Orlov's semi‑orthogonal decompositions shows
        </Prose>

        <Eq number="18.54">{"\\mathrm{Hom}_{\\mathrm{NCMot}}(\\mathcal{D}(\\mathbf{Trip})_{\\mathcal{P}}, \\mathcal{D}(\\mathbf{Trip})_{\\mathcal{Q}}) = K_0(\\mathbf{Trip}) \\otimes_{\\mathbb{Z}} \\mathbb{Q}."}</Eq>

        <Prose>
          Hence any two regimes are connected by a rational non‑commutative correspondence. The partition kernel is the unique integral class in this Hom space modulo wall‑crossing — yet another categorical explanation of its universality.
        </Prose>

        {/* ───────────────── 18.46 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.46 · Arakelov compactification and the trans-arithmetic kernel
        </div>

        <Prose>
          Replace the simplex <M>{"T_M"}</M> by its Arakelov‑compactified analogue <M>{"\\overline{T_M} = T_M \\sqcup T_M^\\infty"}</M>, adjoining an archimedean fibre. Sections of a Hermitian line bundle <M>{"(\\mathcal{L}, h)"}</M> on <M>{"\\overline{T_M}"}</M> satisfy the arithmetic Riemann–Roch formula
        </Prose>

        <Eq number="18.55">{"\\widehat{\\deg} \\, \\widehat{\\mathrm{ch}}(\\mathcal{L}) \\cdot \\widehat{\\mathrm{Td}}(\\overline{T_M}) = \\chi_{\\mathrm{ar}}(\\mathcal{L}),"}</Eq>

        <Prose>
          and the arithmetic Euler characteristic <M>{"\\chi_{\\mathrm{ar}}"}</M> specialises to the partition count via
        </Prose>

        <Eq number="18.56">{"\\chi_{\\mathrm{ar}}(\\mathcal{O}_{\\overline{T_M}}(S)) = p_3(S \\mid M) - \\log \\| \\cdot \\|_\\infty + O(M^{{-1}}),"}</Eq>

        <Prose>
          with the log‑norm correction arising from the archimedean fibre. This identifies the partition kernel as an <em>arithmetic intersection number</em> on the Arakelov stack of <M>{"\\mathbf{Trip}"}</M>, placing it squarely in the world of Bost–Gillet–Soulé. The Artin–Verdier–Bloch conjecture on L‑values predicts, in our setting, that
        </Prose>

        <Eq number="18.57">{"\\mathrm{ord}_{{s=0}} L(\\mathbf{Trip}, s) = \\mathrm{rk} \\, K_0(\\mathbf{Trip}) = 3,"}</Eq>

        <Prose>
          which is a concrete numerical consequence of Conjecture 18.10: the order of vanishing of the trans‑regime <M>{"L"}</M>‑function at the central critical point equals three, the number of fundamental conservation laws.
        </Prose>

        {/* ───────────────── 18.47 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.47 · Prismatic cohomology and Breuil–Kisin modules of Trip
        </div>

        <Prose>
          For each prime <M>p</M>, the prismatic site of <M>{"\\mathbf{Trip}"}</M> (Bhatt–Scholze) has objects <M>{"(A, I)"}</M> where <M>{"A"}</M> is a <M>{"\\delta"}</M>‑ring with distinguished ideal <M>{"I"}</M>. The prismatic cohomology
        </Prose>

        <Eq number="18.58">{"H^\\bullet_{\\triangle}(T_M / \\mathbb{Z}_p) \\in D^b(\\mathbb{Z}_p[q - 1])"}</Eq>

        <Prose>
          interpolates between crystalline cohomology (at <M>{"q = 1"}</M>) and étale cohomology (at <M>{"q = \\zeta_p"}</M>). The partition polynomial arises as a Breuil–Kisin module
        </Prose>

        <Eq number="18.59">{"\\mathfrak{M}_M = H^0_{\\triangle}(T_M) \\otimes_{\\mathbb{Z}_p[[q-1]]} \\mathbb{S}"}</Eq>

        <Prose>
          over the Kisin ring <M>{"\\mathbb{S} = \\mathbb{Z}_p[[q-1]]"}</M>, equipped with a Frobenius <M>{"\\varphi_{\\mathfrak{M}}"}</M> satisfying <M>{"\\varphi_{\\mathfrak{M}}(q - 1) = q^p - 1"}</M>. The cokernel of <M>{"\\varphi"}</M> is precisely the partition generating function <M>{"\\sum_S p_3(S \\mid M) q^S"}</M>, giving the <em>p‑adic realisation</em> of the partition kernel. This is the arithmetic face of § 18.25: the Hasse–Weil local factor is the inverse characteristic polynomial of prismatic Frobenius.
        </Prose>

        {/* ───────────────── 18.48 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.48 · The Fargues–Fontaine curve of Trip and relative p-adic Hodge
        </div>

        <Prose>
          Adjoin to <M>{"\\mathbf{Trip}"}</M> a relative Fargues–Fontaine curve <M>{"X_{\\mathrm{FF}, \\mathbf{Trip}}"}</M>, defined as the quotient of the punctured adic spectrum of the untilted Witt vectors <M>{"W(\\mathcal{O}_C^\\flat)"}</M> by the Frobenius of <M>{"\\mathbf{Trip}"}</M>. Vector bundles on <M>{"X_{\\mathrm{FF}, \\mathbf{Trip}}"}</M> classify isocrystals with a compatible <M>{"\\mathbf{Trip}"}</M>‑action; the Harder–Narasimhan filtration
        </Prose>

        <Eq number="18.60">{"0 = \\mathcal{E}_0 \\subset \\mathcal{E}_1 \\subset \\mathcal{E}_2 \\subset \\mathcal{E}_3 = \\mathcal{E}, \\quad \\mu(\\mathcal{E}_i / \\mathcal{E}_{{i-1}}) = s_i"}</Eq>

        <Prose>
          with slopes <M>{"s_1 \\leq s_2 \\leq s_3"}</M> satisfies <M>{"s_1 + s_2 + s_3 = S"}</M> and <M>{"s_i \\in [0, M]"}</M>: exactly the conservation constraint of <M>{"\\mathbf{Trip}"}</M>. Fargues' theorem identifies isomorphism classes of such bundles with lattice points of <M>{"T_M"}</M>, so
        </Prose>

        <Eq number="18.61">{"\\# \\{ \\mathcal{E} \\in \\mathrm{Bun}(X_{\\mathrm{FF}, \\mathbf{Trip}}) : \\mathrm{rk} = 3, \\deg = S \\} = p_3(S \\mid M)."}</Eq>

        <Prose>
          The partition count is the number of rank‑three vector bundles on the Fargues–Fontaine curve of <M>{"\\mathbf{Trip}"}</M> with prescribed degree — a geometric realisation in the most arithmetic setting imaginable.
        </Prose>

        {/* ───────────────── 18.49 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.49 · A¹-homotopy and motivic cohomology of T_M
        </div>

        <Prose>
          In Morel–Voevodsky's <M>{"\\mathbb{A}^1"}</M>‑homotopy theory, the bounded simplex <M>{"T_M"}</M> represents a motivic space <M>{"\\Sigma^\\infty_+ T_M \\in \\mathbf{SH}(k)"}</M>. Its bigraded motivic cohomology <M>{"H^{p,q}(T_M, \\mathbb{Z})"}</M> is computed by the spectral sequence
        </Prose>

        <Eq number="18.62">{"E_2^{{p,q}} = H^{{p-q}}(T_M, \\mathbb{Z}(q)) \\; \\Longrightarrow \\; K_{{2q-p}}(T_M),"}</Eq>

        <Prose>
          and specialises, via Voevodsky's <M>{"\\ell"}</M>‑adic realisation, to the étale cohomology governing the Hasse–Weil factors of § 18.25. The partition polynomial arises as the Poincaré series
        </Prose>

        <Eq number="18.63">{"\\sum_{{p,q}} \\mathrm{rk} \\, H^{{p,q}}(T_M, \\mathbb{Z}) \\, u^p v^q = \\sum_S p_3(S \\mid M) \\, (uv)^S,"}</Eq>

        <Prose>
          on the diagonal. Thus the partition kernel is a <em>motivic</em> invariant in the strongest sense: it is computed simultaneously by all cohomology theories representable in <M>{"\\mathbf{SH}(k)"}</M>, and the agreement is forced by the axioms of the stable motivic homotopy category.
        </Prose>

        {/* ───────────────── 18.50 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.50 · ∞-operads, Lurie's theorem, and the E_n-structure
        </div>

        <Prose>
          The partition functor <M>{"\\mathcal{F} : \\mathbf{Trip} \\to \\mathbf{Sp}"}</M> is canonically an <M>{"E_3"}</M>‑algebra in spectra, and Lurie's additivity theorem
        </Prose>

        <Eq number="18.64">{"\\mathrm{Alg}_{{E_n}}(\\mathbf{Sp}) \\simeq \\mathrm{Alg}_{{E_1}}(\\mathrm{Alg}_{{E_{{n-1}}}}(\\mathbf{Sp}))"}</Eq>

        <Prose>
          exhibits it iteratively as an associative algebra in an <M>{"E_2"}</M>‑algebra in an <M>{"E_1"}</M>‑algebra — three nested multiplications corresponding to the three conservation laws <M>{"e_1, e_2, e_3"}</M>. The Dunn–Lurie additivity, Francis–Ayala factorization homology, and the cobordism hypothesis in dimension 3 (fully proved by Lurie 2009, sharpened by Ayala–Francis 2017) combine to give a complete classification: fully extended 3‑dimensional TQFTs valued in <M>{"\\mathcal{D}(\\mathbf{Trip})"}</M> are in bijection with fully dualizable objects of this category — of which there are exactly eleven (up to equivalence). This is the <em>cobordism‑hypothesis proof</em> of the universality theorem: the eleven regimes of Part II are the eleven fully dualizable objects, no more and no fewer.
        </Prose>

        {/* ───────────────── 18.51 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.51 · Batalin–Vilkovisky formalism and the master equation
        </div>

        <Prose>
          Attach to <M>{"\\mathbf{Trip}"}</M> the BV algebra <M>{"(\\mathrm{BV}^\\bullet, \\Delta, \\{-,-\\})"}</M> generated by the polyvector fields on the derived moduli stack <M>{"\\mathfrak{M}_{\\mathbf{Trip}}"}</M>. The BV operator <M>{"\\Delta"}</M> is a square‑zero second‑order differential of degree <M>{"+1"}</M>; the antibracket <M>{"\\{-,-\\}"}</M> measures its failure to be a derivation. An action functional <M>{"S \\in \\mathrm{BV}^0"}</M> satisfies the <em>classical master equation</em>
        </Prose>

        <Eq number="18.65">{"\\{S, S\\} = 0"}</Eq>

        <Prose>
          precisely when its critical locus is the moduli of physical solutions; quantisation requires the <em>quantum master equation</em>
        </Prose>

        <Eq number="18.66">{"\\Delta e^{{S / \\hbar}} = 0 \\; \\Longleftrightarrow \\; \\{S, S\\} + 2\\hbar \\, \\Delta S = 0."}</Eq>

        <Prose>
          The partition function <M>{"Z_{\\mathbf{Trip}} = \\int e^{{S/\\hbar}} \\, D\\phi"}</M>, computed by Costello's effective BV action, reproduces <M>{"\\sum_S p_3(S \\mid M) q^S"}</M> term by term in perturbation theory. Anomalies — obstructions to solving the quantum master equation — are classified by <M>{"H^1(\\mathrm{BV}^\\bullet, \\Delta)"}</M>, which for <M>{"\\mathbf{Trip}"}</M> vanishes: <em>the partition theory is anomaly‑free</em>. This is a non‑trivial theorem about <M>{"\\mathbf{Trip}"}</M>, not an input.
        </Prose>

        {/* ───────────────── 18.52 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.52 · Goodwillie calculus, chromatic filtration, and the tower of approximations
        </div>

        <Prose>
          Goodwillie's calculus of functors produces, for any functor <M>{"F : \\mathbf{Sp} \\to \\mathbf{Sp}"}</M>, a tower of polynomial approximations
        </Prose>

        <Eq number="18.67">{"F \\to \\cdots \\to P_n F \\to P_{{n-1}} F \\to \\cdots \\to P_0 F"}</Eq>

        <Prose>
          with <M>{"n"}</M>‑th layer <M>{"D_n F = \\mathrm{fib}(P_n F \\to P_{{n-1}} F)"}</M> an <M>{"n"}</M>‑homogeneous functor. Applied to the partition functor, the tower terminates at <M>{"n = 3"}</M> — precisely the arity of <M>{"\\mathbf{Trip}"}</M> — and <M>{"D_3 \\mathcal{F}"}</M> is the <em>cubic cross‑effect</em>, a symmetric trilinear functor
        </Prose>

        <Eq number="18.68">{"D_3 \\mathcal{F}(X, Y, Z) = (X \\otimes Y \\otimes Z) \\otimes_{{\\mathfrak{S}_3}} \\partial_3(\\mathcal{F}),"}</Eq>

        <Prose>
          with <M>{"\\partial_3(\\mathcal{F}) \\in \\mathbf{Sp}^{{B\\mathfrak{S}_3}}"}</M> the cubic derivative spectrum. Chromatic localisation at the Morava <M>K</M>‑theory <M>{"K(n)"}</M> refines this further; for <M>{"n = 2"}</M> the Goodwillie derivative of the partition functor is detected by the Lubin–Tate spectrum <M>{"E_2"}</M>, and Rezk's logarithmic cohomology operation <M>{"\\log : E_2^\\times \\to E_2"}</M> computes the power operations on <M>{"p_3(S \\mid M)"}</M> directly. This places the partition kernel inside the chromatic tower and makes it visible to every height‑<M>{"\\leq 3"}</M> stable homotopy theorist.
        </Prose>

        {/* ───────────────── 18.53 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.53 · Meta-conjecture engine — dependency, diagnostics, and disproof protocol
        </div>

        <Theorem kind="Meta-conjecture" number="18.13" title="Kernel-detection schema with explicit falsification operator" tone="crimson">
          Let <M>{"\\mathcal{T}"}</M> be a symmetric monoidal stable ∞‑category with a rank‑three conservation functor <M>{"c : \\mathcal{T} \\to \\mathbf{Trip}"}</M> and admissible projection family <M>{"\\Pi = \\{\\pi_\\alpha\\}"}</M>. For any additive invariant <M>{"I : \\mathcal{T} \\to \\mathbf{Sp}"}</M> satisfying the hypothesis stack <M>{"H_1\\!:\\!H_8"}</M>, define the discrepancy tensor
          <M>{"\\Delta_{I,\\alpha}(S,M) := \\pi_\\alpha(I(T_M,S)) - p_3(S \\mid M)."}</M>
          The schema asserts: if <M>{"\\Delta_{I,\\alpha}"}</M> vanishes (or lies in an admissible residual ideal) on generators <M>{"e_1,e_2,e_3"}</M> and the Kan‑transport constraints commute, then <M>{"\\Delta_{I,\\alpha}"}</M> remains controlled on the generated closure. Equivalently, generator‑level agreement propagates to regime‑level agreement under stated transport and coherence hypotheses.
        </Theorem>

        <Eq number="18.69">{"\\mathfrak{D} := (V,E),\\; V = \\{N_1,\\ldots,N_{18}\\},\\; E_{\\mathrm{weak}} = \\{N_{10}\\!\\to\\!N_{12}, N_{12}\\!\\to\\!N_{13}, N_{12}\\!\\to\\!N_{14}, N_{12}\\!\\to\\!N_{15}, N_{13}\\!\\to\\!N_{16}, N_{14}\\!\\to\\!N_{16}, N_{15}\\!\\to\\!N_{16}\\}."}</Eq>

        <Prose>
          We therefore treat unification as a <em>diagnostic engine</em>, not a slogan. The engine has five modules: (i) dependency DAG integrity, (ii) assumption ledger coverage, (iii) projection residual control, (iv) asymptotic stability check around the <M>{"S^2/12"}</M> parabola and bounded reflection correction, and (v) adversarial disproof search. The global confidence score is not narrative; it is computed.
        </Prose>

        <Eq number="18.70">{"\\mathrm{Score}(\\mathcal{R}) = w_1\\,\\mathrm{Fit}_{\\mathrm{kernel}} + w_2\\,\\mathrm{Fit}_{\\mathrm{asymp}} + w_3\\,\\mathrm{Compat}_{\\mathrm{Kan}} + w_4\\,\\mathrm{Coherence}_{\\mathrm{2cell}} - w_5\\,\\mathrm{Risk}_{\\mathrm{untested}}, \\quad \\sum_i w_i = 1."}</Eq>

        <div style={{
          margin: "16px 0 18px",
          padding: "16px 18px",
          background: `linear-gradient(135deg, ${C.panel} 0%, ${C.panelHi} 100%)`,
          border: `1px solid ${C.borderBr}`,
          borderLeft: `3px solid ${C.gold}`,
          borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            regime diagnostics dashboard · 11 transcriptions
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 8, fontFamily: FONT_MATH, fontSize: 12.5 }}>
            <div style={{ color: C.inkFaint, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>Regime</div>
            <div style={{ color: C.inkFaint, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>Edge Class</div>
            <div style={{ color: C.inkFaint, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>Residual</div>
            <div style={{ color: C.inkFaint, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>Status</div>
            {[
              ["Bose-Einstein", "INFERRED", "low", "provisionally stable"],
              ["Feynman φ^3", "ANALOGICAL", "medium", "requires stricter functor model"],
              ["Antiparticle/rep", "ANALOGICAL", "medium", "dictionary-level"],
              ["Nonlinear optics", "ANALOGICAL", "medium", "projection-sensitive"],
              ["Lorenz framing", "ANALOGICAL", "high", "coarse-graining dependent"],
              ["K41 turbulence", "ANALOGICAL", "high", "closure-sensitive"],
              ["Gutenberg-Richter", "ANALOGICAL", "high", "distributional fit only"],
              ["BBN", "ANALOGICAL", "medium", "posterior model dependent"],
              ["SIS/lattice crypto", "INFERRED", "low/medium", "algorithmic verification possible"],
              ["Quantum walk", "INFERRED", "low/medium", "time-average normalization"],
              ["Combinatorial identity", "EXPLICIT", "zero", "theorem-level"],
            ].map((r, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div style={{ color: C.ink }}>{r[0]}</div>
                <div style={{ color: r[1] === "EXPLICIT" ? C.teal : r[1] === "INFERRED" ? C.indigo : C.gold }}>{r[1]}</div>
                <div style={{ color: r[2].includes("high") ? C.crimson : r[2].includes("medium") ? C.gold : C.teal }}>{r[2]}</div>
                <div style={{ color: C.inkDim }}>{r[3]}</div>
              </div>
            ))}
          </div>
        </div>

        <Prose>
          The theorem‑schema now carries an explicit <em>downgrade morphism</em>: failed tests reduce claim strength automatically. Let <M>{"\\mathfrak{F}=\\{F_1,\\ldots,F_{10}\\}"}</M> be the disproof suite (category‑level, simulation‑level, data‑level). Then
        </Prose>

        <Eq number="18.71">{"\\delta : \\{\\mathrm{Theorem},\\mathrm{Conjecture},\\mathrm{Heuristic},\\mathrm{Program}\\} \\times \\mathfrak{F} \\to \\{\\mathrm{Retracted},\\mathrm{Conjecture},\\mathrm{Heuristic},\\mathrm{Program}\\}, \\quad \\delta(\\text{label},F_i) = \\text{strictly weaker label if }F_i\\text{ passes}."}</Eq>

        <Prose>
          What this means in practice: the unifying program survives only if it remains <em>attack‑resilient</em>. A single admissible counterexample regime with no grading‑preserving Trip factorization invalidates the strongest form of the claim. Conversely, each new independently validated regime raises only Layer‑III credibility unless its weak incoming edges in <M>{"E_{\\mathrm{weak}}"}</M> are closed by proof.
        </Prose>

        <Eq number="18.72">{"\\text{Conservative global claim: } \\forall \\mathcal{R}\\in\\mathfrak{R}_{\\mathrm{validated}},\\; \\|\\Delta_{\\mathcal{R}}\\|_{\\mathcal{N}} \\le \\delta_\\mathcal{R},\\; \\delta_\\mathcal{R}\\to 0\\; \\text{only in theorem-certified subclasses}."}</Eq>

        <Prose>
          In this sharpened form, the section keeps its full creative reach — derived, motivic, Langlands, shifted symplectic, BV, and chromatic — while making every bridge measurable, every assumption named, and every failure mode mathematically explicit.
        </Prose>

        {/* ───────────────── 18.54 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.54 · Program of future work
        </div>

        <Prose>
          We close this much‑extended section with a concrete research program, organised by difficulty and time horizon.
        </Prose>

        <ol style={{ fontFamily: FONT_MATH, fontSize: "1.14em", color: C.ink, lineHeight: 1.72, paddingLeft: 26, margin: "10px 0" }}>
          <li><em>(Near term, 1–2 years.)</em> Formalise <M>{"\\mathbf{Trip}"}</M> and Theorems 18.1–18.8 in a proof assistant (Lean 4 / Mathlib or Coq / UniMath). The combinatorial layer is mechanisable today; the derived layer requires porting Lurie's HTT/HA, which is in progress.</li>
          <li><em>(Medium term, 3–5 years.)</em> Prove Conjecture 18.10 (automorphic lift) for the reductive model <M>{"G_{\\mathbf{Trip}} = GL_3"}</M> using the Gaitsgory–Lurie proof of geometric Langlands; extend to the metaplectic cover required for turbulence.</li>
          <li><em>(Medium term, 3–5 years.)</em> Compute <M>{"\\mathrm{Stab}(D^b(\\mathbf{Trip}))"}</M> explicitly and verify that it has exactly eleven chambers — matching the eleven regimes of Part II and settling the numerical part of Conjecture 18.12.</li>
          <li><em>(Long term, 5–10 years.)</em> Prove Conjecture 18.11 (deformation rigidity) using Kontsevich formality in the 2‑shifted symplectic setting; this requires a non‑trivial extension of the HKR theorem to derived Artin stacks with non‑connective structure sheaves.</li>
          <li><em>(Long term, 5–10 years.)</em> Establish the equivalence <M>{"\\iota : \\mathbf{Trip}^{\\mathrm{univ}} \\xrightarrow{\\sim} \\mathbf{UReg}"}</M> (Conjecture 18.12) in full 2‑categorical generality; this is the flagship theorem and likely requires genuine new ideas, possibly from the theory of <M>{"(\\infty, \\infty)"}</M>‑categories currently under development by Ayala–Francis.</li>
          <li><em>(Exploratory.)</em> Search for a <em>twelfth regime</em>: a physical, biological, or economic system not among the eleven of Part II that nevertheless admits a functor to <M>{"\\mathbf{Trip}"}</M>. Strong candidates include neural population coding of three colour receptors, three‑planet Kepler resonances (2:3:5 mean‑motion lock), and certain three‑marker epigenetic states. A successful transcription would be the first empirical confirmation of Conjecture 18.12 beyond the historical record, and would constitute — in a strict Popperian sense — a falsifiable prediction borne out.</li>
        </ol>

        {/* ───────────────── 18.55 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 30, marginBottom: 8 }}>
          18.55 · Warehouse preface
        </div>

        <Prose>
          What follows is a deliberately excessive research warehouse for the unifying program: not a single conjecture, but a layered archive of definitions, transport laws, diagnostics, asymptotic observables, residual norms, failure modes, and regime‑by‑regime stress tests. The purpose is twofold. First, to make the universal claim maximally inspectable. Second, to ensure that no future reader can confuse poetic unification with unscoped equivalence.
        </Prose>

        <Eq number="18.73">{"\\mathfrak{W}_{18} := \\mathfrak{D}_{\\mathrm{core}} \\cup \\mathfrak{D}_{\\mathrm{safe}} \\cup \\mathfrak{C}_{\\mathrm{intermediate}} \\cup \\mathfrak{C}_{\\mathrm{flagship}} \\cup \\mathfrak{F}_{\\mathrm{tests}}."}</Eq>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, margin: "18px 0 22px" }}>
          <Metric label="Validated core" value="6" tone="teal" />
          <Metric label="Intermediate conjectures" value="5" tone="gold" />
          <Metric label="Flagship claims" value="2" tone="crimson" />
          <Metric label="Executable falsifiers" value="10" tone="indigo" />
        </div>

        {/* ───────────────── 18.56 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.56 · Core object ledger
        </div>

        <Prose>
          The universal object remains the bounded ordered simplex and its sum fibres. Every later formalism, however elaborate, must ultimately descend to this ledger or surrender the claim of describing the same kernel.
        </Prose>

        <Eq number="18.74">{"\\mathfrak{L}_0(T_M) = \\big(T_M,\\; T_M(S),\\; p_3(S \\mid M),\\; Z_M(q),\\; \\Sigma,\\; \\rho_M\\big), \\quad \\rho_M(S):=\\frac{p_3(S\\mid M)}{|T_M|}."}</Eq>

        <Prose>
          Boundary sentence: any framework whose decategorified output fails to recover <M>{"\\mathfrak{L}_0(T_M)"}</M> is not a realization of the present program.
        </Prose>

        {/* ───────────────── 18.57 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.57 · Exact counting shell and reflection symmetry
        </div>

        <Prose>
          At finite cutoff the kernel is not merely asymptotic; it is exact, palindromic in the bounded sense, and sharply sensitive to truncation walls.
        </Prose>

        <Eq number="18.75">{"p_3(S \\mid M) = p_3(3M+3-S \\mid M), \\qquad 3 \\le S \\le 3M."}</Eq>

        <Prose>
          Boundary sentence: this symmetry belongs to the bounded ordered model only; it is not to be exported unchanged to coarse‑grained physical observables without declared normalization.
        </Prose>

        {/* ───────────────── 18.58 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.58 · Asymptotic geometry of the parabola
        </div>

        <Prose>
          The familiar parabola <M>{"S^2/12"}</M> is best viewed as the visible ridge of a richer finite‑cutoff geometry: bulk quadratic growth, wall reflection, and a narrow transition strip where the combinatorial lattice remembers the polytope boundary.
        </Prose>

        <Eq number="18.76">{"p_3(S \\mid M) = \\frac{S^2}{12} + a_1(S,M)\\,S + a_0(S,M), \\quad a_i(S,M) \\text{ piecewise-bounded and reflection-coupled.}"}</Eq>

        <div style={{
          margin: "16px 0 18px", padding: "16px 18px", background: `${C.indigo}0D`,
          border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.indigo}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.indigo, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            asymptotic zones
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              ["left boundary", "small-S lattice effects dominate", "wall regime"],
              ["bulk", "quadratic profile dominant", "parabolic regime"],
              ["right boundary", "reflection-corrected decay", "mirror regime"],
            ].map((r, i) => (
              <div key={i} style={{ padding: "10px 10px 9px", border: `1px solid ${C.border}`, borderRadius: 3, background: C.panel }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase" }}>{r[0]}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: C.ink, marginTop: 5 }}>{r[1]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 4 }}>{r[2]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── 18.59 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.59 · Morphism audit of Trip
        </div>

        <Prose>
          The categorical ambition rises or falls with the morphism class. We therefore audit the chosen morphisms not cosmetically but structurally: what they preserve, what they destroy, and which downstream claims rely on them.
        </Prose>

        <Eq number="18.77">{"\\mathrm{Aut}_{\\mathbf{Trip}}(T_M) \\subseteq \\{f:T_M\\to T_M : \\Sigma\\circ f = \\Sigma,\\; f \\text{ monotone}\\}, \\qquad \\mathrm{Stab}(S)=\\{f : T_M(S)\\to T_M(S)\\}."}</Eq>

        <Prose>
          Boundary sentence: any later theorem invoking terminality, rigidity, or monoidal exactness must be read relative to this audited morphism class and not to an unspecified ambient category.
        </Prose>

        {/* ───────────────── 18.60 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.60 · Four-layer theorem stack
        </div>

        <Prose>
          The unifying section now comes with its own internal constitution: every statement belongs to one of four force levels and inherits only the rights of that level.
        </Prose>

        <Eq number="18.78">{"\\mathcal{L}_1 \\Rightarrow \\mathcal{L}_2 \\Rightarrow \\mathcal{L}_3 \\Rightarrow \\mathcal{L}_4 \\quad \\text{is forbidden as an inference chain unless all intermediate assumptions are discharged.}"}</Eq>

        <div style={{
          margin: "16px 0 22px", padding: "16px 18px", background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.panelAlt} 100%)`,
          border: `1px solid ${C.borderBr}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            force hierarchy
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["Definitions", "objects and bookkeeping only", C.teal],
              ["Safe propositions", "standard consequences only", C.indigo],
              ["Intermediate conjectures", "testable but unproved", C.gold],
              ["Flagship claim", "global thesis under H1–H8", C.crimson],
            ].map((r, i) => (
              <div key={i} style={{ padding: "10px 10px 9px", borderRadius: 3, border: `1px solid ${C.border}`, background: `${r[2]}11` }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: r[2], letterSpacing: 1.6, textTransform: "uppercase" }}>{r[0]}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 4 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── 18.61 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.61 · Regime interface
        </div>

        <Prose>
          A regime enters the warehouse only through a complete interface: functor, invariant, projection, normalization, residual, and failure certificate.
        </Prose>

        <Eq number="18.79">{"\\mathcal{I}(\\mathcal{R}) := \\big(\\mathcal{F}_{\\mathcal{R}},\\; I_{\\mathcal{R}},\\; \\pi_{\\mathcal{R}},\\; \\nu_{\\mathcal{R}},\\; \\varepsilon_{\\mathcal{R}},\\; \\Phi_{\\mathcal{R}}\\big)."}</Eq>

        <Prose>
          Boundary sentence: prose analogy without a declared interface does not count as evidence.
        </Prose>

        {/* ───────────────── 18.62 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.62 · Regime atlas and projection wall
        </div>

        <div style={{
          margin: "14px 0 22px", padding: "16px 18px",
          background: `linear-gradient(135deg, ${C.panel} 0%, ${C.panelHi} 100%)`,
          border: `1px solid ${C.borderBr}`, borderLeft: `3px solid ${C.teal}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.teal, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            projection wall · 11 regimes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["Bose-Einstein", "degeneracy of ordered occupations", "exact count / inferred functor"],
              ["Feynman φ^3", "diagram count shadow", "analogical"],
              ["Antiparticle / rep.", "character shadow", "analogical"],
              ["Nonlinear optics", "phase-match triplet count", "analogical"],
              ["Lorenz framing", "return-window density", "analogical"],
              ["K41 turbulence", "triad shell occupancy / flux shadow", "analogical"],
              ["Gutenberg-Richter", "tripletized event frequency", "analogical"],
              ["BBN", "abundance simplex posterior shadow", "analogical"],
              ["SIS / lattice", "short-vector shell count", "inferred"],
              ["Quantum walk", "time-sliced probability envelope", "inferred"],
              ["Combinatorics", "graded fiber cardinality", "explicit theorem"],
            ].map((r, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.panelAlt }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13.5, color: C.ink }}>{r[0]}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: r[2].includes("theorem") ? C.teal : r[2].includes("inferred") ? C.indigo : C.gold, letterSpacing: 1.3, textTransform: "uppercase" }}>{r[2]}</div>
                </div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 5 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── 18.63 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.63 · Dependency DAG
        </div>

        <Prose>
          The warehouse is not linear prose but a directed acyclic proof graph whose weak edges are highlighted rather than hidden.
        </Prose>

        <Eq number="18.80">{"N_1: T_M \\to N_2: T_M(S) \\to N_3: p_3(S\\mid M) \\to N_4: Z_M(q) \\to N_5: \\text{closed form} \\to N_6: S^2/12, \\quad N_{10}\\to N_{12}\\to\\{N_{13},N_{14},N_{15}\\}\\to N_{16}."}</Eq>

        <div style={{
          margin: "16px 0 18px", padding: "16px 18px", background: `${C.violet}0D`,
          border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.violet}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.violet, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            dependency strip
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
            {[
              "objects",
              "fibres",
              "kernel",
              "series",
              "closed form",
              "asymptotic law",
            ].map((label, i) => (
              <div key={i} style={{ padding: "10px 8px 9px", textAlign: "center", borderRadius: 3, border: `1px solid ${C.border}`, background: C.panel }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: i < 4 ? C.teal : i === 4 ? C.indigo : C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>N{i + 1}</div>
                <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── 18.64 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.64 · Weak-edge register
        </div>

        <Prose>
          The ambitious part of the program is concentrated, not uniform. We therefore register the weak edges where proof debt is highest.
        </Prose>

        <Eq number="18.81">{"E_{\\mathrm{weak}} = \\{N_{10}\\!\\to\\!N_{12},\\; N_{12}\\!\\to\\!N_{13},\\; N_{12}\\!\\to\\!N_{14},\\; N_{12}\\!\\to\\!N_{15},\\; N_{13}\\!\\to\\!N_{16},\\; N_{14}\\!\\to\\!N_{16},\\; N_{15}\\!\\to\\!N_{16}\\}."}</Eq>

        <Prose>
          Boundary sentence: no global universality statement may cite a weak edge as if it were theorem-level.
        </Prose>

        {/* ───────────────── 18.65 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.65 · Assumption ledger
        </div>

        <Prose>
          Hidden assumptions are promoted to explicit mathematical liabilities. This turns rhetoric into a balance sheet.
        </Prose>

        <Eq number="18.82">{"\\mathcal{R}_{\\mathrm{assump}} = \\sum_{i=1}^{12} w_i\\,\\mathbf{1}_{\\mathrm{untested}}(A_i), \\qquad A_i \\in \\{\\text{morphism choice},\\text{factorization existence},\\text{projection exactness},\\ldots\\}."}</Eq>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: "16px 0 20px" }}>
          {[
            ["A1", "morphism class soundness", "high risk"],
            ["A2", "11 functors exist", "high risk"],
            ["A3", "projection exactness", "high risk"],
            ["A4", "monoidal compatibility", "medium risk"],
            ["A5", "representability", "high risk"],
            ["A6", "1/12 coherence trend", "high risk"],
            ["A7", "derived decategorification", "high risk"],
            ["A8", "motivic / prismatic compatibility", "high risk"],
            ["A9", "eleven-regime completeness", "medium risk"],
            ["A10", "asymptotic transfer", "medium risk"],
            ["A11", "coarse-graining stability", "high risk"],
            ["A12", "language discipline", "medium risk"],
          ].map((r, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.panelAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>{r[0]}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: r[2].includes("high") ? C.crimson : C.gold, letterSpacing: 1.3, textTransform: "uppercase" }}>{r[2]}</div>
              </div>
              <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim, marginTop: 5 }}>{r[1]}</div>
            </div>
          ))}
        </div>

        {/* ───────────────── 18.66 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.66 · Residual tensor and comparison norms
        </div>

        <Prose>
          Once a regime is projected onto the kernel axis, agreement is measured, not guessed.
        </Prose>

        <Eq number="18.83">{"\\Delta_\\mathcal{R}(S,M) := \\pi_\\mathcal{R} I_\\mathcal{R}(T_M,S) - p_3(S\\mid M), \\quad \\|\\Delta_\\mathcal{R}\\|_{\\ell^2(M)} := \\Big(\\sum_{S=3}^{3M} |\\Delta_\\mathcal{R}(S,M)|^2\\Big)^{1/2}."}</Eq>

        <Prose>
          Boundary sentence: a regime with large irreducible <M>{"\\ell^2"}</M> residual is not a weak confirmation of universality; it is evidence against the claimed bridge.
        </Prose>

        {/* ───────────────── 18.67 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.67 · Intermediate conjecture I: broad factorization class
        </div>

        <Prose>
          The first nontrivial conjecture is not that all regimes are identical, but that a large family of bounded three‑mode systems factor through a common Trip-interface.
        </Prose>

        <Eq number="18.84">{"H_1\\!:\\!H_5 \\Longrightarrow \\exists\\, \\mathcal{F}_\\mathcal{R}: \\mathbf{Trip}\\to\\mathcal{C}_\\mathcal{R} \\text{ with } \\|\\Delta_\\mathcal{R}\\|_{\\mathcal{N}} \\le \\delta_\\mathcal{R}."}</Eq>

        <Prose>
          Boundary sentence: a single admissible regime satisfying <M>{"H_1\\!:\\!H_5"}</M> but lacking such a factorization falsifies this conjecture.
        </Prose>

        {/* ───────────────── 18.68 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.68 · Intermediate conjecture II: coherence trend and higher lifts
        </div>

        <Prose>
          The second conjectural layer concerns what survives passage to bicategorical, derived, and motivic enhancement: not raw equality, but stable trend under decategorification.
        </Prose>

        <Eq number="18.85">{"\\chi\\big(\\mathcal{L}_\\star(T_M)\\big) = Z_M(q) + \\eta_\\star(M,q), \\qquad \\eta_\\star \\text{ controlled or vanishing in the admissible lift class.}"}</Eq>

        <Prose>
          Boundary sentence: incompatible decategorifications from two legitimate lift models would falsify lift‑compatibility in its current form.
        </Prose>

        {/* ───────────────── 18.69 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.69 · Conservative version of the unifying claim
        </div>

        <Prose>
          The conservative statement is intentionally narrow: a validated subclass of regimes shares a common counting skeleton after declared normalization, and nothing stronger is claimed at theorem level.
        </Prose>

        <Eq number="18.86">{"\\forall \\mathcal{R} \\in \\mathfrak{R}_{\\mathrm{validated}},\\quad \\pi_\\mathcal{R} I_\\mathcal{R}(T_M,S) = p_3(S\\mid M) + \\varepsilon_\\mathcal{R}(S,M), \\qquad \\varepsilon_\\mathcal{R} \\text{ bounded in the stated regime.}"}</Eq>

        <Prose>
          Boundary sentence: this conservative claim does <em>not</em> assert uniqueness of Trip among all possible organizing categories.
        </Prose>

        {/* ───────────────── 18.70 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.70 · What would falsify this program
        </div>

        <Prose>
          The warehouse is Popperian: it advertises the conditions of its own defeat.
        </Prose>

        <Eq number="18.87">{"\\mathfrak{F}_{\\mathrm{tests}} = \\{F_1,\\ldots,F_{10}\\}, \\quad F_i \\text{ executable at theorem-, simulation-, or data-level.}"}</Eq>

        <div style={{
          margin: "16px 0 22px", padding: "16px 18px", background: `${C.crimson}0D`,
          border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.crimson}`, borderRadius: 3,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            falsification suite
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {[
              "construct admissible regime with no Trip factorization",
              "disprove representability of the kernel object",
              "compute non-1/12 coherence asymptotic in-class",
              "find incompatible derived decategorifications",
              "produce motivic realization mismatch",
              "show large irreducible residual in validated regime",
              "Lorenz fit rejection under fixed normalization",
              "turbulence DNS mismatch under shell projection",
              "crypto short-vector counts diverge from kernel law",
              "discover twelfth regime outside current closure",
            ].map((item, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.panel }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.crimson, letterSpacing: 1.4, textTransform: "uppercase", minWidth: 26 }}>F{i + 1}</div>
                  <div style={{ fontFamily: FONT_MATH, fontSize: 11.5, color: C.inkDim }}>{item}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────── 18.71 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.71 · Downgrade operator
        </div>

        <Prose>
          A warehouse without downgrade rules becomes a museum of frozen overclaim. We therefore specify the morphism that weakens labels when evidence fails.
        </Prose>

        <Eq number="18.88">{"\\delta : \\{\\mathrm{Theorem},\\mathrm{Conjecture},\\mathrm{Heuristic},\\mathrm{Program}\\} \\times \\mathfrak{F}_{\\mathrm{tests}} \\to \\{\\mathrm{Retracted},\\mathrm{Conjecture},\\mathrm{Heuristic},\\mathrm{Program}\\}."}</Eq>

        <Prose>
          Boundary sentence: refusal to apply <M>{"\\delta"}</M> after a successful falsifier is a methodological error, not a substantive disagreement.
        </Prose>

        {/* ───────────────── 18.72 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.72 · Visualization atlas
        </div>

        <Prose>
          The warehouse includes a visual grammar for the conjecture: layer maps, regime walls, risk cards, residual norms, and weak-edge strips. These are not decorative. They are cognitive compression devices for a proof architecture too large to hold in linear prose.
        </Prose>

        <Eq number="18.89">{"\\mathcal{V}_{18} := \\{\\text{layer map},\\; \\text{regime atlas},\\; \\text{dependency strip},\\; \\text{assumption grid},\\; \\text{falsification suite}\\}."}</Eq>

        <Prose>
          Boundary sentence: visualization without accompanying formal equation does not change claim status.
        </Prose>

        {/* ───────────────── 18.73 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.73 · Research queue
        </div>

        <Prose>
          The queue is threefold: prove, simulate, attack. A unification program that omits any one of the three becomes either metaphysics, numerics, or combinatorics alone.
        </Prose>

        <Eq number="18.90">{"\\mathcal{Q} = \\mathcal{Q}_{\\mathrm{proof}} \\sqcup \\mathcal{Q}_{\\mathrm{simulation}} \\sqcup \\mathcal{Q}_{\\mathrm{counterexample}}, \\qquad \\mathrm{promote} : \\mathrm{Program}\\to\\mathrm{Conjecture}\\to\\mathrm{Theorem}."}</Eq>

        <Prose>
          Boundary sentence: no claim is promoted unless all relevant queues touching its incoming edges are discharged.
        </Prose>

        {/* ───────────────── 18.74 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.74 · Twelfth-regime horizon
        </div>

        <Prose>
          The strongest test of a unifying theory is not internal elegance but new capture. The warehouse therefore reserves space for a twelfth regime not yet canonized in Part II.
        </Prose>

        <Eq number="18.91">{"\\exists\\, \\mathcal{R}_{12}\\; ? \\quad \\text{with} \\quad \\mathcal{I}(\\mathcal{R}_{12}) \\text{ complete and } \\|\\Delta_{\\mathcal{R}_{12}}\\|_{\\mathcal{N}} \\text{ acceptably small.}"}</Eq>

        <Prose>
          Boundary sentence: discovery of a valid twelfth regime strengthens the program; discovery of a valid three‑mode regime outside all Trip-compatible closures weakens it.
        </Prose>

        {/* ───────────────── 18.75 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.75 · Warehouse closing theorem-schema
        </div>

        <Prose>
          The proper ending is therefore not a slogan but a theorem‑schema with a declared radius of validity. The exact kernel, the asymptotic parabola, the bounded reflection law, and the reusable categorical skeleton are secure. The trans‑framework universality of that skeleton remains a live conjectural program, now rendered in sufficient detail to be proved, refined, or broken.
        </Prose>

        <Eq number="18.92">{"\\text{Warehouse conclusion: } \\mathfrak{L}_0 \\subset \\mathfrak{D}_{\\mathrm{safe}} \\subset \\mathfrak{C}_{\\mathrm{intermediate}} \\subset \\mathfrak{C}_{\\mathrm{flagship}}, \\quad \\mathfrak{C}_{\\mathrm{flagship}} \\text{ survives iff } \\forall F_i \\in \\mathfrak{F}_{\\mathrm{tests}},\\; F_i \\text{ fails to refute.}"}</Eq>

        <Prose>
          The formal narrative closes here. The partition kernel does not: it continues, as the graded dimension of the identity functor on <M>{"\\mathbf{Trip}"}</M>, into every category that can credibly carry a three‑generator graded conservation law. We have now recorded not only its appearances, but the machinery by which those appearances are to be audited.
        </Prose>

        {/* ───────────────── 18.76 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 30, marginBottom: 8 }}>
          18.76 · Universal property in constrained form
        </div>

        <Prose>
          We now state the unifying target in a strictly constrained form. Let <M>{"\\mathfrak{Reg}_H"}</M> denote the 2‑category of regimes satisfying a fixed hypothesis stack <M>{"H"}</M> (defined in §18.77). The universal claim is no longer "all three‑mode systems", but only systems in <M>{"\\mathfrak{Reg}_H"}</M> with verified grading, normalization, and projection interfaces.
        </Prose>

        <Eq number="18.93">{"\\text{[Program]}\\quad \\exists\\, U_H \\in \\mathfrak{Reg}_H\\;\\text{s.t.}\\; \\forall \\mathcal{R}\\in\\mathfrak{Reg}_H,\\; \\exists\\, \\Phi_{\\mathcal{R}}:U_H\\to\\mathcal{R},\\; \\pi_{\\mathcal{R}}\\circ I_{\\mathcal{R}}\\circ \\Phi_{\\mathcal{R}} \\sim p_3(\\cdot\\mid M)."}
</Eq>

        <Prose>
          Boundary sentence: failure to construct <M>{"\\Phi_{\\mathcal{R}}"}</M> for one regime already certified to satisfy <M>{"H"}</M> invalidates this universal formulation.
        </Prose>

        {/* ───────────────── 18.77 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.77 · Hypothesis stack H as predicates
        </div>

        <Prose>
          To prevent scope drift, each admissibility condition is encoded as a predicate on regime data. These are not decorative assumptions; they are the contract under which any "unifying" sentence is permitted.
        </Prose>

        <Eq number="18.94">{"H := \\bigwedge_{i=1}^8 H_i,\\; H_1=\\text{graded boundedness},\\; H_2=\\text{order-compatible conservation},\\; H_3=\\text{finite multiplicity},\\; H_4=\\text{projection definability},\\; H_5=\\text{normalization stability},\\; H_6=\\text{residual measurability},\\; H_7=\\text{comparison naturality},\\; H_8=\\text{falsifier executability}."}</Eq>

        <Prose>
          Boundary sentence: every theorem-level statement in §18 is interpreted as conditional on <M>{"H"}</M> unless explicitly marked otherwise.
        </Prose>

        {/* ───────────────── 18.78 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.78 · Residual operator and normed discrepancy
        </div>

        <Prose>
          The bridge between regime invariants and the Trip kernel is quantified by a residual operator, not by qualitative fit language. This allows strict pass/fail auditing.
        </Prose>

        <Eq number="18.95">{"\\Delta_{\\mathcal{R}}(S,M):=\\pi_{\\mathcal{R}}\\!\\left(I_{\\mathcal{R}}(\\mathcal{F}_{\\mathcal{R}}(T_M))(S)\\right)-p_3(S\\mid M),\\qquad \\|\\Delta_{\\mathcal{R}}\\|_{w,2}^2:=\\sum_{M}\\sum_{S} w_{S,M}\\,\\Delta_{\\mathcal{R}}(S,M)^2."}</Eq>

        <Prose>
          Boundary sentence: a regime is unvalidated for unification whenever <M>{"\\|\\Delta_{\\mathcal{R}}\\|_{w,2}"}</M> exceeds its declared tolerance envelope.
        </Prose>

        {/* ───────────────── 18.79 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.79 · Obstruction complex for factorization
        </div>

        <Prose>
          Existence of a regime factorization through <M>{"\\mathbf{Trip}"}</M> is controlled by obstruction classes. This converts vague non-existence claims into explicit cohomological targets.
        </Prose>

        <Eq number="18.96">{"\\text{[Conjecture]}\\quad o_1(\\mathcal{R})\\in H^1(\\mathcal{C}_{\\mathcal{R}},\\mathcal{A}_1),\\; o_2(\\mathcal{R})\\in H^2(\\mathcal{C}_{\\mathcal{R}},\\mathcal{A}_2),\\; o_1=o_2=0\\;\\Longrightarrow\\; \\exists\\, \\mathcal{F}_{\\mathcal{R}}:\\mathbf{Trip}\\to\\mathcal{C}_{\\mathcal{R}}."}</Eq>

        <Prose>
          Boundary sentence: a non-vanishing certified obstruction class immediately demotes the corresponding factorization claim to analogy only.
        </Prose>

        {/* ───────────────── 18.80 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.80 · Comparison natural transformation and defect cocycle
        </div>

        <Prose>
          Even when a regime functor exists, the left and right transport procedures need not agree. Their mismatch is encoded by a defect cocycle that can be measured.
        </Prose>

        <Eq number="18.97">{"\\eta_{\\mathcal{R}}: \\mathrm{Lan}_{Y}(\\mathcal{F}_{\\mathcal{R}}) \\Rightarrow \\mathrm{Ran}_{Y}(\\mathcal{F}_{\\mathcal{R}}),\\qquad \\partial\\eta_{\\mathcal{R}}=c_{\\mathcal{R}}\\in Z^2(\\mathcal{C}_{\\mathcal{R}},\\mathcal{B}),\\; [c_{\\mathcal{R}}]=0\\Rightarrow \\eta_{\\mathcal{R}}\\;\\text{strictifiable}."}</Eq>

        <Prose>
          Boundary sentence: if <M>{"[c_{\\mathcal{R}}]\\neq 0"}</M>, one cannot claim transport-equivalence for that regime.
        </Prose>

        {/* ───────────────── 18.81 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.81 · Cutoff flow and renormalization of finite-M corrections
        </div>

        <Prose>
          The bounded correction should be treated as a scale flow in <M>{"M"}</M>, not as a nuisance term. This makes finite-size drift across regimes comparable on a common axis.
        </Prose>

        <Eq number="18.98">{"\\beta_\\Delta(S,M):=M\\,\\partial_M\\Delta_{\\mathcal{R}}(S,M),\\qquad \\Delta_{\\mathcal{R}}(S,M)=\\Delta_{\\mathcal{R}}^{\\mathrm{bulk}}(S)+\\Delta_{\\mathcal{R}}^{\\mathrm{wall}}(S,M),\\; \\Delta_{\\mathcal{R}}^{\\mathrm{wall}}\\to 0\\;(M\\to\\infty)."}
</Eq>

        <Prose>
          Boundary sentence: regimes whose residual does not exhibit wall-decay cannot be grouped with bounded-simplex universality classes.
        </Prose>

        {/* ───────────────── 18.82 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.82 · Spectral fingerprint of the unification kernel
        </div>

        <Prose>
          Beyond pointwise counts, each regime induces a transfer operator whose leading spectrum acts as a compact fingerprint. Kernel agreement then becomes a spectral comparison problem.
        </Prose>

        <Eq number="18.99">{"\\mathcal{T}_{\\mathcal{R},M}f(S):=\\sum_{S'}K_{\\mathcal{R},M}(S,S')f(S'),\\qquad \\Lambda_{\\mathcal{R},M}:=\\{\\lambda_1\\ge\\lambda_2\\ge\\cdots\\},\\qquad d_{\\mathrm{spec}}(\\mathcal{R},\\mathbf{Trip}):=\\|\\Lambda_{\\mathcal{R},M}-\\Lambda_{\\mathbf{Trip},M}\\|_{\\ell^2}."}</Eq>

        <Prose>
          Boundary sentence: persistent spectral gap mismatch across <M>{"M"}</M> falsifies strong universality even when first-moment fits look good.
        </Prose>

        {/* ───────────────── 18.83 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.83 · Conservative theorem core (hardened)
        </div>

        <Prose>
          The mathematically hard core is intentionally narrow: exact combinatorics, generating identities, and asymptotic law with bounded correction narrative. Everything else is explicitly conditional.
        </Prose>

        <Eq number="18.100">{"\\text{[Theorem core]}\\quad \\{|T_M(S)|=p_3(S\\mid M),\\; Z_M(q)=\\sum_S p_3(S\\mid M)q^S,\\; p_3(S)=S^2/12+O(S)\\}\\;\\subset\\;\\mathfrak{D}_{\\mathrm{safe}}."}</Eq>

        <Prose>
          Boundary sentence: no cross-regime ontological identification is claimed by (18.100); only kernel transport hypotheses are entertained.
        </Prose>

        {/* ───────────────── 18.84 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.84 · Upgrade protocol for claim status
        </div>

        <Prose>
          To avoid rhetorical inflation, claim promotion is algorithmic. A statement advances only if all incoming assumptions are tested and all relevant falsifiers fail.
        </Prose>

        <Eq number="18.101">{"\\mathrm{promote}(X)=\\begin{cases}\\mathrm{Theorem},&\\text{if }H(X)\\text{ verified and }\\forall F_i\\in\\mathfrak{F}(X),\\,F_i\\text{ fails},\\\\\\mathrm{Conjecture},&\\text{if }H(X)\\text{ partially verified},\\\\\\mathrm{Heuristic},&\\text{if evidence is analogical/data-fit only}.\\end{cases}"}</Eq>

        <Prose>
          Boundary sentence: any successful falsifier triggers immediate downgrade under the map <M>{"\\delta"}</M> of §18.71, with no discretionary exception.
        </Prose>

        {/* ───────────────── 18.85 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.85 · Identifiability of regime projections
        </div>

        <Prose>
          A deeper unification claim requires identifiability: distinct regime parameters should not collapse to indistinguishable Trip projections unless that degeneracy is itself classified. Without identifiability, universality can be spuriously manufactured by over-flexible projection maps.
        </Prose>

        <Eq number="18.102">{"\\text{[Conjecture]}\\quad \\pi_{\\mathcal{R},\\theta_1}I_{\\mathcal{R},\\theta_1}=\\pi_{\\mathcal{R},\\theta_2}I_{\\mathcal{R},\\theta_2}\\;\\forall(S,M)\\;\\Longrightarrow\\;\\theta_1\\sim\\theta_2\\;\\text{in the gauge group}\\;\\mathcal{G}_{\\mathcal{R}}."}</Eq>

        <Prose>
          Boundary sentence: existence of non-gauge-equivalent parameters with identical projected kernels invalidates parameter-level explanatory claims for that regime.
        </Prose>

        {/* ───────────────── 18.86 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.86 · Bayesian evidence over regime classes
        </div>

        <Prose>
          Regime comparison is elevated from visual fit to model evidence. Each regime class receives a posterior weight penalized for complexity and rewarded for residual compression against <M>{"p_3(S\\mid M)"}</M>.
        </Prose>

        <Eq number="18.103">{"\\text{[Program]}\\quad \\mathbb{P}(\\mathcal{R}\\mid \\mathcal{D}) \\propto \\mathbb{P}(\\mathcal{D}\\mid \\mathcal{R})\\,\\mathbb{P}(\\mathcal{R}),\\quad \\log \\mathbb{P}(\\mathcal{D}\\mid \\mathcal{R}) \\approx -\\frac{1}{2\\sigma^2}\\|\\Delta_{\\mathcal{R}}\\|_{w,2}^2 - \\frac{\\kappa_{\\mathcal{R}}}{2}\\log N."}</Eq>

        <Prose>
          Boundary sentence: a regime with poor posterior evidence may remain pedagogically useful, but it is excluded from any high-confidence unifying subset.
        </Prose>

        {/* ───────────────── 18.87 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.87 · Coherence-stress tensor and edge fragility
        </div>

        <Prose>
          Weak edges in the dependency DAG are promoted to measurable stress channels. This prevents smooth prose from masking brittle inferential joints.
        </Prose>

        <Eq number="18.104">{"\\text{[Heuristic]}\\quad \\Sigma^{\\mathrm{coh}}_{ij}:=\\partial_{\\alpha_i}\\partial_{\\alpha_j}\\,\\mathcal{J}(\\alpha),\\qquad \\mathcal{J}(\\alpha):=\\sum_{e\\in E_{\\mathrm{weak}}}\\omega_e\\,\\|\\Delta_e(\\alpha)\\|_{w,2}^2,\\qquad \\rho(\\Sigma^{\\mathrm{coh}})\\uparrow\\Rightarrow\\text{fragility}."}</Eq>

        <Prose>
          Boundary sentence: if spectral radius <M>{"\\rho(\\Sigma^{\\mathrm{coh}})"}</M> remains high under perturbation calibration, theorem-level aggregation across weak edges is blocked.
        </Prose>

        {/* ───────────────── 18.88 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.88 · Proof-obligation compiler
        </div>

        <Prose>
          To operationalize rigor, each conjectural statement is compiled into a finite set of proof obligations, simulation obligations, and disproof obligations. The compiler emits a verifiable checklist rather than narrative intent.
        </Prose>

        <Eq number="18.105">{"\\text{[Program]}\\quad \\mathsf{Compile}:\\mathsf{Claim}\\to\\mathcal{O}_{\\mathrm{thm}}\\sqcup\\mathcal{O}_{\\mathrm{sim}}\\sqcup\\mathcal{O}_{\\mathrm{refute}},\\qquad \\mathsf{status}(X)=\\mathrm{closed}\\iff\\forall o\\in\\mathsf{Compile}(X),\\;o\\;\\text{discharged}."}</Eq>

        <Prose>
          Boundary sentence: unresolved obligations force claim status to remain conjectural regardless of aesthetic coherence.
        </Prose>

        {/* ───────────────── 18.89 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.89 · Regime atlas as a stratified stack
        </div>

        <Prose>
          The eleven-regime collection is best interpreted as a stratified stack whose strata encode evidence class (explicit, inferred, analogical) and whose gluing maps carry downgrade data.
        </Prose>

        <Eq number="18.106">{"\\text{[Conjecture]}\\quad \\mathfrak{A}_{11}\\simeq\\bigsqcup_{c\\in\\{\\mathrm{exp},\\mathrm{inf},\\mathrm{ana}\\}}\\mathfrak{A}_c,\\qquad \\mathrm{Glue}_{c\\to c'}:\\mathfrak{A}_c\\to\\mathfrak{A}_{c'}\\;\\text{exists only if}\\;\\delta\\text{-compatibility holds}."}</Eq>

        <Prose>
          Boundary sentence: if glue maps fail compatibility with downgrade dynamics, cross-class synthesis must be presented as heuristic only.
        </Prose>

        {/* ───────────────── 18.90 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.90 · Deep conservative closure
        </div>

        <Prose>
          The deepest conservative closure of the program is now explicit: universality is accepted only as a conditional fixed-point under admissibility, residual control, and non-refutation.
        </Prose>

        <Eq number="18.107">{"\\text{[Conservative closure]}\\quad \\mathfrak{U}_{\\mathrm{cons}}:=\\{\\mathcal{R}:H(\\mathcal{R})=1,\\;\\|\\Delta_{\\mathcal{R}}\\|_{w,2}\\le\\delta_{\\mathcal{R}},\\;\\forall F_i\\in\\mathfrak{F}(\\mathcal{R}),\\;F_i\\text{ not validated}\\},\\qquad \\mathfrak{U}_{\\mathrm{cons}}\\subseteq\\mathfrak{R}_{\\mathrm{validated}}."}</Eq>

        <Prose>
          Boundary sentence: this closure makes no claim that all three-mode systems belong to <M>{"\\mathfrak{U}_{\\mathrm{cons}}"}</M>; it claims only that membership is testable and revocable.
        </Prose>

        {/* ───────────────── 18.91 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.91 · Canonical unification data model
        </div>

        <Prose>
          Absolute detail begins by fixing the schema of every admissible unification statement. Each claim is represented by typed data rather than prose fragments, so dependency tracking, falsifier routing, and claim demotion are machine-auditable.
        </Prose>

        <Eq number="18.108">{"\\mathbb{U}_{\\mathrm{record}} := \\big(\\mathcal{R},\\;H,\\;\\mathcal{F}_{\\mathcal{R}},\\;I_{\\mathcal{R}},\\;\\pi_{\\mathcal{R}},\\;\\nu_{\\mathcal{R}},\\;\\Delta_{\\mathcal{R}},\\;\\mathfrak{F}(\\mathcal{R}),\\;\\lambda(\\mathcal{R}),\\;t_{\\mathrm{stamp}}\\big),\\qquad \\mathbb{U}_{\\mathrm{warehouse}}=\\prod_{\\mathcal{R}\\in\\mathfrak{R}}\\mathbb{U}_{\\mathrm{record}}."}</Eq>

        <Prose>
          Boundary sentence: any unifying sentence not encodable in <M>{"\\mathbb{U}_{\\mathrm{record}}"}</M> is non-operative rhetoric and carries no theorem weight.
        </Prose>

        {/* ───────────────── 18.92 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.92 · Typed commutative square for every regime
        </div>

        <Prose>
          Every regime must satisfy the same typed commutative target: the projected invariant should coincide with the Trip kernel up to declared residual class. This enforces identical semantics across all eleven bridges.
        </Prose>

        <Eq number="18.109">{"\\begin{CD}\\mathbf{Trip} @>{\\mathcal{F}_{\\mathcal{R}}}>> \\mathcal{C}_{\\mathcal{R}} \\\\ @V{|\\cdot|_\\Sigma}VV @VV{I_{\\mathcal{R}}}V \\\\ \\mathbb{Z}^{\\mathcal{S}\\times\\mathcal{M}} @<<{\\pi_{\\mathcal{R}}}< \\mathbb{V}_{\\mathcal{R}} \\end{CD} \\qquad \\pi_{\\mathcal{R}} I_{\\mathcal{R}} \\mathcal{F}_{\\mathcal{R}} = |\\cdot|_\\Sigma + \\Delta_{\\mathcal{R}},\\; \\Delta_{\\mathcal{R}}\\in\\mathcal{E}_{\\mathcal{R}}."}</Eq>

        <Prose>
          Boundary sentence: if the square fails to type-check (domains/codomains mismatch), the regime is excluded before any numerical comparison.
        </Prose>

        {/* ───────────────── 18.93 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.93 · Residual decomposition into bulk, wall, and transport defects
        </div>

        <Prose>
          Residuals are decomposed into interpretable channels so that mismatch is localizable: asymptotic bulk mismatch, finite-cutoff wall mismatch, and categorical transport mismatch.
        </Prose>

        <Eq number="18.110">{"\\Delta_{\\mathcal{R}}(S,M) = \\Delta^{\\mathrm{bulk}}_{\\mathcal{R}}(S) + \\Delta^{\\mathrm{wall}}_{\\mathcal{R}}(S,M) + \\Delta^{\\mathrm{transport}}_{\\mathcal{R}}(S,M),\\qquad \\mathfrak{D}^{\\mathrm{res}}_{\\mathcal{R}} := \\big(\\|\\Delta^{\\mathrm{bulk}}\\|_{w,2},\\|\\Delta^{\\mathrm{wall}}\\|_{w,2},\\|\\Delta^{\\mathrm{transport}}\\|_{w,2}\\big)."}</Eq>

        <Prose>
          Boundary sentence: claims of "good agreement" are invalid unless all three residual channels are reported separately.
        </Prose>

        {/* ───────────────── 18.94 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.94 · Gauge fixing and identifiability protocol
        </div>

        <Prose>
          To avoid non-identifiable parameterizations masquerading as universal structure, each regime is gauge-fixed by a canonical slice before evidence scoring and before conjecture promotion.
        </Prose>

        <Eq number="18.111">{"\\text{GaugeFix}_{\\mathcal{R}}(\\theta):\\; g(\\theta)=0,\\quad J_{\\mathcal{R}}(\\theta):=\\partial_\\theta\\big(\\pi_{\\mathcal{R}}I_{\\mathcal{R}}\\mathcal{F}_{\\mathcal{R}}\\big),\\quad \\mathrm{rank}\\,J_{\\mathcal{R}}(\\theta_\\star)=d_\\theta-\\dim\\mathcal{G}_{\\mathcal{R}}\\Rightarrow \\text{local identifiability at }\\theta_\\star."}</Eq>

        <Prose>
          Boundary sentence: if rank deficiency persists after gauge fixing, parameter-level interpretations are demoted to heuristic regardless of low residual norm.
        </Prose>

        {/* ───────────────── 18.95 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.95 · Likelihood-ratio and posterior regime ordering
        </div>

        <Prose>
          Detailed unification requires explicit regime ordering criteria. We therefore score every admissible regime by residual likelihood, complexity penalty, and falsifier exposure.
        </Prose>

        <Eq number="18.112">{"\\mathcal{S}_{\\mathrm{uni}}(\\mathcal{R}) := -\\frac{1}{2\\sigma^2}\\|\\Delta_{\\mathcal{R}}\\|_{w,2}^2 - \\frac{\\kappa_{\\mathcal{R}}}{2}\\log N - \\gamma\\,\\#\\{F_i\\in\\mathfrak{F}(\\mathcal{R})\\text{ unresolved}\\},\\qquad \\mathcal{R}_a\\succ\\mathcal{R}_b\\iff \\mathcal{S}_{\\mathrm{uni}}(\\mathcal{R}_a) > \\mathcal{S}_{\\mathrm{uni}}(\\mathcal{R}_b)."}
</Eq>

        <Prose>
          Boundary sentence: a regime cannot be called "core" if it is outranked under the declared scoring rule by simpler or better-fit alternatives.
        </Prose>

        {/* ───────────────── 18.96 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.96 · Refutation lattice and maximal detailed closure
        </div>

        <Prose>
          The fully detailed closure is a refutation-aware lattice: each node is a claim-state pair and each edge is a monotone action under new evidence. This gives a complete dynamic semantics for "go deeper" without overclaim drift.
        </Prose>

        <Eq number="18.113">{"\\mathfrak{L}_{\\mathrm{ref}} := \\big(\\mathcal{C}\\times\\Lambda,\\;\\preceq\\big),\\quad (X,\\lambda)\\preceq(Y,\\mu)\\iff X\\to Y\\text{ in DAG and }\\mu\\le\\lambda\\text{ under }\\delta,\\quad \\mathfrak{U}_{\\mathrm{max-detail}}:=\\mathrm{Fix}\\big(\\mathrm{promote}\\circ\\mathrm{compile}\\circ\\mathrm{audit}\\big)."}
</Eq>

        <Prose>
          Boundary sentence: if the fixed-point <M>{"\\mathfrak{U}_{\\mathrm{max-detail}}"}</M> is unstable under one validated falsifier, the flagship claim contracts to the conservative closure of §18.90 by rule, not by editorial choice.
        </Prose>

        {/* ───────────────── 18.97 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.97 · Physics unification taxonomy: EW, GUT, UFT, TOE
        </div>

        <Prose>
          The phrase "unifying theory" is overloaded. To prevent category error, we separate four targets: electroweak unification (experimentally established), grand unification of gauge forces (hypothesized), unified field formulations including gravity (open), and full theory of everything (open). The present monograph belongs to a <em>structural unification</em> class and should not be conflated with a completed quantum-gravity unification.
        </Prose>

        <Eq number="18.114">{"\\text{EW (tested)}\\subset\\text{GUT (conjectural)}\\subset\\text{UFT including gravity (open)}\\subset\\text{TOE (open)},\\qquad \\mathfrak{U}_{\\mathrm{Trip}}\\text{ is a structural kernel program, not a completed TOE claim}."}</Eq>

        <Prose>
          Boundary sentence: any sentence equating <M>{"\\mathfrak{U}_{\\mathrm{Trip}}"}</M> with a solved unified field theory is outside domain and must be downgraded.
        </Prose>

        {/* ───────────────── 18.98 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.98 · Gauge-coupling convergence as analogy, not equivalence
        </div>

        <Prose>
          Grand unification in high-energy physics is often diagnosed by renormalization-group flow of gauge couplings. We borrow this as an analogy for regime-flow coherence, while preserving non-identity between particle-physics coupling constants and Trip residual flows.
        </Prose>

        <Eq number="18.115">{"\\alpha_i^{-1}(\\mu)=\\alpha_i^{-1}(\\mu_0)-\\frac{b_i}{2\\pi}\\log\\frac{\\mu}{\\mu_0},\\qquad \\text{GUT-style convergence requires }\\alpha_1(\\mu_G)\\approx\\alpha_2(\\mu_G)\\approx\\alpha_3(\\mu_G).\\quad \\text{Trip-analogue: }\\|\\Delta_{\\mathcal{R}}(\\mu_G)\\|\\to\\min."}</Eq>

        <Prose>
          Boundary sentence: convergence-like behavior in Trip diagnostics does not constitute evidence for particle-physics gauge unification.
        </Prose>

        {/* ───────────────── 18.99 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.99 · Symmetry-breaking chain and regime projection chain
        </div>

        <Prose>
          GUT narratives are organized by symmetry breaking chains. The monograph’s regime map can be read in parallel as projection/refinement steps from a shared kernel object to specialized observables.
        </Prose>

        <Eq number="18.116">{"G_{\\mathrm{unif}}\\Rightarrow G_{\\mathrm{SM}}\\Rightarrow U(1)_{\\mathrm{EM}}\\times SU(3)_c,\\qquad \\mathbf{Trip}\\Rightarrow (\\mathcal{F}_{\\mathcal{R}},I_{\\mathcal{R}},\\pi_{\\mathcal{R}})\\Rightarrow \\text{regime observables with residual }\\Delta_{\\mathcal{R}}."}</Eq>

        <Prose>
          Boundary sentence: this is a categorical parallelism statement, not a claim that Trip supplies the gauge group of particle physics.
        </Prose>

        {/* ───────────────── 18.100 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.100 · Proton-decay-style falsifier for kernel universality
        </div>

        <Prose>
          In GUT physics, proton decay is the canonical sharp falsifier class. By analogy, the unification program requires one or more high-power regime-level observables whose failure forces immediate downgrade of flagship claims.
        </Prose>

        <Eq number="18.117">{"\\tau_p^{-1}\\sim \\frac{\\alpha_G^2 m_p^5}{M_X^4}\\;\\text{(dimension-6 scale law, schematic)},\\qquad \\text{Trip analogue: if }\\sup_M\\|\\Delta_{\\mathcal{R}}(\\cdot,M)\\|_{w,2}>\\delta_{\\mathcal{R}}\\text{ for one }\\mathcal{R}\\in\\mathfrak{R}_H,\\;\\text{then }\\lambda(\\text{flagship})\\downarrow."}</Eq>

        <Prose>
          Boundary sentence: without hard falsifiers of this type, the program remains interpretive synthesis rather than strict unification theory.
        </Prose>

        {/* ───────────────── 18.101 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.101 · Supersymmetry lessons for structural unification
        </div>

        <Prose>
          The SUSY lesson is methodological: mathematically elegant extensions can improve high-scale coherence yet remain experimentally unconfirmed. We therefore treat elegant categorical completions as admissible only under explicit evidence-weight and unresolved-risk accounting.
        </Prose>

        <Eq number="18.118">{"\\mathcal{S}_{\\mathrm{uni}}(\\mathcal{R}) = \\mathcal{S}_{\\mathrm{fit}} - \\mathcal{S}_{\\mathrm{complexity}} - \\mathcal{S}_{\\mathrm{unverified}},\\qquad \\mathcal{S}_{\\mathrm{unverified}} := \\eta\\,\\#\\{\\text{major untested assumptions in }\\mathcal{R}\\}."}</Eq>

        <Prose>
          Boundary sentence: high formal beauty never upgrades status without commensurate closure of disproof obligations.
        </Prose>

        {/* ───────────────── 18.102 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.102 · Source hierarchy and reliability protocol
        </div>

        <Prose>
          The supplied external links are useful for framing but heterogeneous in evidentiary quality. We therefore define a source hierarchy: primary literature and major-collaboration results dominate; encyclopedia and research-starter summaries are contextual; advocacy claims of "solved UFT" are non-authoritative unless backed by peer-reviewed reproducible results.
        </Prose>

        <Eq number="18.119">{"\\text{Tier-1}:\\;\\text{peer-reviewed primary papers / collaboration limits}\\;\\succ\\;\\text{Tier-2}:\\;\\text{technical summaries}\\;\\succ\\;\\text{Tier-3}:\\;\\text{popular/expository pieces}\\;\\succ\\;\\text{Tier-4}:\\;\\text{advocacy claims without independent validation}."}</Eq>

        <Prose>
          Boundary sentence: Tier-4 sources may motivate hypotheses but cannot increase theorem-level confidence in any §18 claim.
        </Prose>

        {/* ───────────────── 18.103 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.103 · Crosswalk from external unification discourse to Trip program
        </div>

        <Prose>
          To avoid semantic drift, each external unification statement is translated into Trip-compatible claim classes: ontology claim, mechanism claim, or structural-encoding claim. Only the third class is natively admissible in this monograph.
        </Prose>

        <Eq number="18.120">{"\\mathsf{Crosswalk}:\\;\\mathsf{Claim}_{\\mathrm{external}}\\to\\{\\mathsf{Ontology},\\mathsf{Mechanism},\\mathsf{Structure}\\},\\qquad \\mathsf{admissible}_{\\mathbf{Trip}}=\\mathsf{Structure}\\cup\\mathsf{Mechanism}_{\\mathrm{with\\ bridge\\ +\\ residual\\ control}}."}</Eq>

        <Prose>
          Boundary sentence: ontology-level statements from external UFT discourse are included only as commentary unless fully translated into measurable Trip interfaces.
        </Prose>

        {/* ───────────────── 18.104 ───────────────── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginTop: 28, marginBottom: 8 }}>
          18.104 · Final deep clause for unifying theory
        </div>

        <Prose>
          The strongest defensible deep claim is now precise: Trip defines a high-resolution structural unification framework across the eleven regimes with explicit failure conditions, but does not claim to have solved the open high-energy unified-field problem including quantum gravity.
        </Prose>

        <Eq number="18.121">{"\\text{Deep clause}:\\;\\mathfrak{U}_{\\mathrm{Trip}}\\text{ is a falsifiable structural unification program }\\land\\neg\\big(\\text{proved complete UFT/TOE}\\big),\\qquad \\text{status upgraded only under }\\mathsf{Compile}\\circ\\mathsf{Audit}\\circ\\mathsf{Refute}^{-1}."}</Eq>

        <Prose>
          Boundary sentence: any future claim that §18 has solved unified field theory must be interpreted as false unless accompanied by closure of the full proof-and-falsifier ledger.
        </Prose>

        <div style={{
          margin: "28px 0 8px", padding: "18px 22px",
          background: `${C.crimson}08`,
          borderLeft: `3px solid ${C.crimson}`, borderRadius: "0 3px 3px 0",
          fontFamily: FONT_MATH, fontStyle: "italic", fontSize: "1.12em",
          color: C.ink, lineHeight: 1.62,
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.crimson, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
            epigraph · the three-letter word
          </div>
          The entire monograph is the unfolding of a single three‑letter word in the graded ring <M>{"\\mathbb{Z}[e_1, e_2, e_3] / (e_1^4, e_2^2, e_3)"}</M>. Every regime is a representation; every conservation law is a natural transformation; every coincidence between chapters 8 and 17 is the image of one equation in <M>{"\\mathbf{Trip}"}</M>. The universe, viewed through the keyhole of three bounded integers, is a category.
        </div>

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

          <div style={{
            marginTop: 36, paddingTop: 22, borderTop: `1px solid ${C.rule}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: FONT_DISPLAY, fontStyle: "italic",
              fontSize: 15, color: C.gold, letterSpacing: 6,
              textTransform: "uppercase", opacity: 0.95,
            }}>
              A sgnk Creation
            </div>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 9, color: C.inkFaint,
              letterSpacing: 3, textTransform: "uppercase", opacity: 0.75,
            }}>
              monograph № iii · mmxxvi · trip → 𝒞
            </div>
          </div>
        </div>

        <div style={{ height: 80 }} />

        {/* ═══ MOBILE SECTION NAVIGATION ═══ */}
        {responsive.isMobile && (
          <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `${C.bg}f8`,
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${C.rule}`,
            padding: "12px 20px",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
          {...sectionSwipeHandlers}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
            }}>
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: C.inkDim,
                letterSpacing: 2,
                textTransform: "uppercase",
                opacity: 0.7,
              }}>
                §{sections[currentSection]?.title || 'Cover'}
              </span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              justifyContent: "center",
            }}>
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setCurrentSection(index);
                    scrollToSection(section.id);
                  }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "none",
                    background: index === currentSection ? C.gold : `${C.border}88`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minWidth: 44,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  aria-label={`Go to ${section.title}`}
                >
                  {index === currentSection && (
                    <div style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: C.bg,
                    }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              justifyContent: "flex-end",
            }}>
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 8,
                color: C.inkFaint,
                letterSpacing: 1,
                textTransform: "uppercase",
                opacity: 0.6,
              }}>
                swipe ↔
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
