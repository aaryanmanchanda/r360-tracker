# Budget → PO → Voucher Tracker

A small web app that tracks money from a budget request all the way to an
acknowledged voucher, and refuses to let anyone skip a step:

**Budget Request → Budget Approval → Purchase Order → Voucher Received → VRN**

Built as the R360 intern assignment. Two roles (Requester, Approver), four linked
records, and every amount limit enforced on the server.

---

## What's built

| Piece | What it does |
|---|---|
| **Login + roles** | Email/password login, JWT bearer token. Two roles, each action is role-checked **in the API** (`require_role`), the UI hiding buttons is only cosmetic. |
| **Budget requests** | Requester creates, starts `Pending`. Approver approves or rejects (rejection needs a reason). Nobody can decide their own request, and a decided budget can't be decided again. |
| **Purchase orders** | Requester raises them, only on an `Approved` budget. Total of all POs can never exceed the budget amount. |
| **Vouchers** | Requester records a coupon code + amount against a PO. Codes are unique (case-insensitive), voucher total can never exceed the PO amount. |
| **VRNs** | Approver issues exactly one VRN per voucher. A voucher with no VRN shows as *Pending acknowledgement*. |
| **Screens** | Login · Budget list + create + approve/reject · Budget detail (approved amount, PO total, remaining, POs) · PO detail (PO amount, vouchers, remaining) · Voucher list (Pending / Acknowledged tabs). |

Out of scope on purpose (per the brief): emails, multi-level approval, uploads,
vendor master data, reports/exports, payments.

---

## How it works

```
  ┌─────────────────┐   /api/*    ┌─────────────────┐   SQL    ┌────────────┐
  │  React + TS     │ ──────────► │  FastAPI        │ ───────► │ PostgreSQL │
  │  (Vite build)   │             │                 │          │            │
  │  served by      │ ◄────────── │  routers → thin │ ◄─────── │ constraints│
  │  Caddy          │    JSON     │  services → ALL │          │ + sequences│
  └─────────────────┘             │  the rules      │          └────────────┘
                                  └─────────────────┘
```

Routers stay thin. **Every business rule lives in
[`backend/app/services.py`](backend/app/services.py)**, so that one file is the
place to review. Each write locks the parent row (`SELECT … FOR UPDATE`), checks
the rule against fresh totals, inserts and commits. The lock is what stops two
simultaneous requests from both spending the same remaining balance.

### Rules → where they're enforced → where they're tested

| Rule from the brief | Enforced in | Test |
|---|---|---|
| No PO without an approved budget | `services.create_purchase_order` | `test_purchase_orders.py::test_no_po_on_pending_budget` / `_rejected_` |
| PO total ≤ budget amount | `services.create_purchase_order` (+ row lock) | `test_po_over_budget_is_refused_with_remaining`, `test_concurrency.py` |
| Voucher only against an existing PO | `services.record_voucher` | `test_voucher_on_missing_po_is_404` |
| Voucher total ≤ PO amount | `services.record_voucher` (+ row lock) | `test_voucher_over_po_is_refused` |
| Coupon codes unique | `services.record_voucher` + unique index | `test_coupon_codes_are_unique_case_insensitive` |
| One VRN per voucher | `services.issue_vrn` + `UNIQUE(voucher_id)` | `test_second_vrn_for_same_voucher_is_refused` |
| Rejection needs a reason | `RejectIn` schema + DB check constraint | `test_reject_needs_a_reason` |
| Can't approve your own request | `services._decidable_budget` + DB check constraint | `test_nobody_decides_their_own_request` |
| Role permissions on the backend | `auth.require_role` on every write route | `test_permissions.py` |

---

## Running it locally

### Option A: Docker (what the reviewer should use)

```bash
docker compose up --build
# open http://localhost:8080
```

Postgres, the API (migrations + seed run on boot) and the web app all start together.

### Option B: dev mode (hot reload)

```bash
docker compose up -d db                     # just postgres on :5432

cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head && .venv/bin/python -m app.seed
.venv/bin/uvicorn app.main:app --reload     # api on :8000, docs at /docs

cd ../frontend
pnpm install && pnpm dev                    # web on :5173, proxies /api to :8000
```

### Tests

```bash
docker compose up -d db
cd backend && .venv/bin/pytest -q           # 29 tests, real postgres (creates tracker_test)
```

### Seeded logins

All passwords are `Passw0rd!`

| Email | Role |
|---|---|
| `requester@r360.test` | Requester |
| `requester2@r360.test` | Requester (a second one, to show ownership) |
| `approver@r360.test` | Approver |

The login page also has click-to-fill buttons for these.

### Deploying (AWS EC2 + Caddy auto-HTTPS)

1. EC2 `t3.micro` (Ubuntu), security group open on 22, 80, 443. Install Docker.
2. Point a DNS A record (e.g. `tracker.yourdomain.com`) at the instance.
3. On the box:
   ```bash
   git clone <this repo> && cd <repo>
   export SITE_ADDRESS=tracker.yourdomain.com
   export JWT_SECRET=$(openssl rand -hex 32)
   export POSTGRES_PASSWORD=$(openssl rand -hex 16)
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```
   (Put the same three values in a `.env` file next to the compose files so a reboot keeps them.)

---

## Stack choices

**Frontend: React + TypeScript (Vite, Tailwind, TanStack Query).** The app is a
handful of forms and tables with server state, which is exactly what React Query
is good at (cache + refetch after each mutation). TypeScript types mirror the API
schemas so a renamed field is a compile error, not a blank cell. **Backend:
FastAPI + SQLAlchemy 2.0 + Alembic.** I chose it because I can explain every
line of it: Pydantic gives request validation for free, `Depends` makes the role
checks one line per route, and SQLAlchemy lets me write `FOR UPDATE` row locks and
aggregate queries explicitly instead of hiding them. The R360 stack is Django, and
I haven't used it before. The things that matter here (transactions, row locks,
decimal money, DB constraints, migrations) are framework-independent, so I'd
rather ship them in a framework I know than half-understand a bigger one. Django
is next on my list. **Database: PostgreSQL.** Money needs exact decimals
(`NUMERIC(14,2)`), the rules need real transactions and row locks, and uniqueness
("one VRN per voucher", "coupon codes unique") is best guaranteed by the database
itself, not just application code.

### Decisions worth knowing about

- **Money is `Decimal` / `NUMERIC(14,2)` end to end.** The API sends amounts as strings, the browser never does float maths on them.
- **Database constraints back up the app rules** (amount > 0, rejection needs a reason, no self-approval, one VRN per voucher). Even a bug in `services.py` can't write bad rows.
- **Read access is open to both roles.** The brief restricts *actions* by role, not visibility, so any logged-in user can view every record.
- **PO and VRN numbers come from Postgres sequences** (`PO-00001`, `VRN-00001`), so two concurrent requests can't get the same number.

---

## How I used AI

**Tools:** Claude Code (Opus 5.5) for scaffolding the repo, writing the first
pass of the services/routers/tests and the React screens, and for reading the
brief and JD to compare stack options.

**One place I had to correct it:** the AI first typed the login email field as
`EmailStr` (strict email validation). My own seeded addresses ended in
`@r360.test`, and `.test` is a reserved domain, so the validator rejected every
seeded login with a 422 and almost the whole test suite errored. The fix wasn't
to change the addresses, it was to see that login shouldn't validate email format
at all: a bad login should say "Invalid email or password" and nothing more
(it also avoids revealing which addresses are well-formed), so it's now a plain
string.

**Verified, not trusted:** the `FOR UPDATE` lock was removed on purpose (and restored) to check the
concurrency test really depends on it. Without the lock, 10 parallel ₹30,000 POs
all succeeded against a ₹1,00,000 budget. With it, exactly 3 do.
