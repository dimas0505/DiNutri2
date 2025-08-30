import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { addTouchClass } from "./utils/mobile";
import { registerServiceWorker } from "./hooks/use-pwa";

// Initialize mobile optimizations
addTouchClass();

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(<App />);
