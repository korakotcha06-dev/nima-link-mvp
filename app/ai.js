// เรียกผู้ช่วย AI ผ่าน OpenRouter — ทุกหน้าที่ใช้ AI ต้องผ่านไฟล์นี้ที่เดียว
//
// กติกาที่ไฟล์นี้บังคับไว้
//   - รอได้ไม่เกิน 15 วินาที เกินแล้วเลิกรอ หน้าเว็บต้องไม่ค้าง
//   - เรียกไม่สำเร็จ โยนข้อความภาษาไทยที่บอกว่าเกิดอะไรขึ้นและทำอะไรต่อได้
//   - คีย์อ่านจาก app/ai-config.js ที่ .gitignore กันไว้เท่านั้น ห้ามเขียนคีย์ลงไฟล์อื่น

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_SEC = 15;

let config;  // undefined = ยังไม่ได้อ่าน · null = ไม่มีคีย์

async function loadConfig() {
  if (config !== undefined) return config;
  try {
    const m = await import("./ai-config.js");
    const key = m.OPENROUTER_API_KEY;
    // ค่าในไฟล์ตัวอย่างขึ้นต้นด้วย "ใส่คีย์" — ถือว่ายังไม่ได้ใส่
    config = key && !key.startsWith("ใส่คีย์")
      ? { key, model: m.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite" }
      : null;
  } catch {
    config = null;  // ยังไม่มีไฟล์คีย์ — หน้าเว็บต้องใช้งานต่อได้ตามปกติ
  }
  return config;
}

/** ใส่คีย์ไว้หรือยัง — ใช้ตัดสินว่าจะเปิดปุ่ม AI หรือไม่ */
export async function hasAiKey() {
  return (await loadConfig()) !== null;
}

/** ชื่อโมเดลที่ใช้อยู่ — เก็บลง aiLog ด้วย จะได้รู้ว่าผลมาจากรุ่นไหน */
export async function aiModel() {
  return (await loadConfig())?.model ?? "";
}

/**
 * ถาม AI หนึ่งครั้ง คืนข้อความตอบกลับ
 * system = บอกหน้าที่และรูปแบบคำตอบ · user = ข้อมูลจริงที่ให้ AI อ่าน
 */
export async function askAI(system, user) {
  const cfg = await loadConfig();
  if (!cfg) throw new Error("ยังไม่ได้ใส่คีย์ AI — คัดลอก app/ai-config.example.js เป็น app/ai-config.js แล้วใส่คีย์ของหลักสูตร");

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_SEC * 1000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("คีย์ AI ไม่ถูกต้องหรือถูกเพิกถอน — แจ้งผู้สอน");
      if (res.status === 402) throw new Error("วงเงินของคีย์หมดแล้ว — แจ้งผู้สอน");
      if (res.status === 404) throw new Error("ไม่พบโมเดล " + cfg.model + " — ใช้ชื่อรุ่นสำรองที่ผู้สอนประกาศ");
      if (res.status === 429) throw new Error("เรียกถี่เกินไป รอสักครู่แล้วลองใหม่");
      throw new Error("เรียก AI ไม่สำเร็จ (รหัส " + res.status + ")");
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI ตอบกลับมาว่างเปล่า ลองกดใหม่อีกครั้ง");
    return String(text).trim();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`รอเกิน ${TIMEOUT_SEC} วินาทีแล้วยังไม่ตอบ`);
    if (e instanceof TypeError) throw new Error("ต่ออินเทอร์เน็ตไม่ได้ ตรวจการเชื่อมต่อแล้วลองใหม่");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ดึงก้อน JSON ออกจากคำตอบ — โมเดลชอบห่อด้วย ```json ... ``` หรือพูดนำหน้ามาก่อน
 * อ่านไม่ออกคืน null ให้ฝั่งที่เรียกบอกผู้ใช้ว่าใช้ผลนี้ไม่ได้
 */
export function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}
