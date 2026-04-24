# 🚀 Guía Rápida de Inicio

## Paso 1: Instalación

```bash
# Instalar dependencias del proyecto
npm install

# Esto instalará:
# - React 18
# - TypeScript
# - Vite
# - React Router
# - Axios
# - ESLint y Prettier
# - Y otras dependencias necesarias
```

## Paso 2: Configurar Variables de Entorno

```bash
# El archivo .env.local ya está configurado con valores por defecto
# Si necesitas cambiar algo, edítalo:

VITE_API_BASE_URL=http://localhost:3001/api
```

Si tienes un backend en otra URL, actualiza `VITE_API_BASE_URL` en `.env.local`.

## Paso 3: Iniciar Desarrollo

```bash
# Inicia el servidor de desarrollo
npm run dev

# Se abrirá automáticamente en:
# http://localhost:3000

# El hot reload está habilitado: guarda archivos y verás cambios al instante
```

## Paso 4: Explorar la Estructura

```
Abre VS Code y explora:
- src/components/common/   → Componentes reutilizables
- src/pages/              → Páginas de la app
- src/services/           → Llamadas a API
- src/hooks/              → Custom hooks
- src/context/            → Estado global
```

## Comandos del Día a Día

```bash
# Durante desarrollo
npm run dev          # Servidor de desarrollo
npm run lint:fix     # Arreglar errores
npm run format       # Formatear código

# Antes de hacer push
npm run type-check   # Verificar tipos TypeScript
npm run lint         # Verificar linting
npm run format       # Formatear

# Construcción
npm run build        # Build para producción
npm run preview      # Ver cómo se ve en producción
```

## Estructura de Carpetas Clave

```
src/
├── components/       ← Componentes React (reutilizables + layout)
├── pages/           ← Vistas/Páginas
├── services/        ← Llamadas a API
├── hooks/           ← Lógica reutilizable
├── context/         ← Estado global
├── utils/           ← Funciones auxiliares
├── types/           ← Tipos TypeScript
└── constants/       ← Constantes globales
```

## Crear Tu Primera Funcionalidad

### 1. Una Nueva Página

```typescript
// src/pages/MiPagina.tsx
import React from 'react';

export const MiPagina: React.FC = () => {
  return (
    <div>
      <h1>Mi Primera Página</h1>
    </div>
  );
};
```

### 2. Agregarla al Router

```typescript
// Editar src/router/index.tsx
// Agregar esto adentro de <Routes>
<Route path="/mi-pagina" element={<MiPagina />} />
```

### 3. ¡Listo! Accede a `http://localhost:3000/mi-pagina`

## Ejemplos de Uso

### Usar un Componente Común

```typescript
import { Button, Input } from '@components/common';

<Button variant="primary" onClick={() => console.log('Click')}>
  Click Me
</Button>

<Input
  type="email"
  placeholder="Email"
  label="Tu Email"
  error="Email inválido"
/>
```

### Llamar a la API

```typescript
import { useAsync } from '@hooks';
import { userService } from '@services';

const { data, loading, error } = useAsync(() => userService.getUsers());

if (loading) return <p>Cargando...</p>;
if (error) return <p>Error: {error.message}</p>;
return <div>{/* Usar data aquí */}</div>;
```

### Usar Estado Global

```typescript
import { useTheme } from '@context';

const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  Cambiar a {theme === 'light' ? 'oscuro' : 'claro'}
</button>
```

### Usar un Form Hook

```typescript
import { useForm } from '@hooks';

const form = useForm({ email: '', password: '' });

<input
  name="email"
  value={form.values.email}
  onChange={form.handleChange}
  onBlur={form.handleBlur}
/>
```

## Validaciones Disponibles

```typescript
import { validateEmail, validatePassword, isEmpty } from '@utils';

if (!validateEmail(email)) console.log('Email inválido');
if (!validatePassword(password)) console.log('Contraseña débil');
if (isEmpty(value)) console.log('Campo vacío');
```

## Variables de Entorno

```bash
# En .env.local
VITE_API_BASE_URL=http://localhost:3001/api

# Acceder en el código
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Troubleshooting

### "Puerto 3000 ya está en uso"
```bash
# Especificar otro puerto
npm run dev -- --port 3001
```

### "Error de módulo no encontrado"
```bash
# Asegúrate de haber ejecutado
npm install

# Y que los alias estén configurados en tsconfig.json
```

### "Errores de TypeScript"
```bash
# Verifica que los tipos sean correctos
npm run type-check

# Y arregla los errores de lint
npm run lint:fix
```

## Next Steps

1. ✅ **Instalar**: `npm install`
2. ✅ **Desarrollar**: `npm run dev`
3. ✅ **Crear funcionalidades**: Agregar componentes, páginas, servicios
4. ✅ **Probar**: Verificar que todo funcione
5. ✅ **Hacer push**: Comprometer cambios
6. ✅ **Build**: `npm run build` cuando esté listo para producción

## Recursos Útiles

- 📖 [README.md](./README.md) - Documentación completa
- 🗂️ [ESTRUCTURA.md](./ESTRUCTURA.md) - Explicación detallada de carpetas
- 📝 [GUIA_EXPANSION.md](./GUIA_EXPANSION.md) - Cómo agregar nuevas funcionalidades
- 🔗 [React Docs](https://react.dev)
- 🔗 [TypeScript Docs](https://www.typescriptlang.org/docs/)
- 🔗 [Vite Docs](https://vitejs.dev/)

---

**¡Felicidades! Tu proyecto React profesional está listo. ¡A programar! 🎉**
