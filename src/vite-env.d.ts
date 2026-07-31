/// <reference types="vite/client" />

type AppBuildInfo = {
  buildId: string;
  builtAt: string;
  commit: string;
  version: string;
};

declare const __APP_BUILD_INFO__: AppBuildInfo;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_ENABLE_LOCAL_CLOUD_SYNC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
