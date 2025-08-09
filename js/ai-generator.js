// Sistema de generación de imágenes con IA para AI Image Generator
// Maneja tanto APIs online (Hugging Face) como modelos offline (WebGPU/WASM)

class AIImageGenerator {
  constructor() {
    this.isOnlineMode = false;
    this.currentModel = null;
    this.offlineModel = null;
    this.generationQueue = [];
    this.isGenerating = false;
    this.retryAttempts = new Map();
    
    // Inicializar generador
    this.initialize();
  }

  // Inicializar el generador de IA
  async initialize() {
    try {
      console.log('Inicializando generador de IA...');
      
      // Verificar soporte para WebGPU (para modelos offline)
      this.webGPUSupported = await this.checkWebGPUSupport();
      
      if (this.webGPUSupported) {
        console.log('WebGPU soportado - modelos offline disponibles');
      } else {
        console.log('WebGPU no soportado - solo modo online disponible');
      }
      
    } catch (error) {
      console.error('Error inicializando generador de IA:', error);
    }
  }

  // Verificar soporte para WebGPU
  async checkWebGPUSupport() {
    if (!navigator.gpu) {
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return false;
      }
      
      const device = await adapter.requestDevice();
      return !!device;
    } catch (error) {
      console.warn('WebGPU no disponible:', error);
      return false;
    }
  }

  // Establecer modo de generación
  setMode(isOnline) {
    this.isOnlineMode = isOnline;
    console.log(`Modo de generación: ${isOnline ? 'Online' : 'Offline'}`);
  }

  // Procesar y mejorar prompt
  processPrompt(prompt, style = 'realistic', negativePrompt = '') {
    // Limpiar prompt
    let processedPrompt = prompt.trim();
    
    // Agregar prefijo de calidad
    if (!processedPrompt.toLowerCase().includes('high quality')) {
      processedPrompt = CONFIG.APP_CONFIG.generation.defaultPromptPrefix + ', ' + processedPrompt;
    }
    
    // Agregar sufijo de estilo
    const styleConfig = CONFIG.APP_CONFIG.generation.styles[style];
    if (styleConfig && styleConfig.prompt_suffix) {
      processedPrompt += styleConfig.prompt_suffix;
    }
    
    // Prompt negativo
    const finalNegativePrompt = negativePrompt || CONFIG.APP_CONFIG.generation.negativePrompt;
    
    return {
      prompt: processedPrompt,
      negativePrompt: finalNegativePrompt,
      style: style
    };
  }

  // Validar parámetros de generación
  validateGenerationParams(params) {
    const errors = [];
    
    // Validar prompt
    if (!params.prompt || params.prompt.trim().length < CONFIG.APP_CONFIG.generation.minPromptLength) {
      errors.push('El prompt debe tener al menos 3 caracteres');
    }
    
    if (params.prompt && params.prompt.length > CONFIG.APP_CONFIG.generation.maxPromptLength) {
      errors.push('El prompt es demasiado largo (máximo 500 caracteres)');
    }
    
    // Validar número de imágenes
    if (params.numImages < 1 || params.numImages > CONFIG.APP_CONFIG.generation.maxNumImages) {
      errors.push(`Número de imágenes debe estar entre 1 y ${CONFIG.APP_CONFIG.generation.maxNumImages}`);
    }
    
    // Validar estilo
    if (params.style && !CONFIG.APP_CONFIG.generation.styles[params.style]) {
      errors.push('Estilo no válido');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // GENERAR IMÁGENES (función principal)
  async generateImages(params) {
    try {
      // Validar parámetros
      const validation = this.validateGenerationParams(params);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Procesar prompt
      const processedParams = {
        ...params,
        ...this.processPrompt(params.prompt, params.style, params.negativePrompt)
      };
      
      console.log('Generando imágenes con parámetros:', processedParams);
      
      // Generar según el modo
      if (this.isOnlineMode) {
        return await this.generateOnline(processedParams);
      } else {
        return await this.generateOffline(processedParams);
      }
      
    } catch (error) {
      console.error('Error generando imágenes:', error);
      throw {
        success: false,
        error: 'generation/failed',
        message: error.message || CONFIG.ConfigUtils.getErrorMessage('generation/api-error')
      };
    }
  }

  // GENERACIÓN ONLINE (Hugging Face API)
  async generateOnline(params) {
    try {
      // Verificar configuración de API
      if (!CONFIG.ConfigUtils.isHuggingFaceConfigured()) {
        throw new Error('API de Hugging Face no configurada');
      }
      
      // Verificar conectividad
      if (!navigator.onLine) {
        throw new Error('Sin conexión a internet');
      }
      
      const results = [];
      const model = this.selectBestModel(params.style);
      
      // Generar imágenes una por una (para mejor control de errores)
      for (let i = 0; i < params.numImages; i++) {
        try {
          const imageBlob = await this.callHuggingFaceAPI(model, params, i);
          
          results.push({
            success: true,
            imageBlob: imageBlob,
            model: model,
            prompt: params.prompt,
            style: params.style,
            index: i
          });
          
        } catch (error) {
          console.error(`Error generando imagen ${i + 1}:`, error);
          
          // Intentar con modelo alternativo
          const fallbackModel = this.getFallbackModel(model);
          if (fallbackModel) {
            try {
              const imageBlob = await this.callHuggingFaceAPI(fallbackModel, params, i);
              results.push({
                success: true,
                imageBlob: imageBlob,
                model: fallbackModel,
                prompt: params.prompt,
                style: params.style,
                index: i,
                usedFallback: true
              });
            } catch (fallbackError) {
              results.push({
                success: false,
                error: fallbackError.message,
                index: i
              });
            }
          } else {
            results.push({
              success: false,
              error: error.message,
              index: i
            });
          }
        }
      }
      
      // Verificar si al menos una imagen se generó correctamente
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length === 0) {
        throw new Error('No se pudo generar ninguna imagen');
      }
      
      return {
        success: true,
        results: results,
        totalGenerated: successfulResults.length,
        totalRequested: params.numImages,
        message: `Se generaron ${successfulResults.length} de ${params.numImages} imágenes`
      };
      
    } catch (error) {
      console.error('Error en generación online:', error);
      
      // Intentar fallback a modo offline si está disponible
      if (this.webGPUSupported && !params.noFallback) {
        console.log('Intentando fallback a modo offline...');
        try {
          return await this.generateOffline({ ...params, noFallback: true });
        } catch (offlineError) {
          console.error('Fallback offline también falló:', offlineError);
        }
      }
      
      throw error;
    }
  }

  // Llamar a la API de Hugging Face
  async callHuggingFaceAPI(model, params, index = 0) {
    const apiUrl = CONFIG.AI_CONFIG.huggingface.apiUrl + model;
    const apiKey = CONFIG.AI_CONFIG.huggingface.apiKey;
    
    // Preparar datos de la petición
    const requestData = {
      inputs: params.prompt,
      parameters: {
        negative_prompt: params.negativePrompt,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        width: 512,
        height: 512,
        seed: params.seed ? params.seed + index : undefined
      }
    };
    
    // Realizar petición con reintentos
    const maxRetries = CONFIG.AI_CONFIG.huggingface.maxRetries;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Manejar errores específicos
          if (response.status === 503) {
            // Modelo cargándose
            const retryAfter = response.headers.get('Retry-After') || 
                             CONFIG.AI_CONFIG.huggingface.retryDelay / 1000;
            
            if (attempt < maxRetries - 1) {
              console.log(`Modelo cargándose, reintentando en ${retryAfter} segundos...`);
              await this.sleep(retryAfter * 1000);
              continue;
            } else {
              throw new Error(CONFIG.ConfigUtils.getErrorMessage('generation/model-loading'));
            }
          } else if (response.status === 429) {
            // Rate limit
            throw new Error('Límite de peticiones excedido. Intenta más tarde.');
          } else if (response.status === 401) {
            // API key inválida
            throw new Error('Token de API inválido');
          } else {
            throw new Error(errorData.error || `Error HTTP ${response.status}`);
          }
        }
        
        // Verificar que la respuesta sea una imagen
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error('La respuesta no es una imagen válida');
        }
        
        const imageBlob = await response.blob();
        
        // Verificar que el blob no esté vacío
        if (imageBlob.size === 0) {
          throw new Error('Imagen vacía recibida');
        }
        
        return imageBlob;
        
      } catch (error) {
        lastError = error;
        console.error(`Intento ${attempt + 1} falló:`, error.message);
        
        if (attempt < maxRetries - 1) {
          const delay = CONFIG.AI_CONFIG.huggingface.retryDelay * (attempt + 1);
          console.log(`Reintentando en ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  // Seleccionar el mejor modelo según el estilo
  selectBestModel(style) {
    const models = CONFIG.AI_CONFIG.huggingface.models;
    
    switch (style) {
      case 'realistic':
        return models['stable-diffusion-xl'] || models['stable-diffusion'];
      case 'artistic':
        return models['openjourney'] || models['stable-diffusion'];
      case 'cartoon':
      case 'anime':
        return models['dreamshaper'] || models['stable-diffusion'];
      default:
        return models['stable-diffusion'];
    }
  }

  // Obtener modelo de fallback
  getFallbackModel(currentModel) {
    const models = Object.values(CONFIG.AI_CONFIG.huggingface.models);
    const currentIndex = models.indexOf(currentModel);
    
    // Devolver el siguiente modelo disponible
    for (let i = 1; i < models.length; i++) {
      const nextIndex = (currentIndex + i) % models.length;
      if (models[nextIndex] !== currentModel) {
        return models[nextIndex];
      }
    }
    
    return null;
  }

  // GENERACIÓN OFFLINE (WebGPU/WASM)
  async generateOffline(params) {
    try {
      if (!this.webGPUSupported) {
        throw new Error('Generación offline no soportada en este navegador');
      }
      
      // Cargar modelo offline si no está cargado
      if (!this.offlineModel) {
        await this.loadOfflineModel();
      }
      
      const results = [];
      
      // Generar imágenes
      for (let i = 0; i < params.numImages; i++) {
        try {
          const imageBlob = await this.generateWithOfflineModel(params, i);
          
          results.push({
            success: true,
            imageBlob: imageBlob,
            model: 'offline-sd-lite',
            prompt: params.prompt,
            style: params.style,
            index: i
          });
          
        } catch (error) {
          console.error(`Error generando imagen offline ${i + 1}:`, error);
          results.push({
            success: false,
            error: error.message,
            index: i
          });
        }
      }
      
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length === 0) {
        throw new Error('No se pudo generar ninguna imagen offline');
      }
      
      return {
        success: true,
        results: results,
        totalGenerated: successfulResults.length,
        totalRequested: params.numImages,
        message: `Se generaron ${successfulResults.length} de ${params.numImages} imágenes (offline)`
      };
      
    } catch (error) {
      console.error('Error en generación offline:', error);
      throw error;
    }
  }

  // Cargar modelo offline
  async loadOfflineModel() {
    try {
      console.log('Cargando modelo offline...');
      
      // Verificar si el modelo ya está en cache
      const modelCache = await caches.open('ai-models');
      const modelConfig = CONFIG.AI_CONFIG.offline.models['sd-lite'];
      
      // Simular carga de modelo (en implementación real, cargaría WebGPU/WASM)
      // Por ahora, solo marcamos como cargado
      this.offlineModel = {
        name: 'SD-Lite',
        loaded: true,
        version: '1.0'
      };
      
      console.log('Modelo offline cargado correctamente');
      
    } catch (error) {
      console.error('Error cargando modelo offline:', error);
      throw new Error('No se pudo cargar el modelo offline');
    }
  }

  // Generar con modelo offline
  async generateWithOfflineModel(params, index = 0) {
    try {
      // NOTA: Esta es una implementación simulada
      // En una implementación real, aquí se llamaría al modelo WebGPU/WASM
      
      console.log(`Generando imagen offline ${index + 1} con prompt: "${params.prompt}"`);
      
      // Simular tiempo de generación
      await this.sleep(2000 + Math.random() * 3000);
      
      // Por ahora, crear una imagen placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Crear gradiente basado en el prompt
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      const hash = this.hashString(params.prompt + index);
      const color1 = `hsl(${hash % 360}, 70%, 60%)`;
      const color2 = `hsl(${(hash + 180) % 360}, 70%, 40%)`;
      
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Agregar texto del prompt
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Imagen generada offline', 256, 256);
      ctx.font = '12px Arial';
      ctx.fillText(params.prompt.substring(0, 50), 256, 280);
      
      // Convertir a blob
      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
    } catch (error) {
      console.error('Error en generación offline:', error);
      throw error;
    }
  }

  // Función hash simple para generar colores consistentes
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash);
  }

  // PROCESAMIENTO DE IMAGEN DE ENTRADA
  async processInputImage(imageFile) {
    try {
      // Validar archivo
      if (!CONFIG.SECURITY_CONFIG.sanitization.allowedImageTypes.includes(imageFile.type)) {
        throw new Error('Tipo de archivo no permitido');
      }
      
      if (imageFile.size > CONFIG.SECURITY_CONFIG.sanitization.maxImageSize) {
        throw new Error('Archivo demasiado grande');
      }
      
      // Crear canvas para procesar imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Redimensionar si es necesario
          const maxSize = 512;
          let { width, height } = img;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a blob
          canvas.toBlob((blob) => {
            resolve({
              processedImage: blob,
              width: width,
              height: height,
              originalSize: imageFile.size,
              processedSize: blob.size
            });
          }, 'image/jpeg', 0.9);
        };
        
        img.onerror = () => reject(new Error('Error cargando imagen'));
        img.src = URL.createObjectURL(imageFile);
      });
      
    } catch (error) {
      console.error('Error procesando imagen de entrada:', error);
      throw error;
    }
  }

  // UTILIDADES
  
  // Función sleep para delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener información del estado actual
  getStatus() {
    return {
      isOnlineMode: this.isOnlineMode,
      webGPUSupported: this.webGPUSupported,
      offlineModelLoaded: !!this.offlineModel,
      isGenerating: this.isGenerating,
      queueLength: this.generationQueue.length,
      apiConfigured: CONFIG.ConfigUtils.isHuggingFaceConfigured()
    };
  }

  // Cancelar generación en curso
  cancelGeneration() {
    this.isGenerating = false;
    this.generationQueue = [];
    console.log('Generación cancelada');
  }

  // Obtener modelos disponibles
  getAvailableModels() {
    const models = [];
    
    // Modelos online
    if (this.isOnlineMode && CONFIG.ConfigUtils.isHuggingFaceConfigured()) {
      Object.entries(CONFIG.AI_CONFIG.huggingface.models).forEach(([key, model]) => {
        models.push({
          id: key,
          name: model,
          type: 'online',
          available: navigator.onLine
        });
      });
    }
    
    // Modelos offline
    if (this.webGPUSupported) {
      Object.entries(CONFIG.AI_CONFIG.offline.models).forEach(([key, model]) => {
        models.push({
          id: key,
          name: model.name,
          type: 'offline',
          available: true,
          size: model.size
        });
      });
    }
    
    return models;
  }

  // Estimar tiempo de generación
  estimateGenerationTime(numImages, style = 'realistic') {
    if (this.isOnlineMode) {
      // Tiempo estimado para API online (depende de la carga del servidor)
      return numImages * (10 + Math.random() * 20); // 10-30 segundos por imagen
    } else {
      // Tiempo estimado para generación offline
      return numImages * (30 + Math.random() * 30); // 30-60 segundos por imagen
    }
  }
}

// Crear instancia global del generador de IA
window.aiGenerator = new AIImageGenerator();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIImageGenerator;
}

