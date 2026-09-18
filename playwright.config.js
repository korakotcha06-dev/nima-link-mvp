// ตั้งค่า Playwright — ทดสอบกับเว็บจริงที่อยู่บน Firebase Hosting
// อยากทดสอบในเครื่องแทน: BASE_URL=http://localhost:8000 npm test
// (ต้องเปิด python3 -m http.server 8000 ไว้อีกหน้าต่างก่อน)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "https://nima-link-mvp.web.app",
    locale: "th-TH",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
