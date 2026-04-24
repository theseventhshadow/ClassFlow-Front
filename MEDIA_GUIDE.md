# 📁 Guía de Gestión de Media en el Proyecto

## 📍 Estructura de Carpetas

```
ClassFlow-Front/
├── public/
│   └── assets/              ← Assets estáticos pequeños
│       ├── icons/           ← Iconos SVG/PNG (< 50KB)
│       ├── logos/           ← Logos y favicon
│       ├── images/          ← Imágenes estáticas (< 500KB)
│       └── placeholders/    ← Placeholders por defecto
└── src/
    ├── services/
    │   └── media.service.ts ← Gestión de media dinámica
    └── components/
        └── common/
            └── MediaImage.tsx ← Componente para imágenes
```

## 🎯 Tipos de Media

### 1️⃣ Assets Estáticos (en `public/assets/`)

**Qué son:** Iconos, logos, imágenes fijas del proyecto  
**Dónde:** `public/assets/`  
**Tamaño:** < 500KB total  
**Versionado:** ✅ En Git

```tsx
// Uso directo en JSX
<img src="/assets/icons/user.svg" alt="Usuario" />
<img src="/assets/images/hero.jpg" alt="Hero" />

// En CSS
background-image: url('/assets/images/background.jpg');
```

### 2️⃣ Media Dinámica (desde Backend/CDN)

**Qué son:** Imágenes de usuarios, videos, audios, documentos  
**Dónde:** Backend API o CDN  
**Tamaño:** Ilimitado  
**Versionado:** ❌ NO en Git

```tsx
import { MediaImage } from '@components/common';

// Con fallback automático
<MediaImage 
  src={user.profileImage} 
  alt="Perfil del usuario"
  fallbackSrc="/assets/placeholders/user-avatar-placeholder.svg"
/>
```

## 🔧 Servicios de Media

### Obtener Imágenes del Backend

```typescript
import { mediaService } from '@services';

// Obtener todas las imágenes
const { data, loading, error } = useAsync(() => 
  mediaService.getMediaResources('image')
);

// Obtener una imagen específica
const image = await mediaService.getMediaById('123');

// Obtener URL optimizada
const optimizedUrl = mediaService.getOptimizedImageUrl(url, {
  width: 800,
  height: 600,
  quality: 'high',
  format: 'webp'
});
```

## 🖼️ Componente MediaImage

Componente inteligente que maneja errores y placeholders:

```typescript
import { MediaImage } from '@components/common';

export const UserProfile = ({ user }) => {
  return (
    <div>
      <MediaImage 
        src={user.profileImage}
        alt="Perfil de usuario"
        loading="lazy"
        fallbackSrc="/assets/placeholders/user-avatar-placeholder.svg"
        onLoadError={() => console.log('Error cargando imagen')}
      />
    </div>
  );
};
```

## 📋 Checklist de Buenas Prácticas

- ✅ Assets estáticos en `public/assets/`
- ✅ Media dinámica desde backend
- ✅ Usar `MediaImage` para imágenes del usuario
- ✅ Placeholders para estados de carga
- ✅ Lazy loading en listas largas
- ✅ Comprimir imágenes antes de subir
- ✅ Usar WebP cuando sea posible
- ✅ Manejar errores de carga
- ✅ No comitear media grande a Git
- ✅ Usar CDN para mejor performance

## 🌐 Configuración para Producción

Si usas un CDN (Cloudinary, AWS S3, etc):

```typescript
// En config/index.ts
export const config = {
  cdn: {
    baseURL: import.meta.env.VITE_CDN_URL || '',
    transformations: {
      quality: 85,
      format: 'auto',
    },
  },
};

// En media.service.ts
getOptimizedImageUrl(url: string) {
  const cdnUrl = import.meta.env.VITE_CDN_URL;
  return `${cdnUrl}/image/upload/q_auto,f_auto/${url}`;
}
```

## 🚀 Variables de Entorno

```bash
# .env.local
VITE_CDN_URL=https://cdn.ejemplo.com
VITE_API_MEDIA_ENDPOINT=/api/media
```

## 📊 Comparativa

| Aspecto | Assets Estáticos | Media Dinámica |
|--------|-------------------|-----------------|
| Ubicación | `public/assets/` | Backend/CDN |
| Versionado Git | ✅ Sí | ❌ No |
| Tamaño | < 500KB | Ilimitado |
| Cambios | Durante build | En tiempo real |
| Ejemplos | Logos, iconos | Fotos usuarios |
| Rendimiento | Rápido | Depende del CDN |

## ✨ Ejemplos Prácticos

### Galería de Imágenes

```typescript
import { MediaImage } from '@components/common';
import { useAsync } from '@hooks';
import { mediaService } from '@services';

export const Gallery = () => {
  const { data: images } = useAsync(() => 
    mediaService.getMediaResources('image')
  );

  return (
    <div className="gallery">
      {images?.map(image => (
        <MediaImage 
          key={image.id}
          src={image.url}
          alt="Imagen de galería"
          loading="lazy"
        />
      ))}
    </div>
  );
};
```

### Avatar de Usuario

```typescript
import { MediaImage } from '@components/common';

export const UserAvatar = ({ user }) => {
  return (
    <MediaImage
      src={user?.profileImage}
      alt={user?.name}
      fallbackSrc="/assets/placeholders/user-avatar-placeholder.svg"
      className="avatar"
    />
  );
};
```

---

**Regla de oro:** Pequeño y estático → `public/assets/` | Grande y dinámico → Backend/CDN
