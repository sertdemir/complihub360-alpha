import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";
import "./i18n/config";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        {/* prefers-reduced-motion wurde von 26 whileInView-Reveals ignoriert; nur
            2 von 40 Dateien fragten useReducedMotion selbst ab. reducedMotion="user"
            gilt global fuer JEDE motion-Komponente: framer-motion laesst dann
            Transform- und Layout-Animationen weg und behaelt nur Opacity — genau
            die Trennung, auf die es ankommt, denn Bewegung loest vestibulaere
            Beschwerden aus, ein Einblenden nicht. Eine Zeile statt 38 Dateien. */}
        <MotionConfig reducedMotion="user">
            <React.Suspense fallback={null}>
                <App />
            </React.Suspense>
        </MotionConfig>
    </React.StrictMode>
);