# docs

ภาพหลักฐานประกอบการส่งงาน

| ไฟล์ | คืออะไร | ของสัปดาห์ |
|---|---|---|
| `firestore-console.png` | หน้า Firebase Console เห็นคอลเลกชัน `products` / `requests` / `users` และ `requests` มี r001-r005 ครบ 5 รายการ | 6 |
| `no-login-permission-denied.png` | เปิดเว็บที่ deploy แล้วโดยไม่ล็อกอิน — หน้าเว็บเด้งไปหน้าเข้าสู่ระบบเอง และการยิงอ่าน `requests` ตรงได้ `permission-denied` กลับมาจริง | 7 |

ภาพที่สองถ่ายจากเว็บจริงที่ <https://nima-link-mvp.web.app> ไม่ใช่จากเครื่องตัวเอง
กล่องผลทดสอบในภาพคือค่าที่ Firestore ตอบกลับมาจริง ไม่ได้พิมพ์ข้อความเอง

ยืนยันซ้ำจากฝั่ง REST API ด้วย เรียกโดยไม่มี token ได้:

```
HTTP 403 · PERMISSION_DENIED · Missing or insufficient permissions.
```
