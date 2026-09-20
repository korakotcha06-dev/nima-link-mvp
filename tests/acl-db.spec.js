// ไฟล์ที่ 2 — ACL ที่ชั้นฐานข้อมูล
//
// ไฟล์ที่ 1 (acl-ui.spec.js) พิสูจน์ได้แค่ว่า "หน้าเว็บซ่อนปุ่ม/ข้อความให้" ไม่ได้พิสูจน์ว่ากฎ
// ฝั่ง Firestore กันจริง ไฟล์นี้จึงล็อกอินผ่าน UI ก่อน (ของจริง ไม่ใช่ mock) แล้วยิง Firestore
// SDK ตรง ๆ จาก page context ผ่าน page.evaluate() — import จาก CDN gstatic 12.18.0 เวอร์ชัน
// เดียวกับที่หน้าเว็บใช้ (ดู tests/helpers.js: runInPage) — ข้าม UI ไปทดสอบกฎโดยตรง
//
// เทสชุดนี้คือ "ด่านวัดงาน" ของ security rules รายคอลเลกชัน
// เคยถูกปิดด้วย .fixme ไว้ตอนที่ firestore.rules ยังมีกฎเดียวคือ "ต้องล็อกอินก่อน"
// กฎรายคอลเลกชันตามตาราง ACL.md ขึ้น production แล้วเมื่อ 20 ก.ย. 2569 จึงเปิดใช้งานจริง
//
// ห้ามแก้เทสให้ผ่านเอง ห้ามลดความเข้มของสิ่งที่ตรวจ ห้ามแตะ firestore.rules จากไฟล์นี้
import { test, expect } from "@playwright/test";
import {
  ACCOUNTS,
  loginOrSignup,
  logout,
  createOwnedRequestViaDb,
  deleteRequestViaDb,
  runInPage,
} from "./helpers.js";

test.describe(
  "ACL ที่ชั้นฐานข้อมูล — พิสูจน์ security rules รายคอลเลกชันตามตาราง ACL.md",
  () => {
    // 🔴 สองเคสนี้เคย hardcode id ของข้อมูลตัวอย่าง (r001) ซึ่งเปราะมาก
    // พอข้อมูลตัวอย่างถูกลบทิ้ง กฎจะตอบว่า "ไม่พบเอกสาร" แทน "ไม่มีสิทธิ์"
    // (กฎ get ยอมให้ resource == null ผ่าน เพื่อให้หน้าเว็บขึ้น "ไม่พบคำขอใบนี้" ได้)
    // เทสจึงกลายเป็นแดงผิดเหตุ — ตอนนี้สร้างเอกสารของร้านอื่นขึ้นมาเองแล้วค่อยลองอ่าน

    test("buyer ยิงอ่าน requests ของร้านอื่นตรง ๆ ต้องโดน permission-denied", async ({ page }) => {
      // ร้านที่สองสร้างคำขอของตัวเองไว้ก่อน
      await loginOrSignup(page, ACCOUNTS.buyerOtc2);
      const otherId = await createOwnedRequestViaDb(
        page, ACCOUNTS.buyerOtc2, `E2E-db-ของร้านอื่น-${Date.now()}`);
      await logout(page);

      // ร้านแรกพยายามอ่านใบของร้านที่สอง
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          const snap = await fs.getDoc(fs.doc(db, "requests", data.id));
          return snap.exists();
        },
        { id: otherId }
      );
      await logout(page);

      expect(res.ok, `คาดว่าจะโดนปฏิเสธ แต่กลับอ่านผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");

      // เก็บกวาด — เจ้าของเท่านั้นที่ลบได้
      await loginOrSignup(page, ACCOUNTS.buyerOtc2);
      await deleteRequestViaDb(page, otherId).catch(() => {});
      await logout(page);
    });

    test("rep ยิงอ่าน requests ข้ามช่องทาง (MC ดู OTC) ตรง ๆ ต้องโดน permission-denied", async ({
      page,
    }) => {
      // สร้างคำขอฝั่ง OTC ขึ้นมาจริง ๆ
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      const otcId = await createOwnedRequestViaDb(
        page, ACCOUNTS.buyerOtc, `E2E-db-ข้ามช่องทาง-${Date.now()}`);
      await logout(page);

      // ผู้แทนฝั่ง MC พยายามอ่าน
      await loginOrSignup(page, ACCOUNTS.repMc);
      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          const snap = await fs.getDoc(fs.doc(db, "requests", data.id));
          return snap.exists();
        },
        { id: otcId }
      );
      await logout(page);

      expect(res.ok, `คาดว่าจะโดนปฏิเสธ แต่กลับอ่านผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");

      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      await deleteRequestViaDb(page, otcId).catch(() => {});
      await logout(page);
    });

    test("buyer ยิง updateDoc เปลี่ยน status คำขอของตัวเอง ต้องโดน permission-denied", async ({
      page,
    }) => {
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      const id = await createOwnedRequestViaDb(page, ACCOUNTS.buyerOtc, `E2E-db-status-${Date.now()}`);

      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          await fs.updateDoc(fs.doc(db, "requests", data.id), { status: "รับแล้ว" });
        },
        { id }
      );

      // เก็บกวาด — ทำก่อน assert เพื่อให้ลบแน่นอนแม้ expect ด้านล่างจะ throw
      await deleteRequestViaDb(page, id).catch(() => {});

      expect(res.ok, `buyer ต้องอนุมัติของตัวเองไม่ได้ แต่กลับเปลี่ยน status ผ่าน: ${JSON.stringify(res)}`).toBe(
        false
      );
      expect(res.code).toBe("permission-denied");

      await logout(page);
    });

    test("rep ยิง updateDoc แก้ qty ของคำขอที่ไม่ใช่ช่อง status ต้องโดน permission-denied", async ({
      page,
    }) => {
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      const id = await createOwnedRequestViaDb(page, ACCOUNTS.buyerOtc, `E2E-db-qty-${Date.now()}`);
      await logout(page);

      await loginOrSignup(page, ACCOUNTS.repOtc); // ช่องทางเดียวกับคำขอ — ตั้งใจให้ตรงช่องทาง เหลือแค่ปัญหาช่อง qty
      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          await fs.updateDoc(fs.doc(db, "requests", data.id), { qty: 999 });
        },
        { id }
      );
      await logout(page);

      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      await deleteRequestViaDb(page, id).catch(() => {});
      await logout(page);

      expect(res.ok, `rep ต้องแก้ได้แค่ช่อง status แต่กลับแก้ qty ผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");
    });

    test("rep ยิง addDoc สร้างคำขอเอง ต้องโดน permission-denied", async ({ page }) => {
      await loginOrSignup(page, ACCOUNTS.repOtc);

      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          const ref = await fs.addDoc(fs.collection(db, "requests"), {
            buyerId: auth.currentUser.uid,
            buyerName: "E2E-ห้ามสร้าง (rep พยายามสร้างเอง)",
            buyerChannel: data.channel,
            buyerArea: "E2E",
            productId: "e2e-product",
            productName: "E2E-ผู้แทนพยายามสร้างคำขอเอง",
            qty: 1,
            unit: "แผง",
            note: "E2E-เทสนี้ต้องโดนปฏิเสธ",
            status: "รอผู้แทนรับ",
            createdAt: fs.serverTimestamp(),
          });
          return ref.id;
        },
        { channel: ACCOUNTS.repOtc.channel }
      );

      // เก็บกวาด — ถ้ากฎหลวมจนสร้างผ่านได้จริง ลบทิ้งทันทีไม่ให้ขยะค้างฐานจริง
      if (res.ok && res.value) {
        await runInPage(
          page,
          async (db, fs, auth, data) => {
            await fs.deleteDoc(fs.doc(db, "requests", data.id));
          },
          { id: res.value }
        ).catch(() => {});
      }

      expect(res.ok, `rep ต้องสร้างคำขอเองไม่ได้ แต่กลับสร้างผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");

      await logout(page);
    });

    test("rep ยิง deleteDoc ลบคำขอที่ไม่ใช่ของตัวเอง ต้องโดน permission-denied", async ({ page }) => {
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      const id = await createOwnedRequestViaDb(page, ACCOUNTS.buyerOtc, `E2E-db-delete-${Date.now()}`);
      await logout(page);

      await loginOrSignup(page, ACCOUNTS.repOtc);
      const res = await runInPage(
        page,
        async (db, fs, auth, data) => {
          await fs.deleteDoc(fs.doc(db, "requests", data.id));
        },
        { id }
      );
      await logout(page);

      // เก็บกวาด — ถ้าโดนปฏิเสธถูกต้อง เอกสารยังอยู่ ลบทิ้งโดยเจ้าของจริง
      // ถ้ากฎหลวมจนลบผ่านได้จริง เอกสารหายไปแล้ว ไม่ต้องลบซ้ำ (deleteRequestViaDb จะ error เฉย ๆ แล้วถูก catch ทิ้ง)
      await loginOrSignup(page, ACCOUNTS.buyerOtc);
      await deleteRequestViaDb(page, id).catch(() => {});
      await logout(page);

      expect(res.ok, `rep ต้องลบคำขอของคนอื่นไม่ได้ แต่กลับลบผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");
    });

    test("ใครก็ได้ยิงแก้ role ตัวเองใน users/{uid} เป็น rep ต้องโดน permission-denied", async ({
      page,
    }) => {
      // ใช้บัญชีแยกต่างหาก (roleTest) ไม่ใช่ buyerOtc — กันไม่ให้กระทบเทสไฟล์อื่นถ้ากฎหลวมจนแก้ผ่านได้จริง
      await loginOrSignup(page, ACCOUNTS.roleTest);

      const res = await runInPage(page, async (db, fs, auth) => {
        await fs.updateDoc(fs.doc(db, "users", auth.currentUser.uid), { role: "rep" });
      });

      // เก็บกวาด — ถ้ากฎหลวมจนแก้ผ่านได้จริง รีบเปลี่ยนกลับทันที ป้องกันบัญชีเพี้ยนสำหรับรันครั้งถัดไป
      if (res.ok) {
        await runInPage(page, async (db, fs, auth) => {
          await fs.updateDoc(fs.doc(db, "users", auth.currentUser.uid), { role: "buyer" });
        }).catch(() => {});
      }

      expect(res.ok, `ห้ามแก้ role ตัวเองได้ แต่กลับแก้ผ่าน: ${JSON.stringify(res)}`).toBe(false);
      expect(res.code).toBe("permission-denied");

      await logout(page);
    });
  }
);
