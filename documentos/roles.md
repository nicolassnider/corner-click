# Corner Click - System Roles & Permissions

To maintain security and ensure that only authorized personnel can perform specific actions in the application (especially during a live tournament), we need to define clear roles using Firebase Authentication and Custom Claims.

## 1. System Administrator (Super Admin)
- **Scope:** Global
- **Permissions:** 
  - Full access to all data.
  - Can create new Tournaments.
  - Can assign the "Tournament Organizer" role to other users.

## 2. Tournament Organizer (Organizer)
- **Scope:** Specific Tournament(s)
- **Permissions:**
  - Can register competitors and clubs.
  - Can generate brackets (llaves) and match schedules.
  - Can assign "Jury" and "Judge" roles for their specific tournament.
  - **Accesses:** `web-admin` (Full features)

## 3. Jury President / IT Table (Jury)
- **Scope:** Specific Ring / Area
- **Permissions:**
  - Can view the upcoming match queue for their assigned Ring.
  - Can change the state of a match (`PENDING` -> `ACTIVE` -> `PAUSED` -> `ENDED`).
  - Can start medical timers.
  - Can finalize a match and declare the winner based on the judges' scores.
  - **Cannot** alter the overall bracket structure or register new competitors.
  - **Accesses:** `web-admin` (Jury Dashboard only)

## 4. Corner Referee (Judge)
- **Scope:** Specific Ring / Corner (e.g., Ring 1, Corner 1)
- **Permissions:**
  - Can submit points (+1, +2, +3), warnings, and deductions.
  - Can **only** submit these when the match state is `ACTIVE`.
  - **Cannot** start/stop the match.
  - **Cannot** see the overall bracket or tournament settings.
  - **Accesses:** `web-judges` (ScorePad only)

---

### Implementation Strategy (Firebase)
We will use **Firebase Custom Claims** to attach these roles to user tokens. 
For Judges, instead of forcing them to create accounts with emails and passwords on the day of the event, the Organizer can generate **Access Codes (PINs)** or temporary anonymous logins mapped to a specific Ring and Corner.
