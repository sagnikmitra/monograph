// ─────────────────────────────────────────────────────────────────────────────
// Defensive monkey-patch for Plotly.js
//
// Symptoms this fixes (seen in production console):
//   · "Uncaught Error: DOM element provided is null or undefined"
//     — happens when an effect's cleanup runs while a Plotly chart is still
//       being initialised, or when a `responsive: true` ResizeObserver fires
//       after the host <div> has been unmounted.
//   · "RangeError: Maximum call stack size exceeded" deep inside Plotly's
//       autorange code — happens when chart traces contain Infinity / NaN
//       (e.g. stereographic projections near the projection pole). Plotly's
//       tick computation recurses indefinitely.
//
// We wrap react / relayout / restyle / purge / resize / animate / addTraces
// to (a) early-return on null/undefined targets and (b) sanitize trace data
// to strip non-finite numbers before handing it to Plotly.
// ─────────────────────────────────────────────────────────────────────────────
import Plotly from "plotly.js-dist-min";

const _MAX = 1e6;            // clamp absurdly large coordinates
const _arrayKeys = ["x", "y", "z", "i", "j", "k", "u", "v", "w", "values", "labels", "lat", "lon"];

function _sanitizeNumber(n) {
  if (typeof n !== "number") return n;
  if (!Number.isFinite(n)) return null;
  if (n > _MAX) return _MAX;
  if (n < -_MAX) return -_MAX;
  return n;
}

function _sanitizeArray(arr) {
  if (!Array.isArray(arr)) return arr;
  // Detect 2-D arrays (mesh / surface)
  if (arr.length > 0 && Array.isArray(arr[0])) {
    return arr.map(_sanitizeArray);
  }
  let dirty = false;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (typeof v === "number" && !Number.isFinite(v)) {
      out[i] = null; dirty = true;
    } else if (typeof v === "number" && (v > _MAX || v < -_MAX)) {
      out[i] = _sanitizeNumber(v); dirty = true;
    } else {
      out[i] = v;
    }
  }
  return dirty ? out : arr;
}

function _sanitizeTraces(traces) {
  if (!Array.isArray(traces)) return traces;
  for (const t of traces) {
    if (!t || typeof t !== "object") continue;
    for (const k of _arrayKeys) {
      if (t[k] != null) t[k] = _sanitizeArray(t[k]);
    }
  }
  return traces;
}

function _validTarget(el) {
  // Plotly accepts a string id, an HTMLElement, or an object with `_fullLayout`
  if (el == null) return false;
  if (typeof el === "string") return !!document.getElementById(el);
  // Detached nodes still have nodeType but no parent
  if (typeof el === "object" && el.nodeType === 1) {
    return el.isConnected !== false; // jsdom can be undefined
  }
  return false;
}

function _wrap(name, sanitizesArg2) {
  const orig = Plotly[name];
  if (typeof orig !== "function" || orig.__safe) return;
  const wrapped = function (el, ...rest) {
    if (!_validTarget(el)) return Promise.resolve(null);
    if (sanitizesArg2 && rest[0]) {
      try { rest[0] = _sanitizeTraces(rest[0]); } catch { /* leave alone */ }
    }
    try {
      return orig.call(Plotly, el, ...rest);
    } catch (err) {
      // Swallow Plotly errors so a bad chart doesn't tear down the page.
      // Real errors still surface in dev tools via console.warn.
      // eslint-disable-next-line no-console
      console.warn(`[plotlySafe] ${name} threw — chart skipped:`, err && err.message);
      return Promise.resolve(null);
    }
  };
  wrapped.__safe = true;
  Plotly[name] = wrapped;
}

_wrap("react",     true);
_wrap("newPlot",   true);
_wrap("addTraces", true);
_wrap("restyle",   false);
_wrap("relayout",  false);
_wrap("update",    false);
_wrap("animate",   false);
_wrap("purge",     false);
_wrap("Plots", false); // no-op: Plots is an object, _wrap will see it isn't a function and bail

export default Plotly;
