import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// Ask before applying an update so an in-progress booking is never wiped by a reload.
const updateSW = registerSW({
  onNeedRefresh() {
    toast("A new version of the site is available.", {
      duration: Infinity,
      action: { label: "Reload", onClick: () => updateSW(true) },
    });
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
