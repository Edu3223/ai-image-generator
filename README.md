# AI Image Generator - Generador de Imágenes con IA

Una aplicación web completa y gratuita para generar imágenes usando inteligencia artificial, con funcionalidad tanto online como offline, sistema de usuarios y almacenamiento en la nube.

## 🚀 Características Principales

### Funcionalidad Principal
- **Generación de imágenes con IA**: Utiliza APIs gratuitas como Hugging Face Inference API
- **Modo dual**: Funciona tanto online (con APIs) como offline (con modelos locales)
- **Subida de imágenes**: Los usuarios pueden subir fotos como referencia
- **Descripciones personalizadas**: Genera imágenes basadas en texto descriptivo
- **Múltiples estilos**: Realista, artístico, cartoon, anime, etc.
- **Descarga de imágenes**: Todas las imágenes generadas se pueden descargar

### Sistema de Usuarios y Categorías
- **Autenticación dual**: 
  - **Online**: Firebase Auth (correo/Google)
  - **Offline**: Registro local con PIN
- **Carpetas organizadas**: Familia, Trabajo, Amigos + carpetas personalizadas
- **Almacenamiento privado**: Cada usuario tiene sus propias imágenes y carpetas
- **Sincronización en la nube**: Modo online guarda en Firebase
- **Almacenamiento local**: Modo offline usa IndexedDB

### Interfaz Moderna
- **Diseño responsive**: Funciona perfectamente en móvil y PC
- **Menú lateral**: Navegación intuitiva entre carpetas
- **Galería visual**: Vista de miniaturas con scroll infinito
- **Drag & Drop**: Subida de imágenes arrastrando archivos
- **PWA**: Se puede instalar como app nativa

## 📋 Requisitos del Sistema

### Navegadores Compatibles
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Para Modo Online
- Conexión a internet
- Cuenta de Firebase (gratuita)
- Token de Hugging Face (gratuito)

### Para Modo Offline
- Navegador con soporte para IndexedDB
- Al menos 100MB de espacio libre
- WebGPU (opcional, para modelos locales)

## 🛠️ Instalación y Configuración

### 1. Descarga del Proyecto

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/ai-image-generator.git
cd ai-image-generator

# O descargar ZIP y extraer
```

### 2. Configuración de Firebase (Modo Online)

#### 2.1 Crear Proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Nombra tu proyecto (ej: "ai-image-generator")
4. Habilita Google Analytics (opcional)
5. Crea el proyecto

#### 2.2 Configurar Authentication
1. En el panel de Firebase, ve a "Authentication"
2. Haz clic en "Comenzar"
3. En la pestaña "Sign-in method":
   - Habilita "Correo electrónico/contraseña"
   - Habilita "Google" (opcional)
4. En "Settings" > "Authorized domains", agrega tu dominio

#### 2.3 Configurar Firestore Database
1. Ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba"
4. Elige una ubicación cercana a tus usuarios

#### 2.4 Configurar Storage
1. Ve a "Storage"
2. Haz clic en "Comenzar"
3. Acepta las reglas por defecto

#### 2.5 Obtener Configuración
1. Ve a "Configuración del proyecto" (ícono de engranaje)
2. En "Tus apps", haz clic en "Web" (</>)
3. Registra tu app con un nombre
4. Copia la configuración que aparece

#### 2.6 Configurar en la App
Edita el archivo `js/config.js` y reemplaza la configuración de Firebase:

```javascript
// Configuración de Firebase
firebase: {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
}
```

### 3. Configuración de Hugging Face (Generación de Imágenes)

#### 3.1 Crear Cuenta
1. Ve a [Hugging Face](https://huggingface.co/)
2. Crea una cuenta gratuita
3. Verifica tu correo electrónico

#### 3.2 Obtener Token de API
1. Ve a tu perfil > Settings > Access Tokens
2. Haz clic en "New token"
3. Nombra tu token (ej: "ai-image-generator")
4. Selecciona "Read" como tipo
5. Crea el token y cópialo

#### 3.3 Configurar en la App
En `js/config.js`, agrega tu token:

```javascript
// Configuración de IA
huggingface: {
  apiKey: "hf_tu_token_aqui",
  // ... resto de la configuración
}
```

### 4. Configuración de Reglas de Seguridad

#### 4.1 Firestore Rules
En Firebase Console > Firestore > Rules, usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden acceder a sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Imágenes privadas por usuario
    match /images/{imageId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Carpetas privadas por usuario
    match /folders/{folderId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

#### 4.2 Storage Rules
En Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🌐 Despliegue

### Opción 1: GitHub Pages (Recomendado)

#### 1. Subir a GitHub
```bash
# Inicializar repositorio
git init
git add .
git commit -m "Initial commit"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/tu-usuario/ai-image-generator.git
git push -u origin main
```

#### 2. Habilitar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Settings > Pages
3. Source: "Deploy from a branch"
4. Branch: "main" / Folder: "/ (root)"
5. Save

Tu app estará disponible en: `https://tu-usuario.github.io/ai-image-generator/`

### Opción 2: Netlify

#### 1. Preparar para Despliegue
```bash
# Crear archivo _redirects para SPA
echo "/*    /index.html   200" > _redirects
```

#### 2. Desplegar en Netlify
1. Ve a [Netlify](https://netlify.com)
2. Arrastra la carpeta del proyecto a Netlify Drop
3. O conecta tu repositorio de GitHub

### Opción 3: Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Seguir las instrucciones
```

## 📱 Convertir a App Móvil

### Opción 1: PWABuilder (Recomendado)

1. Ve a [PWABuilder](https://www.pwabuilder.com/)
2. Ingresa la URL de tu app desplegada
3. Haz clic en "Start"
4. Revisa el reporte y corrige cualquier problema
5. Haz clic en "Package For Stores"
6. Descarga el paquete para Android/iOS

### Opción 2: Capacitor

```bash
# Instalar Capacitor
npm install @capacitor/core @capacitor/cli

# Inicializar
npx cap init

# Agregar plataformas
npx cap add android
npx cap add ios

# Construir y sincronizar
npm run build
npx cap sync

# Abrir en IDE nativo
npx cap open android
npx cap open ios
```

### Opción 3: Cordova

```bash
# Instalar Cordova
npm install -g cordova

# Crear proyecto
cordova create myapp com.example.myapp MyApp
cd myapp

# Copiar archivos de la web app a www/

# Agregar plataformas
cordova platform add android
cordova platform add ios

# Construir
cordova build
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Firebase
FIREBASE_API_KEY=tu-api-key
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=tu-app-id

# Hugging Face
HUGGINGFACE_API_KEY=hf_tu_token_aqui

# Configuración de la app
APP_NAME=AI Image Generator
APP_VERSION=1.0.0
```

### Personalización de Estilos

Edita `css/styles.css` para personalizar:

```css
:root {
  /* Colores principales */
  --primary-color: #8b5cf6;
  --secondary-color: #06b6d4;
  --accent-color: #f59e0b;
  
  /* Colores de fondo */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-dark: #1e293b;
  
  /* Texto */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-light: #ffffff;
}
```

### Configuración de Modelos de IA

En `js/config.js`, puedes agregar más modelos:

```javascript
huggingface: {
  models: {
    'stable-diffusion': 'runwayml/stable-diffusion-v1-5',
    'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
    'openjourney': 'prompthero/openjourney',
    'dreamshaper': 'Lykon/DreamShaper',
    // Agregar más modelos aquí
  }
}
```

## 🐛 Solución de Problemas

### Problemas Comunes

#### 1. Error de CORS
**Problema**: "Access to fetch blocked by CORS policy"
**Solución**: 
- Despliega la app en un servidor web (no abras directamente el archivo HTML)
- Usa Live Server en VS Code para desarrollo local

#### 2. Firebase no funciona
**Problema**: "Firebase is not defined"
**Solución**:
- Verifica que la configuración en `config.js` sea correcta
- Asegúrate de que las reglas de Firestore permitan acceso
- Revisa la consola del navegador para errores específicos

#### 3. Hugging Face API falla
**Problema**: "Model is loading" o errores 503
**Solución**:
- Los modelos gratuitos pueden tardar en cargar
- Espera unos minutos y reintenta
- Verifica que tu token de API sea válido

#### 4. PWA no se instala
**Problema**: No aparece opción de instalar
**Solución**:
- Verifica que `manifest.json` sea válido
- Asegúrate de que el service worker se registre correctamente
- Usa HTTPS (requerido para PWA)

#### 5. IndexedDB no funciona
**Problema**: Errores de base de datos offline
**Solución**:
- Limpia el almacenamiento del navegador
- Verifica que IndexedDB esté habilitado
- Usa modo incógnito para probar

### Logs y Debugging

#### Habilitar Logs Detallados
En `js/config.js`:

```javascript
APP_CONFIG: {
  debug: true, // Cambiar a true
  logLevel: 'debug' // 'error', 'warn', 'info', 'debug'
}
```

#### Verificar Estado de la App
Abre la consola del navegador y ejecuta:

```javascript
// Ver estado de autenticación
console.log(window.authManager.getCurrentMode());

// Ver estado del generador de IA
console.log(window.aiGenerator.getStatus());

// Ver estadísticas de la galería
console.log(window.galleryManager.getStats());
```

## 📊 Monitoreo y Analytics

### Firebase Analytics

1. En Firebase Console, habilita Analytics
2. En `js/config.js`, asegúrate de que esté configurado:

```javascript
firebase: {
  // ... otras configuraciones
  measurementId: "G-XXXXXXXXXX"
}
```

### Métricas Personalizadas

La app incluye tracking de:
- Número de imágenes generadas
- Estilos más populares
- Errores de generación
- Tiempo de uso

## 🔒 Seguridad

### Mejores Prácticas Implementadas

1. **Validación de entrada**: Todos los inputs son validados
2. **Sanitización**: Las imágenes se procesan antes de guardar
3. **Límites de tamaño**: Archivos limitados a 10MB
4. **Rate limiting**: Previene spam de generación
5. **Autenticación segura**: Tokens y sesiones manejados correctamente

### Configuración de Seguridad Adicional

#### Content Security Policy
Agrega a tu `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.gstatic.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://api-inference.huggingface.co https://*.googleapis.com;
">
```

## 🤝 Contribuir

### Estructura del Proyecto

```
ai-image-generator/
├── index.html              # Página principal
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker
├── css/
│   └── styles.css          # Estilos principales
├── js/
│   ├── config.js           # Configuración
│   ├── auth.js             # Autenticación
│   ├── storage.js          # Almacenamiento
│   ├── ai-generator.js     # Generación de IA
│   ├── gallery.js          # Galería
│   └── app.js              # App principal
├── assets/
│   ├── icons/              # Iconos PWA
│   └── images/             # Imágenes de la app
└── README.md               # Esta documentación
```

### Cómo Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [Hugging Face](https://huggingface.co/) por las APIs gratuitas de IA
- [Firebase](https://firebase.google.com/) por los servicios de backend
- [Stable Diffusion](https://stability.ai/) por los modelos de generación
- La comunidad open source por las herramientas y librerías

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la sección de [Solución de Problemas](#-solución-de-problemas)
2. Busca en los [Issues](https://github.com/tu-usuario/ai-image-generator/issues) existentes
3. Crea un nuevo Issue con detalles del problema
4. Únete a nuestro [Discord](https://discord.gg/tu-servidor) para ayuda en tiempo real

## 🚀 Roadmap

### Versión 1.1
- [ ] Más modelos de IA
- [ ] Editor de imágenes integrado
- [ ] Compartir imágenes en redes sociales
- [ ] Modo oscuro

### Versión 1.2
- [ ] Generación de video
- [ ] Colaboración en tiempo real
- [ ] API pública
- [ ] Plugins de terceros

### Versión 2.0
- [ ] Entrenamiento de modelos personalizados
- [ ] Marketplace de estilos
- [ ] Versión de escritorio
- [ ] Integración con Adobe Creative Suite

---

**¡Disfruta creando imágenes increíbles con IA! 🎨✨**

