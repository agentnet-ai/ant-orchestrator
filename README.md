# ant-orchestrator

Orchestration runtime for AgentNet that coordinates grounded answer generation across UI, backend, and resolver services.

## What it does

`ant-orchestrator` is the composition layer in the AgentNet reference stack. It runs a frontend and backend that manage user queries, call upstream services, and assemble response outputs for local development and demos.

The backend orchestrates retrieval and generation paths, while the frontend provides the interaction surface. In local mode, the repo can also start `ant-resolver` so the full query-to-resolution flow is available in one command.

The implementation is intended as a reference baseline for multi-service orchestration behavior aligned to ANS Core v2.0.

## Where it fits

Canonical flow:

1. Capsulizer
2. Registrar
3. Resolver
4. Orchestrator (this repository)

## Quickstart

```bash
npm install
npm run dev
```

Also available:

- `npm run demo`
- `npm run kill`
- `npm run reset:dev`

## Configuration

Environment variables are managed in `backend/.env`. Start from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

## Repo structure

- `backend/` Express orchestration API
- `frontend/` Vite + React client
- `scripts/` local development utilities

## Status

Alpha, reference implementation.

## Related Repositories

- https://github.com/agentnet-ai/AgentNet
- https://github.com/agentnet-ai/ant-capsulizer
- https://github.com/agentnet-ai/ant-registrar
- https://github.com/agentnet-ai/ant-resolver
- https://github.com/agentnet-ai/ant-orchestrator

## License

Apache License 2.0. See `LICENSE`.
