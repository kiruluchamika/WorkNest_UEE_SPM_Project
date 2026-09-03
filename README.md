# WorkNest — SPM + UEE Execution Roadmap
**A Trusted Community Gig Board Connecting Local Businesses and Youth for Employment**
SDG 01 & 08 — No Poverty & Decent Work and Economic Growth
Repository: `WorkNest_UEE_SPM_Project` (folders: `app/` = frontend, `server/` = backend)
SE3080 Assignment 01 deadline: **25 Aug 2026, 1:00 PM**

Mission statement: *Local businesses and youth co-build a trusted community hiring pool*

Stakeholders: youth job seekers · local businesses/shop owners · community leaders/verifiers · existing gig workers building reputation · local government/youth employment authorities · platform admins/moderators.

---

## Table of Contents
1. Technology Stack Selection & Justification
2. Folder & Project Directory Structures
3. Step-by-Step Roadmap — Sprint 0 / 1 / 2
4. ClickUp ↔ GitHub Integration & Tracking
5. Final Report Compilation Checklist

---

# 1. Technology Stack Selection & Justification

## 1.1 Frontend — React Native (Expo) + TypeScript

| Requirement | Why Expo + RN + TS fits |
|---|---|
| One app, two platforms, 8 weeks | Single TS codebase ships to iOS + Android; no separate native teams needed for a 4-person group |
| Fast sprint iteration | Expo Go lets you scan a QR code and see live changes on a real phone in seconds — critical for weekly sprint reviews with your stakeholder |
| Live panel/stakeholder demos | No cables, no build step: open Expo Go, scan QR, demo runs on the panel's own device if needed |
| Shared data contracts across 4 devs | TypeScript interfaces (`User`, `Gig`, `Application`, `Endorsement`) catch mismatches at compile time instead of at runtime during integration |
| UI needs (trust badges, ratings, forms) | React Navigation + a component library (React Native Paper or NativeBase) gives you accessible form inputs, chips/badges, and modals out of the box |
| Deployable artifact for demo/viva | `eas build` produces an installable APK without owning a Mac, for the panel to sideload if desired |

**Not chosen:** Flutter (Dart is a second language your team doesn't already know — slower ramp-up in an 8-week window); fully native Kotlin/Swift (doubles the build surface for a 4-person team).

## 1.2 Backend — Node.js + Express + TypeScript + PostgreSQL (via Prisma), hosted on Supabase/Neon

WorkNest's core domain is a **trust graph**: Users → Endorsements → Gigs → Applications → Ratings, all bound by referential integrity ("an application must point to a real gig and a real user", "an endorsement must point to a real verifier"). That's a textbook relational model, which is why **PostgreSQL** is chosen over MongoDB.

| Option | Verdict |
|---|---|
| **Node + Express + Prisma + PostgreSQL (chosen)** | You design and own the REST API — this directly demonstrates the "design and implementation" skill LO4 asks for, while Prisma removes almost all boilerplate SQL |
| MongoDB / Mongoose | Fights the relational trust-graph shape; joins across users/gigs/applications become manual application-layer code |
| Firebase (Firestore + Auth) | Fast, but you'd be *consuming* a backend rather than *building* one — harder to show backend engineering during the viva; also poor fit for role-based endorsement logic |
| Supabase used as BaaS only (PostgREST, no custom server) | Rejected as the *only* backend — same "no custom engineering to demo" problem — but its **hosted Postgres instance** is still useful |

**Recommended setup:** write your own Express + TypeScript API (full control over auth, endorsement rules, trust-score logic), but point Prisma at a **free hosted PostgreSQL instance on Supabase or Neon** so nobody has to run/maintain a database server locally. You get custom backend code *and* zero DevOps overhead.

Core libraries:
- `express`, `typescript`, `ts-node-dev`
- `prisma` + `@prisma/client` — schema, migrations, type-safe queries
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT auth (custom, because the "community verifier" role needs logic no off-the-shelf auth provider models well)
- `zod` — request validation
- `multer` or Supabase Storage — gig photos / verification photos
- `jest` + `supertest` — API testing (covers rubric's "software testing" line under LO3)

## 1.3 Project Management & DevOps Tools

**ClickUp**
- One Workspace (`WorkNest`), one Space, Folders per Sprint (see Section 2.3)
- Custom fields on every task: `Story Points`, `Scrum Role`, `Module Tag (SPM/UEE)`, `GitHub Commit Link`
- Native Dashboard widget for burndown (Business plan+) or manual sheet fallback (Section 3, Sprint 2)

**GitHub** (`WorkNest_UEE_SPM_Project`, monorepo: `app/` + `server/`)
- Branch protection on `main`: require PR + 1 review before merge
- `.gitignore` covering `node_modules/`, `.env`, `.expo/`, `dist/`, `*.log`
- Branch naming: `feature/CU-<taskid>-short-desc` (Section 4)

**Postman**
- One Workspace shared with all 4 members
- Collection `WorkNest API` with folders matching your route groups: `Auth`, `Gigs`, `Applications`, `Endorsements`, `Ratings`
- Environments: `Local` (`http://localhost:4000`) and `Staging` (deployed URL once available)
- Store `{{token}}` as a collection variable set automatically via a login request's *Tests* script:
```javascript
const res = pm.response.json();
pm.collectionVariables.set("token", res.token);
```

---

# 2. Complete Folder & Project Directory Structures

## 2.1 Frontend — `app/` (React Native / Expo + TypeScript)

```
app/
├── assets/
│   ├── fonts/
│   ├── images/
│   └── icons/
├── src/
│   ├── api/                     # axios instance + one file per resource
│   │   ├── client.ts
│   │   ├── authApi.ts
│   │   ├── gigApi.ts
│   │   ├── applicationApi.ts
│   │   ├── endorsementApi.ts
│   │   └── ratingApi.ts
│   ├── components/
│   │   ├── common/              # Button, Input, Card, LoadingSpinner
│   │   ├── gig/                 # GigCard, GigListItem
│   │   └── trust/                # TrustBadge, EndorsementTag
│   ├── context/                 # global state via Context API
│   │   ├── AuthContext.tsx
│   │   └── GigContext.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── JobSeekerTabs.tsx
│   │   └── ShopOwnerTabs.tsx
│   ├── screens/
│   │   ├── auth/                 # LoginScreen, RegisterScreen
│   │   ├── jobseeker/            # ProfileScreen, BrowseGigsScreen, GigDetailScreen, ApplyGigScreen
│   │   ├── shopowner/            # DashboardScreen, PostGigScreen, ApplicantsScreen
│   │   ├── trust/                 # VerifierEndorseScreen
│   │   └── shared/                # RatingModal, NotificationsScreen
│   ├── types/                     # User.ts, Gig.ts, Application.ts, Endorsement.ts, Rating.ts
│   ├── utils/                     # validators.ts, formatters.ts, constants.ts
│   └── theme/                     # colors.ts, spacing.ts, typography.ts
├── App.tsx
├── app.config.ts
├── package.json
├── tsconfig.json
└── frontend README.md            # already in repo
```

*Why Context API instead of Redux:* a 4-person, 8-week app has a small state surface (auth session + active gig list). Context + `useReducer` covers it without the extra dependency and learning curve.

## 2.2 Backend — `server/` (Node + Express + TypeScript + Prisma)

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts                 # Prisma client singleton
│   │   └── env.ts                # loads & validates process.env
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── gig.controller.ts
│   │   ├── application.controller.ts
│   │   ├── endorsement.controller.ts
│   │   └── rating.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── gig.routes.ts
│   │   ├── application.routes.ts
│   │   ├── endorsement.routes.ts
│   │   └── rating.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts    # requireAuth, requireRole
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   ├── services/                  # business logic (trust-score calc, etc.)
│   │   └── trustScore.service.ts
│   ├── validators/                # zod schemas per resource
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── hash.ts
│   └── app.ts / server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/                          # jest + supertest
├── .env.example
├── package.json
├── tsconfig.json
└── backend_README.md              # already in repo
```

## 2.3 ClickUp Hierarchy (mapped to Assignment 01 deliverables)

```
Workspace: WorkNest
└─ Space: WorkNest
   ├─ Folder: Sprint 0 – Setup & Foundations
   │  ├─ List: Product Backlog (Epics & Stories)
   │  ├─ List: Project Charter Tasks
   │  └─ Doc: Project Charter / Product Vision
   ├─ Folder: Sprint 1 – User Identity & Core Gig Management
   │  ├─ List: Sprint 1 Backlog
   │  ├─ List: Daily Stand-up Log
   │  └─ Doc: Sprint 1 Review & Retrospective
   ├─ Folder: Sprint 2 – Community Trust Pool & Application Workflow
   │  ├─ List: Sprint 2 Backlog
   │  ├─ List: Daily Stand-up Log
   │  └─ Doc: Sprint 2 Review & Retrospective
   ├─ List: Scrum Roles & Rotation
   └─ Doc: Definition of Done / Working Agreement
```

**Custom fields to create once (apply to every task):**

| Field | Type | Values |
|---|---|---|
| Story Points | Dropdown | 1, 2, 3, 5, 8, 13 |
| Scrum Role | Dropdown | Product Owner, Scrum Master, Dev Team |
| Module Tag | Dropdown | SPM, UEE, Both |
| GitHub Commit Link | Text/URL | — |

---

# 3. Step-by-Step Implementation Roadmap

## Phase 1 — Sprint 0: Setup & Foundations

### SPM Steps
1. **Confirm group & project name** against the official Course Web list (already done — WorkNest).
2. **Build the ClickUp workspace** using the hierarchy in 2.3, including the four custom fields.
3. **Write the Project Charter / Product Vision doc.** Use your existing research as the seed:
   - *Problem:* the reviewed competitor apps (TaskRabbit, Fiverr, LinkedIn Jobs, ikman.lk Jobs) are global freelance marketplaces, formal job boards, or large-chain shift-hiring platforms — none build a locally verified, community-trusted hiring pool where small businesses and youth co-build reputation together.
   - *Vision:* "Local businesses and youth co-build a trusted community hiring pool."
   - *Scope:* Sprint 0–2 covers registration, profiles, gig posting/browsing, community endorsement, application workflow, and ratings. Out of scope for this assignment: payments, push notifications, admin moderation dashboard.
   - *Stakeholder/client role:* recruit a real community leader, youth program coordinator, or local shop owner to play the customer/stakeholder role in your sprint reviews (the brief requires this explicitly).
   - *Constraints:* 4-person team, ~8 active development weeks, free-tier hosting only.
4. **Write Project Selection & Justification**, expanding your existing research-gap note into the rubric's "clear and comprehensive justification" (map explicitly to Real-World Relevance / Agile Suitability / Scope Manageability / Team Collaboration / Demo-Readiness / Technological Flexibility / Version Control, from the assignment guidelines table).
5. **Create the Initial Product Backlog** in ClickUp (see backlog table below) — prioritized epics → user stories → estimates.
6. **Assign initial Scrum roles** and plan rotation so every member experiences each role across the assignment:

| Member | Sprint 0 | Sprint 1 | Sprint 2 |
|---|---|---|---|
| A | Product Owner | Dev Team | Scrum Master |
| B | Scrum Master | Product Owner | Dev Team |
| C | Dev Team | Scrum Master | Product Owner |
| D | Dev Team | Dev Team | Dev Team |

*(Adjust to your team — keep Dev Team consistently staffed since Sprints 1–2 carry the heaviest build load.)*

7. **Set up the Git workflow:** branch protection on `main`, `.gitignore`, README per package (already present), and the branch/commit convention in Section 4.

### UEE Steps
```bash
# 1. Frontend scaffold (inside app/)
npx create-expo-app@latest app -t expo-template-blank-typescript
cd app
npx expo install react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install axios expo-secure-store

# 2. Backend scaffold (inside server/)
mkdir server && cd server
npm init -y
npm install express cors dotenv bcrypt jsonwebtoken zod
npm install -D typescript ts-node-dev @types/express @types/node @types/bcrypt @types/jsonwebtoken
npx tsc --init

# 3. Database — Prisma + hosted Postgres (Supabase/Neon)
npm install prisma @prisma/client
npx prisma init
# paste your Supabase/Neon connection string into server/.env as DATABASE_URL

# 4. Initial commit
git add .
git commit -m "[CU-SETUP] chore: scaffold Expo app and Express server"
git push origin main
```

Minimal `prisma/schema.prisma` seed for Sprint 0 (extended in Sprint 1/2 below):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(JOB_SEEKER)
  trustScore   Int      @default(0)
  createdAt    DateTime @default(now())
}

enum Role {
  JOB_SEEKER
  SHOP_OWNER
  VERIFIER
  ADMIN
}
```

---

## Phase 2 — Sprint 1: User Identity & Core Gig Management

### SPM Deliverables

**Sprint 1 Backlog**

| ID | User Story | Acceptance Criteria (summary) | Points | Role |
|---|---|---|---|---|
| US-01 | As a user, I can register as a Job Seeker or Shop Owner | Valid email required; password hashed; duplicate email rejected (409) | 5 | Dev |
| US-02 | As a user, I can log in with email/password | Wrong credentials → 401; success returns JWT | 3 | Dev |
| US-03 | As a Job Seeker, I can complete my profile (bio, skills, location) | Profile saved and retrievable via `GET /users/me` | 3 | Dev |
| US-04 | As a Shop Owner, I can complete my business profile | Business name, category, location saved | 3 | Dev |
| US-05 | As a Shop Owner, I can post a gig | Title, description, pay, location required; gig defaults to `OPEN` | 5 | Dev |
| US-06 | As a Job Seeker, I can browse/search gigs by category and location | Filters combine with AND logic; results sorted newest first | 5 | Dev |
| US-07 | As a Job Seeker, I can view full gig details | Shows poster name + trust score | 2 | Dev |

**Sprint 1 total: 26 points**

- **Daily stand-up log template** (one row/day/member in ClickUp or a shared doc): *Yesterday / Today / Blockers*.
- **Sprint review template:** demo checklist against US-01–07, stakeholder feedback notes, accepted/carried-over items.
- **Retro template:** Start / Stop / Continue, three items each, one action item owner per issue raised.

### UEE Build Steps

**Backend — extend `prisma/schema.prisma`:**
```prisma
model Gig {
  id          String    @id @default(uuid())
  title       String
  description String
  category    String
  payAmount   Float
  payType     PayType   @default(FIXED)
  location    String
  status      GigStatus @default(OPEN)
  postedBy    User      @relation(fields: [postedById], references: [id])
  postedById  String
  createdAt   DateTime  @default(now())
}

enum PayType   { FIXED HOURLY }
enum GigStatus { OPEN IN_PROGRESS COMPLETED CANCELLED }
```
```bash
npx prisma migrate dev --name add_gig
```

`src/controllers/auth.controller.ts`
```typescript
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
  res.status(201).json({ id: user.id, name: user.name, role: user.role });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
};
```

`src/middleware/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request { userId?: string; role?: string; }

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET!) as any;
    req.userId = payload.userId;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
```

`src/controllers/gig.controller.ts`
```typescript
import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

export const createGig = async (req: AuthRequest, res: Response) => {
  const { title, description, category, payAmount, payType, location } = req.body;
  const gig = await prisma.gig.create({
    data: { title, description, category, payAmount, payType, location, postedById: req.userId! },
  });
  res.status(201).json(gig);
};

export const getGigs = async (req: AuthRequest, res: Response) => {
  const { category, location } = req.query;
  const gigs = await prisma.gig.findMany({
    where: {
      status: "OPEN",
      category: category as string | undefined,
      location: location ? { contains: location as string, mode: "insensitive" } : undefined,
    },
    include: { postedBy: { select: { name: true, trustScore: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(gigs);
};
```

**Frontend screens:**

`src/api/client.ts`
```typescript
import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

`src/context/AuthContext.tsx` (skeleton)
```typescript
import React, { createContext, useContext, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginApi } from "../api/authApi";

type AuthContextType = {
  user: { id: string; name: string; role: string } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType["user"]>(null);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await loginApi(email, password);
    await SecureStore.setItemAsync("authToken", token);
    setUser(user);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync("authToken");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

Screens to build this sprint (skeletons, one component each): `LoginScreen`, `RegisterScreen` (role toggle: Job Seeker / Shop Owner), `ProfileScreen`, `ShopOwnerDashboardScreen`, `PostGigScreen` (form → `POST /gigs`), `BrowseGigsScreen` (FlatList + filter bar → `GET /gigs`), `GigDetailScreen`.

---

## Phase 3 — Sprint 2: Community Trust Pool & Application Workflow

### SPM Deliverables

**Sprint 2 Backlog**

| ID | User Story | Acceptance Criteria (summary) | Points | Role |
|---|---|---|---|---|
| US-08 | As a Verifier, I can endorse a job seeker or business | One endorsement per verifier per user; optional note | 5 | Dev |
| US-09 | As a Job Seeker, I can apply to a gig | Cannot apply twice to the same gig; status starts `PENDING` | 3 | Dev |
| US-10 | As a Shop Owner, I can view applicants for my gig | List shows applicant trust score and endorsement count | 3 | Dev |
| US-11 | As a Shop Owner, I can accept/reject an applicant | Accepting sets gig to `IN_PROGRESS`, rejects the rest | 5 | Dev |
| US-12 | As either party, I can rate the other after gig completion | Score 1–5, one rating per gig per direction | 5 | Dev |
| US-13 | Trust score updates automatically from endorsements + ratings | Recalculated on every new endorsement/rating | 8 | Dev |

**Sprint 2 total: 29 points**

- **Burndown chart tracking:** if your ClickUp plan includes the Dashboards burndown widget, point it at the Sprint 2 list using the `Story Points` field. If not available on your plan, track manually:
  - Ideal line: `remaining points = total points − (total points / sprint days) × day number`
  - Actual line: sum the `Story Points` of tasks still not marked "Done" at the end of each day
  - Plot both in Google Sheets/Excel (line chart) and screenshot into the report.
- **Sprint review with stakeholder:** invite the community-leader/shop-owner stakeholder identified in Sprint 0 to watch the live demo of US-08–13 and log their feedback verbatim in the ClickUp Doc.
- **Retro log:** same Start/Stop/Continue format as Sprint 1, plus a note on how role rotation felt for each member (useful for the individual-contribution viva question).

### UEE Build Steps

**Backend — extend schema:**
```prisma
model Application {
  id          String            @id @default(uuid())
  gig         Gig               @relation(fields: [gigId], references: [id])
  gigId       String
  applicant   User              @relation(fields: [applicantId], references: [id])
  applicantId String
  status      ApplicationStatus @default(PENDING)
  message     String?
  appliedAt   DateTime          @default(now())

  @@unique([gigId, applicantId])
}
enum ApplicationStatus { PENDING ACCEPTED REJECTED WITHDRAWN }

model Endorsement {
  id             String   @id @default(uuid())
  verifierId     String
  endorsedUserId String
  note           String?
  createdAt      DateTime @default(now())

  @@unique([verifierId, endorsedUserId])
}

model Rating {
  id        String   @id @default(uuid())
  gigId     String
  raterId   String
  rateeId   String
  score     Int
  comment   String?
  createdAt DateTime @default(now())

  @@unique([gigId, raterId, rateeId])
}
```
*(Add the corresponding relation arrays back on `User` and `Gig` when you wire this into your actual schema — omitted here for brevity.)*

`src/services/trustScore.service.ts`
```typescript
import { prisma } from "../config/db";

export const recalculateTrustScore = async (userId: string) => {
  const endorsements = await prisma.endorsement.count({ where: { endorsedUserId: userId } });
  const ratings = await prisma.rating.aggregate({
    where: { rateeId: userId },
    _avg: { score: true },
    _count: true,
  });

  const avgRating = ratings._avg.score ?? 0;
  const trustScore = Math.round(endorsements * 10 + avgRating * ratings._count * 2);

  await prisma.user.update({ where: { id: userId }, data: { trustScore } });
  return trustScore;
};
```

`src/controllers/application.controller.ts` (key handlers)
```typescript
export const applyToGig = async (req: AuthRequest, res: Response) => {
  const { gigId } = req.params;
  const application = await prisma.application.create({
    data: { gigId, applicantId: req.userId!, message: req.body.message },
  });
  res.status(201).json(application);
};

export const decideApplication = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { decision } = req.body; // "ACCEPTED" | "REJECTED"

  const application = await prisma.application.update({
    where: { id },
    data: { status: decision },
  });

  if (decision === "ACCEPTED") {
    await prisma.gig.update({ where: { id: application.gigId }, data: { status: "IN_PROGRESS" } });
    await prisma.application.updateMany({
      where: { gigId: application.gigId, id: { not: id } },
      data: { status: "REJECTED" },
    });
  }
  res.json(application);
};
```

**Frontend screens to build this sprint:** `VerifierEndorseScreen` (search user → endorse button + optional note), `ApplyGigScreen` (message field → `POST /gigs/:id/applications`), `ApplicantsScreen` (list per gig, accept/reject buttons), `RatingModal` (star selector 1–5 + comment, shown after a gig marks `COMPLETED`).

---

# 4. ClickUp ↔ GitHub Integration & Tracking Workflow

**One-time setup:** ClickUp → *Settings → Integrations → GitHub* → authorize → link `WorkNest_UEE_SPM_Project`. Once linked, any commit or PR that references a ClickUp task ID automatically appears in that task's activity feed — this becomes your evidence trail for the viva.

**Branch naming:**
```
feature/CU-<task-id>-short-kebab-description
# e.g. feature/CU-86b4x2a-gig-posting-api
```

**Commit message convention:**
```
[CU-<task-id>] <type>: <description>
# e.g. [CU-86b4x2a] feat: add gig posting endpoint
# types: feat | fix | docs | test | refactor | chore
```

**Pull request template** (add as `.github/PULL_REQUEST_TEMPLATE.md`):
```markdown
## Summary
<!-- what this PR does -->

## ClickUp Task
Closes CU-<task-id>

## Module
- [ ] SPM
- [ ] UEE

## Testing
<!-- how you verified this -->
```

**Individual contribution tracker** (keep this updated by each member every sprint — it's your viva prep sheet):

| Member | ClickUp Tasks Completed | Commits / PRs | Screens or APIs Built |
|---|---|---|---|
| A | CU-101, CU-104 | 6 commits, PR #3 | Login, Register screens |
| B | CU-102, CU-105 | 5 commits, PR #4 | Auth API, JWT middleware |
| C | CU-103 | 4 commits, PR #5 | Gig posting API |
| D | CU-106 | 4 commits, PR #6 | Browse Gigs screen |

---

# 5. Final SPM Assignment 01 Report Compilation Checklist

| # | Report Section | Rubric Criteria (weight) | Source Artifact |
|---|---|---|---|
| 1 | Project Selection & Justification | Criteria 1 (5%) | ClickUp Project Charter Doc + research-gap notes |
| 2 | Project Charter (Product Vision) | Criteria 2 (20%) | ClickUp Doc — scope, objectives, stakeholders, constraints |
| 3 | Initial Product Backlog | Criteria 3 (20%, shared) | ClickUp Backlog List (export/screenshot), Section 3 tables |
| 4 | Sprint Backlogs & Plans (Sprint 1 & 2) | Criteria 3 (20%, shared) | ClickUp Sprint Lists + burndown chart image |
| 5 | Defined Scrum Roles | Criteria 4 (25%, shared) | Role rotation table (Section 3, Phase 1) |
| 6 | Evidence of Scrum Events | Criteria 4 (25%, shared) | Stand-up logs, review/retro Docs per sprint |
| 7 | Working Increment Demo | Criteria 6 (10%) | Screen recording / live demo script mapped to backlog IDs |
| 8 | Repository Link | Supports Criteria 3 & 4 | GitHub URL + commit-graph screenshot, cited in report |
| — | Team Collaboration & Communication | Criteria 5 (15%) | ClickUp usage screenshots + group presentation |
| — | Submission of Report | Criteria 7 (5%) | Formatting checklist below |

**Final formatting checklist before submission:**
- [ ] File renamed to the group ID
- [ ] Cover page includes all 4 names + registration numbers
- [ ] Report length is 10–20 pages (brief allows 10–20; deliverables list also says 6–8 — follow the 10–20 range and confirm with your coordinator if unsure)
- [ ] At least one flowchart/diagram and one burndown chart included
- [ ] AI Tool Usage appendix present, following the CLEAR framework (Collaborate, Learn, Evaluate, Acknowledge, Reflect)
- [ ] Git repository link included and pointing to commit history covering Sprint 0–2
- [ ] Exported as PDF
- [ ] Every member can independently explain their listed tasks, commits, and any AI-assisted code before the viva
