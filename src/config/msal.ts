import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
  type PopupRequest,
} from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || '';
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || '';
const apiScope = import.meta.env.VITE_MSAL_API_SCOPE || '';
export const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin;

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
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);

export const entraLoginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email', ...(hasRealValue(apiScope) ? [apiScope] : [])],
  // Siempre muestra la página de Microsoft para ingresar o elegir la cuenta,
  // en vez de reutilizar en silencio la sesión que haya quedado en el navegador.
  prompt: 'select_account',
};

export const classFlowApiRequest: PopupRequest = {
  scopes: hasRealValue(apiScope) ? [apiScope] : [],
};

/**
 * Indica si la URL trae una respuesta de autorización de Entra (code/error + state),
 * es decir, si esta página es el destino de la redirect URI dentro del popup.
 */
export const isAuthResponseUrl = (location: Pick<Location, 'hash' | 'search'>): boolean => {
  const params = new URLSearchParams(
    (location.hash.startsWith('#') ? location.hash.slice(1) : location.hash) || location.search.slice(1),
  );
  return params.has('state') && (params.has('code') || params.has('error'));
};

/**
 * Códigos de MSAL que indican que el navegador no pudo abrir el popup.
 */
export const POPUP_BLOCKED_ERROR_CODES = ['popup_window_error', 'empty_window_error'];

/**
 * Cuenta de Entra en uso. Devuelve null si Entra no está habilitado, porque en ese
 * caso la instancia de MSAL nunca se inicializa y no debe consultarse.
 */
export const getActiveMsalAccount = (): AccountInfo | null => {
  if (!isEntraAuthEnabled) {
    return null;
  }

  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
};

/**
 * Obtiene un access token para ClassFlow-Backend con la cuenta activa de Entra.
 * Intenta primero en silencio y recurre al popup si Entra exige interacción.
 */
export const acquireApiAccessToken = async (): Promise<string | null> => {
  const account = getActiveMsalAccount();

  if (!account) {
    return null;
  }

  try {
    const response = await msalInstance.acquireTokenSilent({ ...classFlowApiRequest, account });
    return response.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const response = await msalInstance.acquireTokenPopup({ ...classFlowApiRequest, account });
      return response.accessToken;
    }

    throw err;
  }
};