import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wrap for the ADHD planner.
// To build native shells locally after `git clone`:
//   bun install && bun run build
//   npx cap add ios && npx cap add android
//   npx cap sync
// The preview-server URL lets the native app hot-reload from the Lovable preview.
const config: CapacitorConfig = {
  appId: "app.lovable.adhd_planner",
  appName: "Calm Planner",
  webDir: "dist",
  server: {
    url: "https://id-preview--71b7c1a9-b372-485b-bef6-8eceed2d9e79.lovable.app",
    cleartext: true,
  },
  backgroundColor: "#1a1a2e",
};

export default config;
