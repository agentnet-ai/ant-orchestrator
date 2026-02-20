# ant-orchestrator

Ground-First orchestration layer for AgentNet. Monorepo with React frontend and Express backend.

## Quick start

```bash
npm install
npm run demo     # kills stale processes, starts everything, opens browser
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend, frontend, and ant-resolver concurrently (color-coded) |
| `npm run demo` | Kill ports, start all, auto-open browser when UI is ready |
| `npm run kill` | Free ports 5055, 5174, 5175 |

## Services

| Service | URL | Port |
|---------|-----|------|
| Frontend (Vite) | http://localhost:5174 | 5174 |
| Backend (Express) | http://localhost:5055 | 5055 |
| ant-resolver | http://localhost:5175 | 5175 |

## Resolver integration

Set `RESOLVER_MODE=http` in `backend/.env` to use a running ant-resolver instance:

```env
RESOLVER_MODE=http
RESOLVER_BASE_URL=http://localhost:5175
RESOLVER_NODE_ENDPOINT=/v1/resolve/node
RESOLVER_ENDPOINT=/v1/resolve/capsules
RESOLVER_OWNER_SLUG=agentnet
```

The orchestrator performs a two-step resolve: first resolves the node by identifier, then fetches capsules for that node.

## Project layout

```
ant-orchestrator/
  backend/          Express API (port 5055)
  frontend/         Vite + React + Tailwind (port 5174)
  scripts/          Dev tooling (killPorts, openWhenReady)
../ant-resolver/    External resolver service (port 5175)
```
