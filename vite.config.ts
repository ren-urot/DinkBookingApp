import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/** Loud build warning while placeholder payment accounts are still configured. */
function samplePaymentWarning(): Plugin {
  return {
    name: "sample-payment-warning",
    apply: "build",
    buildStart() {
      const source = fs.readFileSync(path.resolve(__dirname, "src/config/payment.ts"), "utf8");
      if (/isSample:\s*true/.test(source)) {
        this.warn(
          "\n\n  !!! src/config/payment.ts still uses SAMPLE payment accounts (isSample: true).\n" +
            "  !!! Customers will see a 'do not send money' warning. Replace the details and set isSample: false before going live.\n",
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    samplePaymentWarning(),
    VitePWA({
      // "prompt": never reload by itself mid-booking; the app offers a Reload button instead.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png", "favicon.ico", "courts/*.svg", "courts/*.jpg", "gcash-qr.svg"],
      manifest: {
        name: "Dink District Pickleball - Court Booking",
        short_name: "Dink District",
        description: "Reserve a pickleball court in minutes. No account needed.",
        theme_color: "#1b7a43",
        background_color: "#f9fbf7",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Only static assets are precached. Booking/receipt submissions go to
        // the external service over the network and are never cached.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
