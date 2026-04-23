// useInView — minimal IntersectionObserver hook used to defer Plotly
// initialisation until the chart's host <div> is actually near the viewport.
// Without this, ~40 chart effects fire at first render, exhaust the browser's
// WebGL context cap (~16 in Chrome), and the losers end up as blank white
// rectangles with a broken-image icon (Plotly's placeholder logo).
import { useEffect, useState } from "react";

export default function useInView(
  ref,
  { rootMargin = "1200px 0px 1200px 0px", once = true } = {}
) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) return;
          } else if (!once) {
            setInView(false);
            return;
          }
          if (once && e.isIntersecting) {
            return;
          }
        }
      },
      { rootMargin, threshold: 0 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}
