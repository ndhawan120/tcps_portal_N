# URL canonicalization fix — 2026-08-14

The portal uses `/employees` as the canonical employee-management route and `/employees/{profile_slug}` as the canonical employee profile route.

The legacy `/employee` route is no longer an application page. Middleware redirects legacy `/employee` and `/employee/{id}` requests to the plural `/employees` route so old bookmarks remain usable without being used for internal navigation.

Internal navigation must use the canonical plural routes only.
