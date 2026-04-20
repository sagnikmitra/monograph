// ─────────────────────────────────────────────────────────────────────────────
// <LazyMount> — only mounts children when scrolled near the viewport, and
// unmounts them when they scroll far away. Used to keep the total number of
// live WebGL contexts on /unified below the browser cap (~16 in Chrome).
//
// Without this, dozens of Plotly 3D plots try to live simultaneously and the
// oldest contexts get evicted, producing "gl-shader: Error compiling shader:
// null" runtime errors and blank chart areas.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { SectionLoader } from "./Loader";

export default function LazyMount({
  children,
  minHeight = 540,
  rootMargin = "1200px 0px 1200px 0px",
  unmountMargin = "2400px 0px 2400px 0px",
  loaderLabel = "Rendering figures",
  showLoader = true,
}) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const node = ref.current;
    const mountObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMounted(true);
            return;
          }
        }
      },
      { rootMargin, threshold: 0 }
    );
    const unmountObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) setMounted(false);
        }
      },
      { rootMargin: unmountMargin, threshold: 0 }
    );
    mountObs.observe(node);
    unmountObs.observe(node);
    return () => {
      mountObs.disconnect();
      unmountObs.disconnect();
    };
  }, [rootMargin, unmountMargin]);

  return (
    <div ref={ref} style={{ minHeight: mounted ? undefined : minHeight }}>
      {mounted ? children : showLoader ? <SectionLoader minHeight={minHeight} label={loaderLabel} /> : null}
    </div>
  );
}
