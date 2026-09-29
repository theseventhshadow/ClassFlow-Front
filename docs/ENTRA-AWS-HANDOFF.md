# Guia de traspaso: Frontend, Microsoft Entra ID y AWS

Esta guia resume lo implementado en `ClassFlow-Front` y lo que debe completar el equipo responsable de Microsoft Entra ID y AWS.

## Estado actual

La pantalla de login es **hibrida**:

| Opcion | Cuando aparece | Que exige al backend |
|---|---|---|
| Correo y contrasena (principal) | Siempre, con recuperacion de contrasena | Endpoints locales de `ms-auth` (`/auth/login`, `/auth/validate`, etc.) y JWT local aceptado por gateway y BFF |
| Continuar con Microsoft (segunda opcion) | Con `VITE_AUTH_MODE=entra` y variables `VITE_MSAL_*` validas | Tokens de Entra aceptados por gateway, BFF y `ms-auth` (`/auth/me`) |

**Limitacion actual del backend:** `api-gateway`, `bff` y `ms-auth` tienen dos configuraciones de seguridad excluyentes (`@Profile("entra")` y `@Profile("!entra")`). Con el perfil `entra`, el backend responde `denyAll` (401 sin cuerpo) a `/api/auth/login`, `/register`, `/forgot-password`, `/reset-password` y `/change-password`, y el frontend muestra "El ingreso con correo y contrasena no esta habilitado en el servidor". Para que ambas opciones funcionen a la vez, el backend debe aceptar los dos tipos de token en un mismo perfil.

## Flujo Entra implementado

```text
React + MSAL (popup)
    |
    | 1. loginPopup -> login.microsoftonline.com
    | 2. Microsoft redirige el popup a VITE_MSAL_REDIRECT_URI
    | 3. main.tsx detecta la respuesta y la reenvia a la ventana principal
    |    (broadcastResponseToMainFrame, requerido por MSAL v5)
    v
access_token (scope access_as_user)
    |
    | Authorization: Bearer <access_token>
    v
API Gateway -> ms-auth: GET /api/auth/me
    |
    v
Perfil interno de ClassFlow (id, rol) -> dashboard del rol
```

El frontend:

1. Abre el login de Microsoft en un popup mediante MSAL.
2. Cuando Microsoft devuelve el popup a la redirect URI, la app no se monta en el popup: solo reenvia la respuesta a la ventana principal, que cierra el popup.
3. Obtiene un `access_token` para la API de ClassFlow, primero en silencio y con popup solo si Entra exige interaccion.
4. Lo envia como `Authorization: Bearer <access_token>` en cada peticion (interceptor de Axios).
5. Consulta `/api/auth/me` para obtener el usuario interno y su rol.
6. Redirige al dashboard segun el rol recibido. Un `401` posterior cierra la sesion local.

## Alta de usuarios

Microsoft solo autentica. El acceso y el rol los decide ClassFlow:

- `ms-auth` busca la identidad `(tenant, oid)`. Si todavia no esta vinculada, busca un usuario interno cuyo correo coincida con `preferred_username`/`email` del token y lo vincula en ese primer login.
- Si no existe el usuario interno, `/api/auth/me` responde `403` y el frontend muestra "La cuenta de Microsoft no esta habilitada en ClassFlow".
- En usuarios invitados (B2B), el claim trae el correo de origen, no el UPN `#EXT#`. El usuario interno debe registrarse con ese correo (ejemplo: migracion `V9__add_teacher_evens_reneus.sql`).

## Archivos principales

- `src/config/msal.ts`: configuracion MSAL, deteccion del modo Entra, cuenta activa, obtencion del access token y deteccion de la respuesta de autorizacion en la URL.
- `src/main.tsx`: inicializa MSAL y, en el popup, reenvia la respuesta a la ventana principal.
- `src/context/AuthProvider.tsx`: validacion unica de la sesion al arrancar, login (contrasena o Microsoft), logout y cierre de sesion ante `401`.
- `src/context/auth-context.ts`: contrato del contexto (`status`, `user`, acciones) y hook `useAuth`.
- `src/services/api.service.ts`: envia el Bearer token segun el tipo de sesion y notifica los `401`.
- `src/services/auth.service.ts`: consulta `/api/auth/me`.
- `src/pages/LoginPage.tsx`: login hibrido; correo y contrasena como opcion principal y Microsoft como segunda opcion.

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

Las variables `VITE_` se incorporan durante `npm run build`. Cambiar una variable requiere reconstruir la imagen Docker; el `Dockerfile` las recibe como `--build-arg`.

No guardar `.env.local` ni secretos en Git.

## Desarrollo local con Entra

1. Levantar el backend con el perfil `entra` (en este entorno, `classflow-back-api-gateway` expone el puerto `18080`).
2. En `.env.local`, ademas de las variables anteriores, dejar `VITE_API_BASE_URL` sin definir y apuntar el proxy de Vite a ese backend:

   ```env
   API_PROXY_TARGET=http://localhost:18080
   ```

3. Levantar el frontend en el puerto de la redirect URI registrada en Entra:

   ```bash
   npm run dev -- --port 3001
   ```

4. Abrir `http://localhost:3001` y pulsar **Continuar con Microsoft**.

## Solucion de problemas

| Sintoma | Causa | Solucion |
|---|---|---|
| El popup muestra ClassFlow en vez de Microsoft, o queda en "Conectando..." | La redirect URI no reenvia la respuesta a la ventana principal (MSAL v5) | Ya resuelto en `main.tsx`. Verificar que la app corre en el mismo origen que `VITE_MSAL_REDIRECT_URI` |
| El navegador pide usuario y contrasena ("Autorizacion requerida") | `/api` apunta a un backend sin perfil `entra`, que rechaza el token con `WWW-Authenticate: Basic` | Apuntar `API_PROXY_TARGET` o `VITE_API_BASE_URL` al backend con perfil `entra` |
| "La cuenta de Microsoft no esta habilitada en ClassFlow" | No existe un usuario interno con el correo del token | Dar de alta el usuario en `ms-auth` con ese correo |
| "El navegador bloqueo la ventana de Microsoft" | Bloqueador de ventanas emergentes | Permitir ventanas emergentes para el sitio |

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

Build Docker (modo Entra):

```bash
docker build \
  --build-arg VITE_AUTH_MODE=entra \
  --build-arg VITE_API_BASE_URL=<URL_BASE_DEL_API>/api \
  --build-arg VITE_MSAL_CLIENT_ID=<FRONTEND_CLIENT_ID> \
  --build-arg VITE_MSAL_TENANT_ID=<TENANT_ID> \
  --build-arg VITE_MSAL_API_SCOPE=api://<API_CLIENT_ID>/access_as_user \
  --build-arg VITE_MSAL_REDIRECT_URI=<REDIRECT_URI_REAL> \
  -t classflow-frontend:local .
```

El Dockerfile ya ejecuta `npm ci` y `npm run build`.

## Pruebas de aceptacion

Las pruebas automatizadas (`npm test`) cubren el flujo de sesion, el interceptor de la API, los guards de ruta y la pantalla de login en ambos modos.

### Modo local

- El formulario de email y contrasena sigue funcionando.
- Recuperacion de contrasena sigue disponible.
- El build Docker finaliza correctamente.

### Modo Entra

- El formulario de correo y contrasena sigue visible como opcion principal.
- `Continuar con Microsoft` aparece debajo como segunda opcion.
- El boton de Microsoft abre en un popup la pagina de Microsoft para ingresar o elegir la cuenta.
- Al completar el login, el popup se cierra y la app continua en la ventana principal.
- El token solicitado contiene el scope de la API.
- Las peticiones llevan `Authorization: Bearer`.
- `/api/auth/me` devuelve el perfil interno.
- El dashboard corresponde al rol recibido.
- Un usuario no registrado en ClassFlow no recibe acceso.

## Decisiones importantes

- El frontend usa `access_token`, no `id_token`, para llamar al backend.
- El frontend no decide ni inventa roles; usa el perfil devuelto por ClassFlow.
- Microsoft Entra autentica y entrega claims; ClassFlow conserva usuarios, relaciones y roles internos.
- El login es hibrido: correo y contrasena como opcion principal y Microsoft como segunda. Al recargar, la sesion se restaura con el mismo metodo con que se ingreso.
- El login con Microsoft usa `prompt=select_account`: siempre muestra la pagina de Microsoft en vez de reutilizar en silencio la sesion del navegador.
