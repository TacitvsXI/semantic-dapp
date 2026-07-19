/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_RPC_URL?: string;
  readonly VITE_DEFAULT_CHAIN_ID?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
