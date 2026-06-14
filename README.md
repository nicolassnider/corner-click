# Corner Click

Corner Click is a comprehensive web application designed for managing ITF Taekwondo tournaments. It empowers organizers to seamlessly create tournament brackets, list upcoming matches, and provides a highly responsive, real-time scoring interface for judges.

## Core Features

- **Bracket Management:** Automatically and manually generate tournament brackets (llaves) with support for seeding and byes.
- **Match Listing:** Keep track of all matches, their statuses (pending, active, completed), and assigned areas/rings.
- **Live Scoring Interface:** A real-time, low-latency dashboard for Corner Referees to award points (1, 2, or 3) and record warnings or deductions, fully compliant with ITF Official Competition Rules.
- **Role-Based Access Control:** Secure access separated by roles (Admin, Organizer, Jury, Judge).
- **Frictionless Judge Login:** Judges log in instantly using temporary PIN codes generated for specific rings and corners, avoiding the need for complex account creation on tournament day.
- **Internationalization (i18n):** Built from the ground up to support multiple languages.

## Technology Stack

- **Astro:** Core framework for routing and fast page loads.
- **React:** UI library used for complex, stateful components like the interactive scoring pad and tournament brackets.
- **Firebase:** Provides real-time data synchronization for live scoring (Realtime Database) and persistent storage for tournament structures (Firestore).
- **Netlify:** Hosting platform, utilizing serverless Node.js functions for secure backend operations like bracket generation.
- **Vanilla CSS:** Custom, modern, and premium design system featuring glassmorphism and dynamic micro-animations.

## Business Rules

Corner Click strictly adheres to the official ITF Sparring Business Rules (Version 2026-1). Detailed business rules regarding competitor eligibility, scoring criteria, match durations, and officiating can be found in `documentos/itf_sparring_business_rules.md`.

## Getting Started

*(Development setup instructions will be added shortly)*
