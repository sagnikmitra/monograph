import React from "react";
import ReactDOM from "react-dom/client";
import Monograph from "./Monograph";
import UnifiedTheory from "./UnifiedTheory";
import "./style.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const unifiedPaths = new Set(["/unified", "/unified-theory"]);
const Page = unifiedPaths.has(path) ? UnifiedTheory : Monograph;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
