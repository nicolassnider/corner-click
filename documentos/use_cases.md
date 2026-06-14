# Corner Click - Use Cases

This document outlines the primary use cases for the Corner Click application, defining the interactions between the system and its various users (Actors).

## Actors

1. **Tournament Organizer / Administrator:** Responsible for setting up the tournament, managing competitors, and generating brackets.
2. **Jury President / IT Table:** The official running a specific ring/area. They control the match flow, timer, and official match state.
3. **Corner Referee (Judge):** The official seated at the corners of the ring. Their primary role is to observe the match and score points using a mobile device or tablet.

---

## 1. Organizer Use Cases

### UC-1.1: Create and Configure Tournament
- **Description:** The Organizer creates a new tournament event and configures the available categories (age, weight, rank) according to ITF rules.
- **Outcome:** A new tournament instance is created in the database.

### UC-1.2: Register Competitors
- **Description:** The Organizer adds competitors manually or imports them, assigning them to their respective club and categories (BR-001, BR-002, BR-003).

### UC-1.3: Generate Brackets (Draw)
- **Description:** The Organizer triggers the bracket generation algorithm for a specific category.
- **Pre-conditions:** Competitors must be registered and verified.
- **Flow:** The system randomly distributes competitors (BR-054), applying specific seeding for top-3 previous finishers if applicable (BR-055).

---

## 2. Jury President / IT Table Use Cases

### UC-2.1: Select and Load Match
- **Description:** The Jury President selects the next match from the bracket to be played in their assigned ring.
- **Outcome:** The match state is initialized as `PENDING`. The competitors' names are broadcasted to the Corner Referees' devices.

### UC-2.2: Start / Resume Match Timer
- **Description:** Upon the Central Referee's command ("SIJAK" / "GAE-SOK"), the Jury President starts the timer.
- **Outcome:** The match state changes to `ACTIVE`. The system enables the scoring buttons on all Corner Referees' devices.

### UC-2.3: Pause Match Timer
- **Description:** Upon the Central Referee's command ("JUNG-JI"), the Jury President pauses the timer.
- **Outcome:** The match state changes to `PAUSED`. The system instantly disables the scoring buttons on the Corner Referees' devices to prevent invalid scoring.

### UC-2.4: Handle Medical Time
- **Description:** If a competitor is injured, the Jury President starts the medical timer (maximum 3 minutes per match, BR-034).
- **Outcome:** Match is paused. If medical time exceeds 3 minutes, the system prompts the Jury President to declare the match over (BR-036).

### UC-2.5: End Match and Declare Winner
- **Description:** When the timer runs out or a disqualification occurs, the Jury President ends the match.
- **Outcome:** Match state changes to `ENDED`. The system aggregates the scores from the Corner Referees and calculates the winner. If it's a tie, the system prompts for a tie-breaking round (BR-042).

---

## 3. Corner Referee (Judge) Use Cases

### UC-3.1: Connect to Assigned Ring
- **Description:** The judge opens the `web-judges` app on their mobile device and enters a **temporary PIN code** provided by the Organizer.
- **Outcome:** The device authenticates the judge anonymously, assigns them to their specific ring and corner position, and syncs with the Jury President's table via Firebase.

### UC-3.2: Score Points
- **Description:** While the match is `ACTIVE`, the judge taps the screen to award points to the Red or Blue competitor based on the techniques observed.
  - +1 Point (Hand attack to mid/high section)
  - +2 Points (Foot attack to mid section)
  - +3 Points (Foot attack to high section)
- **Constraints:** Buttons are disabled if the match is `PENDING`, `PAUSED`, or `ENDED`.

### UC-3.3: Record Warnings and Deductions
- **Description:** The judge records warnings or direct deductions as indicated by the Central Referee.
- **Outcome:** The system automatically converts 3 accumulated warnings into a 1-point deduction (Gam-jeom) as per BR-024.
