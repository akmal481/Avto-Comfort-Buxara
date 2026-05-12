## Parol tizimi qo'shish (OTP + Password)

Hozirgi tizim faqat Telegram OTP orqali ishlaydi. Yangi tizim:

### 1. Ro'yxatdan o'tish (yangi user)
1. Ism + telefon → OTP yuboriladi (Telegram bot orqali, hozirgi `send-otp`)
2. OTP tasdiqlandi → **Parol yaratish** ekrani
3. Parol kiritiladi (validatsiya: 6+ belgi, harf+raqam, oddiy parollar bloklanadi)
4. Parol bcrypt bilan hash qilinib `profiles.password_hash` ga saqlanadi
5. Foydalanuvchi avtomatik kiradi

### 2. Login (mavjud user)
- Telefon + parol → `login-with-password` edge function
- Edge function bcrypt bilan tekshiradi → Supabase session yaratadi
- 5 marta xato → 5 daqiqa blok (`login_attempts` jadvali)
- "Parolni unutdingizmi?" → OTP orqali tiklash → yangi parol qo'yish

### 3. Parolni o'zgartirish (Sozlamalar → Xavfsizlik)
- Yangi sahifa: `/settings/security` yoki Settings ichida card
- Eski parol + yangi parol + tasdiqlash
- Edge function `change-password`: bcrypt verify → yangi hash
- Show/hide, strength meter, animatsiyalar, loading, success toast

### Texnik tafsilotlar

**Database (migration):**
- `profiles` ga: `password_hash text`, `password_set_at timestamptz`
- Yangi jadval `login_attempts (id, phone, attempted_at, success bool)` — 5 daqiqa oynasi

**Edge functions:**
- `set-password` (yangi) — OTP verify dan keyin yoki o'zgartirish uchun, bcrypt hash
- `login-with-password` (yangi) — telefon+parol tekshiradi, rate-limit, session qaytaradi
- `change-password` (yangi) — eski parol verify, yangi parol o'rnatadi
- bcrypt: `import bcrypt from "npm:bcryptjs@2.4.3"`

**Frontend:**
- `src/pages/Auth.tsx` — login/signup tabs, signup oqimi: phone→OTP→parol
- Yangi komponent: `PasswordInput` (eye toggle), `PasswordStrengthMeter`
- `src/lib/passwordValidation.ts` — validatsiya + zaif parollar ro'yxati
- `src/pages/Settings.tsx` ga yangi "Xavfsizlik" card → `ChangePasswordCard`
- "Parolni unutdingizmi?" — OTP oqimini qayta ishlatish

**Xavfsizlik:**
- Parol hech qachon plaintext saqlanmaydi (bcrypt cost 10)
- RLS: `password_hash` ustuni faqat service-role orqali o'qiladi (column-level emas, lekin profiles SELECT ochiq — hash ustunini view orqali yashirish yoki edge function orqali ishlash)
- Rate limit: 5 urinish / 5 daqiqa per phone

### O'zgaradigan/yangi fayllar
- Migration: profiles + login_attempts
- Yangi: `supabase/functions/set-password/`, `login-with-password/`, `change-password/`
- Yangi: `src/components/PasswordInput.tsx`, `PasswordStrengthMeter.tsx`, `ChangePasswordCard.tsx`
- Yangi: `src/lib/passwordValidation.ts`
- O'zgaradi: `src/pages/Auth.tsx`, `src/pages/Settings.tsx`

Tasdiqlasangiz, migration bilan boshlayman.