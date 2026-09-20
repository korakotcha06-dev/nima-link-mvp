// ผู้ช่วยใช้ร่วมกันระหว่างสองไฟล์เทส ACL (acl-ui.spec.js กับ acl-db.spec.js)
//
// โปรเจกต์นี้ยิงเข้า Firebase ของจริง ไม่มี emulator — บัญชีด้านล่างเป็นบัญชีทดสอบ
// อีเมลขึ้นต้น e2e- ตั้งใจให้ดูออกว่าเป็นของเทส รหัสผ่านเป็นรหัสสมมติ ไม่ใช่รหัสผ่านจริงของทัช
//
// สคริปต์รันซ้ำได้เรื่อย ๆ โดยไม่พัง — loginOrSignup() ลองเข้าสู่ระบบก่อน
// ถ้าบัญชียังไม่มี (auth/user-not-found หรือ auth/invalid-credential) ค่อยสลับไปสมัครแทน

export const TEST_PASSWORD = "E2eTest123!";

export const ACCOUNTS = {
  // ร้าน OTC หลัก — ใช้สร้างคำขอ, ทดสอบสิทธิ์เจ้าของ
  buyerOtc: {
    email: "e2e-buyer-otc@example.com",
    name: "E2E-ร้านทดสอบ OTC",
    role: "buyer",
    channel: "OTC",
    area: "E2E-เขตทดสอบ",
  },
  // ร้าน OTC ที่สอง — ใช้ทดสอบว่า "ดูของร้านอื่นไม่ได้"
  buyerOtc2: {
    email: "e2e-buyer-otc2@example.com",
    name: "E2E-ร้านทดสอบ OTC สอง",
    role: "buyer",
    channel: "OTC",
    area: "E2E-เขตทดสอบสอง",
  },
  // ผู้แทน OTC — ช่องทางเดียวกับ buyerOtc
  repOtc: {
    email: "e2e-rep-otc@example.com",
    name: "E2E-ผู้แทนทดสอบ OTC",
    role: "rep",
    channel: "OTC",
    area: "E2E-เขตผู้แทน",
  },
  // ผู้แทน MC — ใช้ทดสอบว่า "ข้ามช่องทางดูไม่ได้"
  repMc: {
    email: "e2e-rep-mc@example.com",
    name: "E2E-ผู้แทนทดสอบ MC",
    role: "rep",
    channel: "MC",
    area: "E2E-เขตผู้แทน",
  },
  // บัญชีแยกต่างหาก ใช้เฉพาะเทส "แก้ role ตัวเอง" ในไฟล์ที่ 2 เท่านั้น
  // แยกออกมาเพื่อไม่ให้กระทบบัญชีที่เทสไฟล์อื่นใช้ ถ้ากฎหลวมจนแก้ผ่านได้จริง
  roleTest: {
    email: "e2e-role-test@example.com",
    name: "E2E-บัญชีทดสอบ role",
    role: "buyer",
    channel: "OTC",
    area: "E2E-เขตทดสอบ role",
  },
};

const ROLE_LABEL = { buyer: "ร้านยา / คลินิก", rep: "ผู้แทนยา" };
const CHANNEL_LABEL = { OTC: "OTC — ร้านขายยา", MC: "MC — คลินิก / โรงพยาบาล" };

// เข้าสู่ระบบด้วยบัญชีทดสอบ — ถ้ายังไม่มีบัญชีให้สมัครใหม่ให้อัตโนมัติ
async function isStillOnLogin(page) {
  return new URL(page.url()).pathname.endsWith("/login.html");
}

export async function loginOrSignup(page, account) {
  await page.goto("/login.html");
  await page.getByRole("textbox", { name: "อีเมล" }).fill(account.email);
  await page.getByRole("textbox", { name: "รหัสผ่าน" }).fill(TEST_PASSWORD);
  await page.locator("#submit").click();

  await page
    .waitForURL((url) => !url.pathname.endsWith("/login.html"), { timeout: 8000 })
    .catch(() => {});

  if (!(await isStillOnLogin(page))) return; // เข้าสู่ระบบสำเร็จ — บัญชีมีอยู่แล้ว

  // ยังอยู่หน้า login.html แปลว่าเข้าสู่ระบบไม่สำเร็จ (บัญชียังไม่มี) — สมัครใหม่
  await page.goto("/login.html");
  await page.getByRole("button", { name: "สมัครใช้งาน" }).click();
  await page.getByRole("textbox", { name: "อีเมล" }).fill(account.email);
  await page.getByRole("textbox", { name: "รหัสผ่าน" }).fill(TEST_PASSWORD);
  await page
    .getByRole("textbox", { name: "ชื่อร้าน / คลินิก / ชื่อผู้แทน" })
    .fill(account.name);
  await page.getByLabel("คุณคือ").selectOption(ROLE_LABEL[account.role]);
  await page.getByLabel("ช่องทาง").selectOption(CHANNEL_LABEL[account.channel]);
  await page.getByRole("textbox", { name: "เขต / อำเภอ" }).fill(account.area);
  await page.locator("#submit").click();

  await page.waitForURL((url) => !url.pathname.endsWith("/login.html"), { timeout: 10000 });
}

export async function logout(page) {
  const btn = page.getByRole("button", { name: "ออกจากระบบ" });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForURL(/login\.html/, { timeout: 8000 }).catch(() => {});
  }
}

// ---- ชั้นฐานข้อมูลตรง ๆ (ใช้ในไฟล์ที่ 2 เท่านั้น) ----
//
// import SDK จาก CDN gstatic ตัวเดียวกับที่หน้าเว็บใช้ (ตรึง 12.18.0 — ห้ามขยับตาม CLAUDE.md)
// ดึง firebaseConfig จาก /app/firebase-config.js ที่หน้าเว็บเสิร์ฟอยู่แล้ว แทนที่จะก๊อปค่ามาไว้ในเทส
// เพื่อไม่ต้องแก้เทสถ้าอีกฝั่งหมุน apiKey ในอนาคต (apiKey ฝั่งเว็บไม่ใช่ความลับ — ดูคอมเมนต์ในไฟล์นั้น)
export const FIREBASE_SDK_BASE = "https://www.gstatic.com/firebasejs/12.18.0";

// รัน workFn(db, fs, auth, data) ใน page context ของบัญชีที่ล็อกอินอยู่ตอนนี้
// คืนค่า { ok:true, value } ถ้าไม่มี error หรือ { ok:false, code, message } ถ้าโดน error (เช่น permission-denied)
export async function runInPage(page, workFn, data = null) {
  return page.evaluate(
    async ({ workFnStr, data, base }) => {
      const { firebaseConfig } = await import("/app/firebase-config.js");
      const { initializeApp, getApps, getApp } = await import(`${base}/firebase-app.js`);
      const authMod = await import(`${base}/firebase-auth.js`);
      const fs = await import(`${base}/firebase-firestore.js`);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const db = fs.getFirestore(app);
      const auth = authMod.getAuth(app);

      // 🔴 Firebase Auth กู้ session จาก IndexedDB แบบ async — ถ้าไม่รอตรงนี้
      // auth.currentUser จะเป็น null ทั้งที่หน้าเว็บล็อกอินอยู่ แล้วงานข้างล่างจะตาย
      // ที่ null deref แทนที่จะได้คำตอบจากกฎ (เทสจะ "แดงผิดเหตุ" หรือแย่กว่านั้นคือ
      // "เขียวผิดเหตุ" เพราะถูกปฏิเสธในฐานะคนไม่ได้ล็อกอิน ไม่ใช่เพราะ ACL)
      if (auth.authStateReady) {
        await auth.authStateReady();
      } else {
        await new Promise(resolve => {
          const stop = authMod.onAuthStateChanged(auth, () => { stop(); resolve(); });
        });
      }
      // eslint-disable-next-line no-new-func -- workFn ถูกส่งมาเป็นข้อความ (ข้าม page.evaluate boundary) แล้วประกอบกลับที่นี่
      const fn = new Function("db", "fs", "auth", "data", `return (${workFnStr})(db, fs, auth, data);`);
      try {
        const value = await fn(db, fs, auth, data);
        return { ok: true, value };
      } catch (err) {
        return { ok: false, code: err && err.code, message: err && err.message };
      }
    },
    { workFnStr: workFn.toString(), data, base: FIREBASE_SDK_BASE }
  );
}

// สร้างคำขอทดสอบตรงเข้า Firestore (ไม่ผ่าน UI) ให้บัญชี buyer ที่ล็อกอินอยู่ — ใช้เตรียมข้อมูลในไฟล์ที่ 2
// (การ "สร้างคำขอเป็นของตัวเอง" เป็นสิทธิ์ที่ buyer ควรทำได้อยู่แล้วตาม ACL.md ไม่ได้ผิดกติกาอะไร
//  แค่ข้ามหน้าฟอร์มเพื่อความเร็ว — เทสสิทธิ์การสร้างคำขอผ่าน UI จริง ๆ อยู่ในไฟล์ที่ 1)
export async function createOwnedRequestViaDb(page, account, note) {
  const res = await runInPage(
    page,
    async (db, fs, auth, data) => {
      // ห้ามใส่ buyerName ลงเอกสารคำขอ — ชื่อร้านย้ายไป requests/{id}/identity/buyer แล้ว
      // และกฎ create ปฏิเสธเอกสารที่มีช่องนี้ติดมา (เส้นแดงข้อ 5 · PDPA)
      const ref = await fs.addDoc(fs.collection(db, "requests"), {
        buyerId: auth.currentUser.uid,
        buyerChannel: data.channel,
        buyerArea: data.area,
        productId: "e2e-product",
        productName: "E2E-พาราเซตามอล (เทสสิทธิ์)",
        qty: 1,
        unit: "แผง",
        note: data.note,
        status: "รอผู้แทนรับ",
        createdAt: fs.serverTimestamp(),
      });
      return ref.id;
    },
    { buyerName: account.name, channel: account.channel, area: account.area, note }
  );
  if (!res.ok) {
    throw new Error(`เตรียมข้อมูลเทสไม่สำเร็จ (createOwnedRequestViaDb): ${res.code} ${res.message}`);
  }
  return res.value;
}

export async function deleteRequestViaDb(page, id) {
  return runInPage(
    page,
    async (db, fs, auth, data) => {
      await fs.deleteDoc(fs.doc(db, "requests", data.id));
    },
    { id }
  );
}
