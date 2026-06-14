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

---

## Environment Variables required
To run the API, the following variables must be set in `.env`:
- `PORT` (default 4000)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Keep the `\n` characters intact)
- `FIREBASE_DATABASE_URL`
