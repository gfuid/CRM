# Travel-Trade CRM

A multi-company sales CRM for trade and export businesses. Each company gets its own private
workspace to track buyers and leads (commodity, quantity, Incoterms, payment terms, destination
country), plan follow-ups, assign tasks to the sales team and see daily, outreach and pipeline
reports. A separate platform console lets the platform administrator manage companies, employee
seats and billing.

---

## The three apps

| Folder | App | What it does | Local port |
| :--- | :--- | :--- | :--- |
| `frontend/` | Sales CRM | The app companies use every day: Today, Leads, Tasks, Reports, Team and Settings. | 5173 |
| `admin/` | Platform console | Used only by the platform administrator: companies, seats, payments, reminders, users and pricing. | 5174 |
| `backend/` | REST API | Node.js + Express API under `/api/v1`, with a health check at `/health`. Stores data in MongoDB. | 5000 |

Tech stack: React 19, Vite, Tailwind CSS and lucide-react for both web apps; Node.js 22, Express,
MongoDB (Mongoose driver), JWT and bcrypt for the API.

### Live deployments

| Component | Host | URL |
| :--- | :--- | :--- |
| Sales CRM | Vercel | https://crm-amber-nine.vercel.app |
| Platform console | Vercel | https://crm-b2g7.vercel.app |
| API | Render | https://crm-ep4i.onrender.com/api/v1 |
| API health check | Render | https://crm-ep4i.onrender.com/health |

Sign-in details are never stored in this repository. They live only in the Render environment
settings (see the deployment checklist below).

---

## Roles and permissions

Every company has exactly one **Owner** and any number of employees. Each employee is either a
**Manager** or **Sales staff**.

- **Owner**: full control of the company. Only the owner can add, edit, deactivate or reset the
  password of employees, change company settings, read the audit log and manage the trash
  (restore or permanently delete removed leads). These owner-only rights cannot be given to anyone else.
- **Manager** and **Sales staff** start with the defaults below. The owner can switch each
  permission on or off for any single employee.

| Permission | What it controls | Manager default | Sales staff default |
| :--- | :--- | :--- | :--- |
| `leads_scope` | See only their own leads, or all company leads | All | Own |
| `leads_create` | Add new leads | Yes | Yes |
| `leads_edit` | Edit leads | Yes | Yes |
| `leads_delete` | Move leads to the trash | No | No |
| `leads_reassign` | Give a lead to another person | Yes | No |
| `leads_import` | Import leads in bulk | Yes | No |
| `leads_export` | Export (download) leads | No | No |
| `tasks_assign` | Give tasks to other people | Yes | No |
| `analytics_scope` | Reports for themselves only, or for the whole company | Company | Own |
| `team_reports` | See per-person team reports | Yes | No |

The **platform administrator** is not part of any company. They sign in to the platform console
with `ADMIN_USERNAME` (or `ADMIN_EMAIL`) and `ADMIN_PASSWORD`, using a separate kind of sign-in
token that cannot open the Sales CRM. The console shows companies, seats, payments and user
accounts, but not the companies' customer data. If `ADMIN_PASSWORD` is empty, console sign-in is
switched off.

---

## Billing model

- Every company gets a number of **free employees** (default 2). The owner does not use a seat.
- Each extra employee is a **paid seat** with a **monthly price per employee** (default INR 500).
  The free count, price, currency and reminder timing are edited in the platform console settings.
  Anyone can read the current pricing at `GET /api/v1/public/pricing`.
- Companies do not buy seats themselves. The **platform administrator adds paid seats** to a
  company and records each payment, which extends the subscription end date by the months paid.
- When all seats are in use, the owner cannot add or reactivate employees until more seats are added.
- **Reminders before expiry**: a subscription is "expiring" when it ends within the reminder window
  (default 7 days). From the console the administrator sends an in-app reminder to the owners of every
  expiring or expired company. Once a subscription has ended, only the free seats count again.

---

## Data model

- All data lives in MongoDB in company-scoped collections whose names start with `crm_`:
  `crm_companies`, `crm_users`, `crm_leads`, `crm_tasks`, `crm_activities`, `crm_audit_logs`,
  `crm_notifications`, `crm_payments` and `crm_meta` (platform settings and migration markers).
- Every company record carries a `company_id`. Lead, task, activity, team and audit-log data is
  read and written through `backend/src/db/tenant.js`, which always adds the signed-in user's
  `company_id`. The few direct lookups (sign-in, own profile, company settings, notifications and
  seat counts) filter by the user's own id or company themselves. Email checks at sign-up and when
  adding an employee look across all companies on purpose, because every email can belong to only
  one account.
- Deleting a lead moves it to the trash. The owner can restore it or delete it permanently.
- Reports are calculated from leads, tasks and the activity log; nothing is stored twice.

### One-time migration from the old version

The previous version kept every company's data in one shared pool (collections `users`, `leads`,
`tasks`, `activities` and others). On the first start with `MONGODB_URI` set, the API runs a
one-time migration and records it in `crm_meta`, so it never runs twice:

- Each old **owner** gets their own new, empty company and keeps their existing password.
- Old **staff** accounts and old shared leads, tasks and activities cannot be traced back to a
  company, so they are moved into the demo company. The staff accounts are **deactivated** until
  the platform administrator moves each person to the right company from the console.
- The **old collections are not changed or deleted**. They stay in the database as a backup.

---

## Demo account

Only the account whose email matches `DEMO_OWNER_EMAIL` sees sample data. On first start the API
creates a demo company for that email, fills it with sample leads, tasks and activities, and shifts
the sample dates once, when it is created, so the latest activity is the day before. The dates are
not moved again, so the sample data gets older over time. Every other company, new or migrated,
starts empty.

The demo owner's password comes from `DEMO_OWNER_PASSWORD`. If that is empty, the password from the
old account is kept (MongoDB only); if there is none, demo sign-in stays switched off.
`DEMO_OWNER_EMAIL` and `DEMO_OWNER_PASSWORD` are read only when the demo company is first created,
so changing them later has no effect.

---

## Local development

Requirements: Node.js 22 and npm.

1. Install everything:
   ```bash
   npm run install:all
   ```
2. Create `backend/.env` by copying `backend/.env.example`, then fill in your own values. Keep
   `NODE_ENV=development`. Set `ADMIN_PASSWORD` if you want to open the platform console locally.
3. Start each app in its own terminal:
   ```bash
   npm run dev:backend    # API on http://localhost:5000
   npm run dev:frontend   # Sales CRM on http://localhost:5173
   npm run dev:admin      # Platform console on http://localhost:5174
   ```

If `MONGODB_URI` is empty, the API runs with **in-memory storage**: everything works, but all data
is lost when the API stops. Never point local development at the production database or API.

---

## Testing

```bash
npm test         # backend API tests (Node's built-in test runner, in-memory storage)
npm run build    # production builds of the Sales CRM and the platform console
```

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:
backend tests, the Sales CRM build plus lint (`oxlint`, warnings allowed), and the platform console build.

---

## Deployment checklist (Render + Vercel)

**API on Render** (root directory `backend`, build `npm ci`, start `npm start`).

Set every variable below **before the first deploy of this version**. Render deploys
automatically on every push, so do this before pushing. The data migration and the demo setup run
only once, on the first start. `DEMO_OWNER_EMAIL` and `DEMO_OWNER_PASSWORD` are read only when the
demo company is first created, so changing them later has no effect.

Set these in the service's Environment tab:

- [ ] `NODE_ENV` = `production`
- [ ] `MONGODB_URI` = the production MongoDB connection string
- [ ] `JWT_SECRET` = a **new**, long random value (64+ characters). Changing it signs everyone out once.
- [ ] `ADMIN_PASSWORD` = a **new** strong password. The old administrator password is in the git
      history, so it must be treated as public and replaced.
- [ ] `ADMIN_USERNAME` and `ADMIN_EMAIL` if you want values other than the defaults
- [ ] `DEMO_OWNER_EMAIL` and `DEMO_OWNER_PASSWORD` for the demo account (read only on the first start)
- [ ] `CORS_ORIGIN` = the two Vercel URLs, comma-separated, for example
      `https://crm-amber-nine.vercel.app,https://crm-b2g7.vercel.app`
- [ ] Optional: `JWT_EXPIRES_IN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`

**Both apps on Vercel** (root directory `frontend` for the Sales CRM, `admin` for the platform
console; framework preset Vite):

- [ ] `VITE_API_URL` = `https://<your-render-service>.onrender.com/api/v1` on **both** projects, then redeploy
- [ ] `frontend/vercel.json` sends every path (`/app/...`, `/login`, `/signup`) to `index.html`,
      so page refreshes and shared links work

**After deploying**

- [ ] Open `/health` on the API and check that `database` says `mongodb`
- [ ] Sign in to the platform console with the new password, then move any deactivated old staff
      accounts to their correct companies
- [ ] Rotate any other secret that was ever committed (old `.env` files, database passwords)

Every variable is explained in `backend/.env.example`.

---

## Owner notes

enhe remove bhi kr seke jo unse related nhi h and employee jha create  ho rhe h bhai ye bhi dekh 
