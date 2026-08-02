# Contributing to VibeCraft

We appreciate your interest in contributing to VibeCraft. As maintainers, our primary goal is keeping this project lean, stable, and strictly within its architectural constraints.

## Core Architectural Constraints

We don't accept PRs that add external database dependencies. VibeCraft is and will remain zero-cost and zero-server-state. 

All state must be client-side (IndexedDB/Local Storage). If you try to add a Prisma schema, a Postgres dependency, or a Vercel KV store, the PR will be rejected. 

## Workflow

1. Fork the repository.
2. Ensure you are using `npm` to match the lockfile.
3. Keep PRs small and scoped to a single concern.
4. If you modify WebGPU inference logic, you must test on multiple browsers (Chrome, Firefox, Safari) and confirm memory limits are not breached.
5. All code must pass strict TypeScript checks (`npm run type-check`).
