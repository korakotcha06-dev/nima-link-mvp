// ไฟล์ที่ 1 — ACL ผ่านหน้าจอ
// เดินผ่าน UI จริงเหมือนผู้ใช้จริง ยืนยันสิ่งที่ "ผู้ใช้เห็น" ตรงกับตารางสิทธิ์ใน ACL.md
// เทสถูกเขียนจากตาราง ACL.md ไม่ใช่จากการอ่านโค้ดของ index.html / new.html / detail.html —
// เทสไฟล์นี้เป็นด่านตรวจอิสระของฝั่งหน้าจอ ต้องผ่านตั้งแต่ตอนนี้ (ไม่ต้องรอ security rules ใหม่)
import { test, expect } from "@playwright/test";
import { ACCOUNTS, loginOrSignup, logout } from "./helpers.js";

test.describe("ยังไม่ล็อกอิน — ต้องเด้งไปหน้าเข้าสู่ระบบ", () => {
  // เทสเดิมจากสัปดาห์ที่แล้ว — เก็บไว้ตามเดิม
  test("ยังไม่ล็อกอิน เปิดหน้าสร้างคำขอแล้วต้องเด้งไปหน้าเข้าสู่ระบบ", async ({ page }) => {
    await page.goto("/new.html");
    await expect(page).toHaveURL(/login\.html/);
    await expect(page.locator("input[type=email]").first()).toBeVisible();
  });

  test("ยังไม่ล็อกอิน เปิดหน้ารายการคำขอแล้วต้องเด้งไปหน้าเข้าสู่ระบบ", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page).toHaveURL(/login\.html/);
    await expect(page.locator("input[type=email]").first()).toBeVisible();
  });

  test("ยังไม่ล็อกอิน เปิดหน้ารายละเอียดคำขอแล้วต้องเด้งไปหน้าเข้าสู่ระบบ (จำที่เดิมไว้ด้วย next=)", async ({
    page,
  }) => {
    await page.goto("/detail.html?id=r001");
    await expect(page).toHaveURL(/login\.html\?next=/);
    await expect(page.locator("input[type=email]").first()).toBeVisible();
  });
});

test.describe("rep เปิดหน้าสร้างคำขอ — สร้างไม่ได้", () => {
  test("rep เห็นข้อความปฏิเสธ ฟอร์มสร้างคำขอไม่โผล่ให้ใช้", async ({ page }) => {
    await loginOrSignup(page, ACCOUNTS.repOtc);

    await page.goto("/new.html");
    await expect(page.getByText("ไม่มีสิทธิ์เข้าหน้านี้")).toBeVisible();
    await expect(page.getByText("หน้านี้สำหรับร้านยา / คลินิก เท่านั้น")).toBeVisible();

    // ฟอร์มสร้างคำขอต้องไม่โผล่มาให้กรอกเลย (เช็คว่า "มองไม่เห็น" ไม่ใช่แค่ "ไม่อยู่ใน DOM" —
    // โปรเจกต์นี้เคยเจอ element ที่ยังอยู่ใน DOM แต่ถูกซ่อนด้วย hidden/CSS มาก่อน ดู CLAUDE.md)
    await expect(page.getByRole("combobox", { name: "รายการยาที่ต้องการ" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "ส่งคำขอ" })).not.toBeVisible();

    await logout(page);
  });
});

// เดินเรื่องคำขอหนึ่งใบตั้งแต่สร้างจนกว่าผู้แทนรับ — ทดสอบสิทธิ์ทุกจุดที่ ACL.md พูดถึงบนคำขอใบเดียวกัน
// ทำเป็น serial เพราะเทสถัดไปต้องใช้ id ของคำขอที่เทสก่อนหน้าสร้างไว้
test.describe.serial("เดินเรื่องคำขอหนึ่งใบ — สร้าง → ดู → รับ", () => {
  let requestId;
  const NOTE = `E2E-เทสสิทธิ์ ${Date.now()}`;

  test("buyer สร้างคำขอได้ผ่านฟอร์มจริง แล้วได้สถานะ รอผู้แทนรับ", async ({ page }) => {
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    await page.goto("/new.html");
    await page.getByRole("textbox", { name: "รายละเอียดเพิ่มเติม" }).fill(NOTE);
    await page.getByRole("button", { name: "ส่งคำขอ" }).click();
    await page.waitForURL(/index\.html/);

    const row = page.getByRole("link", { name: new RegExp(NOTE) });
    await expect(row).toBeVisible();
    await expect(row).toContainText("รอผู้แทนรับ");

    await row.click();
    await page.waitForURL(/detail\.html\?id=/);
    requestId = new URL(page.url()).searchParams.get("id");
    expect(requestId, "ต้องอ่าน id ของคำขอที่เพิ่งสร้างจาก URL ได้").toBeTruthy();
    await expect(page.getByText("รอผู้แทนรับ").first()).toBeVisible();

    await logout(page);
  });

  test("buyer เปิดคำขอของตัวเอง ไม่เห็นปุ่มรับ/ปฏิเสธ (อนุมัติของตัวเองไม่ได้)", async ({ page }) => {
    test.skip(!requestId, "ต้องมี requestId จากเทสก่อนหน้าในไฟล์นี้");
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    await page.goto(`/detail.html?id=${requestId}`);
    await expect(page.getByText("คุณอนุมัติคำขอของตัวเองไม่ได้")).toBeVisible();
    await expect(page.getByRole("button", { name: "รับคำขอ" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "ปฏิเสธ" })).not.toBeVisible();

    await logout(page);
  });

  test("buyer ร้านอื่นเปิดคำขอนี้ไม่ได้ — เห็นข้อความปฏิเสธ", async ({ page }) => {
    test.skip(!requestId, "ต้องมี requestId จากเทสก่อนหน้าในไฟล์นี้");
    await loginOrSignup(page, ACCOUNTS.buyerOtc2);

    await page.goto(`/detail.html?id=${requestId}`);
    // รับได้ทั้งสองข้อความ เพราะมีด่านปฏิเสธสองชั้นและชั้นไหนตอบก่อนก็ถูกต้องทั้งคู่:
    //   · กฎฝั่งฐานข้อมูลปฏิเสธการอ่าน → "คุณไม่มีสิทธิ์ดูคำขอใบนี้" (ข้อความกลาง ไม่บอกใบ้ว่าใบนี้เป็นของใคร)
    //   · โค้ดฝั่งหน้าเว็บเช็คความเป็นเจ้าของ → "คำขอใบนี้เป็นของร้านอื่น ..."
    // สิ่งที่ต้องพิสูจน์คือ "ต้องถูกปฏิเสธและต้องไม่เห็นรายละเอียด" ไม่ใช่ถ้อยคำ
    await expect(page.getByText(/ไม่มีสิทธิ์ดู/)).toBeVisible();
    // ต้องไม่เห็นรายละเอียดคำขอเลย (มองไม่เห็น — ไม่ได้เช็คว่าหายไปจาก DOM เพราะโปรเจกต์นี้ใช้ hidden/CSS ซ่อน ไม่ได้ลบทิ้ง)
    await expect(page.getByText("รายการยา")).not.toBeVisible();

    await logout(page);
  });

  test("rep ต่างช่องทาง (MC ดูของ OTC) เปิดคำขอนี้ไม่ได้ — เห็นข้อความปฏิเสธ", async ({ page }) => {
    test.skip(!requestId, "ต้องมี requestId จากเทสก่อนหน้าในไฟล์นี้");
    await loginOrSignup(page, ACCOUNTS.repMc);

    await page.goto(`/detail.html?id=${requestId}`);
    // ด่านปฏิเสธสองชั้นเหมือนเคสร้านอื่น — กฎฐานข้อมูลตอบก่อนก็ได้ข้อความกลาง
    // โค้ดหน้าเว็บตอบก่อนก็ได้ข้อความที่ระบุช่องทาง ถูกต้องทั้งคู่
    await expect(page.getByText(/คนละช่องทางกับคุณ|ไม่มีสิทธิ์ดู/)).toBeVisible();
    await expect(page.getByRole("button", { name: "รับคำขอ" })).not.toBeVisible();
    // และต้องไม่หลุดรายละเอียดคำขอออกมาให้เห็นด้วย
    await expect(page.getByText("รายการยา")).not.toBeVisible();

    await logout(page);
  });

  test("rep ช่องทางเดียวกัน เห็นแค่เขต (ไม่เห็นชื่อร้าน) จนกว่าจะกดรับ — กดรับแล้วชื่อร้านเปิดเผยและกดซ้ำไม่ได้", async ({
    page,
  }) => {
    test.skip(!requestId, "ต้องมี requestId จากเทสก่อนหน้าในไฟล์นี้");
    await loginOrSignup(page, ACCOUNTS.repOtc);

    await page.goto(`/detail.html?id=${requestId}`);

    // ก่อนกดรับ — ต้องเห็นแค่เขต ไม่เห็นชื่อร้าน
    await expect(page.getByText("ยังไม่เปิดเผยชื่อ")).toBeVisible();
    await expect(page.getByText(ACCOUNTS.buyerOtc.name, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "รับคำขอ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ปฏิเสธ" })).toBeVisible();

    await page.getByRole("button", { name: "รับคำขอ" }).click();

    // หลังกดรับ — ชื่อร้านต้องเปิดเผย และปุ่มรับ/ปฏิเสธต้องหายไป (กดซ้ำไม่ได้)
    await expect(page.getByText(ACCOUNTS.buyerOtc.name, { exact: true })).toBeVisible();
    await expect(page.getByText("รับแล้ว").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "รับคำขอ" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "ปฏิเสธ" })).not.toBeVisible();
    await expect(page.getByText("เปลี่ยนสถานะซ้ำไม่ได้")).toBeVisible();

    await logout(page);
  });

  test("buyer ลบคำขอของตัวเองได้ — ต้องมีกล่องยืนยันก่อนลบทุกครั้ง", async ({ page }) => {
    test.skip(!requestId, "ต้องมี requestId จากเทสก่อนหน้าในไฟล์นี้");
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    await page.goto(`/detail.html?id=${requestId}`);
    const deleteBtn = page.getByRole("button", { name: "ลบคำขอนี้" });
    await expect(deleteBtn).toBeVisible();

    // กดลบครั้งแรก — ต้องเจอกล่องยืนยันก่อน ไม่ใช่ลบทันที
    await deleteBtn.click();
    await expect(page.getByText("ยืนยันจะลบคำขอนี้หรือไม่")).toBeVisible();

    // กด "ยกเลิก" — คำขอต้องยังอยู่
    await page.getByRole("button", { name: "ยกเลิก" }).click();
    await expect(page.getByText("รายการยา", { exact: true })).toBeVisible();

    // ลบจริง — ยืนยันแล้วต้องกลับไปหน้ารายการ และหายจากลิสต์
    await deleteBtn.click();
    await page.getByRole("button", { name: "ยืนยันลบ" }).click();
    await page.waitForURL(/index\.html/);
    await expect(page.getByRole("link", { name: new RegExp(NOTE) })).toHaveCount(0);

    await logout(page);
  });
});
