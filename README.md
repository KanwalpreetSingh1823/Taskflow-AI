# TaskFlow AI

A **production-style**, **team task manager**: projects, RBAC (Admin / Member), JWT sessions, PostgreSQL + Prisma, REST APIs, Kanban with drag-and-drop, analytics dashboards (Recharts), comments, activity timelines, inbox notifications, and a polished SaaS UI (Tailwind, shadcn-style primitives, Framer Motion, dark/light mode).

> **Note:** The app lives in `taskflow-ai/` because npm package names cannot contain spaces or capital letters from the parent folder `Ethara AI`.

---

## Screenshots

Replace these placeholders after you capture UI:

| Area | Placeholder |
|------|-------------|
| Landing | `./docs/screenshots/landing.png` |
| Dashboard | `./docs/screenshots/dashboard.png` |
| Project + Kanban | `./docs/screenshots/project-board.png` |

*(Create `docs/screenshots/` and add your images — optional for CI.)*

---

## Features

- **Auth:** Sign up, sign in, sign out; JWT stored in **httpOnly** cookie; bcrypt password hashing.
- **Roles:** **Admin** — create projects, invite members, full task CRUD, full analytics. **Member** — view assigned projects/tasks, update status on assigned tasks, comment.
- **Projects:** Description, deadlines, members, overview stats, activity feed.
- **Tasks:** Priority, status, assignee, due date; list filters + search; **Kanban** (@dnd-kit) with optimistic updates; overdue highlighting.
- **Dashboard:** Role-aware metrics, productivity chart, distribution chart, activity, deadlines / personal queue, member insights.
- **Bonus:** Notifications inbox, profile update, glassmorphism / gradients, skeleton loading, toasts (Sonner).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** (App Router), TypeScript |
| UI | **Tailwind CSS**, Radix-based UI kit, **Lucide**, **Framer Motion** |
| State | **Zustand** (auth shell) |
| Forms | **React Hook Form** + **Zod** |
| Charts | **Recharts** |
| Data | **PostgreSQL** + **Prisma ORM** |
| Auth | **JWT** + **bcrypt** |

---

## Architecture

```
taskflow-ai/
├── app/                    # App Router pages + API routes
│   ├── (auth)/             # Login / signup layouts
│   ├── (dashboard)/        # Authenticated shell routes
│   └── api/                # REST endpoints
├── components/             # UI + feature components (layout, dashboard, tasks, …)
├── hooks/                  # useMediaQuery, etc.
├── lib/                    # prisma client, auth, validators, helpers
├── prisma/                 # schema + seed
├── services/               # Cross-cutting helpers (notifications)
├── stores/                 # Zustand stores
└── types/                  # Shared TS types
```

- **Middleware** guards authenticated routes and redirects logged-in users away from `/login` / `/signup`.
- **API layer** uses `requireAuth` / `requireAdmin` / project membership helpers in `lib/server-auth.ts`.
- **ActivityLog** records meaningful events for timelines and dashboards.

---

## Local Setup

### Prerequisites

- Node 18+
- PostgreSQL instance

### 1. Install

```bash
cd taskflow-ai
npm install
```

### 2. Environment

Copy `.env.example` → `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string  
- `JWT_SECRET` — long random string (32+ chars recommended)

### 3. Database & seed

```bash
npx prisma migrate dev --name init
# or for a quick local sync without migration files:
# npx prisma db push

npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `password123` |
| **Member** | `member@test.com` | `password123` |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma Client |
| `npm run db:push` | Push schema (dev / prototyping) |
| `npm run db:migrate` | `prisma migrate deploy` (production) |
| `npm run db:migrate:dev` | Create migrations locally |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |


---

## Security Notes (demo scope)

- JWT in **httpOnly** cookies reduces XSS token theft vs `localStorage`.
- Inputs validated with **Zod** on auth and mutations; APIs return structured errors.
- **RBAC** enforced server-side — never rely on UI alone.

For a real production service, add refresh tokens, CSRF strategy for cookie auth, rate limiting, audit exports, and hardened password policies.

---

## License

Private / demo use for hiring assignments unless otherwise specified.
