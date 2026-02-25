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
- `npm run kill`

## Configuration

Use `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
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

## License

Apache License 2.0. See `LICENSE` for details.
