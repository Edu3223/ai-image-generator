// Configuración principal de AI Image Generator
// Este archivo contiene todas las configuraciones de la aplicación

// Configuración de Firebase
// IMPORTANTE: Reemplaza estos valores con tu configuración de Firebase
const FIREBASE_CONFIG = {
  apiKey: "tu-api-key-aqui",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Configuración de APIs de IA
const AI_CONFIG = {
  // Hugging Face Inference API
  huggingface: {
    apiUrl: 'https://api-inference.huggingface.co/models/',
    // IMPORTANTE: Reemplaza con tu token de Hugging Face
    apiKey: 'hf_tu_token_aqui',
    models: {
      'stable-diffusion': 'runwayml/stable-diffusion-v1-5',
      'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
      'openjourney': 'prompthero/openjourney',
      'dreamshaper': 'Lykon/DreamShaper'
    },
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 30000
  },
  
  // Configuración para modelos offline (WebGPU/WASM)
  offline: {
    enabled: true,
    models: {
      'sd-lite': {
        name: 'Stable Diffusion Lite',
        url: 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-stable-diffusion@0.2.1/dist/',
        size: '1.2GB',
        supported: () => {
          return 'gpu' in navigator && 'webgpu' in navigator.gpu;
        }
      }
    },
    fallbackToOnline: true
  }
};

// Configuración de almacenamiento
const STORAGE_CONFIG = {
  // IndexedDB para almacenamiento local
  indexedDB: {
    name: 'AIImageGeneratorDB',
    version: 1,
    stores: {
      users: 'users',
      images: 'images',
      folders: 'folders',
      settings: 'settings'
    }
  },
  
  // Firebase Storage para almacenamiento en la nube
  firebase: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    compressionQuality: 0.8
  },
  
  // Configuración de cache
  cache: {
    maxImages: 100,
    maxSize: 50 * 1024 * 1024, // 50MB
    cleanupThreshold: 0.8
  }
};

// Configuración de la aplicación
const APP_CONFIG = {
  name: 'AI Image Generator',
  version: '1.0.0',
  author: 'Tu Nombre',
  
  // Configuración de generación de imágenes
  generation: {
    defaultNumImages: 2,
    maxNumImages: 4,
    defaultStyle: 'realistic',
    styles: {
      realistic: {
        name: 'Realista',
        prompt_suffix: ', photorealistic, high quality, detailed'
      },
      artistic: {
        name: 'Artístico',
        prompt_suffix: ', artistic, creative, beautiful art style'
      },
      cartoon: {
        name: 'Caricatura',
        prompt_suffix: ', cartoon style, animated, colorful'
      },
      anime: {
        name: 'Anime',
        prompt_suffix: ', anime style, manga, japanese animation'
      }
    },
    
    // Configuración de prompts
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
    defaultPromptPrefix: 'high quality, detailed, beautiful',
    
    // Configuración de imagen
    defaultSize: '512x512',
    supportedSizes: ['256x256', '512x512', '768x768', '1024x1024'],
    
    // Configuración de procesamiento
    maxPromptLength: 500,
    minPromptLength: 3
  },
  
  // Configuración de carpetas predeterminadas
  defaultFolders: [
    {
      id: 'familia',
      name: 'Familia',
      icon: '👨‍👩‍👧‍👦',
      color: '#10b981'
    },
    {
      id: 'trabajo',
      name: 'Trabajo',
      icon: '💼',
      color: '#3b82f6'
    },
    {
      id: 'amigos',
      name: 'Amigos',
      icon: '👥',
      color: '#f59e0b'
    }
  ],
  
  // Configuración de UI
  ui: {
    theme: 'light', // 'light', 'dark', 'auto'
    language: 'es',
    animations: true,
    compactMode: false,
    
    // Configuración de galería
    gallery: {
      itemsPerPage: 20,
      thumbnailSize: 200,
      previewSize: 800
    },
    
    // Configuración de notificaciones
    notifications: {
      enabled: true,
      duration: 5000,
      position: 'top-right'
    }
  },
  
  // Configuración de PWA
  pwa: {
    installPrompt: true,
    updatePrompt: true,
    offlineMessage: 'La aplicación funciona sin conexión',
    
    // Configuración de notificaciones push
    notifications: {
      enabled: false, // Deshabilitado por defecto
      vapidKey: 'tu-vapid-key-aqui'
    }
  },
  
  // Configuración de desarrollo
  development: {
    debug: false, // Cambiar a true para modo debug
    mockAPI: false, // Usar APIs simuladas
    skipAuth: false, // Saltar autenticación (solo desarrollo)
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

// Configuración de seguridad
const SECURITY_CONFIG = {
  // Configuración de autenticación
  auth: {
    minPasswordLength: 6,
    maxPasswordLength: 128,
    pinLength: { min: 4, max: 6 },
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutos
  },
  
  // Configuración de validación
  validation: {
    maxUsernameLength: 30,
    minUsernameLength: 3,
    allowedUsernameChars: /^[a-zA-Z0-9_-]+$/,
    maxFolderNameLength: 20,
    minFolderNameLength: 1
  },
  
  // Configuración de sanitización
  sanitization: {
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxPromptLength: 500
  }
};

// Configuración de errores y mensajes
const MESSAGES = {
  errors: {
    // Errores de autenticación
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'El correo ya está en uso',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    
    // Errores de generación
    'generation/no-image': 'Debes subir una imagen',
    'generation/no-description': 'Debes escribir una descripción',
    'generation/api-error': 'Error al generar la imagen. Intenta de nuevo',
    'generation/quota-exceeded': 'Has excedido tu cuota de generación',
    'generation/model-loading': 'El modelo se está cargando. Intenta en unos minutos',
    
    // Errores de almacenamiento
    'storage/quota-exceeded': 'Espacio de almacenamiento agotado',
    'storage/upload-failed': 'Error al subir la imagen',
    'storage/delete-failed': 'Error al eliminar la imagen',
    
    // Errores generales
    'network/offline': 'Sin conexión a internet',
    'network/timeout': 'Tiempo de espera agotado',
    'validation/invalid-input': 'Entrada inválida',
    'unknown': 'Error desconocido'
  },
  
  success: {
    'auth/login': 'Sesión iniciada correctamente',
    'auth/register': 'Usuario registrado correctamente',
    'auth/logout': 'Sesión cerrada correctamente',
    'generation/complete': 'Imágenes generadas correctamente',
    'storage/upload': 'Imagen guardada correctamente',
    'storage/delete': 'Imagen eliminada correctamente',
    'folder/created': 'Carpeta creada correctamente',
    'folder/deleted': 'Carpeta eliminada correctamente'
  },
  
  info: {
    'app/offline': 'Aplicación funcionando sin conexión',
    'app/online': 'Conexión restaurada',
    'generation/processing': 'Generando imágenes...',
    'storage/syncing': 'Sincronizando datos...',
    'model/loading': 'Cargando modelo de IA...'
  }
};

// Utilidades de configuración
const ConfigUtils = {
  // Verificar si Firebase está configurado
  isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey !== 'tu-api-key-aqui' && 
           FIREBASE_CONFIG.projectId !== 'tu-proyecto-id';
  },
  
  // Verificar si Hugging Face está configurado
  isHuggingFaceConfigured() {
    return AI_CONFIG.huggingface.apiKey !== 'hf_tu_token_aqui';
  },
  
  // Obtener configuración según el entorno
  getEnvironmentConfig() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    return {
      ...APP_CONFIG,
      development: {
        ...APP_CONFIG.development,
        debug: isDevelopment
      }
    };
  },
  
  // Validar configuración
  validateConfig() {
    const issues = [];
    
    if (!this.isFirebaseConfigured()) {
      issues.push('Firebase no está configurado correctamente');
    }
    
    if (!this.isHuggingFaceConfigured()) {
      issues.push('Hugging Face API no está configurada');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  // Obtener mensaje de error localizado
  getErrorMessage(errorCode) {
    return MESSAGES.errors[errorCode] || MESSAGES.errors.unknown;
  },
  
  // Obtener mensaje de éxito localizado
  getSuccessMessage(successCode) {
    return MESSAGES.success[successCode] || 'Operación completada';
  },
  
  // Obtener mensaje informativo localizado
  getInfoMessage(infoCode) {
    return MESSAGES.info[infoCode] || '';
  }
};

// Exportar configuraciones (para uso en otros archivos)
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    FIREBASE_CONFIG,
    AI_CONFIG,
    STORAGE_CONFIG,
    APP_CONFIG,
    SECURITY_CONFIG,
    MESSAGES,
    ConfigUtils
  };
} else {
  // Browser
  window.CONFIG = {
    FIREBASE_CONFIG,
    AI_CONFIG,
    STORAGE_CONFIG,
    APP_CONFIG,
    SECURITY_CONFIG,
    MESSAGES,
    ConfigUtils
  };
}

// Inicialización de configuración
document.addEventListener('DOMContentLoaded', () => {
  // Validar configuración al cargar
  const validation = ConfigUtils.validateConfig();
  
  if (!validation.valid && APP_CONFIG.development.debug) {
    console.warn('Problemas de configuración detectados:', validation.issues);
  }
  
  // Configurar modo debug
  if (APP_CONFIG.development.debug) {
    window.DEBUG = true;
    console.log('Modo debug activado');
    console.log('Configuración de la aplicación:', APP_CONFIG);
  }
});

