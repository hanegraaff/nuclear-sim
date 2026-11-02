import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-500.css";
import "@fontsource/geist-sans/latin-700.css";
import "@fontsource/geist-mono/latin-400.css";
import "@fontsource/geist-mono/latin-700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { App } from "./ui/App";
import "./ui/styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("The application root element is missing.");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
