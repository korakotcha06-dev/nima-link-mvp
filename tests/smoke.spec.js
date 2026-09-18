// เทสแรก — เช็กว่าเว็บเปิดได้ และหน้าที่ต้องล็อกอินเด้งไปหน้าเข้าสู่ระบบจริง
// เทสที่ต้องล็อกอิน (กดปุ่ม AI · เปลี่ยนสถานะ) ทำต่อในสัปดาห์ที่ 9
import { test, expect } from "@playwright/test";

test("ยังไม่ล็อกอิน เปิดหน้าสร้างคำขอแล้วต้องเด้งไปหน้าเข้าสู่ระบบ", async ({ page }) => {
  await page.goto("/new.html");
  await expect(page).toHaveURL(/login\.html/);
  await expect(page.locator("input[type=email]").first()).toBeVisible();
});
