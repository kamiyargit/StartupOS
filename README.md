# Kartin

A modern business management platform that helps teams manage expenses, income, meetings, tasks, suppliers, invoices, and business operations in one place.

Persian:

**کارتین (Kartin)** یک پلتفرم جامع برای مدیریت کسب‌وکار است که با هدف ساده‌سازی فرآیندهای روزانه طراحی شده است.

### چرا Kartin؟

اسم «کارتین» (Kartin) ترکیبی فارسی-انگلیسی است: از «کار» + پسوند تک‌واری «-ین»، که هم کوتاه و ساده به یاد سپردنی است و هم به‌طور مستقیم به مفهوم کار و مدیریت کسب‌وکار اشاره دارد.

این سامانه به جای استفاده از چندین نرم‌افزار مختلف، تمامی ابزارهای مورد نیاز تیم را در یک محیط یکپارچه ارائه می‌کند.

### امکانات فعلی

**هزینه‌ها و مالی**
- مدیریت هزینه‌ها با دسته‌بندی، جستجو و صفحه‌بندی
- پشتیبانی از تومان و دلار
- آپلود فاکتور و پیوست (تصویر / PDF) با پیش‌نمایش درون‌برنامه‌ای
- مدیریت سهم و تسویه تأمین‌کنندگان (financiers)
- ثبت پرداخت سهم، پیش‌پرداخت و بازپرداخت

**درآمد و فاکتور**
- ثبت درآمد با منبع، دسته‌بندی و وضعیت پرداخت
- مدیریت منابع درآمد (مشتری، سرمایه‌گذار، شریک، گرنت و …)
- صدور فاکتور با ردیف‌های کالا/خدمات
- گردش کار وضعیت فاکتور: پیش‌نویس → ارسال‌شده → پرداخت‌شده / سررسید گذشته / لغو
- تغییر وضعیت فاکتور از صفحه درآمد (ارسال، پرداخت، لغو و …)
- ثبت خودکار رکورد درآمد هنگام علامت‌گذاری فاکتور به «پرداخت‌شده»
- لیست صفحه‌بندی‌شده فاکتورها و رکوردهای درآمد
- خروجی PDF فاکتور

**وظایف**
- صف کار (inbox) برای وظایف محول‌شده
- برد کانبان با drag-and-drop بین ستون‌ها
- تنظیمات برد (ادمین): نام برد، ۲ تا ۸ ستون، برچسب فارسی هر ستون
- اولویت، برچسب، دسته‌بندی و سررسید
- درخواست و ثبت تأیید (acknowledgement) توسط اعضای تیم

**صورتجلسات**
- ثبت و آرشیو صورتجلسات هیئت‌مدیره
- وضعیت پیش‌نویس / تأییدشده
- پیوست فایل و انتخاب حاضرین

**تحلیل و گزارش**
- داشبورد تحلیل مالی با نمودار ترکیبی درآمد و هزینه (ماهانه / سالانه)
- سوییچ تومان / دلار برای نمودارها
- درآمد، هزینه و سود/زیان در بازه زمانی
- نمودار دایره‌ای هزینه بر اساس نوع و درآمد بر اساس دسته
- وضعیت سهم و تسویه بین تأمین‌کنندگان
- فیلتر بر اساس سال و ماه شمسی

**مدیریت و امنیت**
- داشبورد ماژولار (صفحه خانه)
- مدیریت کاربران با جستجو، فیلتر نقش و صفحه‌بندی (فقط ادمین)
- انواع هزینه (فقط ادمین)
- احراز هویت دومرحله‌ای (2FA) — اختیاری یا اجباری
- تنظیمات برنامه (ادمین): برندینگ، حداقل سال شمسی، سیاست 2FA
- تنظیمات برد وظایف (ادمین)
- صفحه ورود با لوگو و نام برنامه از تنظیمات
- حالت تاریک / روشن
- نسخه PWA با manifest پویا

**زیرساخت**
- رابط کاربری فارسی (RTL) با تاریخ شمسی و میلادی
- بدون ثبت‌نام عمومی — کاربران توسط ادمین ایجاد می‌شوند
- `noindex` و `robots.txt` برای حفظ حریم خصوصی

### برنامه توسعه

- مدیریت مشتریان (CRM سبک)
- مدیریت پروژه‌ها
- اعلان‌ها
- تقویم کاری
- گزارش‌های پیشرفته‌تر و خروجی Excel
- تجربه موبایل‌محورتر (offline / push)
- شخصی‌سازی کامل برند و white-label

### مناسب برای

- استارتاپ‌ها
- شرکت‌های کوچک و متوسط
- بنیان‌گذاران و شرکا
- تیم‌های در حال رشد
- سازمان‌هایی که به یک ERP سبک نیاز دارند

هدف نهایی پروژه، تبدیل شدن به یک **سیستم‌عامل مدیریتی (Business Operating System)** برای کسب‌وکارهاست؛ جایی که تمام فرآیندهای اصلی شرکت در یک پلتفرم مدرن، امن و یکپارچه مدیریت شوند.

---

English:

## Kartin Workspace

Kartin is an all-in-one business management platform designed to simplify daily business operations.

### Why Kartin?

The name "Kartin" blends the Persian word *kār* (کار — "work") with the suffix *-in*, forming a short, easy-to-remember name that directly evokes the concept of work and business management.

Instead of using multiple disconnected tools, Kartin provides a unified Persian (RTL) workspace for founders, partners, and growing teams.

### Current Features

**Expenses & finance**
- Expense tracking with categories, search, and pagination
- Toman and USD support
- Invoice/file attachments with in-app preview (images & PDF)
- Financier share allocation and settlement tracking
- Payment kinds: own share, advance, reimbursement

**Income & invoicing**
- Income records with sources, categories, and payment status
- Income sources (customer, investor, partner, grant, other)
- Invoices with line items and status workflow (draft → sent → paid / overdue / cancelled)
- Inline invoice status actions on the income page
- Auto income record when an invoice is marked paid
- Paginated invoice and income lists
- PDF invoice export

**Tasks**
- Personal inbox for assigned work
- Kanban board with drag-and-drop between columns
- Admin board settings: board name, 2–8 columns, Persian column labels
- Priority, labels, categories, and due dates
- Team acknowledgement requests and confirmations

**Meeting minutes**
- Board meeting minutes archive
- Draft / approved workflow
- File attachments and attendee picker

**Analytics**
- Combined income vs expense bar chart (monthly / yearly)
- Toman / USD chart toggle
- Period income, expenses, and profit/loss
- Pie charts by cost type and income category
- Financier share status and inter-financier balances
- Jalali year/month filters

**Admin & security**
- Modular home dashboard
- User management with search, role filter, and pagination (admin)
- Cost type management (admin)
- Two-factor authentication (optional or mandatory policy)
- App settings (admin): branding, min Jalali year, 2FA policy
- Task board settings (admin)
- Branded login page from app settings
- Light / dark theme
- PWA with dynamic manifest from app settings

**Platform**
- Persian RTL UI with Jalali and Gregorian dates
- Login-only access — no public registration
- SEO privacy: `noindex`, `robots.txt`

### Planned Features

- Lightweight customer management (CRM)
- Project tracking
- Notifications
- Calendar integration
- Advanced exports and reporting
- Richer mobile / offline experience
- Full white-label branding

### Who is it for?

- Startups
- Small businesses
- Founders and partners
- Growing teams
- Organizations looking for a lightweight ERP

### Vision

Our goal is to build a simple, modern, and secure business operating system that replaces multiple disconnected applications with one integrated platform.

---

## Development

Full-stack Persian (RTL) business workspace — login-only auth, admin-managed users, expenses, income, invoices, tasks, meeting minutes, analytics, and configurable branding.

### Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **PostgreSQL** + **Prisma**
- **Auth.js** (NextAuth v5) credentials + TOTP 2FA
- **Tailwind CSS 4** + shadcn-style components
- **Recharts** for analytics
- **dayjs** + **jalaliday** for Jalali dates

### Modules & routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Module launcher / home |
| `/expenses` | Expense list (search, pagination) |
| `/expenses/new`, `/expenses/[id]` | Create / view / edit expense |
| `/meeting-minutes` | Meeting minutes archive |
| `/meeting-minutes/new`, `/meeting-minutes/[id]` | Create / view minutes |
| `/tasks` | Task inbox |
| `/tasks/board` | Kanban board (drag-and-drop) |
| `/tasks/new`, `/tasks/[id]` | Create / view task |
| `/income` | Invoices (status actions) + income records |
| `/income/new` | Record income |
| `/income/invoices/new` | Create invoice |
| `/analytics` | Financial analytics dashboard |
| `/admin/users` | User management — search, role filter, pagination (admin) |
| `/admin/cost-types` | Cost categories (admin) |
| `/settings/security` | 2FA setup |
| `/settings/app` | Branding, min Jalali year, 2FA policy (admin) |
| `/settings/tasks` | Kanban board columns & labels (admin) |

### API highlights

| Endpoint | Description |
|----------|-------------|
| `GET/PATCH/DELETE /api/invoices/[id]` | View, update status, soft-delete invoice |
| `GET /api/invoices/[id]/pdf` | Printable invoice HTML/PDF |
| `GET/PATCH /api/task-boards` | Read / configure Kanban columns |
| `GET /api/task-meta` | Task labels and categories |
| `POST /api/income/sources` | Create income source |
| `GET/DELETE /api/files/[id]` | Stream attachment / soft-delete |

### Quick start (local)

```bash
pnpm install
cp env.production.expenses.example .env   # or create .env with DATABASE_URL, AUTH_SECRET, etc.
# Start Postgres (or: docker compose up db -d)
pnpm db:push
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 — default admin from `.env`:

- Email: `admin@kartin.local` (or `ADMIN_EMAIL`)
- Password: value of `ADMIN_PASSWORD` (default in seed: `change-me-on-first-deploy`)

Optional sample cost types:

```bash
pnpm db:seed:fresh
```

### Docker (development)

One container (`kartin-app-dev`) serves **both** the setup portal and tenant apps. Routing is by hostname (`KARTIN_UNIFIED_DEV=true`):

```bash
docker compose up --build -d
# or: pnpm docker:up
```

| URL | Role |
|-----|------|
| http://localhost:5568/setup | Setup portal |
| http://{slug}.localhost:5568 | Tenant app after provisioning (e.g. `acme.localhost:5568`) |

- Postgres: `localhost:5433` (user/db/password: `kartin`, control DB: `kartin_control`)
- Uploads: Docker volume `upload_data_dev`

If upgrading from the old two-container dev setup, reset local DB volumes once: `docker compose down -v`

### Docker (production)

Production SaaS runs on **kartin.ir** / **portal.kartin.ir** (cloud multi-tenant). Self-hosted VPS deployment is temporarily disabled (`ENABLE_SELF_HOSTED=false`); see [DEPLOY_VPS.md](./DEPLOY_VPS.md) for when it is re-enabled.

#### Quick deploy (Windows)

```powershell
.\scripts\build-and-deploy-to-vps.ps1
```

Or double-click `scripts\run-deploy.bat`.

#### Manual production (on server)

1. Copy `env.production.expenses.example` to `.env` on the server and set strong secrets:

```env
AUTH_SECRET=<long-random-string>
ADMIN_PASSWORD=<strong-password>
POSTGRES_PASSWORD=<strong-password>
NEXTAUTH_URL=https://expenses.cuty.center
```

2. Point `expenses.cuty.center` DNS to your server.

3. Deploy via scripts above, or on the server after building images locally:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

TLS is handled by Cuty Platform nginx; this stack does not bind host 80/443.

### SEO / privacy

- `robots.txt` disallows all crawlers
- `noindex, nofollow` meta + `X-Robots-Tag` header
- No public registration

### Default seeded data

- Admin user from env vars (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- App settings (name, logo, theme color, min Jalali year)
- Task labels: فوری، همکاری، مالی
- Income categories: فروش محصول، خدمات، مشاوره
- Cost types (with `--fresh-seed-data` only): Host, SMS-Panel, mapAPI

### Backup (production)

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U kartin kartin > backup.sql
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:seed` | Seed admin + essential metadata |
| `pnpm db:seed:fresh` | Seed + sample cost types |
| `pnpm db:migrate` | Prisma migrate dev |
