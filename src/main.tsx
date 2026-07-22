import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<App />);

// Register the app-shell service worker after the first paint. The wrapper
// itself decides whether registration should actually happen (production only,
// never inside Lovable preview iframes / preview hosts / with `?sw=off`).
registerServiceWorker();
