# StartupOS-app

A modern startup management platform that helps teams manage expenses, income, meetings, tasks, suppliers, invoices, and business operations in one place.

Persian:

StartupOS ورک‌اسپیس یک پلتفرم جامع برای مدیریت کسب‌وکار و استارتاپ است که با هدف ساده‌سازی فرآیندهای روزانه طراحی شده است.

این سامانه به جای استفاده از چندین نرم‌افزار مختلف، تمامی ابزارهای مورد نیاز تیم را در یک محیط یکپارچه ارائه می‌کند.

امکانات فعلی

• مدیریت هزینه‌ها
• ثبت صورتجلسات
• مدیریت تأمین‌کنندگان
• مدیریت سهم و تسویه تأمین‌کنندگان
• مدیریت فایل‌ها و اسناد
• داشبورد مدیریتی
• احراز هویت دومرحله‌ای (2FA)
• نسخه PWA

برنامه توسعه

• مدیریت تسک‌ها (برد کانبان و کارتابل)
• مدیریت درآمد
• صدور فاکتور
• مدیریت مشتریان
• مدیریت پروژه‌ها
• گزارش‌ها و تحلیل‌های پیشرفته
• اعلان‌ها
• تقویم کاری
• تجربه کاربری موبایل‌محور
• شخصی‌سازی کامل برند و تنظیمات

این سامانه مناسب است برای:

- استارتاپ‌ها
- شرکت‌های کوچک و متوسط
- بنیان‌گذاران
- شرکا
- تیم‌های در حال رشد

هدف نهایی پروژه، تبدیل شدن به یک سیستم‌عامل مدیریتی (Business Operating System) برای کسب‌وکارهاست؛ جایی که تمام فرآیندهای اصلی شرکت در یک پلتفرم مدرن، امن و یکپارچه مدیریت شوند.

---

English:

## Qti Workspace

Qti Workspace is an all-in-one startup management platform designed to simplify daily business operations.

Instead of using multiple disconnected tools, Qti Workspace provides a unified workspace for founders, partners, and growing teams.

### Current Features

- Expense Management
- Meeting Minutes
- Supplier Management
- Share & Settlement Tracking
- Secure File Attachments
- Dashboard & Reports
- Two-Factor Authentication (2FA)
- Progressive Web App (PWA)

### Planned Features

- Task Management (Board & Inbox)
- Income Management
- Invoice Generation
- Customer Management
- Project Tracking
- Analytics & Reports
- Notifications
- Calendar Integration
- Mobile-first Experience
- Advanced Branding & White-label Support

### Who is it for?

- Startups
- Small Businesses
- Founders
- Business Partners
- Growing Teams
- Organizations looking for a lightweight ERP

### Vision

Our goal is to build a simple, modern, and secure business operating system that replaces multiple disconnected applications with one integrated platform.

---

## Development

Minimal Persian (RTL) expense-tracking webapp — login-only auth, admin-managed users, cost categories, invoice uploads, Jalali/Gregorian dates, and financial dashboards.

### Stack

- Next.js 15+ (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (NextAuth v5) credentials
- Tailwind CSS + shadcn-style components
- Recharts

### Quick start (local)

```bash
pnpm install
cp .env.example .env
# Start Postgres (or use docker compose up db -d)
pnpm db:push
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 — default admin: `admin@cuty.center` / `admin123` (from `.env`).

### Docker (development)

```bash
docker compose up --build
```

App: http://localhost:5568

### Docker (production)

Production runs at **https://expenses.cuty.center** as an isolated stack on the VPS (`/opt/cuty-expenses`). See [DEPLOY_VPS.md](./DEPLOY_VPS.md).

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

- Admin user from env vars
- Cost types: Host, SMS-Panel, mapAPI

### Backup (production)

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U cuty cuty_financial > backup.sql
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:seed` | Seed admin + cost types |
