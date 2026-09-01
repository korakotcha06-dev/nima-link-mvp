// ตรึงเวอร์ชัน SDK ไว้ที่ 12.18.0 — โปรเจกต์นี้ไม่มีขั้นตอน build
// จึงต้องเรียกจาก CDN gstatic ไม่ใช่ import จาก "firebase/app" แบบที่ Console ก๊อปมาให้
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const STATUS = {
  PENDING: "รอผู้แทนรับ",
  ACCEPTED: "รับแล้ว",
  REJECTED: "ปฏิเสธ",
};

export function isConfigured() {
  return !String(firebaseConfig.projectId).includes("ใส่ค่าจริง");
}
