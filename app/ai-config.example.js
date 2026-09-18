// ตัวอย่างไฟล์คีย์ผู้ช่วย AI
//
// วิธีใช้: คัดลอกไฟล์นี้เป็น app/ai-config.js แล้วใส่คีย์ OpenRouter ของหลักสูตร
//   cp app/ai-config.example.js app/ai-config.js
//
// app/ai-config.js ถูก .gitignore กันไว้ — ห้าม commit เด็ดขาด
// ใช้คีย์ของหลักสูตรที่ผู้สอนตั้งวงเงินไว้เท่านั้น ห้ามใช้คีย์ส่วนตัว
//
// ข้อจำกัดที่รู้อยู่แล้ว: คีย์ที่ส่งไปกับหน้าเว็บ ใครเปิด F12 ก็เห็น
// ยอมรับได้เฉพาะในหลักสูตรเพราะคีย์มีวงเงินจำกัด
// ระบบจริงต้องเรียก AI ผ่านตัวกลางฝั่งเซิร์ฟเวอร์ (อยู่ใน Backlog Sprint 2)

export const OPENROUTER_API_KEY = "ใส่คีย์ของหลักสูตรตรงนี้";
export const OPENROUTER_MODEL = "google/gemini-2.5-flash-lite";
