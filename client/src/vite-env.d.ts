/// <reference types="vite/client" />

interface ImportMetaEnv {
  // extend with `VITE_*` here when needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
