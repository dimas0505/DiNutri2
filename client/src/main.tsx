import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { addTouchClass } from "./utils/mobile";
import { registerServiceWorker } from "./hooks/use-pwa";

// Initialize mobile optimizations
addTouchClass();

// Register service worker for PWA functionality
// Registra em qualquer ambiente que não seja desenvolvimento local (localhost)
if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(<App />);
