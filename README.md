# TCPS Professional Development Portal

A role-based internal professional development portal for TC Professional Services. The application supports employee ACCA/PER tracking, manager review workflows, organisation-level administration, reporting, announcements, and profile management.

The repository is a working Next.js application backed by Supabase and deployed through Vercel.

## Stack

- **Next.js 14 / App Router** — application and server-rendered pages
- **React 18 + TypeScript** — UI and type safety
- **Tailwind CSS** — responsive styling
- **Supabase** — PostgreSQL, Authentication, Row Level Security and server-side data access
- **Vercel** — production hosting and GitHub-based deployments

## Current portal structure

### Employee

- Dashboard
- Exams
- PER Objectives
- Documents
- Updates
- Profile

Employees can maintain their own exam and PER progress, submit objectives for approval, maintain evidence notes, view updates and manage their profile.

### Manager

- Dashboard
- Exams
- PER Objectives
- Team
- Approvals
- Reports
- Updates
- Profile

Managers see team-scoped progress, review submitted PER objectives and access reports for employees assigned to them.

### Admin

- Dashboard
- Exams
- PER Objectives
- People
- Approvals
- Reports
- Admin
- Roles & Access
- Updates
- Profile

Administrators have organisation-level visibility and can manage people, roles, account status and portal configuration.

## Important data rules

- The portal currently treats **22 PER objectives** as the source-of-truth total.
- The portal currently treats **13 ACCA exam papers** as the tracked exam total.
- Do not introduce a different hard-coded objective total in individual pages or components.
- Manager reporting is scoped through `profiles.manager_id`.
- Admin reporting is organisation-wide.
- Approval actions must remain protected by authenticated role checks and database security rules.

## Main routes

| Area | Route | Intended access |
|---|---|---|
| Login | `/login` | Public |
| Signup | `/signup` | Public |
| Password recovery | `/forgot-password` | Public |
| Dashboard | `/dashboard` | Authenticated |
| Exams | `/exams` | Authenticated |
| PER Objectives | `/per-objectives` | Authenticated |
| Documents | `/documents` | Employee / authenticated users where enabled |
| Updates | `/announcements` | Authenticated |
| Profile | `/profile` | Authenticated |
| Team | `/manager` | Manager / Admin |
| Approvals | `/approvals` | Manager / Admin |
| Reports | `/reports` | Manager / Admin |
| People | `/employees` | Admin |
| Admin | `/admin` | Admin |
| Roles & Access | `/admin/roles` | Admin |
| Branding | `/admin/branding` | Admin |

Route access is enforced in `middleware.ts` and sensitive API endpoints perform their own server-side role checks. UI navigation is not treated as a security boundary.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Set the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` must only exist in trusted server/Vercel environment variables. Never expose it to client-side code and never commit it to Git.

### 3. Run the application

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Validate before pushing

```bash
npm run lint
npm run typecheck
npm run build
```

A production deployment should not be considered ready until the TypeScript check and production build both pass.

## Supabase setup

The database schema is maintained under `supabase/`.

For a fresh development environment:

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Configure Authentication for internal users.
4. Create the first admin account.
5. Set the corresponding profile role to `admin`.
6. Configure the same environment variables in Vercel.

The production database should not be reset or replaced with the development schema. Schema changes should be additive and reviewed before production rollout.

## Authentication and access control

The application uses Supabase Auth with server-side session handling.

The middleware performs these high-level checks:

1. Unauthenticated users are redirected to `/login`.
2. Pending, rejected and inactive profiles are prevented from entering the portal.
3. `/admin/*` requires the `admin` role.
4. Manager-only areas require `manager` or `admin`.
5. Sensitive API routes perform an additional server-side authorization check.

This layered approach is intentional: hiding a navigation item is not sufficient to protect data.

## Deployment

The production application is hosted on Vercel and connected to this GitHub repository.

Recommended deployment flow:

1. Make changes on a feature branch.
2. Run lint, typecheck and production build locally.
3. Push the branch and review the Vercel preview deployment.
4. Verify the affected role flows in the preview.
5. Merge to `main` only after the preview is healthy.
6. Confirm the production deployment after merge.

Production URL:

`https://tcps-portal-n.vercel.app`

## Known limitations and next improvements

The portal is functional, but the following areas should be treated as planned improvements rather than assumed to be complete:

- **Document storage:** the current PER workflow has evidence notes; a full Supabase Storage-backed document/evidence system is still a separate enhancement.
- **Automated notifications:** portal notifications exist in the UI, but a complete email notification pipeline for every approval/status event should be verified before relying on it operationally.
- **Admin data entry:** some exam/PER configuration can still depend on database-backed setup rather than a complete admin configuration workflow.
- **Automated route testing:** a full authenticated smoke-test suite for employee, manager and admin routes should be added.
- **Dependency maintenance:** Next.js and other packages should be upgraded through a deliberate compatibility/security review rather than ad-hoc version changes.
- **Navigation consistency:** keep role navigation, route names and internal links synchronized whenever a section is renamed or moved.

See [`docs/PORTAL_AUDIT.md`](docs/PORTAL_AUDIT.md) for the current structural audit and recommended follow-up work.

## Repository hygiene

- Do not commit `.env.local` or any Supabase service-role credentials.
- Keep production secrets in Vercel/Supabase environment configuration.
- Prefer feature branches and pull requests for application changes.
- Keep documentation and route names synchronized with the actual application.
- Avoid maintaining duplicate components when a canonical implementation already exists under `components/` or `app/`.

## Troubleshooting

### Vercel says a module cannot be resolved

Check the import path and confirm the file exists with the same capitalization. Linux-based Vercel builds are case-sensitive even when a local Windows development environment is not.

### Material Symbols appear as text

The navigation uses the `Material Symbols Outlined` font. Confirm that `app/globals.css` contains the font import and `.material-symbols-outlined` definition before changing individual navigation links.

### A role can see an unexpected page

Check both:

- the navigation definition in `components/Nav.tsx`
- the server-side access logic in `middleware.ts` and the affected page/API route

Navigation visibility alone must never be used as authorization.

## Project documentation

- [`docs/PORTAL_AUDIT.md`](docs/PORTAL_AUDIT.md) — current structural audit, risks and follow-up plan
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — development and change workflow
- [`SECURITY.md`](SECURITY.md) — security expectations and vulnerability reporting

## Maintainer

TC Professional Services internal development team.
