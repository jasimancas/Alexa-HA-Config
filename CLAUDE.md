# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important**: Keep this file in sync with `AGENTS.md`. When updating one, update the other.

## Project Overview

Alexa HA Config is a Home Assistant add-on that provides a web UI for selecting which Home Assistant entities to expose to Amazon Alexa. Built with Next.js, it connects to Home Assistant via WebSocket, fetches entity/device/area registries, and writes selections to `configuration.yaml`.

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm start            # Start production server
pnpm test             # Run unit tests with Vitest
pnpm test:ui          # Interactive test UI
pnpm test:coverage    # Run tests with coverage report
pnpm test:e2e         # Run E2E tests with Playwright
pnpm test:e2e:ui      # Interactive E2E test UI
pnpm test:e2e:headed  # Run E2E tests in headed browser
pnpm lint             # Run Biome linter
pnpm lint:fix         # Auto-fix linting issues
pnpm type-check       # TypeScript type checking
pnpm docker:build     # Build Docker image
pnpm docker:run:dev   # Run Docker container locally
```

## Architecture

### Data Flow
1. `GET /api/entities` (server side) connects to the HA WebSocket API, fetches device/entity/area registries and compiles `CompiledEntity[]` (15s timeout, fails fast on `auth_invalid`)
2. `useGetEntities` (`src/queries/`) holds the local selection, pending changes and bulk updates
3. `POST /api/publish-alexa-config` → `updateAlexaConfiguration()` edits only `alexa.smart_home.filter.include_entities`
4. `POST /api/ha-core` `{action: "check" | "restart"}` proxies the Supervisor API so the new filter can be applied

### Key Directories
- `src/__tests__/api/` - API route tests (kept out of `pages/` so they are not served as routes)
- `src/pages/api/` - API routes: `entities`, `publish-alexa-config`, `ha-core`, `health`
- `src/queries/`, `src/mutations/` - TanStack Query hooks
- `src/guards/` - Type guards for Home Assistant message types
- `src/utils/ha-config.util.ts` - Comment-preserving YAML editing with the `yaml` package (Document API), follows `!include`, atomic writes, timestamped backups
- `src/utils/addon-options.util.ts` - Reads `/data/options.json`
- `src/types/` - TypeScript types for HA entities, devices, areas, compiled entities

### Home Assistant Integration
- WebSocket protocol: `auth_required` → `auth` → `auth_ok` → registry requests
- Message types defined in `MessageType` enum (`home-assistant.types.ts`)
- Entity filtering by domain: switch, scene, sensor, binary_sensor, light, climate, button, automation

### Configuration
- Path alias: `@/*` → `./src/*`
- Biome: tabs, double quotes for JS
- Tailwind with Material Tailwind and custom `ha.*` color namespace

## Testing

### Unit Tests (Vitest)
- Located in `src/**/*.test.ts(x)` files alongside source code
- Uses `@testing-library/react` for component testing
- Coverage reports generated with `@vitest/coverage-v8`

### E2E Tests (Playwright)
- Located in `e2e/` directory
- Uses mock WebSocket server to simulate Home Assistant

#### E2E Architecture
```
e2e/
├── home.spec.ts              # E2E test specs
├── fixtures/
│   └── home-assistant.ts     # Mock data (devices, entities, areas)
├── mocks/
│   └── mock-ha-websocket-server.ts  # Mock WebSocket server
├── global-setup.ts           # Starts mock server, creates config files
└── global-teardown.ts        # Cleanup
```

#### Mock WebSocket Server
The mock server (`e2e/mocks/mock-ha-websocket-server.ts`) simulates Home Assistant's WebSocket protocol:
1. Sends `auth_required` on connection
2. Validates auth token and sends `auth_ok`
3. Responds to registry requests (devices, entities, areas)
4. Returns mock data from `e2e/fixtures/home-assistant.ts`

#### E2E Best Practices
- Use `page.waitForSelector("table")` before interacting with loaded content
- Use `{ force: true }` on clicks when toast notifications may overlay elements
- Use `.first()` selector when multiple elements match (Material Tailwind quirk)
- For tabs, use `page.locator('[role="tablist"]').getByText("TabName")` instead of role selectors
- Add `waitForToastToDismiss()` helper when toasts interfere with interactions

## Docker Deployment

Multi-stage build: deps → builder (Next.js `output: "standalone"`) → runner (node:24-alpine + nginx, no pnpm/npm)
- `run.sh` is PID 1 (`init: false`): starts Next.js (127.0.0.1:3000) and nginx (8080, Ingress only), forwards SIGTERM and exits 1 if either dies so the Supervisor watchdog restarts the add-on
- nginx only accepts the Supervisor (172.30.32.2) and rewrites paths for the Ingress prefix
- Mounts: `/homeassistant` (config), `/data/options.json` (add-on options)
- Release: push tag `vX.Y.Z` matching `config.yml` version → images `jasimancas/alexa-ha-config-{amd64,aarch64}`

## Security
- `pnpm audit` must pass; GHSA-vfj7-8cjw-p6xm (braces via Tailwind 3 watch mode, no fix available) is ignored in `package.json`
- React 18 / Tailwind 3 are pinned by `@material-tailwind/react`; don't take those majors without replacing it

## Commit Convention

Conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
Scopes: `entities`, `websocket`, `api`, `ui`, `config`, `docker`
