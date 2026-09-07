// ล็อกอินด้วย Email/Password + โหลดบทบาทของคนที่ล็อกอินอยู่
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { app, db } from "./db.js";

export const auth = getAuth(app);

export const ROLE = { BUYER: "buyer", REP: "rep" };
export const ROLE_LABEL = { buyer: "ร้านยา / คลินิก", rep: "ผู้แทนยา" };

/**
 * เขียนโปรไฟล์ลง users/{uid}
 * แยกออกมาเป็นฟังก์ชันของตัวเอง เพราะต้องใช้ทั้งตอนสมัครใหม่
 * และตอนซ่อมบัญชีที่มี Auth แล้วแต่โปรไฟล์หาย
 */
export async function saveProfile(uid, { email, name, role, channel, area }) {
  // Firestore ต้องรอให้ token ของคนที่เพิ่งล็อกอินส่งถึงก่อน ไม่งั้นโดน permission-denied
  // เคยพลาดมาแล้วตอนสมัครครั้งแรก: บัญชี Auth เกิดแต่โปรไฟล์ไม่เกิด
  await auth.currentUser?.getIdToken(true);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await setDoc(doc(db, "users", uid), { email, name, role, channel, area });
      return;
    } catch (e) {
      if (e.code !== "permission-denied" || attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 400 * attempt));
      await auth.currentUser?.getIdToken(true);
    }
  }
}

/** สมัครสมาชิก แล้วสร้าง users/{uid} เก็บบทบาทและช่องทาง */
export async function register({ email, password, name, role, channel, area }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await saveProfile(cred.user.uid, { email, name, role, channel, area });
  return cred.user;
}

export const login  = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

/** อ่านโปรไฟล์จาก users/{uid} — role มาจากที่นี่ ไม่ใช่จากฝั่งหน้าเว็บ */
export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/**
 * ด่านหน้าเพจ — ยังไม่ล็อกอินให้เด้งไปหน้าเข้าสู่ระบบ
 * คืน profile ของคนที่ล็อกอินอยู่ให้หน้าเพจเอาไปตัดสินใจว่าจะโชว์ปุ่มอะไร
 */
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        location.replace("login.html?next=" + encodeURIComponent(location.pathname + location.search));
        return;
      }
      const profile = await loadProfile(user.uid);
      if (!profile) {
        // มีบัญชีแต่ไม่มีโปรไฟล์ (สมัครค้างกลางทาง) — พาไปกรอกโปรไฟล์ให้จบ ไม่ใช่ทางตัน
        location.replace("login.html?completeProfile=1&next=" + encodeURIComponent(location.pathname + location.search));
        return;
      }
      resolve(profile);
    });
  });
}

/** ปุ่มออกจากระบบ ใช้ร่วมกันทุกหน้า */
export function mountSignOut(el) {
  el.onclick = async () => { await logout(); location.replace("login.html"); };
}

export function friendlyAuthError(code) {
  return {
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/missing-password": "ยังไม่ได้กรอกรหัสผ่าน",
    "auth/weak-password": "รหัสผ่านสั้นเกินไป ต้องอย่างน้อย 6 ตัว",
    "auth/email-already-in-use": "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "ไม่พบบัญชีนี้",
    "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
    "auth/too-many-requests": "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
    "auth/operation-not-allowed": "ยังไม่ได้เปิด Email/Password ใน Firebase Console > Authentication",
  }[code] || ("เกิดข้อผิดพลาด: " + code);
}
