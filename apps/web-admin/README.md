# Corner Click - Web Admin & Organizers App

This is the **Corner Click Admin & Organizers Application** (`apps/web-admin`), a comprehensive administrative console built for Organizers, Jury members, and Spectator TV displays.

## Core Features

- **Jury Dashboard (`/live`):** A dark sports-themed dashboard for the Central Jury Table. Provides live round timers, automated custom toast warnings, judge consensus vote comparison bars, and tie-breaking options.
- **Dynamic TV Spectator View (`/area/[areaId]/tv`):** A high-contrast digital scoreboard optimized for public projectors and TVs.
  - **Overscan Margins (5% Safe Zone):** Elements are safe-zone padded (`p-[4vh] px-[4vw]`) to prevent clipping on physical Smart TVs.
  - **Closed Scoreboard Mode:** Real-time judge votes remain hidden and set to a dimmed `0` ("MARCADOR CERRADO") during active rounds to prevent bias. They instantly light up in glowing Red and Blue neon consensus vote counts once the match is declared `ENDED` or `COMPLETED`.
  - **Real-time Live Sync:** Collects live score streams directly from Firebase RTDB `/live_matches` as judges score.
- **Bracket Management:** Organizer dashboard for automatically seeding bracket nodes, handling byes, and publishing upcoming fights.
- **Admin Authentication:** Secure email/password login integrated with custom Admin roles.

## Technical Architecture

- **Astro:** Pages routing framework. Dynamically pre-renders dynamic TV routes `/area/[1-10]/tv` at build time.
- **React:** Powers the Organizer login, the interactive Bracket editor, the Jury controller (`JuryDashboard.tsx`), and the Spectator Scoreboard (`PublicScoreboard.tsx`).
- **Firebase Realtime Database:** Handles live match statuses, timer ticks, and score streams.
- **Firebase Firestore:** Persists brackets, category configurations, competitor listings, and judge assignments.

## Development

Run the development server from the monorepo root:

```bash
npm run dev --workspace=apps-web-admin
```

Or run dev on all workspaces at once:

```bash
npm run dev
```
