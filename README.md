# PS-Cafe-Pro

نظام إدارة كافيهات PS-Cafe-Pro — لوحة تحكم متكاملة لإدارة الأجهزة، الجلسات، المخزون، المبيعات، الورديات، والتقارير.

---

## المحتويات

- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [التثبيت الكامل (Offline - SQLite)](#التثبيت-الكامل-offline---sqlite)
- [أول مرة تشغيل + إنشاء مستخدم](#أول-مرة-تشغيل--إنشاء-مستخدم)
- [التشغيل اليومي (After Build)](#التشغيل-اليومي-after-build)
- [تعديل بيانات أو إضافة أجهزة](#تعديل-بيانات-أو-إضافة-أجهزة)
- [النشر على Vercel (Online)](#النشر-على-vercel-online)
- [جميع أوامر التيرمينال](#جميع-أوامر-التيرمينال)
- [استكشاف الأخطاء](#استكشاف-الأخطاء)
- [بنية الملفات](#بنية-الملفات)

---

## المتطلبات الأساسية

### اللي لازم يكون موجود على الجهاز

1. **Node.js** — إصدار 18 أو أحدث
2. **npm** — إصدار 9 أو أحدث (بييجي مع Node.js تلقائي)

### طريقة التحميل

- روح على https://nodejs.org
- نزّل النسخة **LTS** (الأحدث)
- شغّل الملف اللي نزّلته — Next Next Finish
- **أعد تشغيل الجهاز** عشان التغييرات ت生效

### التأكد من التثبيت

افتح **Command Prompt (cmd)** أو **PowerShell** واكتب:

```bash
node --version
npm --version
```

لو ظهرت أرقام زي `v18.x.x` و `9.x.x` يبقى تمام.

---

## التثبيت الكامل (Offline - SQLite)

> SQLite شغال محلياً — مش محتاج إنترنت ولا سيرفر خارجي.

### الخطوة 1: حمل المشروع

```bash
# لو عندك ملف ZIP، فك الضغط على مجلد
# وادخل المجلد من التيرمينال:
cd C:\Users\اسمك\Desktop\ps-cafe-pro
```

> **لو ملف ZIP**: اضغط كليك يمين على الملف → Extract All → اختار مجلد على سطح المكتب.
>
> **لو معاك Git:**
> ```bash
> git clone https://github.com/minaeldahshan/ps-cafe-pro.git
> cd ps-cafe-pro
> ```

### الخطوة 2: ثبت الحزم

في التيرمينال (جوا مجلد المشروع):

```bash
npm install
```

> هتظهر رسايل وورننغ — عادي طالما مش Error أحمر.
>
> لو ظهر Error، ارجع لـ [استكشاف الأخطاء](#استكشاف-الأخطاء).

### الخطوة 3: أنشئ قاعدة البيانات

```bash
npm run db:sqlite:push
```

> ❗**مرة واحدة فقط** - اول مرة. الأمر ده بيخلق ملف `prisma/dev.db` (قاعدة البيانات) وكل الجداول.

### الخطوة 4: اعمل Build (تجميع البرنامج)

```bash
npm run build:sqlite
```

> **❗أهم خطوة.** لازم تعمل build بعد أي تغيير في الكود أو بعد أول تثبيت.
>
> البيلد بياخد من 30 ثانية لدقيقة. لو ظهر `✓ Compiled successfully` يبقى تمام.

### الخطوة 5: شغل البرنامج

```bash
npm run start:sqlite
```

> الرسالة اللي هتظهر:
> ```
> ▲ Next.js 16.2.1
> - Local: http://localhost:3000
> ```
>
> **خلي التيرمينال مفتوح** — لو قفلته، السيرفر يقفل.

### الخطوة 6: افتح المتصفح

افتح **http://localhost:3000**

---

## أول مرة تشغيل + إنشاء مستخدم

### طريقة 1: Sign-up من الموقع (أسهل)

1. افتح `http://localhost:3000/sign-up`
2. اكتب:
   - **Username** (اسم المستخدم — أي حاجة)
   - **Password** (كلمة السر)
   - **Phone** (رقم التليفون — اختياري)
3. اضغط **Create Account**
4. هتتحول تلقائي للوحة التحكم
5. ابدأ أضف أجهزة من **Settings → Devices**

### طريقة 2: Seed Script (بيانات تجريبية)

لو عايز تبدأ بشوية بيانات جاهزة (أجهزة، مخزون، مستخدم):

1. أوقف السيرفر الأول (اضغط `Ctrl+C` في التيرمينال)
2. شغّل:

```bash
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed.ts
```

3. ارجع شغل السيرفر:

```bash
npm run start:sqlite
```

---

## التشغيل اليومي (After Build)

> بعد ما خلصت أول مرة (install + build + db:push)، كل ما تبدأ شغل جديد:

### لو التيرمينال لسه مفتوح من قبل كده:
1. اضغط `Ctrl+C` عشان توقف السيرفر القديم
2. اكتب تاني:

```bash
npm run start:sqlite
```

### لو قفلت التيرمينال وفتحته جديد:

```bash
cd C:\Users\اسمك\Desktop\ps-cafe-pro
npm run start:sqlite
```

> **مش محتاج تعيد build ولا install** — ده مرة واحدة أول مرة بس.

افتح **http://localhost:3000**

---

## تعديل بيانات أو إضافة أجهزة

### لو عايز تضيف أجهزة أو تعدل حاجة

1. أوقف السيرفر (`Ctrl+C`)
2. شغّل Prisma Studio (واجهة قاعدة البيانات):

```bash
npm run db:sqlite:studio
```

3. هتفتح صفحة في المتصفح تقدر منها تضيف/تعدل/تمسح أي حاجة
4. بعد ما تخلص، اقفل Prisma Studio
5. ارجع شغل السيرفر:

```bash
npm run start:sqlite
```

### لو غيرت حاجة في الكود (مثلاً عدلت ملفات)

```bash
npm run build:sqlite    # أعد البيلد
npm run start:sqlite    # شغل تاني
```

---

## النشر على Vercel (Online)

> عشان تخلي البرنامج متاح على الإنترنت.

### 1. اعمل PostgreSQL database

- روح https://neon.tech
- اعمل حساب (Sign Up with GitHub أو Google)
- اعمل **New Project**
- Region اختار **EU (West) — Frankfurt** (الأقرب لمصر)
- بعد ما يتعمل، ظبط **Connection string** (اللي بيبدأ بـ `postgresql://...`)

### 2. ارفع الكود على GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/اسمك/ps-cafe-pro.git
git push -u origin main
```

### 3. اربط مع Vercel

- روح https://vercel.com
- اعمل حساب بنفس إيميل GitHub
- اضغط **Add New → Project**
- اختار الـ Repository بتاعك (`ps-cafe-pro`)
- في صفحة الإعدادات، ضيف **Environment Variables**:

| الاسم | القيمة |
|-------|--------|
| `DATABASE_URL` | `postgresql://neondb_owner:...` (اللي خدته من Neon) |
| `JWT_ACCESS_SECRET` | `your-random-secret-at-least-32-chars-long` |
| `JWT_REFRESH_SECRET` | `another-random-secret-at-least-32-chars-long` |
| `NEXT_PUBLIC_APP_URL` | `https://ps-cafe-pro.vercel.app` (أو اسم مشروعك) |

- اضغط **Deploy**
- استنى شوية — هيشتغل تلقائي

### 4. push قاعدة البيانات (من التيرمينال المحلي)

تأكد إن `.env` فيه `DATABASE_URL` بتاعة Neon، وشغّل:

```bash
npm run db:push
```

---

## جميع أوامر التيرمينال

### SQLite (Offline — على الجهاز المحلي)

| الأمر | يعمل إيه | تشغيله أول مرة بس؟ |
|-------|----------|-------------------|
| `npm install` | تثبيت كل الحزم المطلوبة | ✅ مرة واحدة |
| `npm run db:sqlite:push` | إنشاء قاعدة البيانات | ✅ مرة واحدة |
| `npm run build:sqlite` | بناء البرنامج (Compile) | ✅ مرة واحدة |
| `npm run start:sqlite` | تشغيل البرنامج على `localhost:3000` | ❌ كل مرة تشغيل |
| `npm run db:sqlite:studio` | فتح واجهة قاعدة البيانات | ❌ لما تحب تعدل حاجة |
| `npm run db:sqlite:generate` | تجديد الـ Prisma Client (نادر) | ❌ لو ظهر Error |

### PostgreSQL (Online — النشر على Vercel)

| الأمر | يعمل إيه |
|-------|----------|
| `npm run build` | بناء البرنامج لـ PostgreSQL |
| `npm run start` | تشغيل البرنامج ب PostgreSQL |
| `npm run dev` | تشغيل وضع التطوير ب PostgreSQL |
| `npm run db:push` | تحديث قاعدة PostgreSQL |

### ترتيب الأوامر الصحيح (أول مرة Offline)

```bash
cd C:\Users\اسمك\Desktop\ps-cafe-pro

npm install
npm run db:sqlite:push
npm run build:sqlite
npm run start:sqlite
```

### ترتيب الأوامر الصحيح (كل يوم)

```bash
cd C:\Users\اسمك\Desktop\ps-cafe-pro
npm run start:sqlite
```

---

## استكشاف الأخطاء

### `npm install` بيجيب Error

```bash
# لو Error بسبب صلاحيات:
npm install --no-optional

# لو Error في network:
npm cache clean --force
npm install
```

### `npm run build:sqlite` بيظرب Error

- تأكد إنك شغّل `npm run db:sqlite:push` الأول
- احذف `prisma/dev.db` وجرب تاني:

```bash
Remove-Item prisma/dev.db -ErrorAction SilentlyContinue
npm run db:sqlite:push
npm run build:sqlite
```

### السيرفر مش شغال (`localhost:3000` مش مفتوح)

- تأكد إن التيرمينال مفتوح وبيظهر رسالة `http://localhost:3000`
- لو ظهر Error `port 3000 is in use`:

```bash
# غير البورت لـ 3001:
npx next start -p 3001
```

- افتح `http://localhost:3001` في المتصفح بدال 3000

### الصفحة بتظهر "This page couldn’t load"

- أوقف السيرفر (`Ctrl+C`)
- أعد البيلد وشغل تاني:

```bash
npm run build:sqlite
npm run start:sqlite
```

### "Prisma Client could not be found"

```bash
npm run db:sqlite:generate
```

### "Cannot find module" أو "Module not found"

```bash
npm install
npm run db:sqlite:generate
npm run build:sqlite
```

### عايز تبدأ من الصفر (مسح كل البيانات)

```bash
# أوقف السيرفر (Ctrl+C) first
Remove-Item prisma/dev.db -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run db:sqlite:push
npm run build:sqlite
npm run start:sqlite
```

### مشاكل Vercel (Online)

**"This page couldn't load"** على Vercel:
- تأكد إن `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` مضافين في Vercel → Settings → Environment Variables
- اعمل Re-deploy من Vercel Dashboard (Redeploy button)
- لو لسه مش شغال: روح Vercel → Deployments → آخر Deploy →的三个点 → **Redeploy**

**قاعدة البيانات مش بتتصل:**
- تأكد إن `DATABASE_URL` في Vercel نفس اللي في `.env`
- Neon ممكن يكون في sleep — افتح Neon Dashboard واعمل Query عادي عينشط

---

## بنية الملفات

| الملف / المجلد | ده إيه؟ |
|----------------|---------|
| `.env` | إعدادات PostgreSQL للتشغيل العادي |
| `.env.sqlite` | إعدادات SQLite للتشغيل المحلي — استخدم ده للـ offline |
| `prisma/schema.prisma` | مخطط قاعدة PostgreSQL (عليها الـ Decimal و Json) |
| `prisma/schema.sqlite.prisma` | مخطط قاعدة SQLite (عليها Float و String بدالهم) — استخدم ده للـ offline |
| `prisma/dev.db` | **ملف قاعدة البيانات نفسه** — يتكون أول مرة تشغل `db:sqlite:push` |
| `package.json` | ملف المشروع — فيه كل الأوامر والحزم |
| `.next/` | مجلد البيلد — يتكون من `build:sqlite` (متحذفش) |
| `node_modules/` | الحزم المثبتة — يتكون من `npm install` (متحذفش) |
| `src/app/` | صفحات الموقع |
| `src/app/actions/` | أوامر السيرفر (Server Actions) — تسجيل الدخول، الجلسات، إلخ |
| `src/components/` | مكونات الواجهة — الأزرار، البطاقات، القوائم |
| `src/lib/` | المكتبات المشتركة — Auth، DB، الفوترة، المراجعة |
| `prisma/seed.ts` | بيانات تجريبية جاهزة — شغله بـ `npx ts-node prisma/seed.ts` |
