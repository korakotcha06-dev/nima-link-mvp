// ไฟล์ที่ 3 — ฟอร์มสร้างคำขอต้องไม่ยอมรับข้อมูลที่ไม่ครบ (spec.md 3.3)
//
// สองไฟล์แรกพิสูจน์เรื่องสิทธิ์ ไฟล์นี้พิสูจน์เรื่องความถูกต้องของข้อมูลที่เข้าฐานข้อมูล
// คำขอที่ไม่มีจำนวน คือคำขอที่ผู้แทนตอบไม่ได้ ระบบจึงต้องปฏิเสธตั้งแต่หน้าฟอร์ม
// ไม่ใช่ปล่อยเข้าไปแล้วค่อยไปเจอปัญหาตอนมีคนอ่าน
//
// เช็ก 3 ชั้นในทุกเทส: ยังอยู่หน้าเดิม · เบราว์เซอร์บอกว่าช่องไหนขาด · ไม่มีเอกสารเกิดในฐานข้อมูล
// ชั้นที่ 3 สำคัญที่สุด — ถ้าดูแค่หน้าจอ เราจะไม่มีทางรู้ว่ามีขยะไหลเข้าฐานข้อมูลไปแล้วหรือยัง
import { test, expect } from "@playwright/test";
import { ACCOUNTS, loginOrSignup, runInPage } from "./helpers.js";

const NOTE_PREFIX = "E2E-ฟอร์มไม่ครบ";

/** นับคำขอของตัวเองที่มีข้อความนี้ — ยิงตรงเข้าฐานข้อมูล ไม่เชื่อสิ่งที่หน้าจอแสดง */
async function countRequestsWithNote(page, note) {
  const res = await runInPage(
    page,
    async (db, fs, auth, data) => {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "requests"),
        fs.where("buyerId", "==", auth.currentUser.uid)));
      return snap.docs.filter(d => d.data().note === data.note).length;
    },
    { note }
  );
  if (!res.ok) throw new Error(`อ่านคำขอของตัวเองไม่ได้: ${res.code} ${res.message}`);
  return res.value;
}

test.describe("ฟอร์มสร้างคำขอ — กรอกไม่ครบต้องไม่บันทึก", () => {
  test("เว้นช่องจำนวนไว้แล้วกดส่ง ต้องไม่บันทึกและต้องบอกว่าช่องไหนยังขาด", async ({ page }) => {
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    const note = `${NOTE_PREFIX} เว้นจำนวน ${Date.now()}`;
    await page.goto("/new.html");
    await expect(page.locator("#form")).toBeVisible();

    await page.locator("#note").fill(note);
    await page.locator("#qty").fill("");       // ลบจำนวนออกให้ว่าง
    await page.locator("#submit").click();

    // 1. ต้องยังอยู่หน้าเดิม ไม่ถูกพากลับหน้ารายการเหมือนตอนบันทึกสำเร็จ
    await expect(page).toHaveURL(/new\.html/);

    // 2. ต้องมีข้อความบอกผู้ใช้ ไม่ใช่เงียบ ๆ แล้วไม่เกิดอะไรขึ้น
    const qty = await page.locator("#qty").evaluate(el => ({
      valid: el.checkValidity(),
      message: el.validationMessage,
    }));
    expect(qty.valid, "ช่องจำนวนว่างแต่ฟอร์มยังถือว่าถูกต้อง").toBe(false);
    expect(qty.message.length, "ไม่มีข้อความบอกว่าช่องไหนยังขาด").toBeGreaterThan(0);

    // 3. ด่านจริง — ต้องไม่มีคำขอใบนี้เกิดขึ้นในฐานข้อมูล
    expect(await countRequestsWithNote(page, note),
      "ฟอร์มไม่ครบแต่มีคำขอเกิดขึ้นจริงในฐานข้อมูล").toBe(0);
  });

  test("จำนวนติดลบต้องไม่ผ่าน และต้องไม่มีคำขอเกิดขึ้น", async ({ page }) => {
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    const note = `${NOTE_PREFIX} ติดลบ ${Date.now()}`;
    await page.goto("/new.html");
    await expect(page.locator("#form")).toBeVisible();

    await page.locator("#note").fill(note);
    await page.locator("#qty").fill("-3");
    await page.locator("#submit").click();

    await expect(page).toHaveURL(/new\.html/);
    const valid = await page.locator("#qty").evaluate(el => el.checkValidity());
    expect(valid, "จำนวนติดลบผ่านฟอร์มไปได้").toBe(false);

    expect(await countRequestsWithNote(page, note),
      "จำนวนติดลบแต่มีคำขอเกิดขึ้นจริงในฐานข้อมูล").toBe(0);
  });

  test("จำนวนเป็นทศนิยมต้องไม่ผ่าน เพราะยาเบิกเป็นเศษแผงไม่ได้", async ({ page }) => {
    await loginOrSignup(page, ACCOUNTS.buyerOtc);

    const note = `${NOTE_PREFIX} ทศนิยม ${Date.now()}`;
    await page.goto("/new.html");
    await expect(page.locator("#form")).toBeVisible();

    await page.locator("#note").fill(note);
    await page.locator("#qty").fill("2.5");
    await page.locator("#submit").click();

    await expect(page).toHaveURL(/new\.html/);
    const valid = await page.locator("#qty").evaluate(el => el.checkValidity());
    expect(valid, "จำนวนทศนิยมผ่านฟอร์มไปได้ ทั้งที่ step=1").toBe(false);

    expect(await countRequestsWithNote(page, note),
      "จำนวนทศนิยมแต่มีคำขอเกิดขึ้นจริงในฐานข้อมูล").toBe(0);
  });
});
