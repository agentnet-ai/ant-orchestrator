# START HERE

## Purpose

This guide gets `ant-orchestrator` running locally and shows how it connects to the rest of the AgentNet reference stack.

## Prerequisites

- Node.js and npm
- MySQL
- Redis

## Setup

```bash
cp backend/.env.example backend/.env
npm install
```

## Run

```bash
npm run dev
```

Useful alternatives:

- `npm run demo`
- `npm run kill`
- `npm run reset:dev`

## Typical local integration flow

1. Start `ant-registrar`.
2. Start `ant-resolver`.
3. Start `ant-capsulizer` if web crawl inputs are needed.
4. Start `ant-orchestrator` (`npm run dev` or `npm run demo`).
5. Verify orchestration output in the frontend and backend logs.

## Links

- AgentNet: https://github.com/agentnet-ai/AgentNet
- ant-capsulizer: https://github.com/agentnet-ai/ant-capsulizer
- ant-registrar: https://github.com/agentnet-ai/ant-registrar
- ant-resolver: https://github.com/agentnet-ai/ant-resolver
