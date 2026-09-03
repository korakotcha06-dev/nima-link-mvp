// ค่าจาก Firebase Console > Project settings > General > Your apps > Web app
//
// apiKey ฝั่งเว็บไม่ใช่ความลับ — commit ขึ้น public repo ได้ตามปกติ
// ที่เป็นความลับจริงคือ service account key ซึ่งโปรเจกต์นี้ไม่ได้ใช้
//
// หมายเหตุ: โค้ดที่ Console ก๊อปมาให้เขียนว่า import from "firebase/app"
// แบบนั้นต้องมี bundler — โปรเจกต์นี้ไม่มีขั้นตอน build จึงเรียกจาก CDN gstatic
// ใน app/db.js แทน ที่นี่เก็บแค่ค่า config

export const firebaseConfig = {
  apiKey: "AIzaSyBIpwJdhFcCjwIvLeqigQj-3YbTs_mUIHk",
  authDomain: "nima-link-mvp.firebaseapp.com",
  projectId: "nima-link-mvp",
  storageBucket: "nima-link-mvp.firebasestorage.app",
  messagingSenderId: "1006192399384",
  appId: "1:1006192399384:web:d0adc6c2b2d210d55d9f6d",
  measurementId: "G-YZ64C4MQ4D",
};
