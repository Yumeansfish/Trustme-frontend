/// <reference types="vite/client" />

interface TrustmeInjectedAppConfig {
  production?: boolean;
  awServerUrl?: string;
}

declare const __TRUSTME_APP_CONFIG__: TrustmeInjectedAppConfig | undefined;
declare const __TRUSTME_DEV_SERVER__: boolean | undefined;
