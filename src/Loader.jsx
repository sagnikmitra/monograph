// ─────────────────────────────────────────────────────────────────────────────
// Shared loading indicators used by route-level Suspense, lazy gallery
// Suspense, and LazyMount placeholders. Replaces the previous "blank dark
// rectangle" experience with an animated, on-brand spinner so the reader
// always sees that something is in flight.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

const KEYFRAMES = `
@keyframes lvSpin { to { transform: rotate(360deg); } }
@keyframes lvPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes lvShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("lv-loader-keyframes")) return;
  const s = document.createElement("style");
  s.id = "lv-loader-keyframes";
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

function Spinner({ size = 28, color = "#c9b88a" }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        animation: "lvSpin 0.9s linear infinite",
      }}
    />
  );
}

function Dots({ color = "#c9b88a" }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            animation: `lvPulse 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

// Full-screen route loader (used by main.jsx Suspense boundary).
export function PageLoader({ label = "Loading compendium" }) {
  useEffect(ensureKeyframes, []);
  const [dots, setDots] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 380);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        background: "#0a0d14",
        color: "#c9b88a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <Spinner size={42} />
      <div
        style={{
          fontSize: 11,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        {label}
        <span style={{ display: "inline-block", width: "1.2em", textAlign: "left" }}>{dots}</span>
      </div>
    </div>
  );
}

// In-flow section loader for lazy galleries / LazyMount placeholders.
export function SectionLoader({
  minHeight = 540,
  label = "Rendering figures",
  variant = "default",
}) {
  useEffect(ensureKeyframes, []);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight,
        margin: "16px 0",
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background:
          "linear-gradient(90deg, rgba(201,184,138,0.04) 0%, rgba(201,184,138,0.10) 50%, rgba(201,184,138,0.04) 100%)",
        backgroundSize: "200% 100%",
        animation: "lvShimmer 2.4s linear infinite",
        borderLeft: "2px solid rgba(201,184,138,0.45)",
        borderRadius: 2,
        color: "#c9b88a",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <Spinner size={variant === "small" ? 22 : 30} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 10,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        <span>{label}</span>
        <Dots />
      </div>
    </div>
  );
}

export default SectionLoader;
