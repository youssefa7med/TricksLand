# TricksLand Academy — Management System

Internal operations platform for managing coaches, courses, session tracking, and monthly payroll invoicing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS + Glassmorphism design system |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Email OTP (passwordless) |
| Email | Resend API via Supabase Edge Functions |
| i18n | next-intl (English + Arabic / RTL) |
| Deployment | Vercel + Supabase (hosted) |

---

## Features

- **Admin**: Full CRUD on coaches, courses, sessions, adjustments; invoice preview & email dispatch
- **Coach**: View assigned courses, log/edit own sessions, view adjustments and invoices (read-only)
- **Invoicing**: Automatic calculation — sessions + bonuses − discounts = net payable, sent via email
- **Bilingual**: English and Arabic (RTL) with one-click language toggle in the navbar
- **Secure**: Row-Level Security on all tables — coaches only see their own data

---

## Setup Guide (Beginner Friendly)

### Step 1 — Create a Supabase account

1. Go to [supabase.com](https://supabase.com) → **Sign Up** → verify your email

### Step 2 — Create a new project

1. Click **New Project**
2. Name it `tricksland`
3. Set a strong database password — **save it somewhere safe**
4. Choose the region closest to your users:
   - For Egypt: select **Europe (Frankfurt)** or Middle East if available
5. Wait ~2 minutes for the project to be ready

### Step 3 — Get your API keys

1. Go to **Project Settings → API**
2. Copy these three values:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public key** (safe to use in frontend)
   - **service_role key** (secret — never expose in frontend)

### Step 4 — Configure environment variables

```bash
# Copy the example file
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 5 — Enable Email OTP authentication

1. Go to **Authentication → Providers → Email**
2. Make sure **Enable Email Provider** is ON
3. Click **Save**

### Step 6 — Run SQL migrations

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open `supabase/migrations/20260211_initial_schema.sql` → paste content → click **Run**
3. Open `supabase/migrations/002_overlap_trigger.sql` → paste content → click **Run**
4. Run these additional RLS policies:

```sql
-- Allow coaches to create their own profile on self-registration
CREATE POLICY "Users can create their own coach profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid() AND role = 'coach');

-- Allow users to update their own profile (Settings page)
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());
```

### Step 7 — Create the first Admin account

1. Go to **Authentication → Users → Add User → Create New User**
2. Enter your email address
3. Go to **SQL Editor** and run:

```sql
-- Replace with your actual details
INSERT INTO profiles (id, full_name, email, role)
SELECT id, 'Your Name', 'your-email@example.com', 'admin'
FROM auth.users
WHERE email = 'your-email@example.com';
```

4. Go to the login page → enter your email → check inbox for OTP code → sign in

### Step 8 — Set up invoice emails (Resend)

1. Go to [resend.com](https://resend.com) → sign up → go to **API Keys → Create API Key**
2. Log in to Supabase CLI:

```bash
npx supabase login
```

3. Deploy the edge function (replace `your-project-ref` with your actual project ref):

```bash
npx supabase functions deploy send-invoices --project-ref your-project-ref
```

4. Set secrets:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_key --project-ref your-project-ref
npx supabase secrets set ADMIN_EMAIL=admin@youracademy.com --project-ref your-project-ref
npx supabase secrets set APP_URL=https://your-app.vercel.app --project-ref your-project-ref
```

### Step 9 — Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → redirects to login page.

### Step 10 — Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select your repo
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**
5. In Supabase → **Authentication → URL Configuration** → add your Vercel URL to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## Project Structure

```
app/
├── [locale]/
│   ├── (auth)/login/          — Login & registration (EN/AR)
│   ├── (protected)/
│   │   ├── admin/
│   │   │   ├── dashboard/     — Stats + recent sessions
│   │   │   ├── courses/       — Course CRUD + coaches + students + rates
│   │   │   ├── sessions/      — Session list, log, edit
│   │   │   ├── adjustments/   — Bonus/discount management
│   │   │   ├── coaches/       — Coach CRUD + invite
│   │   │   └── invoices/      — Monthly invoices + email dispatch
│   │   ├── coach/
│   │   │   ├── dashboard/     — Personal overview
│   │   │   ├── courses/       — Assigned courses + students
│   │   │   ├── sessions/      — Log + edit own sessions
│   │   │   ├── adjustments/   — Read-only bonuses/discounts
│   │   │   └── invoices/      — Read-only monthly earnings
│   │   └── settings/          — Profile settings
api/
└── admin/coaches/             — Server routes (coach create/delete using service role)
supabase/
├── migrations/
│   ├── 20260211_initial_schema.sql   — Tables, RLS, triggers, views
│   └── 002_overlap_trigger.sql       — Overlap prevention trigger
└── functions/
    └── send-invoices/         — Deno edge function for invoice emails
components/
├── layout/
│   ├── Navbar.tsx             — Navigation + EN/AR language switcher
│   └── GlassCard.tsx          — Glassmorphism card component
messages/
├── en.json                    — English translations
└── ar.json                    — Arabic translations
```

---

## Roles

| Role | Access |
|---|---|
| **Admin** | Full CRUD on everything, invoice management, coach creation |
| **Coach** | Own sessions only, read-only adjustments and invoices |

> Students are stored as plain text names inside courses — no login, no portal.

---

## Business Rules

- **Rate resolution**: Rate is per (coach + course) combination, as of session date. No rate = session rejected.
- **Replacement coach**: `paid_coach_id` always gets paid. `originally_scheduled_coach_id` is informational.
- **Invoice formula**: `SUM(session subtotals) + SUM(bonuses) − SUM(discounts) = net payable`
- **Overlap prevention**: Two sessions for the same coach on the same date cannot overlap (DB trigger)
- **Cross-midnight**: Sessions must end on same day they start (`end_time > start_time`)
- **Rate history**: Append-only — add new `effective_from` entries, never delete old rates

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Supabase anon key (safe for frontend) |
| `NEXT_PUBLIC_APP_URL` | `.env.local` | App URL (`http://localhost:3000` locally) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Service role key — server-side only, never expose |
| `RESEND_API_KEY` | Supabase secrets | Resend.com API key for sending emails |
| `ADMIN_EMAIL` | Supabase secrets | Email that receives admin invoice summaries |
| `APP_URL` | Supabase secrets | Production URL for edge function email links |

---

## Adding Additional Admins

Run in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'new-admin@example.com';
```
