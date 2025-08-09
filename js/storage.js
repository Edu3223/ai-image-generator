// Sistema de almacenamiento dual para AI Image Generator
// Maneja almacenamiento tanto local (IndexedDB) como en la nube (Firebase)

class StorageManager {
  constructor() {
    this.db = null;
    this.firestore = null;
    this.firebaseStorage = null;
    this.isOnlineMode = false;
    this.syncQueue = [];
    this.compressionCanvas = null;
    
    this.initializeStorage();
  }

  // Inicializar sistemas de almacenamiento
  async initializeStorage() {
    try {
      // Inicializar IndexedDB
      await this.initializeIndexedDB();
      
      // Inicializar Firebase si está configurado
      if (CONFIG.ConfigUtils.isFirebaseConfigured()) {
        this.initializeFirebase();
      }
      
      // Crear canvas para compresión de imágenes
      this.compressionCanvas = document.createElement('canvas');
      
      console.log('Sistema de almacenamiento inicializado');
    } catch (error) {
      console.error('Error inicializando almacenamiento:', error);
    }
  }

  // Inicializar IndexedDB
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        CONFIG.STORAGE_CONFIG.indexedDB.name,
        CONFIG.STORAGE_CONFIG.indexedDB.version
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store de imágenes
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('userId', 'userId', { unique: false });
          imageStore.createIndex('folderId', 'folderId', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
          imageStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
        
        // Store de carpetas
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('userId', 'userId', { unique: false });
          folderStore.createIndex('name', 'name', { unique: false });
        }
        
        // Store de metadatos
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
        
        // Store de cola de sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Inicializar Firebase
  initializeFirebase() {
    try {
      this.firestore = firebase.firestore();
      this.firebaseStorage = firebase.storage();
      console.log('Firebase Storage inicializado');
    } catch (error) {
      console.error('Error inicializando Firebase Storage:', error);
    }
  }

  // Establecer modo de almacenamiento
  setMode(isOnline) {
    this.isOnlineMode = isOnline;
    
    if (isOnline && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  // Comprimir imagen antes de almacenar
  async compressImage(file, quality = CONFIG.STORAGE_CONFIG.firebase.compressionQuality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = this.compressionCanvas;
        const ctx = canvas.getContext('2d');
        
        // Calcular dimensiones manteniendo aspect ratio
        let { width, height } = img;
        const maxSize = 1024; // Tamaño máximo
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob comprimido
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Generar ID único para imagen
  generateImageId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Generar ID único para carpeta
  generateFolderId() {
    return 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // GUARDAR IMAGEN
  async saveImage(imageData, userId, folderId = null) {
    try {
      const imageId = this.generateImageId();
      const timestamp = new Date().toISOString();
      
      // Preparar datos de la imagen
      const imageRecord = {
        id: imageId,
        userId: userId,
        folderId: folderId,
        originalPrompt: imageData.prompt || '',
        style: imageData.style || 'realistic',
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: this.extractTags(imageData.prompt || ''),
        metadata: {
          size: imageData.file ? imageData.file.size : 0,
          type: imageData.file ? imageData.file.type : 'image/jpeg',
          width: imageData.width || 512,
          height: imageData.height || 512,
          model: imageData.model || 'unknown'
        },
        syncStatus: this.isOnlineMode ? 'synced' : 'pending'
      };
      
      // Comprimir imagen si es necesario
      let imageBlob = imageData.file;
      if (imageBlob && imageBlob.size > 1024 * 1024) { // Si es mayor a 1MB
        imageBlob = await this.compressImage(imageBlob);
        imageRecord.metadata.compressed = true;
        imageRecord.metadata.originalSize = imageData.file.size;
        imageRecord.metadata.size = imageBlob.size;
      }
      
      // Guardar localmente
      await this.saveImageLocally(imageRecord, imageBlob);
      
      // Guardar en la nube si está en modo online
      if (this.isOnlineMode && this.firebaseStorage) {
        try {
          const cloudUrl = await this.saveImageToCloud(imageRecord, imageBlob);
          imageRecord.cloudUrl = cloudUrl;
          imageRecord.syncStatus = 'synced';
          
          // Actualizar registro local con URL de la nube
          await this.updateImageLocally(imageRecord);
        } catch (error) {
          console.error('Error guardando en la nube:', error);
          // Agregar a cola de sincronización
          await this.addToSyncQueue('upload', imageRecord);
        }
      } else if (!this.isOnlineMode) {
        // Agregar a cola de sincronización para cuando esté online
        await this.addToSyncQueue('upload', imageRecord);
      }
      
      return {
        success: true,
        imageId: imageId,
        message: 'Imagen guardada correctamente'
      };
      
    } catch (error) {
      console.error('Error guardando imagen:', error);
      throw {
        success: false,
        error: 'storage/save-failed',
        message: CONFIG.ConfigUtils.getErrorMessage('storage/upload-failed')
      };
    }
  }

  // Guardar imagen localmente (IndexedDB)
  async saveImageLocally(imageRecord, imageBlob) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      // Convertir blob a base64 para almacenar en IndexedDB
      if (imageBlob) {
        const reader = new FileReader();
        reader.onload = () => {
          imageRecord.imageData = reader.result;
          const request = store.put(imageRecord);
          request.onsuccess = () => resolve(imageRecord);
          request.onerror = () => reject(request.error);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(imageBlob);
      } else {
        const request = store.put(imageRecord);
        request.onsuccess = () => resolve(imageRecord);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Actualizar imagen localmente
  async updateImageLocally(imageRecord) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.put(imageRecord);
      
      request.onsuccess = () => resolve(imageRecord);
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar imagen en la nube (Firebase Storage)
  async saveImageToCloud(imageRecord, imageBlob) {
    const fileName = `images/${imageRecord.userId}/${imageRecord.id}.jpg`;
    const storageRef = this.firebaseStorage.ref(fileName);
    
    // Subir archivo
    const snapshot = await storageRef.put(imageBlob);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    // Guardar metadatos en Firestore
    await this.firestore.collection('images').doc(imageRecord.id).set({
      ...imageRecord,
      imageData: undefined, // No guardar datos binarios en Firestore
      cloudUrl: downloadURL,
      storagePath: fileName
    });
    
    return downloadURL;
  }

  // OBTENER IMÁGENES
  async getImages(userId, folderId = null, limit = 20, offset = 0) {
    try {
      if (this.isOnlineMode && this.firestore) {
        return await this.getImagesFromCloud(userId, folderId, limit, offset);
      } else {
        return await this.getImagesLocally(userId, folderId, limit, offset);
      }
    } catch (error) {
      console.error('Error obteniendo imágenes:', error);
      // Fallback a almacenamiento local
      return await this.getImagesLocally(userId, folderId, limit, offset);
    }
  }

  // Obtener imágenes localmente
  async getImagesLocally(userId, folderId = null, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const index = store.index('userId');
      const request = index.getAll(userId);
      
      request.onsuccess = () => {
        let images = request.result;
        
        // Filtrar por carpeta si se especifica
        if (folderId !== null) {
          images = images.filter(img => img.folderId === folderId);
        }
        
        // Ordenar por fecha de creación (más recientes primero)
        images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Aplicar paginación
        const paginatedImages = images.slice(offset, offset + limit);
        
        resolve({
          images: paginatedImages,
          total: images.length,
          hasMore: offset + limit < images.length
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener imágenes de la nube
  async getImagesFromCloud(userId, folderId = null, limit = 20, offset = 0) {
    let query = this.firestore.collection('images')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (folderId !== null) {
      query = query.where('folderId', '==', folderId);
    }
    
    const snapshot = await query.get();
    const images = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      images: images,
      total: images.length,
      hasMore: images.length === limit
    };
  }

  // ELIMINAR IMAGEN
  async deleteImage(imageId, userId) {
    try {
      // Eliminar localmente
      await this.deleteImageLocally(imageId);
      
      // Eliminar de la nube si está en modo online
      if (this.isOnlineMode && this.firestore) {
        try {
          await this.deleteImageFromCloud(imageId);
        } catch (error) {
          console.error('Error eliminando de la nube:', error);
          // Agregar a cola de sincronización
          await this.addToSyncQueue('delete', { id: imageId, userId });
        }
      } else {
        // Agregar a cola de sincronización
        await this.addToSyncQueue('delete', { id: imageId, userId });
      }
      
      return {
        success: true,
        message: 'Imagen eliminada correctamente'
      };
      
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      throw {
        success: false,
        error: 'storage/delete-failed',
        message: CONFIG.ConfigUtils.getErrorMessage('storage/delete-failed')
      };
    }
  }

  // Eliminar imagen localmente
  async deleteImageLocally(imageId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.delete(imageId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar imagen de la nube
  async deleteImageFromCloud(imageId) {
    // Obtener información de la imagen para eliminar archivo de Storage
    const doc = await this.firestore.collection('images').doc(imageId).get();
    
    if (doc.exists) {
      const imageData = doc.data();
      
      // Eliminar archivo de Storage si existe
      if (imageData.storagePath) {
        const storageRef = this.firebaseStorage.ref(imageData.storagePath);
        await storageRef.delete();
      }
      
      // Eliminar documento de Firestore
      await this.firestore.collection('images').doc(imageId).delete();
    }
  }

  // GESTIÓN DE CARPETAS
  async createFolder(name, userId, icon = '📁', color = '#6366f1') {
    try {
      const folderId = this.generateFolderId();
      const timestamp = new Date().toISOString();
      
      const folderData = {
        id: folderId,
        name: name,
        userId: userId,
        icon: icon,
        color: color,
        createdAt: timestamp,
        updatedAt: timestamp,
        imageCount: 0,
        syncStatus: this.isOnlineMode ? 'synced' : 'pending'
      };
      
      // Guardar localmente
      await this.saveFolderLocally(folderData);
      
      // Guardar en la nube si está online
      if (this.isOnlineMode && this.firestore) {
        try {
          await this.saveFolderToCloud(folderData);
          folderData.syncStatus = 'synced';
          await this.updateFolderLocally(folderData);
        } catch (error) {
          console.error('Error guardando carpeta en la nube:', error);
          await this.addToSyncQueue('createFolder', folderData);
        }
      } else {
        await this.addToSyncQueue('createFolder', folderData);
      }
      
      return {
        success: true,
        folder: folderData,
        message: CONFIG.ConfigUtils.getSuccessMessage('folder/created')
      };
      
    } catch (error) {
      console.error('Error creando carpeta:', error);
      throw {
        success: false,
        error: 'storage/folder-create-failed',
        message: 'Error al crear la carpeta'
      };
    }
  }

  // Guardar carpeta localmente
  async saveFolderLocally(folderData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folderData);
      
      request.onsuccess = () => resolve(folderData);
      request.onerror = () => reject(request.error);
    });
  }

  // Actualizar carpeta localmente
  async updateFolderLocally(folderData) {
    return this.saveFolderLocally(folderData);
  }

  // Guardar carpeta en la nube
  async saveFolderToCloud(folderData) {
    await this.firestore.collection('folders').doc(folderData.id).set(folderData);
  }

  // Obtener carpetas
  async getFolders(userId) {
    try {
      if (this.isOnlineMode && this.firestore) {
        return await this.getFoldersFromCloud(userId);
      } else {
        return await this.getFoldersLocally(userId);
      }
    } catch (error) {
      console.error('Error obteniendo carpetas:', error);
      return await this.getFoldersLocally(userId);
    }
  }

  // Obtener carpetas localmente
  async getFoldersLocally(userId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const index = store.index('userId');
      const request = index.getAll(userId);
      
      request.onsuccess = () => {
        const folders = request.result;
        folders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(folders);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener carpetas de la nube
  async getFoldersFromCloud(userId) {
    const snapshot = await this.firestore.collection('folders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Eliminar carpeta
  async deleteFolder(folderId, userId) {
    try {
      // Verificar que la carpeta esté vacía
      const images = await this.getImages(userId, folderId, 1);
      if (images.images.length > 0) {
        throw new Error('No se puede eliminar una carpeta que contiene imágenes');
      }
      
      // Eliminar localmente
      await this.deleteFolderLocally(folderId);
      
      // Eliminar de la nube si está online
      if (this.isOnlineMode && this.firestore) {
        try {
          await this.deleteFolderFromCloud(folderId);
        } catch (error) {
          console.error('Error eliminando carpeta de la nube:', error);
          await this.addToSyncQueue('deleteFolder', { id: folderId, userId });
        }
      } else {
        await this.addToSyncQueue('deleteFolder', { id: folderId, userId });
      }
      
      return {
        success: true,
        message: CONFIG.ConfigUtils.getSuccessMessage('folder/deleted')
      };
      
    } catch (error) {
      console.error('Error eliminando carpeta:', error);
      throw {
        success: false,
        error: 'storage/folder-delete-failed',
        message: error.message || 'Error al eliminar la carpeta'
      };
    }
  }

  // Eliminar carpeta localmente
  async deleteFolderLocally(folderId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.delete(folderId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar carpeta de la nube
  async deleteFolderFromCloud(folderId) {
    await this.firestore.collection('folders').doc(folderId).delete();
  }

  // COLA DE SINCRONIZACIÓN
  async addToSyncQueue(action, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const syncItem = {
        action: action,
        data: data,
        timestamp: new Date().toISOString(),
        retries: 0,
        maxRetries: 3
      };
      
      const request = store.add(syncItem);
      request.onsuccess = () => resolve(syncItem);
      request.onerror = () => reject(request.error);
    });
  }

  // Procesar cola de sincronización
  async processSyncQueue() {
    if (!this.isOnlineMode || !this.firestore) {
      return;
    }
    
    try {
      const syncItems = await this.getSyncQueue();
      
      for (const item of syncItems) {
        try {
          await this.processSyncItem(item);
          await this.removeSyncItem(item.id);
        } catch (error) {
          console.error('Error procesando item de sincronización:', error);
          
          // Incrementar contador de reintentos
          item.retries++;
          if (item.retries >= item.maxRetries) {
            console.error('Máximo de reintentos alcanzado para item:', item);
            await this.removeSyncItem(item.id);
          } else {
            await this.updateSyncItem(item);
          }
        }
      }
    } catch (error) {
      console.error('Error procesando cola de sincronización:', error);
    }
  }

  // Obtener items de la cola de sincronización
  async getSyncQueue() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Procesar item individual de sincronización
  async processSyncItem(item) {
    switch (item.action) {
      case 'upload':
        if (item.data.imageData) {
          // Convertir base64 a blob
          const response = await fetch(item.data.imageData);
          const blob = await response.blob();
          const cloudUrl = await this.saveImageToCloud(item.data, blob);
          
          // Actualizar registro local
          item.data.cloudUrl = cloudUrl;
          item.data.syncStatus = 'synced';
          await this.updateImageLocally(item.data);
        }
        break;
        
      case 'delete':
        await this.deleteImageFromCloud(item.data.id);
        break;
        
      case 'createFolder':
        await this.saveFolderToCloud(item.data);
        item.data.syncStatus = 'synced';
        await this.updateFolderLocally(item.data);
        break;
        
      case 'deleteFolder':
        await this.deleteFolderFromCloud(item.data.id);
        break;
        
      default:
        console.warn('Acción de sincronización desconocida:', item.action);
    }
  }

  // Actualizar item de sincronización
  async updateSyncItem(item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Remover item de la cola de sincronización
  async removeSyncItem(itemId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(itemId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // UTILIDADES
  extractTags(prompt) {
    // Extraer palabras clave del prompt para tags
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remover palabras comunes
    const commonWords = ['the', 'and', 'with', 'for', 'una', 'con', 'del', 'que', 'por'];
    return words.filter(word => !commonWords.includes(word)).slice(0, 10);
  }

  // Obtener estadísticas de almacenamiento
  async getStorageStats(userId) {
    try {
      const images = await this.getImages(userId, null, 1000); // Obtener todas las imágenes
      const folders = await this.getFolders(userId);
      
      let totalSize = 0;
      let localImages = 0;
      let cloudImages = 0;
      
      for (const image of images.images) {
        totalSize += image.metadata?.size || 0;
        if (image.cloudUrl) {
          cloudImages++;
        } else {
          localImages++;
        }
      }
      
      return {
        totalImages: images.total,
        totalFolders: folders.length,
        totalSize: totalSize,
        localImages: localImages,
        cloudImages: cloudImages,
        formattedSize: this.formatBytes(totalSize)
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalImages: 0,
        totalFolders: 0,
        totalSize: 0,
        localImages: 0,
        cloudImages: 0,
        formattedSize: '0 B'
      };
    }
  }

  // Formatear bytes a formato legible
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Limpiar cache y datos antiguos
  async cleanupStorage(userId, maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 días por defecto
    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      let deletedCount = 0;
      
      // Obtener imágenes antiguas
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const index = store.index('userId');
      const request = index.openCursor(userId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const image = cursor.value;
            const imageDate = new Date(image.createdAt);
            
            if (imageDate < cutoffDate && !image.cloudUrl) {
              // Solo eliminar imágenes locales antiguas que no estén en la nube
              cursor.delete();
              deletedCount++;
            }
            
            cursor.continue();
          } else {
            resolve({
              success: true,
              deletedCount: deletedCount,
              message: `Se eliminaron ${deletedCount} imágenes antiguas`
            });
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('Error limpiando almacenamiento:', error);
      throw {
        success: false,
        error: 'storage/cleanup-failed',
        message: 'Error al limpiar el almacenamiento'
      };
    }
  }
}

// Crear instancia global del gestor de almacenamiento
window.storageManager = new StorageManager();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}

