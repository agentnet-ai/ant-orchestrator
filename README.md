# ant-orchestrator

Orchestration runtime for AgentNet that coordinates retrieval and response assembly across local services.

Status: Alpha / Reference Implementation
Docs: https://www.agent-net.ai
Org: https://github.com/agentnet-ai

## What it does

`ant-orchestrator` is the orchestration component of the AgentNet reference architecture.

It is responsible for coordinating retrieval and response assembly behavior across the local service graph, including backend/frontend execution paths.

In a local development environment, it typically runs alongside `ant-resolver`, and often with `ant-registrar` and `ant-capsulizer` for full end-to-end validation.

## Where it fits

Within the canonical AgentNet flow:

1. Capsulizer
2. Registrar
3. Resolver
4. Orchestrator

This repository provides the orchestration role.

## Quickstart

```bash
npm install
```

Run commands:

- `npm run dev`
- `npm run demo`
- `npm run reset:dev`
- `npm run reset:sample-data -- --yes`
- `npm run kill`

## Configuration

Use `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Resolver owner config (owner_id-only boundary):

```bash
# backend/.env
RESOLVER_MODE=http
# Discover via: curl -s http://localhost:4002/v1/owners/ant-worker
RESOLVER_OWNER_ID=<owner_id_from_registrar>
```

Owner ref fields (API boundary compatibility):
- Accepted variants: `owner_id` or `ownerId`, and `owner_slug` or `ownerSlug`
- Canonical internal key: `owner_id`
- `owner_slug` is a human-readable alias

## Strict Owner-ID Boundary Mode (Dev)

This verifies orchestrator calls resolver using `owner_id` only (no `owner_slug` field sent).

1) Reset sample data (recommended):

```bash
npm run reset:sample-data -- --yes
```

2) Get canonical `ant-worker` owner id from registrar:

```bash
curl -s http://localhost:4002/v1/owners/ant-worker
```

3) Set orchestrator backend env (copy/paste safe; one line per var):

```bash
RESOLVER_MODE=http
RESOLVER_OWNER_ID=<owner_id_from_registrar>
RESOLVER_BASE_URL=http://localhost:5175
```

4) Start services (separate terminals):

```bash
cd ../ant-registrar && npm run dev
cd ../ant-resolver && npm run dev
cd ../ant-capsulizer && ANT_WORKER_OWNER_SLUG=ant-worker npm run worker
cd ../ant-capsulizer && ANT_WORKER_OWNER_SLUG=ant-worker npm run seed
cd ../ant-orchestrator && npm run dev
```

5) Verify through orchestrator API:

```bash
curl -s -X POST http://localhost:5055/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"owner-id-dev-check","message":{"role":"user","content":"what is an agentnet resolver"}}'
```

```bash
curl -s -X POST http://localhost:5055/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"owner-id-dev-check-2","message":{"role":"user","content":"what is ans core"}}'
```

Logging tip:
- Orchestrator now enforces owner-id-only resolver calls at startup; if `RESOLVER_OWNER_ID` is missing/invalid it fails fast with a configuration error.

Automated smoke test (cross-stack):

```bash
bash scripts/verify-owner-id-mode.sh --with-reset
```

## Resetting Sample Data (Dev Only)

Use this when demo data contains legacy owner slugs and you want a clean rebuild under `owner_slug=ant-worker`.

From `ant-orchestrator`:

```bash
# 1) Reset orchestrator/resolver/registrar sample tables, flush BullMQ keys, clear capsulizer run artifacts
npm run reset:sample-data -- --yes

# 2) Start services (separate terminals)
cd ../ant-registrar && npm run dev
cd ../ant-resolver && npm run dev
cd ../ant-capsulizer && ANT_WORKER_OWNER_SLUG=ant-worker npm run worker

# 3) Re-seed crawl jobs
cd ../ant-capsulizer && ANT_WORKER_OWNER_SLUG=ant-worker npm run seed
```

Verify the canonical owner and resolver behavior:

```bash
# Registrar canonical owner (includes ownerId for owner_id-based resolve calls)
curl -s http://localhost:4002/v1/owners/ant-worker

# Resolver resolve/query using owner_slug
curl -s -X POST http://localhost:5175/v1/resolve/query \
  -H "Content-Type: application/json" \
  -d '{"owner_slug":"ant-worker","q":"agentnet resolver"}'

# Resolver resolve/query using owner_id (replace 1 with ownerId from registrar response)
curl -s -X POST http://localhost:5175/v1/resolve/query \
  -H "Content-Type: application/json" \
  -d '{"owner_id":1,"q":"agentnet resolver"}'
```

## Status

Status: Alpha / Reference Implementation  
These components are intended to demonstrate ANS-aligned architecture patterns.

## Related Repositories

Other core AgentNet reference components:

- https://github.com/agentnet-ai/AgentNet
- https://github.com/agentnet-ai/ant-capsulizer
- https://github.com/agentnet-ai/ant-registrar
- https://github.com/agentnet-ai/ant-resolver
- https://github.com/agentnet-ai/ant-orchestrator

## Contributing
These repositories are reference implementations of the AgentNet architecture aligned to ANS Core v2.0.
Issues for bug reports and spec questions are welcome.
We do not accept unsolicited pull requests. If you would like to contribute code, please open an issue first to discuss scope, or coordinate via a partner fork.

## License

Apache License 2.0. See `LICENSE` for details.
