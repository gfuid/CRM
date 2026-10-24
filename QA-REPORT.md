# CRM QA Report

**Date:** 22 October 2026  
**Scope:** Owner/staff workflows, role permissions, tenant isolation, admin controls, and the backend integration checks.

## Summary

The backend CI integration suite completed with **77 passed, 0 failed**. The CRM frontend and admin dashboard production builds also passed. A browser check of the developer dashboard found that its telemetry endpoints were unavailable in the current local session.

This is good evidence for the API paths covered by the suite. It does **not** prove that every screen, browser workflow, production database operation, or external service works end to end.

## Issues found and changes made

| Area | Issue found | Change made | Verification |
|---|---|---|---|
| Sign-in and identity | Requests could attempt to claim an identity through headers, local-session tokens, or forged admin tokens. | Protected API routes now require a verified bearer token; production rejects the default signing secret and default admin credentials. | CI checks rejected identity-header spoofing, local tokens, forged tokens, and unsafe production defaults. |
| Staff account data | Staff responses could expose plaintext passwords. | Passwords are hashed, and staff create/list responses do not return plaintext password fields. | CI checked both responses and successful staff sign-in. |
| Lead permissions | Staff could attempt to set owner-managed commercial details or change lead assignments. | Owner-only fields and assignment changes are checked by the API. Staff can still record permitted lead updates and discussion notes. | CI checked owner-only field rejection, assignment restrictions, staff lead creation, and staff discussion updates. |
| Tasks and reviews | Staff could attempt to assign or change work beyond their permission; owners need to review completed and overdue work. | Task access and editable fields are restricted by role and assignment. | CI checked owner assignment, staff completion with notes, restricted edits, and owner review of completed and overdue tasks. |
| Follow-ups and reminders | Follow-up changes needed to respect assignment and staff permissions. | Follow-up creation and updates are restricted by role and scope. | CI checked owner-created reminders, staff follow-up updates, and restricted-user access. |
| Planner and activity | Private planner items and records needed user/tenant boundaries. | Planner and activity endpoints enforce the current user's permitted scope. | CI checked staff planner creation/completion and that owners cannot see private staff planner items. |
| Admin controls | Owner deletion must be restricted to the Super Admin and remove tenant data. | Owner deletion is restricted, with tenant cleanup in the tested data store. | CI checked that a company owner cannot delete an owner account and that Super Admin deletion removes the test tenant records and staff from memory. |
| Developer metrics | In-memory storage totals missed several record types and used the wrong notification list. Capacity could also show negative free space or more than 100% usage. | The dashboard now includes all current in-memory CRM collections, reads actual notifications, and clamps capacity values. Per-owner storage remains clearly labeled as an estimate. | CI checks the collection list, bounded capacity values, per-owner estimated footprint, and API request attribution. |
| Developer dashboard connection state | When telemetry could not load, the page showed blank values without a clear cause. | The page now shows an unavailable message, primary API URL, both endpoint errors, and a retry button rather than implying the backend is online. | Browser check: local API connection was refused and the hosted fallback returned HTTP 404; the new error state displayed both failures. |
| Frontend lead editor | A malformed owner-only section blocked the CRM frontend production build. | Corrected the conditional JSX wrapper for the owner-managed industry section. | CRM frontend production build passes. |
| Delete and invalid routes | Stale sessions and unknown routes should not appear successful. | Deleted staff/owner sessions are rejected, and unknown API routes return 404. | Both cases were checked by CI. |

## Owner and staff workflow coverage

- **Owner:** create staff, create and assign leads/tasks/follow-ups, set owner-managed lead details, and review completed or overdue tasks.
- **Staff:** sign in, work on permitted leads, record discussion/remarks, complete assigned tasks, update permitted follow-ups, and manage personal planner items.
- **Restricted staff:** API-level permission checks block analytics/planner access where permission is absent, lead creation where disallowed, task assignment, follow-up creation, and owner-managed lead changes.
- **Admin:** developer API request attribution and owner workspace deletion are checked.

## Important limits

- The 77 checks are backend integration/API tests. The browser check confirmed the dashboard's telemetry-offline state, not the actual values from a connected production backend. Full owner/staff flows and mobile layouts were not exercised.
- Per-owner storage is an estimate from the app's workspace records, not a precise measurement of each tenant's physical MongoDB disk usage.
- Owner deletion was verified against the test suite's in-memory data. A production MongoDB deletion and recovery/backup behavior were not verified here.
- External email delivery was not tested; the test output noted that SMTP was not configured.
- Passing these checks does not prove that every possible input or workflow is error-free.

## Verification evidence

Command run from `backend`:

```text
npm test
```

Result:

```text
CI/CD TEST RESULTS: 77 PASSED | 0 FAILED | TOTAL: 77
ALL CI/CD INTEGRATION CHECKS PASSED SUCCESSFULLY!
```

Production builds:

```text
admin: npm run build — passed
frontend: npm run build — passed
```

## Still to verify

- Full authenticated owner/staff browser workflows, including mobile layout, form errors, and navigation.
- Restore telemetry API availability: the local `http://localhost:5000/api/v1/admin/developer-metrics` connection was refused, and the configured hosted fallback `https://crm-ep4i.onrender.com/api/v1/admin/developer-metrics` returned HTTP 404. The backend source defines this route; the deployed service/route still needs to be checked or updated.
- Owner deletion against a persistent MongoDB staging database, plus the expected backup/recovery policy. Production deletion was not run.
