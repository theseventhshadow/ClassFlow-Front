# ClassFlow - Aplicación React Moderna y Escalable

Estructura profesional y modular para una aplicación React con TypeScript, siguiendo las mejores prácticas de desarrollo.

## 📋 Características

✅ **Modular y Escalable** - Estructura clara separada por responsabilidades
✅ **TypeScript** - Tipado fuerte para mayor seguridad
✅ **Componentes Reutilizables** - Biblioteca de componentes comunes
✅ **Gestión de Estado** - Context API + Custom Hooks
✅ **Servicios de API** - Centralización de llamadas HTTP
✅ **Hooks Personalizados** - useAsync, useFetch, useForm
✅ **Linting y Formateo** - ESLint + Prettier preconfigurados
✅ **Enrutamiento** - React Router v6
✅ **Temas** - Soporte para modo claro/oscuro
✅ **Validaciones** - Funciones de validación reutilizables
✅ **Alias de Importación** - Rutas simplificadas

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── common/         # Componentes reutilizables (Button, Input, etc.)
│   └── layout/         # Componentes de layout (Header, Footer, etc.)
├── pages/              # Páginas/Vistas
├── services/           # Servicios (API, autenticación, etc.)
├── hooks/              # Custom Hooks
├── context/            # Context API (Estado global)
├── utils/              # Funciones utilitarias
│   ├── formatters.ts   # Funciones de formateo
│   ├── validators.ts   # Funciones de validación
│   └── helpers.ts      # Funciones auxiliares
├── types/              # Tipos TypeScript globales
├── config/             # Configuración de la aplicación
├── constants/          # Constantes globales
├── styles/             # Estilos CSS
├── router/             # Configuración de enrutamiento
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada
```

## 🚀 Inicio Rápido

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# La aplicación se abrirá en http://localhost:3000
```

### Construcción

```bash
# Build para producción
npm run build

# Preview de producción
npm run preview
```

### Linting y Formateo

```bash
# Verificar errores de linting
npm run lint

# Arreglar errores de linting automáticamente
npm run lint:fix

# Formatear código
npm run format

# Verificar tipos TypeScript
npm run type-check
```

## 📦 Dependencias Principales

- **React 18** - Librería de UI
- **React Router 6** - Enrutamiento
- **TypeScript** - Tipado estático
- **Vite** - Build tool moderno
- **Axios** - Cliente HTTP
- **ESLint** - Linting
- **Prettier** - Formateo de código

## 🔧 Configuración de Alias

Los siguientes alias están preconfigurados en `tsconfig.json` y `vite.config.ts`:

```typescript
@/* - src/
@components/* - src/components/
@pages/* - src/pages/
@hooks/* - src/hooks/
@services/* - src/services/
@context/* - src/context/
@utils/* - src/utils/
@types/* - src/types/
@styles/* - src/styles/
@config/* - src/config/
@constants/* - src/constants/
```

**Uso:**
```typescript
import { Button } from '@components/common';
import { useAuth } from '@context';
import { userService } from '@services';
```

## 📝 Patrones de Desarrollo

### Crear un Nuevo Componente

```typescript
// src/components/common/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
  return <div onClick={onClick}>{title}</div>;
};

export default MyComponent;
```

### Crear un Custom Hook

```typescript
// src/hooks/useMyHook.ts
import { useState } from 'react';

export function useMyHook() {
  const [state, setState] = useState(null);
  
  return { state, setState };
}
```

### Crear un Servicio

```typescript
// src/services/myService.ts
import { apiService } from './api.service';

class MyService {
  async getData() {
    return apiService.get('/endpoint');
  }
}

export const myService = new MyService();
```

### Crear una Página

```typescript
// src/pages/MyPage.tsx
import React from 'react';

export const MyPage: React.FC = () => {
  return <div>Mi Página</div>;
};

export default MyPage;
```

## 🎨 Temas

El proyecto incluye soporte para temas claro y oscuro usando CSS variables y Context API.

```typescript
import { useTheme } from '@context';

export function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return <button onClick={toggleTheme}>Cambiar tema</button>;
}
```

## 🔐 Autenticación

El proyecto incluye un contexto de autenticación preconfigurado:

```typescript
import { useAuth } from '@context';

export function ProtectedComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) return <p>No autenticado</p>;
  
  return <div>Hola, {user?.name}</div>;
}
```

## ✅ Mejores Prácticas Incluidas

- ✅ Separación de responsabilidades
- ✅ DRY (Don't Repeat Yourself)
- ✅ Componentes sin estado cuando es posible
- ✅ Tipos TypeScript estrictos
- ✅ Manejo de errores centralizado
- ✅ Comentarios en funciones complejas
- ✅ Estructura predecible
- ✅ Fácil de escalar

## 📚 Recursos

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)

## 📄 Licencia

MIT

---

**Creado para facilitar el desarrollo de aplicaciones React profesionales y escalables.**
