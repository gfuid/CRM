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

### 1. Super Admin Console
- **URL**: [https://crm-b2g7.vercel.app](https://crm-b2g7.vercel.app/)
- **Username**: `traveltrade_admin` (or `admin@travel-trade.com`)
- **Password**: `TravelTrade#Admin2026!`

### 2. Sales CRM Workspace
- **URL**: [https://crm-amber-nine.vercel.app](https://crm-amber-nine.vercel.app/)
- **Owner Login**: Register a new company workspace or log in with:
  - **Email**: `owner@travel-trade.com`
  - **Password**: `password123` (or any newly registered company)
- **Staff Login**: Added via the "+ Add Staff" modal inside the Sales CRM workspace.

---

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