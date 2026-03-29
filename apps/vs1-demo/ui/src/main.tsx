import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <React.Suspense fallback={null}>
            <App />
        </React.Suspense>
    </React.StrictMode>
);