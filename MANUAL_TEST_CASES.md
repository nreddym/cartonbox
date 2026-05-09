# Manual Test Cases — Carton Box Manufacturing Management System

End-to-end manual test cases covering the complete business process, organized by functional area. Each case identifies the **role required** to perform the action, preconditions, steps, and expected results.

---

## Roles Reference

| Role | Responsibilities |
|---|---|
| `ADMIN` | Full access; user management; final approvals; inventory adjustments. |
| `STORE_MANAGER` | Manage paper rolls, raise inventory inward, **approve/reject material issues**, raise & approve inventory adjustments, raise FG outward. |
| `PRODUCTION_MANAGER` | Approve/reject inward; **create & approve/reject job cards**; **request material issues**; approve/reject inventory adjustments. |
| `SUPERVISOR` | Create job cards & material issue requests; complete job cards (record output). |
| `DISPATCH_MANAGER` | Approve/reject FG outward; create FG outward. |
| `AUDITOR` | View audit logs, reports, and inventory adjustments (read-only). |
| `VIEWER` (any authenticated) | View lists/reports as permitted. |

> Approval rule: a maker (creator/requester) cannot approve their own request. Approvers must hold the configured role for that transaction type.

---

## Test Environment Setup (Pre-requisite)

| ID | Step | Expected |
|---|---|---|
| ENV-1 | `docker compose up -d --build` from repo root. | All three containers report healthy. |
| ENV-2 | `docker compose exec backend alembic upgrade head`. | Alembic applies all migrations without error. |
| ENV-3 | Create initial admin (see README §2.2). | `admin/password123` user is created. |
| ENV-4 | Open `http://localhost:3000`. | Login page renders. |

---

## TS-1. Authentication & Session

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-1.1 | — | Valid login | Enter `admin` / `password123` → Login. | Redirect to dashboard; JWT stored; `/auth/me` returns user. |
| TC-1.2 | — | Invalid password | Enter `admin` / `wrong`. | 401, error toast "Invalid credentials". |
| TC-1.3 | — | Inactive user login | Admin deactivates user `u1`; user `u1` logs in. | 401 "User account is inactive". |
| TC-1.4 | Any | Token expiry | Wait until JWT expires; perform any action. | 401 returned; user redirected to login. |
| TC-1.5 | Any | Logout | Click Logout. | Token cleared; protected routes redirect to login. |
| TC-1.6 | — | Missing token on protected route | Hit `/api/materials` without `Authorization` header. | 401 / 403. |

---

## TS-2. User Management (ADMIN only)

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-2.1 | ADMIN | Create users for each role | Users page → Add user for each role: store_mgr, prod_mgr, supervisor, dispatch_mgr, auditor. | Each user created; visible in list. |
| TC-2.2 | ADMIN | Update user roles | Edit `store_mgr`, change roles. | Roles updated; `PUT /users/{id}/roles` returns 200. |
| TC-2.3 | STORE_MANAGER | Forbidden user creation | Login as store_mgr → POST `/users`. | 403 Insufficient permissions. |
| TC-2.4 | ADMIN | Duplicate username | Create another user with username `admin`. | 400/409 validation error. |
| TC-2.5 | ADMIN | Deactivate user | Toggle `is_active=false` for a user. | User can no longer log in (TC-1.3). |

---

## TS-3. Master Data — Paper Rolls / Materials

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-3.1 | STORE_MANAGER | Create paper roll master | Materials → New → fill GSM, BF, size, supplier; Save. | 201 created; appears in list. |
| TC-3.2 | ADMIN | Edit paper roll attributes | Open existing material → edit GSM → Save. | 200; updated values persist. |
| TC-3.3 | PRODUCTION_MANAGER | Forbidden create | Login as prod_mgr → try to create material. | 403. |
| TC-3.4 | Any authenticated | View materials | Open list. | Items render with stock summary. |
| TC-3.5 | STORE_MANAGER | Validation — negative GSM | Save with GSM = -10. | 422 validation error. |
| TC-3.6 | Any authenticated | View live stock | Open `/materials/{id}/stock`. | Returns current on-hand qty. |

---

## TS-4. Inventory Inward (Goods Receipt)

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-4.1 | STORE_MANAGER | Create inward | Inward → New → choose material, qty, supplier ref, batch; Save. | Status `PENDING`; raw inventory **not yet** incremented. |
| TC-4.2 | ADMIN | List & filter inwards | Filter by status=PENDING, date range. | Filtered results returned. |
| TC-4.3 | PRODUCTION_MANAGER | Approve inward | Open pending inward → Approve. | Status `APPROVED`; raw stock incremented; audit log entry created. |
| TC-4.4 | PRODUCTION_MANAGER | Reject inward | Open pending inward → Reject with reason. | Status `REJECTED`; stock unchanged; reason stored. |
| TC-4.5 | STORE_MANAGER | Self-approval blocked | Maker tries to approve own request. | 403 (or service-level rejection). |
| TC-4.6 | SUPERVISOR | Forbidden approval | Login as supervisor → Approve inward. | 403. |
| TC-4.7 | PRODUCTION_MANAGER | Approve already-approved | Approve a record already APPROVED. | 400 invalid state transition. |
| TC-4.8 | STORE_MANAGER | Validation — zero qty | Create inward with qty = 0. | 422 validation error. |

---

## TS-5. Job Card (Production Order)

Status state machine: `CREATED → APPROVED | REJECTED`, `APPROVED → IN_PRODUCTION | CANCELLED`, `IN_PRODUCTION → COMPLETED | CANCELLED`. `REJECTED`, `COMPLETED` and `CANCELLED` are terminal.

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-5.1 | SUPERVISOR | Create job card | New JC → product, dimensions, qty, due date; system computes material requirement. | 201; status `CREATED`; computed paper area / required qty visible. |
| TC-5.2 | PRODUCTION_MANAGER | Create job card | Same as TC-5.1. | Allowed. |
| TC-5.3 | STORE_MANAGER | Forbidden create | Login as store_mgr → POST job card. | 403. |
| TC-5.4 | SUPERVISOR | Edit CREATED job card | Modify qty → Save. | Material requirement recalculated. |
| TC-5.5 | PRODUCTION_MANAGER | Approve job card | `POST /jobcards/{id}/approve` on a JC created by another user. | Status `APPROVED`; ready to start. |
| TC-5.6 | PRODUCTION_MANAGER | Self-approval blocked | Approve a JC the same user created. | 400 — "Approver must be different from the user who created the job card". |
| TC-5.7 | PRODUCTION_MANAGER | Reject job card | `POST /jobcards/{id}/reject` on a CREATED JC by another creator. | Status `REJECTED`; terminal — no further transitions allowed. |
| TC-5.8 | SUPERVISOR | Forbidden approve/reject | Try approve or reject endpoint as supervisor. | 403 — only PRODUCTION_MANAGER/ADMIN. |
| TC-5.9 | PRODUCTION_MANAGER | Start without material issue | `POST /jobcards/{id}/start` when no APPROVED material issue exists for the JC. | 400 — "Cannot start production without an approved material issue". |
| TC-5.10 | PRODUCTION_MANAGER | Start job card | After STORE_MANAGER has approved a material issue against the JC, click Start. | Status `IN_PRODUCTION`. |
| TC-5.11 | PRODUCTION_MANAGER | Forbidden complete | Try `POST /jobcards/{id}/complete`. | 403 — only SUPERVISOR/ADMIN may complete. |
| TC-5.12 | SUPERVISOR | Complete job card | Complete with actual produced qty + wastage. | Status `COMPLETED`; FG inventory increased; raw consumption recorded; audit logged. |
| TC-5.13 | SUPERVISOR | Edit completed JC | Edit qty on a COMPLETED JC. | 400 — terminal state. |
| TC-5.14 | PRODUCTION_MANAGER | Invalid transition | Start a JC still in `CREATED` (not approved). | 400 invalid transition. |
| TC-5.15 | PRODUCTION_MANAGER | Transition from REJECTED | Try to approve / start a REJECTED JC. | 400 invalid transition. |

---

## TS-6. Material Issue (to Production)

> Roles were swapped to enforce segregation of duties: **production-side users request**, **store-side users approve**.

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-6.1 | PRODUCTION_MANAGER | Create issue against approved JC | Issue → pick JC → choose material(s) and **requested** qty (no `issued_quantity` field on creation). | Status `PENDING`; stock not yet decremented. |
| TC-6.2 | SUPERVISOR | Create issue | Same as TC-6.1. | Allowed. |
| TC-6.3 | STORE_MANAGER | Forbidden create | Login as store_mgr → POST issue. | 403. |
| TC-6.4 | PRODUCTION_MANAGER | Request more than stock | Request qty > on-hand. | Allowed at create; insufficient stock is enforced on approval. |
| TC-6.5 | STORE_MANAGER | Approve issue (issue full requested qty) | Open pending issue → Approve (leave override blank). | Status `APPROVED`; raw stock decremented by requested qty; `issued_quantity = requested_quantity`. |
| TC-6.6 | STORE_MANAGER | Approve with reduced issued qty | Approve and provide `issued_quantity` < requested. | Status `APPROVED`; stock decremented by `issued_quantity` only; both values stored. |
| TC-6.7 | STORE_MANAGER | Approve when stock insufficient | Approve where `issued_quantity` > current on-hand. | 400 insufficient stock; status unchanged. |
| TC-6.8 | STORE_MANAGER | Reject issue | Reject with reason. | Status `REJECTED`; stock unchanged. |
| TC-6.9 | PRODUCTION_MANAGER | Forbidden approve | Login as prod_mgr → Approve own (or any) request. | 403 — only STORE_MANAGER/ADMIN approve. |
| TC-6.10 | STORE_MANAGER | Self-approval blocked | Same store_mgr who created the issue tries to approve. | 400 — approver must differ from requester. |
| TC-6.11 | PRODUCTION_MANAGER | Issue against non-approved JC | Pick a `CREATED`/`REJECTED` job card. | 400 — JC must be `APPROVED` (or `IN_PRODUCTION`). |

---

## TS-7. Production Recording

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-7.1 | SUPERVISOR | Record production output for `IN_PRODUCTION` JC with approved issue | `POST /production` (or Complete on JC) with good qty + wastage. | FG inventory ↑; raw consumption ↑; audit log entry. |
| TC-7.2 | SUPERVISOR | Complete without approved material issue | Try to complete a JC where no material issue is `APPROVED`. | 400 — "Cannot complete production without an approved material issue". |
| TC-7.3 | PRODUCTION_MANAGER | Record production | Same as TC-7.1. | Allowed. |
| TC-7.4 | STORE_MANAGER | Forbidden | Try to record. | 403. |
| TC-7.5 | SUPERVISOR | Output > planned qty | Record produced qty > planned. | Either accepted with warning or rejected per business rule — verify behavior matches spec. |
| TC-7.6 | SUPERVISOR | Negative wastage | Wastage = -1. | 422 validation. |

---

## TS-8. Finished Goods Outward (Dispatch)

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-8.1 | STORE_MANAGER | Create outward | FG Outward → New → product, qty, customer ref. | Status `PENDING`; FG stock unchanged. |
| TC-8.2 | DISPATCH_MANAGER | Create outward | Same as above. | Allowed. |
| TC-8.3 | PRODUCTION_MANAGER | Forbidden create | Try POST. | 403. |
| TC-8.4 | DISPATCH_MANAGER | Approve outward | Approve a pending outward. | Status `APPROVED`; FG stock decremented; audit logged. |
| TC-8.5 | STORE_MANAGER | Forbidden approval | Try to approve outward. | 403 — only DISPATCH_MANAGER/ADMIN. |
| TC-8.6 | DISPATCH_MANAGER | Reject outward | Reject with reason. | Status `REJECTED`; stock unchanged. |
| TC-8.7 | DISPATCH_MANAGER | Approve when stock insufficient | Approve outward whose qty exceeds current FG stock. | 400 insufficient stock. |
| TC-8.8 | DISPATCH_MANAGER | Self-approval blocked | Approve own outward. | 403 / business rule rejection. |

---

## TS-9. Inventory Adjustment

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-9.1 | STORE_MANAGER | Raise raw/FG adjustment | Adjustment → +/- qty with reason. | Status `PENDING`. |
| TC-9.2 | PRODUCTION_MANAGER | Raise adjustment | Same as above. | Allowed. |
| TC-9.3 | SUPERVISOR | Forbidden create | Try POST. | 403 — supervisor not in creator roles. |
| TC-9.4 | DISPATCH_MANAGER | Forbidden create | Try POST. | 403. |
| TC-9.5 | ADMIN | Approve adjustment | Approve pending adjustment by another user. | Status `APPROVED`; stock adjusted; audit logged. |
| TC-9.6 | PRODUCTION_MANAGER | Approve adjustment | Approve a pending adjustment created by another user. | Allowed (PM is in approver roles). |
| TC-9.7 | STORE_MANAGER | Approve adjustment | Approve a pending adjustment created by another user. | Allowed (SM is in approver roles). |
| TC-9.8 | STORE_MANAGER | Self-approval blocked | Approve adjustment they themselves created. | 400 — approver must differ from creator. |
| TC-9.9 | AUDITOR | Read-only access | Open Adjustments list. | List loads; New / Approve / Reject buttons not available. |
| TC-9.10 | ADMIN | Reject adjustment | Reject with reason. | Status `REJECTED`; stock unchanged. |
| TC-9.11 | ADMIN | Negative result stock | Approve adjustment that drives stock below zero. | 400 — cannot result in negative stock. |

---

## TS-10. Reporting

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-10.1 | ADMIN | Raw material stock report | Reports → Raw Stock. | Report renders with current quantities. |
| TC-10.2 | STORE_MANAGER | Low-stock alerts | Reports → Low Stock. | Items below threshold listed. |
| TC-10.3 | PRODUCTION_MANAGER | Material consumption | Pick date range → run. | Aggregated consumption per material. |
| TC-10.4 | PRODUCTION_MANAGER | Wastage analysis | Run with date range. | Wastage % per JC / material. |
| TC-10.5 | DISPATCH_MANAGER | FG stock report | Run report. | Current FG inventory. |
| TC-10.6 | AUDITOR | Read-only reports | Open reports list. | Reports load successfully. |
| TC-10.7 | An unauthorized role | Forbidden | Login as a role not in `REPORT_ROLES` → run report. | 403. |

---

## TS-11. Audit Logs (ADMIN, AUDITOR)

| ID | Role | Scenario | Steps | Expected |
|---|---|---|---|---|
| TC-11.1 | AUDITOR | List audit logs | Audit Logs page; filter by entity_type, user, date. | Paginated logs returned. |
| TC-11.2 | ADMIN | Get single audit log | Open detail of one log entry. | All before/after JSON visible. |
| TC-11.3 | STORE_MANAGER | Forbidden | Hit `/audit-logs`. | 403. |
| TC-11.4 | ADMIN | Coverage check | Approve any transaction; then look in audit logs. | New entry exists with actor, timestamp, action, before/after. |

---

## TS-12. End-to-End Happy Path (Full Lifecycle)

> Run sequentially with the indicated user; verify state at each step.

| Step | Role | Action | Expected |
|---|---|---|---|
| E2E-1 | ADMIN | Create users for all roles. | Users active. |
| E2E-2 | STORE_MANAGER | Create paper roll master `PR-90gsm`. | Master saved. |
| E2E-3 | STORE_MANAGER | Inward 1000 kg of `PR-90gsm`. | Inward `PENDING`. |
| E2E-4 | PRODUCTION_MANAGER | Approve inward. | Stock `PR-90gsm` = 1000 kg; audit logged. |
| E2E-5 | SUPERVISOR | Create job card for 5000 boxes. | Status `CREATED`; required paper qty computed (e.g. 400 kg). |
| E2E-6 | PRODUCTION_MANAGER | Approve the JC (different user from creator). | Status `APPROVED`. |
| E2E-7 | PRODUCTION_MANAGER | Request material issue for 400 kg against the JC. | Issue `PENDING`. |
| E2E-8 | STORE_MANAGER | Approve issue. | Raw stock = 600 kg; issue `APPROVED`. |
| E2E-9 | PRODUCTION_MANAGER | Start the JC. | Status `IN_PRODUCTION` (only allowed because the issue is now approved). |
| E2E-10 | SUPERVISOR | Complete JC: 4900 good, 100 wastage. | JC `COMPLETED`; FG +4900. |
| E2E-11 | DISPATCH_MANAGER (or STORE_MANAGER) | Create FG outward for 4000 boxes. | Outward `PENDING`. |
| E2E-12 | DISPATCH_MANAGER | Approve outward. | FG stock = 900 boxes. |
| E2E-13 | STORE_MANAGER | Raise +50 inventory adjustment for FG (recount). | Adjustment `PENDING`. |
| E2E-14 | ADMIN | Approve adjustment. | FG stock = 950. |
| E2E-15 | AUDITOR | Open audit logs. | Entries exist for steps 4, 6, 8, 9, 10, 12, 14. |
| E2E-16 | ADMIN | Run all reports for the test date range. | Numbers reconcile across raw stock, consumption, wastage, FG stock. |

---

## TS-13. Negative & Cross-cutting Tests

| ID | Scenario | Expected |
|---|---|---|
| TC-13.1 | Concurrent approval — two approvers click Approve at the same time. | Only one succeeds; the other gets 409/400 invalid state. |
| TC-13.2 | SQL/script in text fields (`<script>`, `' OR 1=1 --`). | Stored safely; rendered as text; no XSS / injection. |
| TC-13.3 | Long string (10 000 chars) in remarks. | Either truncated server-side or 422; never 500. |
| TC-13.4 | Browser back after approval. | UI does not allow re-approval; backend rejects on retry. |
| TC-13.5 | Network loss mid-submit. | Either record saved once or not at all (idempotency); no duplicate entries. |
| TC-13.6 | Direct API call bypassing UI with mismatched role. | 403 enforced server-side. |
| TC-13.7 | Pagination — list with > 100 records. | Page size honored; navigation works. |
| TC-13.8 | Date range with start > end. | 400 validation. |
| TC-13.9 | Soft-delete / status filters across all list pages. | Default filter shows active/relevant; filters change result set. |
| TC-13.10 | Browser refresh while logged in. | Session restored from token; still on same page. |

---

## Defect Reporting Template

```
ID:
Test case:
Role used:
Steps:
Expected:
Actual:
Severity (Blocker/Major/Minor):
Screenshots / API response:
Environment (commit / image tag):
```
