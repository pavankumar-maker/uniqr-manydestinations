# NxtQR — Unified QR Management Platform

Production-ready SaaS for generating, customizing, managing, and tracking
**Static** and **Dynamic** QR codes with multi-destination routing, scan
analytics, and file-backed QRs.

Built for the **NxtGenSec Development Internship** capstone project.

**Live demo:** https://doc-to-pro-hub.lovable.app

---

## Feature Matrix

| Area | Status |
| --- | --- |
| Email/password + Google authentication | ✅ |
| User dashboard (create / list / edit / pause / delete) | ✅ |
| Profile management (display name, password, account stats) | ✅ |
| Static QR generator (URL, Text, Email, SMS, Phone, WhatsApp, WiFi, UPI, Geo, Event, vCard) | ✅ |
| Dynamic QR (editable destinations without reprinting) | ✅ |
| Multi-link routing (Single / Round-robin / Weighted A/B / By device / By priority) | ✅ |
| Digital Business Card (vCard) | ✅ |
| File-backed QRs (PDF / image / video, ≤ 25 MB, signed URLs) | ✅ |
| QR customization (foreground / background color) | ✅ |
| Download PNG · SVG · PDF | ✅ |
| Scan analytics (14-day trend, device breakdown, recent scans) | ✅ |
| Search & filter dashboard (by name, URL, status, type) | ✅ |
| Row-Level Security on all user data | ✅ |
| Responsive UI (mobile / tablet / desktop) | ✅ |
| SEO metadata (per-route titles, OG tags, robots.txt) | ✅ |

---

## Tech Stack

- **Framework:** TanStack Start v1 (React 19, Vite 7, SSR-ready)
- **Styling:** Tailwind CSS v4 with a custom "Midnight Indigo" design system
- **Auth + DB + Storage:** Lovable Cloud (Supabase — Postgres + Auth + Storage)
- **QR engine:** `qrcode` + `qrcode.react`
- **PDF export:** `jspdf`
- **State / data:** TanStack Query, TanStack Router file-based routing
- **Icons:** `lucide-react`
- **Notifications:** `sonner`

---

## Architecture Overview

```text
┌──────────────────────────────┐
│  Browser (React 19 + Vite)   │
│  ─ Landing / Generator       │
│  ─ Auth pages                │
│  ─ Dashboard / Profile       │
└──────────────┬───────────────┘
               │  useServerFn + TanStack Query
               ▼
┌──────────────────────────────┐
│  TanStack Server Functions   │
│  ─ qr.functions.ts (CRUD)    │
│  ─ profile.functions.ts      │
│  ─ resolveShortAndTrack      │
│    (public /r/:shortId)      │
└──────────────┬───────────────┘
               │  Supabase JS (RLS as user)
               ▼
┌──────────────────────────────┐
│  Postgres (Supabase)         │
│  profiles · qr_codes         │
│  qr_destinations · scan_events│
│  storage: qr-files (private) │
└──────────────────────────────┘
```

### Database Schema

- **`profiles`** — mirrors `auth.users`; display name.
- **`qr_codes`** — `name`, `short_id`, `target_url?`, `file_path?`,
  `fg_color`, `bg_color`, `routing_mode`, `rotation_cursor`, `is_active`,
  `scan_count`.
- **`qr_destinations`** — many-per-QR routing entries: `label`,
  `target_url`, `weight`, `device_filter`, `priority`, `is_active`.
- **`scan_events`** — one row per scan: `user_agent`, `referrer`, `device`,
  `country`, timestamp.

Every table has RLS enabled; owner-only policies scoped to `auth.uid()`.

### Redirect Flow

1. User scans QR → hits `/r/{shortId}`.
2. Server route resolves the QR, picks a destination based on `routing_mode`.
3. For file QRs, a 1-hour signed URL is generated from private storage.
4. Scan event recorded (device / UA / referrer), counter incremented.
5. HTTP 302 to the resolved URL.

---

## Local Development

```bash
# install
bun install

# dev
bun run dev

# typecheck
bunx tsgo --noEmit

# build
bun run build
```

Environment variables (auto-provisioned by Lovable Cloud):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Server-only: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`

---

## Security

- Row-Level Security on every user table (`auth.uid() = user_id`).
- Private storage bucket (`qr-files`) with per-user folder policies.
- Zod validation on every server function input.
- Bearer-token middleware on all authenticated server functions.
- No service-role key ever exposed to the client.
- Signed URLs (1h TTL) for file downloads — never public.

---

## Project Structure

```text
src/
├── routes/
│   ├── __root.tsx              # HTML shell, SEO, providers
│   ├── index.tsx               # Landing page
│   ├── generator.tsx           # Static QR generator (public)
│   ├── auth.tsx                # Sign-in / sign-up
│   ├── r.$shortId.tsx          # Dynamic redirect + tracking
│   └── _authenticated/
│       ├── route.tsx           # Auth gate (managed)
│       ├── dashboard.tsx       # QR management + analytics
│       └── profile.tsx         # Profile + stats
├── lib/
│   ├── qr.functions.ts         # QR CRUD, destinations, resolve+track
│   └── profile.functions.ts    # Profile read/update, aggregate stats
├── components/                 # SiteHeader, SiteFooter, QrPreview, …
├── integrations/supabase/      # Auto-generated Supabase clients + types
└── styles.css                  # Tailwind v4 tokens + Midnight Indigo theme
```

---

## Deployment

Auto-deployed via Lovable to `https://doc-to-pro-hub.lovable.app`.
Backend (DB migrations, storage buckets, server functions) deploys on save;
frontend requires clicking **Publish → Update**.

---

## Internship Deliverables Checklist

- [x] Phase 1 — Requirements, UI, DB schema, project setup
- [x] Phase 2 — Auth, dashboard, QR CRUD, dynamic QR, profile
- [x] Phase 3 — Analytics, customization, multi-link, vCard, security, file uploads
- [x] Phase 4 — Responsive UI, validation, error handling, docs (this README)
- [x] Phase 5 — Production deployment + submission

---

Built with ❤ on Lovable.
