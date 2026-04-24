<!-- Información sobre la estructura -->

# 🎯 Guía de Expansión del Proyecto

## Cómo Añadir Nuevas Funcionalidades

### 1. Añadir una Nueva Página

```bash
# 1. Crear el archivo de la página
src/pages/MiPagina.tsx

# 2. Exportar desde src/pages/index.ts
export { MiPagina } from './MiPagina';

# 3. Agregar ruta en src/router/index.tsx
<Route path="/mi-pagina" element={<MiPagina />} />

# 4. Agregar constante en src/constants/index.ts
MI_PAGINA: '/mi-pagina'
```

### 2. Crear un Nuevo Servicio

```typescript
// src/services/miServicio.ts
import { apiService } from './api.service';

class MiServicio {
  async obtenerDatos() {
    return apiService.get('/endpoint');
  }

  async crearDato(data: unknown) {
    return apiService.post('/endpoint', data);
  }
}

export const miServicio = new MiServicio();

// Exportar desde src/services/index.ts
export { miServicio } from './miServicio';
```

### 3. Crear un Custom Hook

```typescript
// src/hooks/useMiHook.ts
import { useState, useCallback } from 'react';

interface MiHookState {
  data: unknown | null;
  loading: boolean;
}

export function useMiHook() {
  const [state, setState] = useState<MiHookState>({
    data: null,
    loading: false,
  });

  const fetch = useCallback(async () => {
    setState({ data: null, loading: true });
    try {
      // Lógica aquí
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  return { ...state, fetch };
}

// Exportar desde src/hooks/index.ts
export { useMiHook } from './useMiHook';
```

### 4. Crear un Componente Reutilizable

```typescript
// src/components/common/MiComponente.tsx
import React from 'react';

interface MiComponenteProps {
  titulo: string;
  contenido: string;
  onAccion?: () => void;
}

/**
 * Componente reutilizable para [descripción]
 * 
 * @example
 * <MiComponente titulo="Título" contenido="Contenido" />
 */
export const MiComponente: React.FC<MiComponenteProps> = ({
  titulo,
  contenido,
  onAccion,
}) => {
  return (
    <div className="mi-componente">
      <h2>{titulo}</h2>
      <p>{contenido}</p>
      {onAccion && <button onClick={onAccion}>Acción</button>}
    </div>
  );
};

export default MiComponente;

// Exportar desde src/components/common/index.ts
export { MiComponente } from './MiComponente';
```

### 5. Crear un Nuevo Contexto

```typescript
// src/context/MiContexto.tsx
import React, { createContext, useState, ReactNode } from 'react';

interface MiContextoType {
  valor: string;
  cambiarValor: (valor: string) => void;
}

export const MiContexto = createContext<MiContextoType | undefined>(undefined);

export const MiProvedor: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [valor, setValor] = useState('');

  return (
    <MiContexto.Provider value={{ valor, cambiarValor: setValor }}>
      {children}
    </MiContexto.Provider>
  );
};

export const useMiContexto = () => {
  const contexto = React.useContext(MiContexto);
  if (!contexto) {
    throw new Error('useMiContexto debe estar dentro de MiProvedor');
  }
  return contexto;
};

// Exportar desde src/context/index.ts
export { MiContexto, MiProvedor, useMiContexto } from './MiContexto';
```

## Checklist de Calidad

Antes de hacer commit:

- [ ] ✅ Código formateado: `npm run format`
- [ ] ✅ Sin errores de lint: `npm run lint:fix`
- [ ] ✅ Tipos válidos: `npm run type-check`
- [ ] ✅ Componentes documentados con JSDoc
- [ ] ✅ Manejo de errores implementado
- [ ] ✅ Responsive en mobile
- [ ] ✅ Accesibilidad considerada
- [ ] ✅ Sin console.log en producción

## Estructura de Archivos de Componentes Complejos

Para componentes con múltiples archivos:

```
src/components/features/MiFeature/
├── MiFeature.tsx              # Componente principal
├── MiFeature.module.css       # Estilos específicos
├── MiFeature.types.ts         # Tipos y interfaces
├── MiFeature.constants.ts     # Constantes del componente
├── hooks/                      # Hooks específicos del componente
│   └── useMiFeatureHook.ts
├── utils/                      # Utilidades del componente
│   └── helpers.ts
└── __tests__/                  # Tests (cuando sea apropiado)
    └── MiFeature.test.tsx
```

## Variables de Entorno

Actualizar `.env.local` según necesidad:

```bash
# API
VITE_API_BASE_URL=http://localhost:3001/api

# Modos
VITE_MODE=development  # production, development, staging

# Features (feature flags)
VITE_FEATURE_BETA_UI=false
VITE_FEATURE_ANALYTICS=true
```

Acceso en el código:
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const modo = import.meta.env.VITE_MODE;
```

## Escalabilidad Recomendada

A medida que crece el proyecto:

1. **State Management Avanzado**: Migrar de Context API a Redux/Zustand si es necesario
2. **Testing**: Agregar Jest + React Testing Library
3. **E2E Testing**: Implementar Cypress o Playwright
4. **Performance**: Implementar lazy loading y code splitting
5. **Analytics**: Agregar Google Analytics o similar
6. **Error Tracking**: Implementar Sentry
7. **Storybook**: Para documentación de componentes
8. **Husky + Lint-staged**: Para pre-commit hooks

## Comandos Útiles en Desarrollo

```bash
# Iniciar en modo debug
npm run dev -- --debug

# Build con análisis de tamaño
npm run build -- --analyze

# Limpiar caché
rm -rf node_modules/.vite

# Update dependencias
npm update
```

---

**Recuerda: ¡Mantén la estructura ordenada, reutiliza componentes y servicios, y documenta tu código!**
