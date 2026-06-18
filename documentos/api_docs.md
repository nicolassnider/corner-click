# API Documentation

The Corner Click API is built with Node.js and Express. It primarily serves the `web-admin` application and handles authentication logic, bracket generation, and secure data interactions that shouldn't be exposed directly to the frontend clients.

## Base URL

Local Development: `http://localhost:4000/api`

---

## Authentication Endpoints

### `POST /auth/pin`

Authenticates a Corner Referee (Judge) using a temporary PIN code and returns a Firebase Custom Auth Token.

**Description:**
Instead of requiring judges to create accounts, the Organizer generates temporary PINs mapped to specific rings and corners. The `web-judges` app sends the PIN here. The API verifies the PIN in the `pins` Firestore collection and, if valid, generates a Firebase Custom Token with appropriate claims (e.g., `role: 'judge'`). The frontend uses this token to authenticate directly with Firebase via `signInWithCustomToken()`.

**Request Body:**

```json
{
  "pin": "4829" // 4-6 digit numeric string
}
```

**Success Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZC... (Firebase Custom Token)",
  "assigned": {
    "tournamentId": "tour_abc123",
    "ringId": "ring_1",
    "cornerId": "corner_red"
  }
}
```

**Error Responses:**

- `400 Bad Request`: `{ "error": "PIN is required" }`
- `401 Unauthorized`: `{ "error": "Invalid PIN" }` or `{ "error": "PIN has expired" }`
- `503 Service Unavailable`: `{ "error": "Firebase Admin not configured" }` (Credentials missing from `.env`)

## Tournament & PIN Endpoints

### `POST /tournaments/{id}/pins/generate`

Generates all necessary PINs for a given tournament.

**Description:**
This endpoint is used by the **Organizer** (from the Admin Dashboard or Swagger) to automatically generate 4-digit numeric PINs for all rings and corners of a tournament. This is how the PINs are "obtained" to be later distributed to the judges.

**Response:**
Returns a list of the generated PINs. The Organizer must note these down or print them to give to the respective judges.

```json
{
  "message": "Generated 16 PINs successfully",
  "pins": [
    { "pin": "4829", "ringId": "ring_1", "cornerId": "red" },
    { "pin": "1234", "ringId": "ring_1", "cornerId": "blue" }
  ]
}
```

---

## Hybrid Architecture: Match Control & Scoring

To support Serverless deployment, the API uses a hybrid approach:

- **Match Status (Firebase RTDB)**: Firebase Realtime Database is strictly used as a "dumb pipe" to broadcast the match `status` and `timer`. The API or Admin pushes to Firebase, and Judges only listen.
- **Match Control (REST)**: Admin clients use REST POST requests (`/api/matches/:id/status`) to change match state. The API validates these commands.
- **Local Scoring**: Judges accumulate points locally in their app's state during an `ACTIVE` match. They do **not** send points in real-time.
- **Score Collection (REST)**: When a match status changes to `ENDED`, judges automatically send their locally accumulated score to the API via REST (`/api/matches/:id/scores`). The API validates and records the final result in Firestore.

---

## Environment Variables required

To run the API, the following variables must be set in `.env`:

- `PORT` (default 4000)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Keep the `\n` characters intact)
- `FIREBASE_DATABASE_URL`
