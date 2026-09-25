import { PublicClientApplication, type Configuration, type PopupRequest } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || '';
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || '';
const apiScope = import.meta.env.VITE_MSAL_API_SCOPE || '';
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin;

const hasRealValue = (value: string): boolean => value.length > 0 && !value.startsWith('<');

export const isEntraAuthEnabled =
  import.meta.env.VITE_AUTH_MODE === 'entra'
  && hasRealValue(tenantId)
  && hasRealValue(clientId)
  && hasRealValue(apiScope);

const msalConfiguration: Configuration = {
  auth: {
    clientId: hasRealValue(clientId) ? clientId : 'local-development-client',
    authority: `https://login.microsoftonline.com/${hasRealValue(tenantId) ? tenantId : 'common'}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);

export const entraLoginRequest: PopupRequest = {
  scopes: hasRealValue(apiScope) ? [apiScope] : [],
};