🛡️ Sentinel: Full Stack Setup Guide

1. Prerequisites
   Node.js: v18+

pnpm: v8+

Docker & Docker Compose: For backend infrastructure.

2. Infrastructure (The Backend)
   Before starting the apps, you need the database and services running.

Bash

# From the root directory

cd packages/hoppscotch-backend
docker-compose up -d
Note: Ensure you have copied .env.example to .env in the hoppscotch-backend folder and configured your DATABASE_URL.

3. The Core Build (Data & CLI)
   As we established, the Sentinel logic lives in the shared data package. This must be built first:

Bash

# Build the engine

pnpm --filter "@hoppscotch/data" build

# Build the CLI (The Sentinel "Pulse" tool)

pnpm --filter "@hoppscotch/cli" build 4. Running the Web UI (The Frontend)
Once the backend is up, you can launch the dashboard to see your "Healed" collections:

Bash

# Start the development server from the root

pnpm run dev
Dashboard: http://localhost:3000

Admin Dashboard: http://localhost:3001

Sentinel Workflow (Recap)
The "Sentinel" Sync
Use the CLI to generate your healed blueprint from an OpenAPI URL:

Bash
node packages/hoppscotch-cli/bin/hopp.js sync <OPENAPI_URL>

The "Sentinel" Pulse
Run the autonomous health check with Smart Variable swapping:

Bash
node packages/hoppscotch-cli/bin/hopp.js pulse
