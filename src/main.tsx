import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const UPDATE_CHECK_MS = 30 * 60 * 1000;

// New versions activate on their own (see vite.config.ts) and are used from the
// next page load, so nobody gets stuck on an old copy and nothing reloads mid-booking.
// Tabs left open for a long time also check for updates every 30 minutes.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_MS);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
