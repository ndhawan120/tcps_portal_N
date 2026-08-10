# TCPS Professional Development Portal

A real, working version of the Stitch mockups: employee/manager/admin
dashboards, ACCA exam tracking, PER objective submission, and a manager
approval workflow — backed by a real database and login.

Stack (all free tiers):
- **Next.js 14** (App Router) — the application
- **Supabase** — Postgres database + authentication + row-level security
- **Vercel** — hosting, deploys straight from GitHub

---

## 1. Create your Supabase project (free, no card needed)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub or email.
2. **New project** → name it `tcps-portal`, set a database password (save it somewhere safe), pick the region closest to you (e.g. London/EU West).
3. Wait ~2 minutes for it to provision.
4. In the left sidebar go to **SQL Editor** → **New query**.
5. Open `supabase/schema.sql` from this project, paste the whole file in, and click **Run**. This creates all the tables, security rules, and the auto-profile trigger.
6. Go to **Project Settings → API**. Copy:
   - **Project URL**
   - **anon public** key

   You'll need both in step 3.

7. Go to **Authentication → Providers** and make sure **Email** is enabled (it is by default). For an internal tool, under **Authentication → Settings**, you can turn off "Confirm email" if you'd rather add users manually without them needing to click a confirmation link.

## 2. Create your first user (yourself, as admin)

1. In Supabase, go to **Authentication → Users → Add user → Create new user**. Enter your TC Group email and a temporary password.
2. Go to **Table Editor → profiles** — you should see a row was auto-created for you (first/last name will say "New User" — edit them in that table directly, or edit later in the app).
3. In the same row, set **role** to `admin`. This makes you the first admin so you can manage everyone else from inside the app afterwards.

## 3. Run it locally first (recommended, 5 minutes)

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and paste in your Supabase URL and anon key from step 1.6.

```bash
npm run dev
```

Open http://localhost:3000 and log in with the account you created in step 2. Confirm the admin panel loads and you can see your own user.

## 4. Push to GitHub (free)

```bash
git init
git add .
git commit -m "Initial TCPS portal"
```

Create a new empty repo at https://github.com/new (private is fine), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/tcps-portal.git
git branch -M main
git push -u origin main
```

## 5. Deploy on Vercel (free)

1. Go to https://vercel.com → sign up/sign in with GitHub.
2. **Add New → Project** → import the `tcps-portal` repo you just pushed.
3. Before deploying, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
4. Click **Deploy**. In about a minute you'll get a live URL like `tcps-portal.vercel.app`.
5. Every time you push new commits to `main`, Vercel redeploys automatically.

## 6. Add the rest of the team

For each person:
1. Supabase → **Authentication → Users → Add user**, using their TC Group email.
2. In the live app, log in as admin → **Admin** tab → set their **role** (employee/manager/admin).
3. To link an employee to a manager for team reporting, in Supabase **Table Editor → profiles**, set that employee's `manager_id` to the manager's `id`.
4. To add someone's PER objectives and exams to track, insert rows into `per_objectives` and `exams` via the Table Editor (see `supabase/seed_example.sql` for the exact format), or extend the admin panel later to do this from the UI.

Send people their login email + a temporary password, and have them log in at your Vercel URL.

## 7. Optional: custom domain

Vercel's free tier includes the `.vercel.app` subdomain at no cost. If TC Group
wants this on your own domain (e.g. `progress.tc-group.com`), that requires
DNS access to the tc-group.com domain — check with whoever manages TC Group's
DNS/IT, then add the domain under Vercel → Project → Settings → Domains
(still free — you just point a DNS record at Vercel).

---

## What's built vs what's a starting point

**Working now:** login/logout, role-based access (employee/manager/admin see
different pages), employee dashboard with live progress stats, PER objective
submission, manager approve/reject workflow with an audit trail, exam
tracker, admin user list with role management.

**Reasonable next steps:** file/evidence upload for PER objectives (Supabase
Storage is free tier too and drops in easily), email notifications on
approval/rejection (Supabase has a free-tier integration for this), letting
admins add PER objectives/exams from the UI instead of the Supabase table
editor, and the Google Business Profile / reporting-style views from the
other mockups (documents, reports pages) if you want those built out too.
