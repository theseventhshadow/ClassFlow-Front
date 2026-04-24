<!-- ESTRUCTURA DEL PROYECTO -->

# 📐 Estructura del Proyecto - Referencia Completa

## Organización por Capas

```
ClassFlow-Front/
│
├── src/
│   ├── components/              # Componentes React
│   │   ├── common/             # ✅ Componentes reutilizables
│   │   │   ├── Button.tsx      # Botón genérico
│   │   │   ├── Input.tsx       # Input genérico
│   │   │   ├── Loading.tsx     # Indicador de carga
│   │   │   ├── Error.tsx       # Componente de error
│   │   │   └── index.ts        # Exporta todos
│   │   │
│   │   └── layout/             # ✅ Estructura visual
│   │       ├── Layout.tsx      # Layout principal
│   │       └── index.ts
│   │
│   ├── pages/                  # ✅ Vistas/Páginas
│   │   ├── HomePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── index.ts
│   │
│   ├── services/               # ✅ Lógica de API
│   │   ├── api.service.ts      # Cliente HTTP (Axios)
│   │   ├── user.service.ts     # Ejemplo de servicio específico
│   │   └── index.ts            # Exporta todos
│   │
│   ├── hooks/                  # ✅ Custom Hooks
│   │   ├── useAsync.ts         # Manejo de peticiones
│   │   ├── useFetch.ts         # Fetch simple
│   │   ├── useForm.ts          # Manejo de formularios
│   │   └── index.ts            # Exporta todos
│   │
│   ├── context/                # ✅ Estado Global
│   │   ├── ThemeContext.tsx    # Tema claro/oscuro
│   │   ├── AuthContext.tsx     # Autenticación
│   │   └── index.ts            # Exporta todos
│   │
│   ├── utils/                  # ✅ Funciones Útiles
│   │   ├── formatters.ts       # Formateo de datos
│   │   ├── validators.ts       # Validaciones
│   │   ├── helpers.ts          # Funciones auxiliares
│   │   └── index.ts            # Exporta todos
│   │
│   ├── types/                  # ✅ Tipos TypeScript
│   │   └── index.ts            # Tipos globales
│   │
│   ├── config/                 # ✅ Configuración
│   │   └── index.ts            # Config global
│   │
│   ├── constants/              # ✅ Constantes
│   │   └── index.ts            # Rutas, status, etc.
│   │
│   ├── styles/                 # ✅ Estilos CSS
│   │   └── index.css           # Estilos globales
│   │
│   ├── router/                 # ✅ Enrutamiento
│   │   └── index.tsx           # Configuración de rutas
│   │
│   ├── App.tsx                 # Componente raíz
│   ├── main.tsx                # Punto de entrada
│   └── vite-env.d.ts           # Tipos Vite
│
├── public/                     # Archivos estáticos
│
├── package.json                # Dependencias
├── tsconfig.json               # Config TypeScript
├── vite.config.ts              # Config Vite
├── .eslintrc.cjs               # Config ESLint
├── .prettierrc                 # Config Prettier
├── .gitignore                  # Git ignore
├── index.html                  # HTML principal
├── .env.example                # Variables de entorno ejemplo
├── .env.local                  # Variables de entorno local
├── README.md                   # Documentación principal
└── GUIA_EXPANSION.md           # Guía para expandir el proyecto
```

## Flujo de Datos

```
┌─────────────────────────────────────┐
│         Componentes React           │
│  (components/, pages/)              │
└────────────────┬────────────────────┘
                 │
                 ├── Usan Contexto
                 │   (context/)
                 │
                 ├── Usan Hooks
                 │   (hooks/)
                 │
                 └── Usan Servicios
                     (services/)
                     │
                     └── Llaman API
                         (axios)
```

## Patrones de Uso

### 1. Importaciones con Alias

```typescript
// ❌ Evitar rutas largas
import { Button } from '../../../components/common/Button';

// ✅ Usar alias
import { Button } from '@components/common';
import { useForm } from '@hooks';
import { userService } from '@services';
import { ROUTES } from '@constants';
```

### 2. Flujo de una Página

```typescript
import React from 'react';
import { useAsync } from '@hooks';           // Hook personalizado
import { userService } from '@services';     // Servicio de API
import { Layout } from '@components/layout'; // Componente layout
import { Loading, Error } from '@components/common'; // Componentes comunes
import { useAuth } from '@context';          // Contexto

export const MiPagina: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, error } = useAsync(
    () => userService.getUsers()
  );

  if (loading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <Layout>
      <h1>Mis Usuarios</h1>
      {/* Renderizar data aquí */}
    </Layout>
  );
};
```

### 3. Crear Funcionalidad Nueva

```
1. Determinar qué necesitas:
   ├── ¿Componente visual? → components/
   ├── ¿Lógica de API? → services/
   ├── ¿Estado compartido? → context/
   ├── ¿Lógica reutilizable? → hooks/
   └── ¿Funciones auxiliares? → utils/

2. Crear el archivo
3. Exportar desde index.ts del directorio
4. Usar en otros componentes
```

## Checklist para Nueva Funcionalidad

```
□ Archivo creado en carpeta correcta
□ Exportado desde index.ts
□ TypeScript tipado correctamente
□ Comentarios JSDoc en funciones públicas
□ Importa desde alias (@)
□ Manejo de errores implementado
□ Integrado en App.tsx si es necesario
□ Código formateado (npm run format)
□ Sin errores de lint (npm run lint)
```

## Dependencias Principales

| Paquete | Propósito |
|---------|-----------|
| `react` | Framework de UI |
| `react-dom` | Renderizado en DOM |
| `react-router-dom` | Enrutamiento |
| `axios` | Cliente HTTP |
| `typescript` | Tipado estático |
| `vite` | Build tool |

## Variables de Entorno Disponibles

```bash
VITE_API_BASE_URL    # URL base de la API
VITE_APP_NAME        # Nombre de la aplicación
VITE_APP_VERSION     # Versión de la aplicación
```

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Build para producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Verifica errores de lint |
| `npm run lint:fix` | Arregla errores de lint |
| `npm run format` | Formatea el código |
| `npm run type-check` | Verifica tipos TypeScript |

## Mejores Prácticas Implementadas

✅ **Modularidad**: Código separado por responsabilidad
✅ **Reutilización**: Componentes, hooks y servicios compartidos
✅ **Type Safety**: TypeScript con tipado fuerte
✅ **DRY**: No repetir código
✅ **Escalabilidad**: Fácil agregar nuevas funcionalidades
✅ **Legibilidad**: Estructura clara y predecible
✅ **Mantenibilidad**: Código organizado y documentado
✅ **Performance**: Lazy loading y optimizaciones
✅ **Accesibilidad**: Consideraciones de A11y

---

**Próximos pasos**: Ejecutar `npm install` e `npm run dev` para iniciar desarrollo.
