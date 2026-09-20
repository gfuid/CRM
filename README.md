# Nexus CRM Platform

A modern, high-performance Customer Relationship Management (CRM) system and Admin Console designed for sales teams, pipeline management, and enterprise administrative operations.

## Architecture

- **`frontend/`**: Sales CRM application (React, Vite, Tailwind CSS)
  - Analytics & KPI dashboard
  - Lead management & sales pipeline stages
  - Task management & calendar schedules
  - Outreach tracking & automated follow-ups
- **`admin/`**: Master CRM Administration Console (React, Vite, Tailwind CSS)
  - Business Overview & CRM Metrics
  - Users & Team Management (role assignment, status toggling)
  - Global Platform & Company Settings
- **`backend/`**: RESTful API Service (Node.js, Express)
  - Authentication & authorization middleware
  - Administrative telemetry & management routes
  - Leads, Tasks, Activities, and Outreach APIs

## Quick Start

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

## Tech Stack
- **Frontend & Admin**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Async error handling, Bcrypt
- **Database Support**: MongoDB Atlas, Supabase, and in-memory fallback store
