# AI Game Factory

## Project purpose

This repository contains an AI-assisted factory for developing
3D browser game prototypes from approved design specifications.

The factory must be reusable across different game projects.

## Technology stack

- TypeScript
- React
- Three.js
- React Three Fiber
- Vite
- Additional libraries only when justified

## Development principles

1. Prioritize playable prototypes over polished products.
2. Follow approved game design specifications.
3. Do not invent or change core gameplay mechanics without approval.
4. Keep experimental ideas separate from approved requirements.
5. Prefer simple, maintainable and reusable solutions.
6. Avoid unnecessary dependencies and overengineering.
7. Explain significant technical decisions.

## Agent workflow

Before implementing a substantial task:

1. Read the relevant specifications.
2. Identify requirements and constraints.
3. Propose a concise implementation plan.
4. Wait for approval before making substantial changes.

During implementation:

1. Work in small, verifiable steps.
2. Run relevant tests and build checks.
3. Fix errors when possible.
4. Report changes, test results and remaining limitations.

## Important restrictions

- Do not modify approved design specifications without permission.
- Do not implement features marked as experimental or deferred.
- Do not introduce major architectural changes without approval.
- Never assume a task is complete solely because code was written.

## Current project

The first prototype is a card-based RPG.

Its approved functional specification is located at:

docs/rpg-cartas-prototype-spec-v0.2.md

Treat this document as the source of truth for gameplay requirements.
