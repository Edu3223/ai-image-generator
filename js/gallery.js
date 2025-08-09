// Sistema de galería para AI Image Generator
// Maneja la visualización, selección y gestión de imágenes

class GalleryManager {
  constructor() {
    this.currentFolder = null;
    this.selectedImages = new Set();
    this.currentPage = 0;
    this.itemsPerPage = CONFIG.APP_CONFIG.ui.gallery.itemsPerPage;
    this.isLoading = false;
    this.hasMore = true;
    this.images = [];
    this.folders = [];
    
    // Referencias a elementos DOM
    this.galleryGrid = null;
    this.galleryTitle = null;
    this.emptyState = null;
    this.selectAllBtn = null;
    this.deleteSelectedBtn = null;
    
    this.initializeGallery();
  }

  // Inicializar galería
  initializeGallery() {
    // Obtener referencias a elementos DOM
    this.galleryGrid = document.getElementById('gallery-grid');
    this.galleryTitle = document.getElementById('gallery-title');
    this.emptyState = document.getElementById('empty-gallery');
    this.selectAllBtn = document.getElementById('select-all');
    this.deleteSelectedBtn = document.getElementById('delete-selected');
    
    // Configurar event listeners
    this.setupEventListeners();
    
    console.log('Galería inicializada');
  }

  // Configurar event listeners
  setupEventListeners() {
    // Botón seleccionar todo
    if (this.selectAllBtn) {
      this.selectAllBtn.addEventListener('click', () => this.toggleSelectAll());
    }
    
    // Botón eliminar seleccionadas
    if (this.deleteSelectedBtn) {
      this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedImages());
    }
    
    // Scroll infinito
    if (this.galleryGrid) {
      this.galleryGrid.addEventListener('scroll', () => this.handleScroll());
    }
    
    // Escuchar cambios de autenticación
    if (window.authManager) {
      window.authManager.onAuthStateChanged((user) => {
        if (user) {
          this.loadGallery();
        } else {
          this.clearGallery();
        }
      });
    }
  }

  // Cargar galería
  async loadGallery(folderId = null, reset = true) {
    try {
      if (this.isLoading) return;
      
      this.isLoading = true;
      this.currentFolder = folderId;
      
      if (reset) {
        this.currentPage = 0;
        this.images = [];
        this.selectedImages.clear();
        this.updateSelectionUI();
      }
      
      // Obtener usuario actual
      const user = await window.authManager.getCurrentUser();
      if (!user) {
        this.showEmptyState('Inicia sesión para ver tus imágenes');
        return;
      }
      
      // Cargar imágenes
      const result = await window.storageManager.getImages(
        user.id,
        folderId,
        this.itemsPerPage,
        this.currentPage * this.itemsPerPage
      );
      
      if (reset) {
        this.images = result.images;
      } else {
        this.images = [...this.images, ...result.images];
      }
      
      this.hasMore = result.hasMore;
      
      // Actualizar título
      this.updateGalleryTitle(folderId);
      
      // Renderizar galería
      this.renderGallery(reset);
      
      // Mostrar estado vacío si no hay imágenes
      if (this.images.length === 0) {
        this.showEmptyState();
      } else {
        this.hideEmptyState();
      }
      
    } catch (error) {
      console.error('Error cargando galería:', error);
      this.showError('Error cargando las imágenes');
    } finally {
      this.isLoading = false;
    }
  }

  // Actualizar título de la galería
  updateGalleryTitle(folderId) {
    if (!this.galleryTitle) return;
    
    if (folderId) {
      const folder = this.folders.find(f => f.id === folderId);
      this.galleryTitle.textContent = folder ? folder.name : 'Carpeta';
    } else {
      this.galleryTitle.textContent = 'Galería';
    }
  }

  // Renderizar galería
  renderGallery(reset = true) {
    if (!this.galleryGrid) return;
    
    if (reset) {
      this.galleryGrid.innerHTML = '';
    }
    
    this.images.forEach((image, index) => {
      if (reset || index >= (this.currentPage * this.itemsPerPage)) {
        const imageElement = this.createImageElement(image);
        this.galleryGrid.appendChild(imageElement);
      }
    });
  }

  // Crear elemento de imagen
  createImageElement(image) {
    const imageItem = document.createElement('div');
    imageItem.className = 'gallery-item';
    imageItem.dataset.imageId = image.id;
    
    // Crear imagen
    const img = document.createElement('img');
    img.src = image.cloudUrl || image.imageData || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW48L3RleHQ+PC9zdmc+';
    img.alt = image.originalPrompt || 'Imagen generada';
    img.loading = 'lazy';
    
    // Manejar errores de carga
    img.onerror = () => {
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
    };
    
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'gallery-item-overlay';
    
    // Crear checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gallery-item-checkbox';
    checkbox.checked = this.selectedImages.has(image.id);
    
    // Event listeners
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.toggleImageSelection(image.id);
    });
    
    imageItem.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      this.openImageModal(image);
    });
    
    // Ensamblar elemento
    imageItem.appendChild(img);
    imageItem.appendChild(overlay);
    imageItem.appendChild(checkbox);
    
    return imageItem;
  }

  // Alternar selección de imagen
  toggleImageSelection(imageId) {
    if (this.selectedImages.has(imageId)) {
      this.selectedImages.delete(imageId);
    } else {
      this.selectedImages.add(imageId);
    }
    
    this.updateSelectionUI();
  }

  // Alternar selección de todas las imágenes
  toggleSelectAll() {
    if (this.selectedImages.size === this.images.length) {
      // Deseleccionar todas
      this.selectedImages.clear();
    } else {
      // Seleccionar todas
      this.images.forEach(image => this.selectedImages.add(image.id));
    }
    
    this.updateSelectionUI();
    this.updateCheckboxes();
  }

  // Actualizar checkboxes visuales
  updateCheckboxes() {
    const checkboxes = this.galleryGrid.querySelectorAll('.gallery-item-checkbox');
    checkboxes.forEach(checkbox => {
      const imageId = checkbox.closest('.gallery-item').dataset.imageId;
      checkbox.checked = this.selectedImages.has(imageId);
    });
  }

  // Actualizar UI de selección
  updateSelectionUI() {
    if (!this.selectAllBtn || !this.deleteSelectedBtn) return;
    
    const selectedCount = this.selectedImages.size;
    const totalCount = this.images.length;
    
    // Actualizar botón seleccionar todo
    if (selectedCount === 0) {
      this.selectAllBtn.textContent = 'Seleccionar Todo';
    } else if (selectedCount === totalCount) {
      this.selectAllBtn.textContent = 'Deseleccionar Todo';
    } else {
      this.selectAllBtn.textContent = `Seleccionar Todo (${selectedCount}/${totalCount})`;
    }
    
    // Actualizar botón eliminar
    this.deleteSelectedBtn.disabled = selectedCount === 0;
    this.deleteSelectedBtn.textContent = selectedCount > 0 
      ? `Eliminar (${selectedCount})` 
      : 'Eliminar';
  }

  // Eliminar imágenes seleccionadas
  async deleteSelectedImages() {
    if (this.selectedImages.size === 0) return;
    
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar ${this.selectedImages.size} imagen(es)?`);
    if (!confirmed) return;
    
    try {
      const user = await window.authManager.getCurrentUser();
      if (!user) return;
      
      // Eliminar imágenes una por una
      const deletePromises = Array.from(this.selectedImages).map(imageId => 
        window.storageManager.deleteImage(imageId, user.id)
      );
      
      await Promise.all(deletePromises);
      
      // Mostrar notificación de éxito
      this.showNotification(`${this.selectedImages.size} imagen(es) eliminada(s) correctamente`, 'success');
      
      // Recargar galería
      await this.loadGallery(this.currentFolder);
      
    } catch (error) {
      console.error('Error eliminando imágenes:', error);
      this.showNotification('Error eliminando las imágenes', 'error');
    }
  }

  // Abrir modal de imagen
  openImageModal(image) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const downloadBtn = document.getElementById('download-image');
    const deleteBtn = document.getElementById('delete-image');
    
    if (!modal || !modalImage) return;
    
    // Configurar imagen
    modalImage.src = image.cloudUrl || image.imageData;
    modalImage.alt = image.originalPrompt || 'Imagen generada';
    
    // Configurar botones
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadImage(image);
    }
    
    if (deleteBtn) {
      deleteBtn.onclick = () => this.deleteImage(image.id);
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
    
    // Cerrar modal con ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.closeImageModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  // Cerrar modal de imagen
  closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Descargar imagen
  async downloadImage(image) {
    try {
      let imageUrl = image.cloudUrl || image.imageData;
      
      // Si es base64, convertir a blob URL
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      }
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ai-image-${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar blob URL si se creó
      if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      
      this.showNotification('Imagen descargada correctamente', 'success');
      
    } catch (error) {
      console.error('Error descargando imagen:', error);
      this.showNotification('Error descargando la imagen', 'error');
    }
  }

  // Eliminar imagen individual
  async deleteImage(imageId) {
    const confirmed = confirm('¿Estás seguro de que quieres eliminar esta imagen?');
    if (!confirmed) return;
    
    try {
      const user = await window.authManager.getCurrentUser();
      if (!user) return;
      
      await window.storageManager.deleteImage(imageId, user.id);
      
      this.showNotification('Imagen eliminada correctamente', 'success');
      this.closeImageModal();
      
      // Recargar galería
      await this.loadGallery(this.currentFolder);
      
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      this.showNotification('Error eliminando la imagen', 'error');
    }
  }

  // Manejar scroll para carga infinita
  handleScroll() {
    if (this.isLoading || !this.hasMore) return;
    
    const scrollTop = this.galleryGrid.scrollTop;
    const scrollHeight = this.galleryGrid.scrollHeight;
    const clientHeight = this.galleryGrid.clientHeight;
    
    // Cargar más cuando esté cerca del final
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      this.loadMore();
    }
  }

  // Cargar más imágenes
  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.currentPage++;
    await this.loadGallery(this.currentFolder, false);
  }

  // Mostrar estado vacío
  showEmptyState(message = null) {
    if (!this.emptyState) return;
    
    this.emptyState.classList.remove('hidden');
    this.galleryGrid.classList.add('hidden');
    
    if (message) {
      const emptyMessage = this.emptyState.querySelector('p');
      if (emptyMessage) {
        emptyMessage.textContent = message;
      }
    }
  }

  // Ocultar estado vacío
  hideEmptyState() {
    if (!this.emptyState) return;
    
    this.emptyState.classList.add('hidden');
    this.galleryGrid.classList.remove('hidden');
  }

  // Limpiar galería
  clearGallery() {
    if (this.galleryGrid) {
      this.galleryGrid.innerHTML = '';
    }
    
    this.images = [];
    this.selectedImages.clear();
    this.currentPage = 0;
    this.hasMore = true;
    
    this.showEmptyState('Inicia sesión para ver tus imágenes');
  }

  // Agregar nueva imagen a la galería
  addImage(image) {
    this.images.unshift(image); // Agregar al principio
    
    if (this.galleryGrid && this.images.length === 1) {
      // Si era la primera imagen, ocultar estado vacío
      this.hideEmptyState();
    }
    
    // Re-renderizar galería
    this.renderGallery(true);
  }

  // Filtrar galería por carpeta
  async filterByFolder(folderId) {
    await this.loadGallery(folderId, true);
  }

  // Buscar imágenes
  async searchImages(query) {
    if (!query.trim()) {
      await this.loadGallery(this.currentFolder, true);
      return;
    }
    
    try {
      const user = await window.authManager.getCurrentUser();
      if (!user) return;
      
      // Filtrar imágenes localmente por prompt
      const filteredImages = this.images.filter(image => 
        image.originalPrompt && 
        image.originalPrompt.toLowerCase().includes(query.toLowerCase())
      );
      
      this.images = filteredImages;
      this.renderGallery(true);
      
      if (filteredImages.length === 0) {
        this.showEmptyState(`No se encontraron imágenes para "${query}"`);
      } else {
        this.hideEmptyState();
      }
      
    } catch (error) {
      console.error('Error buscando imágenes:', error);
      this.showNotification('Error en la búsqueda', 'error');
    }
  }

  // Mostrar notificación
  showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos inline para la notificación
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });
    
    // Colores según el tipo
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#10b981';
        break;
      case 'error':
        notification.style.backgroundColor = '#ef4444';
        break;
      case 'warning':
        notification.style.backgroundColor = '#f59e0b';
        break;
      default:
        notification.style.backgroundColor = '#3b82f6';
    }
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de un tiempo
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, CONFIG.APP_CONFIG.ui.notifications.duration || 5000);
  }

  // Mostrar error
  showError(message) {
    this.showNotification(message, 'error');
  }

  // Obtener estadísticas de la galería
  getStats() {
    return {
      totalImages: this.images.length,
      selectedImages: this.selectedImages.size,
      currentFolder: this.currentFolder,
      currentPage: this.currentPage,
      hasMore: this.hasMore
    };
  }
}

// Crear instancia global del gestor de galería
window.galleryManager = new GalleryManager();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GalleryManager;
}

