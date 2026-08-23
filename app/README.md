# WorkNest Mobile Frontend

A React Native + Expo + TypeScript frontend prototype for the WorkNest community gig board.

## What is WorkNest?

WorkNest connects local businesses and youth job seekers in a trusted community hiring pool. It supports three roles:

- **Youth job seeker** – browse and apply to local gigs, build a trust profile.
- **Local shop owner** – post gigs and review applicants.
- **Community verifier** – review and verify youth job seeker verification requests by checking identity information and supporting evidence to improve trust within the platform.

## Tech stack

- React Native (Expo SDK 51)
- TypeScript
- React Navigation (stack + bottom tabs)
- Zod (form validation)
- Mock API layer (ready to be swapped for a real backend)

## Project structure

```text
app/
├── src/
│   ├── api/          # Mock API clients (auth, gigs, applications, endorsements, ratings)
│   ├── components/   # Common UI, gig cards, trust badges
│   ├── context/      # AuthContext + GigContext
│   ├── navigation/   # Root, Auth, JobSeeker, ShopOwner navigators
│   ├── screens/      # Role-based screens
│   ├── theme/        # Colors, spacing, typography
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Constants, formatters, validators
├── App.tsx
├── app.config.ts
├── package.json
└── tsconfig.json
```

## Getting started

```bash
cd app
bun install
bun start
```

Then scan the QR code with Expo Go (iOS or Android) or press `w` to open the web preview.

## Demo accounts

| Role             | Email               | Password |
| ---------------- | ------------------- | -------- |
| Job seeker       | amal@example.com    | password |
| Shop owner       | savi@example.com    | password |
| Verifier         | nuwan@example.com   | password |

You can also register a new account and pick a role during sign-up.

## Notes

- This is a frontend-only prototype. All data is stored in memory and will reset on app reload.
- The API layer is designed to be swapped for real REST endpoints when the backend is ready.
