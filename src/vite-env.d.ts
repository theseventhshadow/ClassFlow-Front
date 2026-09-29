/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_AUTH_MODE?: 'local' | 'entra';
    readonly VITE_MSAL_CLIENT_ID?: string;
    readonly VITE_MSAL_TENANT_ID?: string;
    readonly VITE_MSAL_API_SCOPE?: string;
    readonly VITE_MSAL_REDIRECT_URI?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_VERSION?: string;
  }

  namespace React {
    interface CSSProperties {
      [key: string]: unknown;
    }
  }
}

export {};
