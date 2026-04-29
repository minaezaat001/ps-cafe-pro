# دليل رفع المشروع أونلاين مجاناً (Deployment Guide)

لرفع مشروع **PS Cafe Pro** أونلاين مجاناً والحصول على رابط (Domain) خاص بك، سنستخدم أفضل الأدوات المتوفرة حالياً لمشاريع Next.js.

> [!IMPORTANT]
> بما أن المشروع يستخدم قاعدة بيانات **SQLite** (ملف محلي)، فهي لن تعمل على المواقع المجانية (Vercel) لأنها تتطلب قاعدة بيانات سحابية. سنقوم بتحويلها إلى **PostgreSQL** مجانية.

## 1. إعداد قاعدة البيانات (مجانية)
أنصح باستخدام **Supabase** أو **Neon**:
1. قم بإنشاء حساب على [Supabase](https://supabase.com/) أو [Neon.tech](https://neon.tech/).
2. أنشئ مشروعاً جديداً.
3. انسخ رابط الاتصال (Connection String) والذي سيبدو هكذا:
   `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

## 2. تعديل كود Prisma
يجب إخبار التطبيق باستخدام Postgres بدلاً من SQLite:
1. افتح ملف [prisma/schema.prisma](file:///c:/Users/minae/OneDrive/Desktop/PcAppMaster/ps-cafe-pro/prisma/schema.prisma).
2. قم بتعديل الجزء العلوي ليصبح:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 3. رفع الكود على GitHub
1. قم بإنشاء مستودع (Repository) جديد على [GitHub](https://github.com/).
2. ارفع ملفات المشروع عليه (تأكد من وجود ملف [.gitignore](file:///c:/Users/minae/OneDrive/Desktop/PcAppMaster/ps-cafe-pro/.gitignore) لمنع رفع ملف `dev.db`).

## 4. الرفع على Vercel (Host & Domain)
هذا هو الجزء الأسهل للحصول على رابط مجاني:
1. ادخل على [Vercel](https://vercel.com/) واربط حسابك بـ GitHub.
2. اختر مشروع `ps-cafe-pro` واضغط **Import**.
3. في قسم **Environment Variables**، أضف المتغير التالي:
   - **Key:** `DATABASE_URL`
   - **Value:** (رابط الاتصال الذي نسخته من Supabase/Neon)
4. اضغط **Deploy**.

## 5. تشغيل قاعدة البيانات لأول مرة
بعد انتهاء الرفع، ستحتاج لإنشاء الجداول في Postgres. يمكنك فعل ذلك من جهازك بتشغيل الأمر:
```bash
npx prisma db push
```
*(تأكد من وضع رابط `DATABASE_URL` في ملف `.env` محلياً قبل تشغيل الأمر)*.

---

### النتيجة النهائية
ستحصل على رابط مثل `ps-cafe-pro.vercel.app` يعمل أونلاين من أي مكان في العالم!

> [!TIP]
> إذا واجهت أي مشكلة في ربط Postgres، أخبرني وسأساعدك في تعديل ملف الـ Schema فوراً.
