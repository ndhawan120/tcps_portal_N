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

### Manager

- Dashboard
- Exams
- PER Objectives
- Team
- Approvals
- Reports
- Updates
- Profile

### Admin

- Dashboard
- Exams
- PER Objectives
- Team
- People
- Approvals
- Reports
- Admin
- Roles & Access
- Updates
- Profile

### Navigation principles

- **Dashboard** is an action/summary centre, not a duplicate record-management page.
- **People** is the source of truth for user records and access-related people actions.
- **Team** is the source of truth for team structure and progress views. Managers see their direct reports; admins see the organisation-wide employee scope.
- **Approvals** is the source of truth for PER approval workflow.
- **Reports** is for analysis and KPIs, not another copy of employee records.
- **Updates** is for announcements and communication.
- **Admin / Roles & Access** are reserved for system configuration and permissions.
- Important dashboard cards and summary rows should link to the relevant source page instead of reproducing the full dataset.

The role navigation is defined in `components/Nav.tsx`. Route protection is handled separately by `middleware.ts` and individual sensitive API handlers.

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
| Documents | `/documents` | Employee |
| Updates | `/announcements` | Authenticated |
| Profile | `/profile` | Authenticated |
| Team | `/manager` | Manager / Admin |
| Approvals | `/approvals` | Manager / Admin |
| Reports | `/reports` | Manager / Admin |
| People | `/employees` | Admin |
| Admin | `/admin` | Admin |
| Roles & Access | `/admin/roles` | Admin |
| Branding | `/admin/branding` | Admin |

The `/manager` route intentionally supports both managers and admins: managers receive their direct-report scope, while admins receive the organisation-wide active-employee scope. The visible navigation label remains **Team** for both roles.

## Internal linking journey

The preferred navigation journey is:

- Employee: `Dashboard → PER Objectives → Documents` when working on evidence, and `Dashboard → Exams` for exam actions.
- Manager: `Dashboard → Team → Employee detail`, `Dashboard → Approvals → review`, and `Dashboard → Reports` for analysis.
- Admin: `Dashboard → Team` for organisation-wide people progress, `Dashboard → People` for user management, `Dashboard → Approvals` for workflow, and `Dashboard → Reports` for analysis.
- Source pages should link onward to the next logical action rather than creating duplicate copies of the same information.

When a route is renamed or moved, update `components/Nav.tsx`, internal `Link` targets, middleware protection, and README route documentation together.

## Local development

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it through a `NEXT_PUBLIC_*` variable, client component or committed file.

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### Validate a release

```bash
npm run check
```

`npm run check` runs lint, TypeScript validation and the production build in sequence.

## Supabase setup

The database schema is maintained under `supabase/`.

For a fresh development environment:

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Configure Authentication for internal users.
4. Create the first admin account.
5. Set the corresponding profile role to `admin`.
6. Configure the same environment variables in Vercel.

Do not reset or replace the production database with a development schema. Production schema changes should be reviewed and applied deliberately.

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

Recommended flow:

1. Work on a feature branch.
2. Run `npm run check`.
3. Review the Vercel preview deployment.
4. Verify the affected employee, manager and admin flows.
5. Merge to `main` only after the preview is healthy.
6. Confirm the production deployment after merge.

Production URL:

`https://tcps-portal-n.vercel.app`

## Current known flaws / follow-up work

The portal is functional, but these items should not be considered finished:

- **Document storage:** the current PER workflow supports evidence notes; a full file-upload/storage workflow still needs Supabase Storage, metadata, access rules and retention behavior.
- **Automated notifications:** the notification UI exists, but the complete email/status-event pipeline should be verified before relying on it operationally.
- **Admin configuration:** some exam/PER setup can still depend on database-backed configuration rather than a complete admin UI workflow.
- **Automated route testing:** authenticated smoke tests for employee, manager and admin flows are still needed.
- **Dependency maintenance:** package upgrades should be handled as deliberate compatibility/security updates followed by `npm run check`.
- **Configuration centralization:** totals such as 22 PER objectives and 13 exams should eventually come from one configuration/source rather than being repeated as constants across pages.

## Repository hygiene

- Never commit `.env.local` or Supabase service-role credentials.
- Keep production secrets in Vercel/Supabase environment configuration.
- Prefer feature branches and pull requests for application changes.
- Keep documentation and route names synchronized with the application.
- Avoid duplicate implementations of shared components.
- Treat server-side authorization as the security boundary.

## Troubleshooting

### Vercel says a module cannot be resolved

Check the import path and confirm the file exists with exactly the same capitalization. Vercel builds on Linux, so filename casing must match imports exactly.

### Material Symbols appear as text

The navigation uses the `Material Symbols Outlined` font. Confirm `app/globals.css` contains both the font import and `.material-symbols-outlined` definition before changing navigation links.

### A role sees an unexpected page

Check both:

- `components/Nav.tsx` for navigation visibility
- `middleware.ts` and the affected page/API route for server-side authorization

Navigation visibility alone must never be used as authorization.

## Maintainer

TC Professional Services internal development team.
