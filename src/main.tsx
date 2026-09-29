import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import App from './App.tsx';
import { isAuthResponseUrl, isEntraAuthEnabled, msalInstance } from './config/msal';

const renderApp = (): void => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
};

/**
 * MSAL v5: cuando Microsoft redirige el popup de login a la redirect URI, esa página
 * debe reenviar la respuesta a la ventana principal (que luego cierra el popup).
 * En ese caso no se monta la app dentro del popup.
 */
const relayAuthResponse = async (): Promise<void> => {
  const { broadcastResponseToMainFrame } = await import('@azure/msal-browser/redirect-bridge');
  await broadcastResponseToMainFrame();
};

if (isEntraAuthEnabled && isAuthResponseUrl(window.location)) {
  relayAuthResponse().catch((err) => {
    console.error('No se pudo completar el login de Microsoft:', err);
    renderApp();
  });
} else if (isEntraAuthEnabled) {
  msalInstance.initialize().then(renderApp).catch(() => renderApp());
} else {
  renderApp();
}
