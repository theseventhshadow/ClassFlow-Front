# Guia de traspaso: Frontend, Microsoft Entra ID y AWS

Esta guia resume lo implementado en `ClassFlow-Front` y lo que debe completar el equipo responsable de Microsoft Entra ID y AWS.

## Estado actual

Ultimo commit de referencia: `0b90d9a`.

El frontend tiene dos modos:

- `local`: conserva el login actual con email y contrasena para desarrollo.
- `entra`: usa MSAL para autenticar en Microsoft Entra ID.

El modo se controla con `VITE_AUTH_MODE` y por defecto es `local`.

## Flujo Entra implementado

Cuando `VITE_AUTH_MODE=entra` y existen valores validos:

```text
React + MSAL
    |
    | loginPopup
    v
Microsoft Entra ID
    |
    | access_token
    v
API Gateway de AWS / API backend
    |
    v
GET /api/auth/me
```

El frontend:

1. Abre el login de Microsoft mediante MSAL.
2. Obtiene un `access_token` para la API de ClassFlow.
3. Adquiere el token silenciosamente cuando es posible.
4. Lo envia como `Authorization: Bearer <access_token>` mediante Axios.
5. Consulta `/api/auth/me` para obtener el usuario interno y su rol.
6. Redirige al dashboard segun el rol local recibido.

## Archivos principales

- `src/config/msal.ts`: configuracion MSAL y deteccion del modo Entra.
- `src/main.tsx`: inicializacion de `MsalProvider`.
- `src/context/AuthContext.tsx`: login popup, token silencioso, logout y validacion.
- `src/services/auth.service.ts`: consulta `/api/auth/me`.
- `src/services/api.service.ts`: envia el Bearer token.
- `src/pages/LoginPage.tsx`: muestra login local o boton Microsoft.
- `src/router/index.tsx`: deshabilita recuperacion de contrasena en modo Entra.
- `src/pages/admin/AdminDashboard.tsx`: oculta la creacion local de usuarios en modo Entra.

## Variables necesarias

Crear `.env.local` a partir de `.env.example` y completar:

```env
VITE_AUTH_MODE=entra
VITE_API_BASE_URL=<URL_BASE_DEL_API>/api
VITE_MSAL_CLIENT_ID=<FRONTEND_CLIENT_ID>
VITE_MSAL_TENANT_ID=<TENANT_ID>
VITE_MSAL_API_SCOPE=api://<API_CLIENT_ID>/access_as_user
VITE_MSAL_REDIRECT_URI=<REDIRECT_URI_REAL>
```

Las variables `VITE_` se incorporan durante `npm run build`. Cambiar una variable requiere reconstruir la imagen Docker.

No guardar `.env.local` ni secretos en Git.

## Tareas del equipo de Entra ID

1. Registrar el frontend como aplicacion SPA.
2. Registrar la API de ClassFlow.
3. Exponer el scope `access_as_user`.
4. Agregar la redirect URI exacta de desarrollo y produccion.
5. Configurar permisos para que el frontend solicite el scope de la API.
6. Crear y asignar App Roles:
   - `Administrator`.
   - `Teacher`.
   - `Student`.
   - `Guardian`.
7. Confirmar que los usuarios esten asignados en la aplicacion empresarial.
8. Entregar `TENANT_ID`, `FRONTEND_CLIENT_ID`, `API_CLIENT_ID`, scope y redirect URI.

El frontend no debe pedir contrasenas ni crear usuarios locales cuando Entra este activo.

## Tareas del equipo AWS

1. Entregar la URL final de AWS API Gateway.
2. Configurar `VITE_API_BASE_URL` con esa URL.
3. Configurar CORS para permitir el dominio del frontend.
4. Asegurar que el endpoint `/api/auth/me` sea accesible mediante el gateway.
5. Reconstruir y publicar la imagen frontend despues de cambiar las variables `VITE_`.
6. Configurar HTTPS y la redirect URI de produccion en Entra.

## Comandos locales

Modo local:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Build Docker:

```bash
docker build -t classflow-frontend:local .
```

El Dockerfile ya ejecuta `npm ci` y `npm run build`.

## Pruebas de aceptacion

### Modo local

- El formulario de email y contrasena sigue funcionando.
- Recuperacion de contrasena sigue disponible.
- El build Docker finaliza correctamente.

### Modo Entra

- El formulario local no aparece.
- El boton de Microsoft abre el login de Entra.
- El token solicitado contiene el scope de la API.
- Las peticiones llevan `Authorization: Bearer`.
- `/api/auth/me` devuelve el perfil interno.
- El dashboard corresponde al rol recibido.
- Las rutas de recuperacion redirigen al login.
- La gestion local `Nuevo usuario` no aparece.
- Un usuario no asignado en Entra no debe recibir acceso accidentalmente.

## Decisiones importantes

- El frontend usa `access_token`, no `id_token`, para llamar al backend.
- El frontend no decide ni inventa roles; usa el perfil devuelto por ClassFlow.
- Microsoft Entra autentica y entrega claims; ClassFlow conserva usuarios, relaciones y roles internos.
- No se deben hardcodear IDs reales ni dominios de produccion.
- No activar `entra` hasta disponer de los valores reales y la API publicada.
