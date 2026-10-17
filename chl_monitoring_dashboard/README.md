# CHL Monitoring Dashboard

The web Admin Dashboard for the JRB CHL Enforcement system. Supervisors and
administrators use it to monitor enforcement activity recorded by the mobile
app.

**Stack:** React 19, TypeScript, Vite, oxlint. Node.js 24.

## Contents

1. [Getting started](#getting-started)
2. [Commands](#commands)
3. [Project structure](#project-structure)
4. [Conventions](#conventions)
5. [Change log](#change-log)

## Getting started

```bash
cd chl_monitoring_dashboard
npm install
npm run dev
```

The dev server prints its address (by default http://localhost:5173).

## Commands

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Starts the dev server with hot reload                   |
| `npm run build`     | Type-checks and builds the production bundle to `dist/` |
| `npm run preview`   | Serves the built bundle locally                         |
| `npm run typecheck` | Type-checks only                                        |
| `npm run lint`      | Lints with oxlint                                       |
| `npm run check`     | Lint and build: run before committing                   |

## Project structure

```
index.html          The page Vite serves; loads src/main.tsx
public/             Static files served as they are (favicon, icons)
src/
  main.tsx          Entry point: mounts <App /> into #root
  App.tsx           The root component
  assets/           Images and other files imported by the code
vite.config.ts      Vite settings
tsconfig*.json      TypeScript settings (app code and build tooling)
.oxlintrc.json      Lint rules
```

## Conventions

- TypeScript everywhere; no `any` without a reason.
- Run `npm run check` before committing.
- Commit and push to `main` after each change; update this README and its
  change log in the same commit.

## Change log

Newest first. Add a line for every change.

- Installed React 19 with Vite and TypeScript (oxlint for linting); added
  `typecheck` and `check` scripts, `.nvmrc` and the Node 24 requirement.
