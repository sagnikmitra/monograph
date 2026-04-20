import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Apply the defensive Plotly wrapper BEFORE any chart code runs.
import "./plotlySafe";
import "katex/dist/katex.min.css";
import "./style.css";

// Route-level code splitting: each page (Monograph / UnifiedTheory) pulls in
// ~MBs of Plotly traces and gallery code. Lazy-loading them means visiting
// "/" no longer downloads "/unified" and vice-versa, cutting the initial JS
// payload roughly in half.
const Monograph = lazy(() => import("./Monograph"));
const UnifiedTheory = lazy(() => import("./UnifiedTheory"));

import { PageLoader } from "./Loader";

function RouteFallback() {
  return <PageLoader label="Loading compendium" />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Monograph />} />
          <Route path="/unified" element={<UnifiedTheory />} />
          <Route path="/unified-theory" element={<UnifiedTheory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
