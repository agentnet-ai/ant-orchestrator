# START HERE

## Purpose

Set up and run `ant-orchestrator` locally as the orchestration layer in the AgentNet reference flow.

## Prereqs

- Node.js and npm
- MySQL
- Redis

## Setup

```bash
cp backend/.env.example backend/.env
npm install
```

## Run commands

- `npm run dev`
- `npm run demo`
- `npm run reset:dev`
- `npm run kill`

## Typical local integration flow

1. Start `ant-registrar`.
2. Start `ant-resolver`.
3. Start `ant-capsulizer` when ingestion/web crawl input is needed.
4. Start `ant-orchestrator` with one of the run commands above.
5. Verify end-to-end behavior in local logs and UI.

## Related Repositories

- https://github.com/agentnet-ai/AgentNet
- https://github.com/agentnet-ai/ant-capsulizer
- https://github.com/agentnet-ai/ant-registrar
- https://github.com/agentnet-ai/ant-resolver
- https://github.com/agentnet-ai/ant-orchestrator
