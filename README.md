# 🎲 Rummikub Live - Modern Full-Stack Web Application

A responsive, feature-packed digital web application for the classic tile-based game **Rummikub**. Built with React 18, TypeScript, Tailwind CSS, an Express + Socket.IO real-time server, a zero-dependency deterministic rules engine, Web Audio synthesis, and multi-stage Docker containerization optimized for **Google Cloud Run**.

---

## 🌟 Key Features

### 1. Official Game Rules & Deterministic Core Engine (`@rummikub/shared`)
- **106 Tiles Total**: Exactly two identical sets of 1–13 across 4 colors (Red, Blue, Yellow/Orange, Black) and 2 Jokers.
- **Group (Set) Validation**: 3 or 4 tiles of the identical number with all distinct colors.
- **Run Validation**: 3 to 13 consecutive tiles of the same color. Ace (1) is strictly low (sequences like 12-13-1 are rejected).
- **The 30-Point Initial Meld Rule**: Players cannot touch existing table tiles until they place one or more valid melds from their own rack totaling $\ge 30$ points.
- **Joker Substitution**: Jokers assume the color and value of substituted tiles; jokers left in hand at the end penalize 30 points.
- **Official Scoring & Tallies**: Winner earns the sum of all losers' remaining rack points; losers receive negative penalties.

### 2. Turn Snapshot Engine & Rollback Safety
- Deep-clone snapshots captured at the start of every turn.
- **Revert Turn**: Instantly restore the entire board and your rack with a single click.
- **Turn Timer (60s Countdown)**: If the timer expires while the table contains broken or incomplete sets, the engine automatically rolls back the table and levies a 3-tile penalty draw.

### 3. Three Rich Game Modes
1. **Solo vs. AI Bots (Local / Offline)**:
   - Play with 1 to 3 AI opponents.
   - **Novice (Easy)**: Plays standalone 3-tile sets directly from hand.
   - **Pro (Hard)**: Evaluates complex table manipulations, appends 4th tiles to groups, extends runs, and splits long sequences.
2. **Pass & Play (Local Multiplayer)**:
   - Multi-player hotseat on a single phone, tablet, or desktop.
   - Includes privacy screen masking ("Curtain") between turns to prevent opponents from peeking.
3. **Online Rooms (WebSockets)**:
   - Create private lobbies with memorable 4-character codes (e.g., `RJ8K`).
   - Real-time drag-and-drop table updates and state synchronization across all participants.

### 4. Tactile UI/UX & Web Audio FX
- Authentic 3D plastic tiles with sunken engraved numerals and custom Joker artwork.
- Natural felt-green playing table with distinct meld containers and live validation alerts.
- Dual-tier wooden rack with **Sort 777** (by number/groups) and **Sort 789** (by color/runs).
- Synthesized Web Audio API sound effects (plastic tile clicks, placement thuds, draw swooshes, valid turn chimes, error buzzers, and victory fanfares) with zero external MP3 dependencies.

---

## 🏗️ Repository Architecture

```text
├── .github/
│   └── workflows/
│       └── deploy-cloud-run.yml   # CI/CD workflow for Google Cloud Run
├── Dockerfile                     # Multi-stage Alpine container (<150MB)
├── shared/                        # Pure TypeScript deterministic engine
│   ├── src/
│   │   ├── engine/
│   │   │   ├── tilePool.ts        # 106-tile generation, shuffle, draw, sorting
│   │   │   ├── meldValidator.ts   # Groups, runs, 30-pt initial meld, table validator
│   │   │   ├── botAI.ts           # Easy and Hard AI algorithms
│   │   │   ├── scoring.ts         # Official Rummikub scoring and penalties
│   │   │   └── __tests__/         # 23 comprehensive Vitest unit tests
│   │   ├── types.ts               # Shared interfaces (Tile, Meld, Player, GameState)
│   │   └── index.ts
├── server/                        # Express + Socket.IO server
│   ├── src/
│   │   ├── roomManager.ts         # Matchmaking, lobbies, authoritative validation
│   │   └── server.ts              # Express app, Cloud Run health probe, WS events
│   └── public/                    # Built client bundle (served statically in prod)
├── client/                        # React 18 + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Tile.tsx           # 3D physical tile component
│   │   │   ├── MeldGroup.tsx      # Meld platter with live validation badge
│   │   │   ├── Board.tsx          # Felt table and new meld drop zones
│   │   │   ├── Rack.tsx           # Wooden rack with sorting and selection
│   │   │   ├── TurnHUD.tsx        # Countdown timer, pool counter, opponent cards
│   │   │   └── Modals.tsx         # Lobbies, privacy curtain, rules, game over
│   │   ├── hooks/
│   │   │   ├── useSoundEffects.ts # Zero-dependency Web Audio API synthesizer
│   │   │   └── useRummikubEngine.ts # Game loop, turn rollback, multiplayer sync
│   │   └── App.tsx
└── package.json                   # Root monorepo workspace configuration
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Engine Unit Tests
```bash
npm test
```
Runs the 23 Vitest tests verifying tile counts, groups, runs, Jokers, 30-point initial meld rule, table validation, and penalty tallies.

### 3. Run Development Server
```bash
npm run dev
```
Runs both:
- Backend server on `http://localhost:8080` (with nodemon/tsx)
- Frontend client on `http://localhost:3000` (Vite dev server with WebSocket proxy)

### 4. Build Production Bundle
```bash
npm run build
```
Compiles `shared`, builds `client` into `server/public`, and compiles `server/dist`.

### 5. Run Production Server
```bash
npm start
```
Starts the server on `http://0.0.0.0:8080`.

---

## 🐳 Docker & Google Cloud Run Deployment

### Local Docker Build & Run
```bash
# Build the production image
docker build -t rummikub-web .

# Run container on port 8080
docker run -p 8080:8080 -e PORT=8080 rummikub-web
```
Verify the health check:
```bash
curl http://localhost:8080/health
# Response: {"status":"ok","uptime":...}
```

### Deploying to Google Cloud Run
1. Configure Google Cloud credentials and Artifact Registry in your repository secrets:
   - `GCP_PROJECT_ID`: Your GCP Project ID.
   - `GCP_SA_KEY`: Service Account JSON key with Cloud Run Admin & Artifact Registry Writer roles.
2. Push commits to `main`: `.github/workflows/deploy-cloud-run.yml` will automatically build and deploy to Cloud Run:
   ```bash
   gcloud run deploy rummikub-web \
     --image us-central1-docker.pkg.dev/$PROJECT_ID/rummikub-repo/rummikub-app:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1
   ```
3. Cloud Run binds automatically to `0.0.0.0:$PORT` and passes the `/health` liveness probe.

---

## 📜 License
MIT License.
