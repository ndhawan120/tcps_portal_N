# Role navigation audit — 2026-08-14

## Verified decisions

### Employee
Dashboard → Exams / PER Objectives / Documents / Updates / Profile

### Manager
Dashboard → Team / Approvals / Reports / Updates / Profile

### Admin
Dashboard → Team / People / Approvals / Reports / Admin / Roles & Access / Updates / Profile

## Source-of-truth rules
- Dashboard cards are summaries and should link to the detailed module.
- People owns user records and people actions.
- Team owns team/progress views.
- Approvals owns approval workflow.
- Reports owns analysis.
- Admin owns system configuration.
- Roles & Access owns permissions and department configuration.

## Safe cleanup applied
- Admin dashboard no longer embeds the full People management table; it links to People instead.
- Admin dashboard now exposes Team as a first-class destination.
- Internal links from the Admin dashboard point to the appropriate source modules.
- The existing `/manager` Team route intentionally accepts both manager and admin roles; managers are scoped to direct reports while admins receive the organization-wide active employee scope.

## Deliberately not changed
Large dashboard content was not blindly rewritten because the current dashboard contains role-specific data-fetching logic. Further changes should be made only after the complete file is reviewed and validated with authenticated employee, manager and admin flows.