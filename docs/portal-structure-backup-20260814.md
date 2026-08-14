# TCPS portal structure safety checkpoint — 2026-08-14

Current main was reviewed before the role/navigation cleanup.

## Role structure
- Employee: Dashboard, Exams, PER Objectives, Documents, Updates, Profile
- Manager: Dashboard, Exams, PER Objectives, Team, Approvals, Reports, Updates, Profile
- Admin: Dashboard, Exams, PER Objectives, Team, People, Approvals, Reports, Admin, Roles & Access, Updates, Profile

## Source-of-truth rule
- Dashboards are summaries/action centers.
- Module pages contain the underlying records.
- Reports contain analysis.
- Updates contain communication.
- People/Team contain people and hierarchy management.
- Admin/Roles & Access contain configuration and permissions.

This file documents the checkpoint before the 2026-08-14 navigation/internal-link cleanup.