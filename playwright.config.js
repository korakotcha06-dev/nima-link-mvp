// ตั้งค่า Playwright — ทดสอบกับเว็บจริงที่อยู่บน Firebase Hosting
// อยากทดสอบในเครื่องแทน: BASE_URL=http://localhost:8000 npm test
// (ต้องเปิด python3 -m http.server 8000 ไว้อีกหน้าต่างก่อน — หรือปล่อยให้ webServer ด้านล่างเปิดให้เองก็ได้)
//
// เทสในโปรเจกต์นี้ยิงเข้า Firebase ของจริง (ไม่มี emulator) — ทั้งสองโหมด (local / prod URL)
// คุยกับ Firebase backend เดียวกัน ต่างกันแค่ไฟล์ static ถูกเสิร์ฟจากไหน
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "https://nima-link-mvp.web.app";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "th-TH",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // ถ้า BASE_URL ชี้ไป localhost ให้ Playwright เปิด python3 -m http.server ให้เอง
  // (reuseExistingServer: true — ถ้ามีเซิร์ฟเวอร์เปิดอยู่แล้วจากคำสั่งอื่นก็ใช้ตัวนั้นต่อได้เลย ไม่ error)
  webServer: isLocal
    ? {
        command: "python3 -m http.server 8000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 10_000,
      }
    : undefined,
});
