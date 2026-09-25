import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import App from './App.tsx';
import { isEntraAuthEnabled, msalInstance } from './config/msal';

const root = ReactDOM.createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
};

if (isEntraAuthEnabled) {
  msalInstance.initialize().then(renderApp).catch(() => renderApp());
} else {
  renderApp();
}
