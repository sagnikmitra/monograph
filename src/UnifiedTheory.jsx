import React from "react";

const C = {
  bg: "#070b17",
  bgDeep: "#040710",
  panel: "#0d1324",
  panelAlt: "#121b30",
  border: "#1e2a44",
  rule: "#2a3454",
  ink: "#e8dfc7",
  inkDim: "#a89c82",
  gold: "#d4a574",
  teal: "#5fa8a8",
  indigo: "#7a8fd4",
  crimson: "#c45050",
};

const FONT_MATH = "'EB Garamond', Georgia, serif";
const FONT_DISPLAY = "'EB Garamond', Georgia, serif";
const FONT_MONO = "'JetBrains Mono', Menlo, monospace";

function Block({ title, number, tone = C.gold, children }) {
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: 3,
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: tone,
          marginBottom: 8,
        }}
      >
        {number} · {title}
      </div>
      <div style={{ fontFamily: FONT_MATH, color: C.ink, fontSize: 20, lineHeight: 1.55 }}>
        {children}
      </div>
    </section>
  );
}

function Eq({ children }) {
  return (
    <div
      style={{
        fontFamily: FONT_MATH,
        fontStyle: "italic",
        color: C.gold,
        fontSize: 25,
        lineHeight: 1.35,
        margin: "10px 0 8px",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

export default function UnifiedTheory() {
  const gotoMain = () => {
    window.location.href = "/";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse at 10% 0%, ${C.gold}18 0%, transparent 55%),
          radial-gradient(ellipse at 90% 100%, ${C.indigo}16 0%, transparent 55%),
          linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 100%)
        `,
        color: C.ink,
        padding: "28px 20px 72px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              color: C.gold,
              letterSpacing: 3,
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            Unified Theory Dossier
          </div>
          <button
            onClick={gotoMain}
            style={{
              background: "transparent",
              color: C.inkDim,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: 1,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Back to Monograph
          </button>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(44px, 8vw, 76px)",
            lineHeight: 1.02,
            letterSpacing: -1.1,
            color: C.ink,
          }}
        >
          Unified Theory Page
        </h1>
        <div
          style={{
            fontFamily: FONT_MATH,
            fontStyle: "italic",
            color: C.inkDim,
            fontSize: 24,
            margin: "8px 0 18px",
          }}
        >
          strict architecture for the Trip kernel program
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            ["Core invariant", "p3(S|M)"],
            ["Generating series", "Z_M(q)"],
            ["Asymptotic spine", "S^2/12"],
            ["Regime ambition", "11 mappings"],
          ].map(([k, v], i) => (
            <div
              key={k}
              style={{
                background: C.panelAlt,
                border: `1px solid ${C.border}`,
                borderLeft: `2px solid ${[C.gold, C.teal, C.indigo, C.crimson][i]}`,
                borderRadius: 3,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.inkDim, letterSpacing: 1.6, textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontFamily: FONT_MATH, fontStyle: "italic", color: C.ink, fontSize: 22, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        <Block title="Domain and Kernel" number="U.1" tone={C.gold}>
          The base object remains the bounded ordered simplex:
          <Eq>T_M = {"{(x,y,z) in Z^3 : 1 <= x <= y <= z <= M}"}</Eq>
          The fiber cardinality defines the kernel:
          <Eq>|T_M(S)| = p_3(S | M),  Z_M(q) = sum_S p_3(S | M) q^S</Eq>
          Every downstream framework is admissible only if it exposes a typed map back to this kernel.
        </Block>

        <Block title="Layered Truth Protocol" number="U.2" tone={C.teal}>
          We separate claims into four layers: definitions, safe propositions, intermediate conjectures, and flagship unification.
          <Eq>{"L1 -> L2 -> L3 -> L4, with no promotion without discharged obligations"}</Eq>
          This page is intentionally strict: elegance never outranks closure of falsification tests.
        </Block>

        <Block title="Hypothesis Stack and Admissibility" number="U.3" tone={C.indigo}>
          Regimes are admitted only under a predicate stack H = H1 /\ ... /\ H8 (graded boundedness, conservation compatibility, finite multiplicity, projection definability, normalization stability, residual measurability, transport naturality, falsifier executability).
          <Eq>R in Reg_H  iff  H(R) = 1</Eq>
          Any theorem-level statement is conditional on H unless explicitly marked otherwise.
        </Block>

        <Block title="Residual Calculus" number="U.4" tone={C.crimson}>
          Regime mismatch is measured, not narrated:
          <Eq>Delta_R(S,M) = pi_R I_R F_R(T_M)(S) - p_3(S | M)</Eq>
          <Eq>{"||Delta_R||^2_(w,2) = sum_M sum_S w_(S,M) Delta_R(S,M)^2"}</Eq>
          Residuals are decomposed into bulk, wall, and transport components for diagnosis and targeted refutation.
        </Block>

        <Block title="Flagship Claim in Conservative Form" number="U.5" tone={C.gold}>
          The strongest defensible statement is conditional unification:
          <Eq>{"forall R in Reg_H, pi_R I_R F_R(T_M) = p_3 + epsilon_R, ||epsilon_R|| <= delta_R"}</Eq>
          This is a structural-unification claim. It is not a completed particle-physics UFT/TOE claim.
        </Block>

        <Block title="Physics Crosswalk (EW/GUT/UFT/TOE)" number="U.6" tone={C.teal}>
          We map language carefully:
          <Eq>EW (tested) subset GUT (conjectural) subset UFT+gravity (open) subset TOE (open)</Eq>
          Trip unification belongs to a structural class with explicit interfaces and falsifiers. It should not be stated as "unified field theory solved."
        </Block>

        <Block title="Disproof Protocol" number="U.7" tone={C.indigo}>
          One validated counterexample is sufficient to demote claims:
          <Eq>{"delta : {Theorem, Conjecture, Heuristic, Program} x F_tests -> {Retracted, Conjecture, Heuristic, Program}"}</Eq>
          The system is Popperian by construction: failed tests trigger automatic downgrade, not discretionary editorial softening.
        </Block>

        <Block title="Research Queue and Promotion Logic" number="U.8" tone={C.crimson}>
          Claims advance only through a three-track queue:
          <Eq>Q = Q_proof sqcup Q_simulation sqcup Q_counterexample</Eq>
          <Eq>promote(X) = Theorem  iff  all obligations from Compile(X) are closed</Eq>
          This ensures that "more detail" increases accountability, not just narrative volume.
        </Block>

        <Block title="Britannica Deepening I: Field-Theory Lineage" number="U.9" tone={C.gold}>
          The uploaded Britannica PDF motivates a strict lineage: Maxwell unifies electric and magnetic fields, Einstein geometrizes gravity, quantum electrodynamics quantizes electromagnetic interactions, electroweak unification merges weak and electromagnetic sectors, and QCD completes the Standard Model gauge structure.
          <Eq>{"U(1)_EM + SU(2)_L -> SU(2)_L x U(1)_Y (EW framework), with SU(3)_c added for QCD completeness"}</Eq>
          In this page's language, that history is treated as a sequence of increasingly constrained symmetry organizations, not a license to overstate completed ultimate unification.
        </Block>

        <Block title="Britannica Deepening II: GUT Diagnostics and Proton Decay Logic" number="U.10" tone={C.teal}>
          The PDF emphasizes the classic GUT diagnostic: if quarks and leptons are placed in unified multiplets, baryon-number violating channels appear and proton decay becomes a direct falsifier channel.
          <Eq>{"tau_p^-1 ~ alpha_G^2 * m_p^5 / M_X^4  (schematic dimension-6 scaling)"}</Eq>
          This is the template for this monograph's hard falsifier philosophy: flagship claims must expose at least one observable whose failure forces downgrade.
        </Block>

        <Block title="Britannica Deepening III: Coupling Convergence and High-Energy Extrapolation" number="U.11" tone={C.indigo}>
          The PDF notes that force strengths can trend toward convergence at high energies, but exact meeting depends on model details and potential beyond-Standard-Model structure.
          <Eq>{"alpha_i^-1(mu) = alpha_i^-1(mu0) - (b_i/2pi) log(mu/mu0),   i in {1,2,3}"}</Eq>
          Here this becomes a methodological warning: extrapolative coherence is suggestive evidence, never theorem status without independent hard tests.
        </Block>

        <Block title="Britannica Deepening IV: Gravity Gap and Non-Completion Clause" number="U.12" tone={C.crimson}>
          The PDF is explicit that a successful gauge unification still leaves quantum gravity unresolved. This maps directly to our scope guard: structural kernel unification is not equivalent to a solved unified field theory including gravity.
          <Eq>{"GUT success != quantum gravity completion,   hence != full UFT/TOE closure"}</Eq>
          This clause is now a hard boundary in the page's logic: completed UFT language is disallowed unless gravity is brought into a validated quantum framework.
        </Block>

        <Block title="Britannica Deepening V: Quantum Foundations as Unification Constraints" number="U.13" tone={C.gold}>
          The PDF's quantum-mechanics material provides operational constraints for any unification architecture: quantization scale, wave-particle duality, probabilistic interpretation, and transition rules.
          <Eq>{"E = h nu,   lambda = h/p,   i hbar dPsi/dt = H Psi,   P(x) = |Psi(x)|^2"}</Eq>
          For this monograph, these serve as admissibility filters on regime mappings: any proposed bridge conflicting with these foundations is rejected before fitting exercises.
        </Block>

        <Block title="Britannica Deepening VI: Tunneling, Selection Rules, and Observable Channels" number="U.14" tone={C.teal}>
          The PDF highlights tunneling and transition selection structure as concrete mechanisms turning abstract quantum statements into measurable rates. We use the same pattern for unification: no mechanism, no claim.
          <Eq>{"Gamma_{i->f} proportional to |<f|V|i>|^2,   with selection constraints and barrier factors exp(- integral kappa dx)"}</Eq>
          This directly supports the page's refutation-first protocol: every high-level synthesis statement must reduce to at least one measurable transition channel.
        </Block>

        <Block title="Britannica Constraint Capsule (Direct URL Integration)" number="U.15" tone={C.indigo}>
          Directly from Britannica's unified-field-theory article: (i) electroweak unification is established, (ii) QCD extends the gauge description, (iii) GUT-style force convergence is high-energy and model-dependent, (iv) proton decay is a decisive discriminator, and (v) even successful GUT frameworks do not by themselves quantize gravity.
          <Eq>{"tau_p (simple GUT expectation) ~ 10^32 years (historical scale),   observed limits require longer lifetimes,   and gravity remains outside validated gauge unification closure"}</Eq>
          Source note: https://www.britannica.com/science/unified-field-theory. In this dossier, these are encoded as constraints, not promotional claims.
        </Block>

        <div
          style={{
            marginTop: 16,
            padding: "16px 18px",
            background: `${C.crimson}12`,
            borderLeft: `3px solid ${C.crimson}`,
            borderRadius: "0 3px 3px 0",
            fontFamily: FONT_MATH,
            fontStyle: "italic",
            color: C.ink,
            lineHeight: 1.6,
            fontSize: 21,
          }}
        >
          Deep clause: this page treats unification as a falsifiable, typed structural program with explicit residual calculus and downgrade rules. It does not assert a solved fundamental unified field theory.
        </div>
      </div>
    </div>
  );
}
