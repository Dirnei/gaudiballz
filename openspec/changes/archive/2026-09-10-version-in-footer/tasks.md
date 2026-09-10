## 1. Build pipeline

- [x] 1.1 Add `ARG APP_VERSION=local-dev` and `ENV VITE_APP_VERSION=$APP_VERSION` to the client stage in `Dockerfile`, before `npm run build`
- [x] 1.2 Add TypeScript declaration for `import.meta.env.VITE_APP_VERSION` in `client/src/vite-env.d.ts`

## 2. UI

- [x] 2.1 Create a `version.ts` module that exports the version string (`import.meta.env.VITE_APP_VERSION` with `'local-dev'` fallback)
- [x] 2.2 Render the version in the game-screen footer as muted text after the control buttons
- [x] 2.3 Render the version in any other screen footers that exist (home / menu)

## 3. Verify

- [x] 3.1 Run `npm run dev` and confirm the footer shows `local-dev`
- [x] 3.2 Build with `docker compose up -d --build` and confirm the footer shows `local-dev` (default ARG)
- [x] 3.3 Build with `docker build --build-arg APP_VERSION=1.0.0-test .` and confirm the footer shows `1.0.0-test`
