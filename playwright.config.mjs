import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run dev -- --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
    },
    {
      command: "npm run dev -- --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: "https://browser-test.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "browser-test-public-key",
      },
    },
  ],
});
