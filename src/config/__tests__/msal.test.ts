import { describe, expect, it } from 'vitest';

import { entraLoginRequest, isAuthResponseUrl } from '../msal';

describe('entraLoginRequest', () => {
  it('siempre muestra la página de Microsoft para ingresar o elegir la cuenta', () => {
    expect(entraLoginRequest.prompt).toBe('select_account');
  });
});

const at = (hash: string, search = ''): Pick<Location, 'hash' | 'search'> => ({ hash, search });

describe('isAuthResponseUrl', () => {
  it('detecta la respuesta de Entra en el fragmento', () => {
    expect(isAuthResponseUrl(at('#code=abc&state=xyz&client_info=e30'))).toBe(true);
  });

  it('detecta una respuesta de error de Entra', () => {
    expect(isAuthResponseUrl(at('#error=access_denied&state=xyz'))).toBe(true);
  });

  it('detecta la respuesta en la query string', () => {
    expect(isAuthResponseUrl(at('', '?code=abc&state=xyz'))).toBe(true);
  });

  it('ignora URLs normales de la app', () => {
    expect(isAuthResponseUrl(at(''))).toBe(false);
    expect(isAuthResponseUrl(at('#seccion'))).toBe(false);
  });

  it('no confunde el token de restablecer contraseña con una respuesta de Entra', () => {
    expect(isAuthResponseUrl(at('', '?token=abc123'))).toBe(false);
  });

  it('exige el state para considerar que es una respuesta', () => {
    expect(isAuthResponseUrl(at('#code=abc'))).toBe(false);
  });
});
