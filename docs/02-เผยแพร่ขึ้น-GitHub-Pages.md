# เผยแพร่หน้าเว็บขึ้น GitHub Pages

## ก่อนเริ่ม — เข้าใจว่าอะไรเป็นสาธารณะ อะไรไม่

| สิ่งที่อยู่บน GitHub Pages (สาธารณะ ใครก็อ่านได้) | สิ่งที่ไม่เคยออกจากบัญชี Google ของคุณ |
|---|---|
| โค้ดหน้าเว็บทั้งหมด | ข้อมูลการจอง รายชื่อผู้ใช้ และประวัติทั้งหมด (อยู่ใน Google Sheets) |
| URL ของ Apps Script | กุญแจลับที่ใช้เซ็น session token |
| | สิทธิ์เข้าถึงไฟล์ข้อมูล และรหัสผ่าน/PIN ของผู้ใช้ (เก็บเป็น hash ผสมกุญแจลับ) |

**URL ของ Apps Script จะเป็นสาธารณะ** ซึ่งรับได้ เพราะทุกคำสั่งที่แตะข้อมูลต้องมี
session token ที่เซ็นด้วยกุญแจลับ และบัญชีต้องอยู่ในชีต Users
คนที่ยิง URL ตรง ๆ จะได้แค่ `{"ok":false,"error":{"code":"UNAUTHENTICATED"}}`

กันการเดารหัสสองชั้น: แต่ละบัญชีรหัสผ่าน/PIN ผิด 5 ครั้งติดกันล็อก 15 นาที และทั้งระบบรวมกัน
ล้มเหลวได้ไม่เกิน **100 ครั้งต่อชั่วโมง**

> ถ้าไม่อยากให้โค้ดเป็นสาธารณะเลย ให้ตั้ง repository เป็น **private**
> GitHub Pages จาก repo แบบ private ต้องใช้แพ็กเกจแบบจ่ายเงิน — ทางเลือกฟรีคือ Vercel
> ซึ่งรองรับ repo private และใช้ไฟล์ที่ build ออกมาชุดเดียวกัน

## ขั้นที่ 1 — สร้าง repository แล้ว push

```bash
cd /Users/shoyu/code/meeting-room-booking
git init -b main                      # ทำแล้วถ้าใช้สคริปต์นี้ครั้งแรก
git add .
git commit -m "ระบบจองห้องประชุม: domain logic + Apps Script + หน้าเว็บ"

gh repo create meeting-room-booking --public --source=. --remote=origin --push
# หรือสร้างใน github.com แล้ว
# git remote add origin https://github.com/<ชื่อคุณ>/meeting-room-booking.git
# git push -u origin main
```

ไฟล์ที่ **ไม่** ขึ้น git อยู่แล้ว (ตั้งไว้ใน `.gitignore`): `.env`, `apps-script/.clasp.json`,
ไฟล์ service account ทุกแบบ, `node_modules/`, `dist/`

## ขั้นที่ 2 — เปิด GitHub Pages

ใน repo → **Settings → Pages → Build and deployment → Source** เลือก **GitHub Actions**

(ไม่ต้องเลือก branch เพราะเรา deploy ผ่าน workflow ที่เตรียมไว้ใน
`.github/workflows/deploy-pages.yml`)

## ขั้นที่ 3 — ใส่ค่าตั้งค่าของหน้าเว็บ

**Settings → Secrets and variables → Actions → แท็บ Variables → New repository variable**

| Name | Value |
|---|---|
| `VITE_API_URL` | Web app URL ของ Apps Script (ลงท้าย `/exec`) |

ใช้ **Variables** ไม่ใช่ Secrets เพราะค่านี้ถูกฝังในไฟล์ที่เบราว์เซอร์ดาวน์โหลดอยู่แล้ว
การใส่ใน Secrets จะทำให้ log อ่านยากโดยไม่ได้เพิ่มความปลอดภัยจริง

> **ยังไม่ได้ตั้งค่านี้ก็เผยแพร่ได้** — หน้าเข้าสู่ระบบจะมีรายชื่อบัญชีทดลองพร้อมรหัสผ่านและ PIN ให้กดเลือก และเก็บข้อมูล
> ไว้ในเบราว์เซอร์ของแต่ละคน (แต่ละเครื่องเห็นข้อมูลของตัวเอง) จนกว่าจะต่อ Google Sheets

## ขั้นที่ 4 — ตรวจผล

push แล้วดูที่แท็บ **Actions** — workflow จะทำตามลำดับนี้ และ **หยุดทันทีถ้าข้อใดไม่ผ่าน**

1. ตรวจ type ของ domain logic
2. รันเทส domain logic ทั้งหมด
3. ตรวจว่า `apps-script/Domain.gs` ตรงกับ `shared/` (กันกรณีแก้โค้ดแล้วลืม build)
4. ตรวจ type ของหน้าเว็บ
5. รันเทสหน้าเว็บทั้งหมด (เข้าสู่ระบบด้วยรหัสผ่านหรือ PIN จอง อนุมัติ 3 ขั้นด้วย PIN จัดการผู้ใช้)
6. build แล้วเผยแพร่

ถ้าเขียนโค้ดพังหรือเทสไม่ผ่าน เว็บเดิมจะยังอยู่ ไม่ถูกทับด้วยเวอร์ชันที่พัง

## คำถามที่เจอบ่อย

**ทำไม URL มี `#` คั่น (`.../#/`)**
GitHub Pages ไม่มีเซิร์ฟเวอร์ให้ตั้ง rewrite ถ้าใช้เส้นทางปกติแล้วผู้ใช้กดรีเฟรชที่
หน้าปฏิทิน GitHub จะตอบ 404 การใช้ `#` จึงทำให้ลิงก์ทุกหน้าใช้ได้จริงและแชร์ได้
เป็นการแลกที่คุ้มสำหรับระบบใช้ภายในองค์กร

**ย้ายไป Vercel หรือโดเมนตัวเองภายหลังได้ไหม**
ได้ ไม่ต้องแก้โค้ดเลย เพราะตั้ง `base: './'` ไว้ ไฟล์ที่ build แล้วทำงานได้ทุก path
แค่เอาโฟลเดอร์ `web/dist` ไปวาง
