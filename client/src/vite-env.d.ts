/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

/** The root changelog, parsed at build time by the changelog plugin in `vite.config.ts`. */
declare module '*/CHANGELOG.md' {
  const entries: readonly import('./changelog/parse').ChangelogEntry[];
  export default entries;
}
