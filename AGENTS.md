# AGENTS.md
Guidance for agentic coding assistants working in the DropPoint repository.

## Project Snapshot
- Stack: Electron app with main process (`src/*.js`) and renderer scripts (`renderer/*.js`).
- Frontend styling: Tailwind CSS in static pages under `static/`.
- Module system: CommonJS (`require`, `module.exports`).
- Package manager: npm (`package-lock.json` is authoritative).
- App entry point: `src/App.js`.
- Packaging: `electron-builder`.

## Environment Expectations
- Use Node 18.x to match CI (`.github/workflows/build.yml`).
- Use npm, not pnpm/yarn.
- Support Windows/macOS/Linux behavior when changing platform-sensitive code.
- CI validates build packaging; lint and tests are not configured currently.

## Setup Commands
- Install dependencies: `npm install`
- Launch app in dev mode: `npm start`

## Build / Lint / Test Commands

### Build
- Standard build: `npm run build`
- Release build/publish: `npm run release`
- Platform-specific examples:
  - Windows: `npx electron-builder --win`
  - macOS: `npx electron-builder --mac`
  - Linux: `npx electron-builder --linux`

### Lint
- No lint script exists in `package.json` today.
- No ESLint/Prettier config files were found in the repository root.
- Do not invent lint steps in CI-related work unless explicitly requested.

### Test
- No `npm test` script exists today.
- No `*.test.*` or `*.spec.*` files were found.
- Practical verification is manual smoke testing plus build check:
  - `npm start`
  - `npm run build`

### Running a Single Test (Important)
- There is no single-test command right now because no test runner is configured.
- If a test runner is added later, expose both full-suite and single-test commands.
- Recommended future pattern with Node test runner:
  - Run all tests: `node --test`
  - Run one file: `node --test path/to/file.test.js`
  - Run one test by name: `node --test --test-name-pattern "name fragment"`

## Fast Validation Checklist for Agents
- Main/renderer logic change:
  - Start app with `npm start`.
  - Exercise drag/drop, tray menu, and affected settings flows.
- Packaging/build change:
  - Run `npm run build`.
- Prefer smallest meaningful validation for the edited scope.

## Code Style Guidelines

### Imports and Module Boundaries
- Keep `require(...)` statements at the top of files.
- Typical ordering:
  - Electron and Node built-ins first
  - External packages second
  - Local modules last
- Keep privileged APIs in main process files (`src/*`).
- Expose renderer-safe capabilities through preload/IPC contracts.

### Formatting and Syntax
- Use 2-space indentation.
- Use semicolons.
- Prefer double quotes for strings.
- Prefer trailing commas in multiline arrays/objects/calls.
- Avoid long dense lines; wrap where readability improves.
- Favor `const`; use `let` only when reassignment is required.

### Types and Data Contracts
- Codebase is JavaScript-only (no TypeScript).
- Use JSDoc for non-obvious params/returns in shared helpers.
- Validate IPC payloads and function inputs defensively.
- Return stable object shapes from IPC handlers.
- Use safe defaults for optional values (`x || ""`, `Array.isArray(...) ? ... : []`).

### Naming Conventions
- Variables/functions: `camelCase`.
- Classes/constructors: `PascalCase` (for example `Instance`, `Settings`).
- `src/` filenames are generally `PascalCase.js`; preserve existing local patterns.
- IPC channel naming should stay consistent with existing style:
  - Namespaced by domain (`clipboard:*`, `gallery:*`, `fs:*`, `vault:*`)
  - Use concise kebab/camel fragments (`resize-window`, `get-history`)

### Error Handling and Logging
- Wrap filesystem and Electron boundary operations in `try/catch` when failure is recoverable.
- Fail soft where possible (early return, fallback values) to keep app responsive.
- Throw errors only for invalid contracts or truly exceptional states.
- Use clear log prefixes (for example `[DropPoint] ...`).
- Use `console.warn` for recoverable issues and `console.error` for hard failures.

### Electron and IPC Practices
- Validate path existence before file operations.
- Avoid blocking expensive work in hot IPC paths unless necessary.
- Keep IPC handlers focused and side effects explicit.
- Avoid leaking internal data structures over IPC.
- Keep cross-window broadcasts guarded (`win`, `webContents`, destroyed checks).

### Renderer/UI Script Practices
- Guard DOM lookups before attaching listeners.
- Keep state mutations centralized (add/replace/clear helpers).
- Normalize dropped file metadata near boundaries.
- Avoid duplicate entries unless explicitly part of feature behavior.
- Keep drag/drop UX resilient to empty or invalid payloads.

### State and Persistence
- `electron-store` is the canonical persistence layer.
- Keep defaults and schema in `src/configOptions.js` synchronized with UI behavior.
- For new persisted keys:
  - Add default value
  - Add schema metadata/title
  - Handle missing legacy values safely

### Comments and Documentation
- Add comments only for non-obvious behavior.
- Prefer concise JSDoc over long inline commentary.
- Update docs when commands or user-facing behavior changes.

## Repository Guardrails
- Do not add another lockfile.
- Do not migrate CommonJS to ESM unless explicitly requested.
- Avoid broad refactors outside task scope.
- Keep changes minimal-risk for cross-platform Electron runtime behavior.

## Cursor / Copilot Rule Status
- Checked `.cursor/rules/`: not present.
- Checked `.cursorrules`: not present.
- Checked `.github/copilot-instructions.md`: not present.
- If any of these files are added later, treat them as higher-priority repository instructions.

## Source References
- Command scripts: `package.json`
- CI baseline and Node version: `.github/workflows/build.yml`
- Main process examples: `src/App.js`, `src/Window.js`, `src/RequestHandlers.js`
- Renderer examples: `renderer/droppoint.js`, `renderer/settings-renderer.js`
- Persistence schema/defaults: `src/configOptions.js`
