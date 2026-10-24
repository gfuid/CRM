# Travel-Trade CRM Platform

A modern, high-performance Customer Relationship Management (CRM) system and Admin Console designed for sales teams, pipeline management, and enterprise administrative operations.

---

## 🌐 Live Production Deployments

| Component | Service | Live Production URL |
| :--- | :--- | :--- |
| **Sales CRM Frontend** | Vercel | [https://crm-amber-nine.vercel.app](https://crm-amber-nine.vercel.app/) |
| **Super Admin Console** | Vercel | [https://crm-b2g7.vercel.app](https://crm-b2g7.vercel.app/) |
| **Backend REST API** | Render Cloud | [https://crm-ep4i.onrender.com/api/v1](https://crm-ep4i.onrender.com/api/v1) |
| **Backend Health Check** | Render Cloud | [https://crm-ep4i.onrender.com/health](https://crm-ep4i.onrender.com/health) |

---

## 🔐 Credentials

Passwords are **never** written in this repository.

- **Super Admin Console**: username/email and password come from the `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables on the backend (Render → Environment). In production the server refuses to start admin login while the password is still `admin123`.
- **Sales CRM owners** register their own company at the Sales CRM URL (password of at least 6 characters).
- **Staff** accounts are created only by their company owner (Staff management). Public sign-up as staff is blocked.

---

## 👥 Roles & rules (enforced by the server)

| Who | Can | Cannot |
| :--- | :--- | :--- |
| **Super Admin** | Everything in the Admin Console: owners, staff limits, premium features, broadcasts, audit log, tenants | — |
| **Owner** | Create/edit/deactivate/delete **own** staff (within the staff limit), create/edit/delete leads, tasks and follow-ups, correct any field, see Team Review | Change their own staff limit or premium features, see other companies, use any Admin Console route |
| **Staff** | Create leads, add remarks / next follow-up, move a lead forward, complete tasks and follow-ups (with what was discussed), create personal tasks, send correction requests, log daily reports | Edit or delete what was created, mark Won/Lost, cancel or reopen tasks, rewrite follow-ups, see other staff's data (unless the owner gives "all data"), assign work to others |

- Remark history is append-only; owner corrections are listed in each lead's `edit_history`.
- Overdue follow-ups show as **Missed**; reschedules need a reason and are logged.
- **Team Review** (`/analytics/team`, `/analytics/staff/:id`) shows per person: tasks on time / late / overdue, follow-ups done / missed / rescheduled, overdue leads and what was written.
- **Reminders** (`/reminders`) list today's and overdue items; they appear in the bell menu.
- Business time zone for "today" and deadlines: `BUSINESS_TZ_OFFSET` (default `+05:30`).
- Extra web domains that may call the API: `CORS_ORIGIN` (comma-separated). `*` is ignored.

Tests: `npm --prefix backend test` (CI suite + 122 owner/staff/attacker role scenarios, no database needed).
Remove old demo records from MongoDB: `npm --prefix backend run cleanup:demo` (dry run) then `... -- --apply`.

---

## ✉️ Email (Transactional + Email Marketing)

### Platform emails (thank-you on registration)
Sent from the platform's own SMTP account via Nodemailer. Set these on the backend (Render → Environment):

| Variable | Example | Notes |
| :--- | :--- | :--- |
| `SMTP_HOST` | `smtp.maileroo.com` | Recommended free provider: Maileroo (SMTP + API, ~3,000 mails/month free). EmailLabs (300/day) also works. |
| `SMTP_PORT` | `587` | Use `465` with `SMTP_SECURE=true` for SSL |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials from the provider dashboard |
| `MAIL_FROM` | `Travel-Trade CRM <no-reply@yourdomain.com>` | Verify the domain (SPF/DKIM) at the provider |
| `APP_URL` | `https://crm-amber-nine.vercel.app` | Used for the login button in emails |
| `API_PUBLIC_URL` | `https://crm-ep4i.onrender.com` | Used for unsubscribe links in campaigns |
| `MAIL_ENC_KEY` | long random string | Encrypts owners' SMTP passwords at rest (falls back to `JWT_SECRET`) |

If `SMTP_HOST` is empty the backend simply logs and skips the mail; registration still works.

### Email Marketing (premium, per company)
- **Super Admin** switches it on per owner: Owners & Staff → `Email ON/OFF` (`PATCH /admin/users/:id/features`).
- **Owner** opens *Email Marketing* in the Sales CRM, saves their own SMTP sender (Gmail app password, Zoho, Outlook, Hostinger, Maileroo, or custom) and sends a test mail.
- Leads get optional **tags** (lead form → Tags). Campaigns target one or more tags, all leads with email, or a pasted / CSV list.
- Sending is throttled (`rate_per_minute`), logged per recipient, and every mail carries a one-click **unsubscribe** link. Placeholders: `{{company_name}} {{contact_name}} {{country}} {{product}} {{sender_name}}`.
- API: `/api/v1/email/*` (see `/api/v1/docs`).

### Super Admin login
The console verifies credentials **only** against the backend (`ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars). There is no client-side fallback any more. Admins can set a new password for any owner or staff member from Owners & Staff → **Password**.

## Architecture

- **`frontend/`**: Sales CRM application (React, Vite, Tailwind CSS)
  - Analytics & KPI dashboard
  - Lead management & sales pipeline stages (New, Qualified, Proposal, In Review, Won, Closed)
  - Task management & calendar schedules
  - Outreach tracking & automated follow-ups
  - Responsive mobile navbar & bottom tab navigation
- **`admin/`**: Master CRM Administration Console (React, Vite, Tailwind CSS)
  - Business Overview & CRM Metrics
  - Users & Team Management (role assignment, status toggling)
  - Global Platform & Company Settings
  - Direct quick-switch link to the Sales CRM App
- **`backend/`**: RESTful API Service (Node.js, Express)
  - Authentication & authorization middleware (Super Admin bypass & JWT verification)
  - Administrative telemetry & management routes
  - Leads, Tasks, Activities, and Outreach APIs
  - In-memory data store with MongoDB Atlas failover

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start Development Servers
You can run services concurrently or independently:

- **Backend API (Port 5000)**:
  ```bash
  npm run dev:backend
  ```
- **Sales CRM App (Port 5173)**:
  ```bash
  npm run dev:frontend
  ```
- **Admin Console (Port 5174)**:
  ```bash
  npm run dev:admin
  ```

---

## Tech Stack
- **Frontend & Admin**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Async error handling, Bcrypt, JWT
- **Database Support**: MongoDB Atlas, Supabase, and resilient in-memory fallback store



### 📋 Completed Feature & Enhancement Checklist (All 11 Points Done ✅)

| # | Feature / Bug Fix | Description | Status |
|---|---|---|:---:|
| 1 | **Country A-Z with Search** | Country list A-Z sorted alphabetically with real-time text filter search box | ✅ Done |
| 2 | **Target Commodities Remove Option** | Categories/Commodities ko delete/remove karne ka option (`×` button) with persistence | ✅ Done |
| 3 | **Custom Payment & Shipping Terms** | Incoterms & Payment terms me "+ Custom" term add & select karne ka dynamic option | ✅ Done |
| 4 | **Leads Table (Date & Created By)** | Leads table me Creation Date aur Creator Name saaf avatar ke sath visible | ✅ Done |
| 5 | **Remove Standalone Assigned Rep** | Leads table se purana standalone "Assigned Rep" column hata kar "Created By & Date" se replace | ✅ Done |
| 6 | **Creator vs Assignee Persistence** | Original Creator permanently immutable; reassign hone par bhi Creator name intact rehta hai | ✅ Done |
| 7 | **Role/Designation Add & Remove** | Staff management modal me dynamic role addition (+ Add Role) aur deletion (`×` tag) | ✅ Done |
| 8 | **Clickable Leads (View All Data)** | Leads row aur mobile card par click karte hi full data dossier modal khulna | ✅ Done |
| 9 | **Token Session / Expiry Fix** | 30-day JWT validity + resilient cold-start session recovery (unexpected logout fixed) | ✅ Done |
| 10 | **Easy Logout** | Header, Sidebar footer, aur Mobile top bar me prominent red [Logout] button | ✅ Done |
| 11 | **Owner vs Employee Login Distinction** | Login screen par segmented Owner vs Staff switch aur Register page par direct Staff Login link | ✅ Done |


enhe remove bhi kr seke jo unse related nhi h and employee jha create  ho rhe h bhai ye bhi dekh 
