# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep pages and UI state in the React presentation tier; use the shared API client for relative `/api` requests, with explicit loading, empty, and accessible error states. Do not put business rules or database access in the frontend.
- Logic tier decision: Implement the API contracts in Express routes/services, keeping request validation and response mapping at the API boundary and persistence logic in the data tier. Preserve the existing ports and Vite proxy; do not add authentication in this exercise.
- Data tier decision: Define required fields, references, and defaults in the Mongoose models. Keep seed data representative and idempotent: add or update the exercise fixtures without deleting unrelated records.
- Activity tracking approach: Validate the request fields and ID format before querying; confirm both referenced user and team exist before creating. Persist the references, type, minutes, computed points, and occurrence time, and return deliberate 4xx responses for invalid input or missing references.
- Team management approach: Require a non-empty name, preserve the submitted name and mascot, and support member references. Return a deliberate 400 for a missing name rather than relying on a database error.
- Leaderboard approach: Aggregate activity points by team, include teams with no activity at zero, sort by total points descending with team name as a deterministic tie-breaker, and assign 1-based ranks in the API response.
- Workout suggestions approach: Find the user by the requested email, use recent activity and the user's fitness goal to select a matching workout, and include a concise reason. Return a deliberate 4xx when no user matches.

## Test plan

Run the focused contract suites in dependency order, then build both tiers. A data failure points to model or seed behavior; an API failure points to route/service behavior or its data integration; a frontend failure points to API-client integration, rendering, or user-visible state handling. A build failure indicates a type-check or production compilation problem. Baseline results recorded from the current starter implementation:

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` - 4 failed, 1 passed. The User, Team, Activity, and Workout required-field validation contracts fail; the seed/idempotency contract passes.
- API command: `npm run test:api --prefix octofit-tracker/backend` - 4 failed. Invalid activity and team requests return 501 instead of 400, the leaderboard is empty instead of ranked, and the first workout suggestion does not match the user's activity/goal.
- Frontend command: `npm test --prefix octofit-tracker/frontend` - 15 failed. Data rendering and the user-specific workout request fail, as do loading, empty, and accessible error states across all four routes.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — not run yet; run after implementation to check backend TypeScript compilation.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — not run yet; run after implementation to check frontend TypeScript and Vite production compilation.
