// Aplicación principal de AI Image Generator
// Coordina todos los módulos y maneja la lógica de la interfaz

class AIImageGeneratorApp {
  constructor() {
    this.currentUser = null;
    this.currentMode = 'offline'; // 'online' o 'offline'
    this.currentSection = 'generate';
    this.isInitialized = false;
    this.folders = [];
    
    // Referencias a elementos DOM
    this.elements = {};
    
    // Estado de la aplicación
    this.state = {
      isGenerating: false,
      sidebarOpen: false,
      currentFolder: null
    };
    
    this.initializeApp();
  }

  // Inicializar aplicación
  async initializeApp() {
    try {
      console.log('Inicializando AI Image Generator...');
      
      // Mostrar pantalla de carga
      this.showLoadingScreen();
      
      // Esperar a que el DOM esté listo
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // Obtener referencias a elementos DOM
      this.getElementReferences();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Inicializar módulos
      await this.initializeModules();
      
      // Verificar sesión existente
      await this.checkExistingSession();
      
      // Ocultar pantalla de carga y mostrar selección de modo
      this.hideLoadingScreen();
      this.showModeSelection();
      
      this.isInitialized = true;
      console.log('Aplicación inicializada correctamente');
      
    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      this.showError('Error inicializando la aplicación');
    }
  }

  // Obtener referencias a elementos DOM
  getElementReferences() {
    // Pantallas principales
    this.elements.loadingScreen = document.getElementById('loading-screen');
    this.elements.modeSelection = document.getElementById('mode-selection');
    this.elements.authScreen = document.getElementById('auth-screen');
    this.elements.mainApp = document.getElementById('main-app');
    
    // Botones de modo
    this.elements.onlineModeBtn = document.getElementById('online-mode-btn');
    this.elements.offlineModeBtn = document.getElementById('offline-mode-btn');
    
    // Elementos de autenticación
    this.elements.authTitle = document.getElementById('auth-title');
    this.elements.onlineAuth = document.getElementById('online-auth');
    this.elements.offlineAuth = document.getElementById('offline-auth');
    this.elements.backToMode = document.getElementById('back-to-mode');
    
    // Formularios de autenticación online
    this.elements.email = document.getElementById('email');
    this.elements.password = document.getElementById('password');
    this.elements.loginBtn = document.getElementById('login-btn');
    this.elements.registerBtn = document.getElementById('register-btn');
    this.elements.googleAuthBtn = document.getElementById('google-auth-btn');
    this.elements.switchToRegister = document.getElementById('switch-to-register');
    
    // Formularios de autenticación offline
    this.elements.username = document.getElementById('username');
    this.elements.pin = document.getElementById('pin');
    this.elements.offlineLoginBtn = document.getElementById('offline-login-btn');
    this.elements.offlineRegisterBtn = document.getElementById('offline-register-btn');
    
    // Header y navegación
    this.elements.menuToggle = document.getElementById('menu-toggle');
    this.elements.sidebar = document.getElementById('sidebar');
    this.elements.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.elements.userName = document.getElementById('user-name');
    this.elements.sidebarUserName = document.getElementById('sidebar-user-name');
    this.elements.sidebarMode = document.getElementById('sidebar-mode');
    this.elements.modeIndicator = document.getElementById('mode-indicator');
    
    // Navegación del sidebar
    this.elements.navItems = document.querySelectorAll('.nav-item[data-section]');
    this.elements.foldersList = document.getElementById('folders-list');
    this.elements.addFolderBtn = document.getElementById('add-folder');
    this.elements.switchModeBtn = document.getElementById('switch-mode');
    this.elements.logoutBtn = document.getElementById('logout');
    
    // Secciones de contenido
    this.elements.generateSection = document.getElementById('generate-section');
    this.elements.gallerySection = document.getElementById('gallery-section');
    
    // Elementos de generación
    this.elements.uploadArea = document.getElementById('upload-area');
    this.elements.imageInput = document.getElementById('image-input');
    this.elements.imagePreview = document.getElementById('image-preview');
    this.elements.previewImg = document.getElementById('preview-img');
    this.elements.removeImageBtn = document.getElementById('remove-image');
    this.elements.description = document.getElementById('description');
    this.elements.folderSelect = document.getElementById('folder-select');
    this.elements.numImages = document.getElementById('num-images');
    this.elements.styleSelect = document.getElementById('style-select');
    this.elements.generateBtn = document.getElementById('generate-btn');
    this.elements.btnText = this.elements.generateBtn?.querySelector('.btn-text');
    this.elements.btnLoading = this.elements.generateBtn?.querySelector('.btn-loading');
    this.elements.generationResults = document.getElementById('generation-results');
    this.elements.resultsGrid = document.getElementById('results-grid');
    
    // Modales
    this.elements.imageModal = document.getElementById('image-modal');
    this.elements.folderModal = document.getElementById('folder-modal');
    this.elements.folderNameInput = document.getElementById('folder-name');
    this.elements.createFolderBtn = document.getElementById('create-folder');
    this.elements.cancelFolderBtn = document.getElementById('cancel-folder');
    
    // Botones de cierre de modal
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.add('hidden');
      });
    });
  }

  // Configurar event listeners
  setupEventListeners() {
    // Botones de selección de modo
    this.elements.onlineModeBtn?.addEventListener('click', () => this.selectMode('online'));
    this.elements.offlineModeBtn?.addEventListener('click', () => this.selectMode('offline'));
    
    // Botón volver a selección de modo
    this.elements.backToMode?.addEventListener('click', () => this.showModeSelection());
    
    // Autenticación online
    this.elements.loginBtn?.addEventListener('click', () => this.handleOnlineLogin());
    this.elements.registerBtn?.addEventListener('click', () => this.handleOnlineRegister());
    this.elements.googleAuthBtn?.addEventListener('click', () => this.handleGoogleAuth());
    this.elements.switchToRegister?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleAuthMode();
    });
    
    // Autenticación offline
    this.elements.offlineLoginBtn?.addEventListener('click', () => this.handleOfflineLogin());
    this.elements.offlineRegisterBtn?.addEventListener('click', () => this.handleOfflineRegister());
    
    // Enter en formularios
    this.elements.email?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleOnlineLogin();
    });
    this.elements.password?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleOnlineLogin();
    });
    this.elements.username?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleOfflineLogin();
    });
    this.elements.pin?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleOfflineLogin();
    });
    
    // Navegación
    this.elements.menuToggle?.addEventListener('click', () => this.toggleSidebar());
    this.elements.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());
    this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
    this.elements.switchModeBtn?.addEventListener('click', () => this.handleSwitchMode());
    
    // Navegación entre secciones
    this.elements.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (section) this.navigateToSection(section);
      });
    });
    
    // Carpetas
    this.elements.addFolderBtn?.addEventListener('click', () => this.showCreateFolderModal());
    this.elements.createFolderBtn?.addEventListener('click', () => this.createFolder());
    this.elements.cancelFolderBtn?.addEventListener('click', () => this.hideCreateFolderModal());
    
    // Generación de imágenes
    this.setupImageGenerationListeners();
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
    
    // Responsive - cerrar sidebar en resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.state.sidebarOpen) {
        this.closeSidebar();
      }
    });
  }

  // Configurar listeners de generación de imágenes
  setupImageGenerationListeners() {
    // Upload area drag & drop
    if (this.elements.uploadArea) {
      this.elements.uploadArea.addEventListener('click', () => {
        this.elements.imageInput?.click();
      });
      
      this.elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.elements.uploadArea.classList.add('dragover');
      });
      
      this.elements.uploadArea.addEventListener('dragleave', () => {
        this.elements.uploadArea.classList.remove('dragover');
      });
      
      this.elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.elements.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleImageUpload(files[0]);
        }
      });
    }
    
    // Input de imagen
    this.elements.imageInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleImageUpload(e.target.files[0]);
      }
    });
    
    // Botón remover imagen
    this.elements.removeImageBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeUploadedImage();
    });
    
    // Botón generar
    this.elements.generateBtn?.addEventListener('click', () => this.handleGeneration());
  }

  // Inicializar módulos
  async initializeModules() {
    // Los módulos ya están inicializados globalmente
    // Solo necesitamos configurar los listeners
    
    if (window.authManager) {
      window.authManager.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });
    }
    
    if (window.storageManager) {
      window.storageManager.setMode(this.currentMode === 'online');
    }
    
    if (window.aiGenerator) {
      window.aiGenerator.setMode(this.currentMode === 'online');
    }
  }

  // Verificar sesión existente
  async checkExistingSession() {
    try {
      const user = await window.authManager?.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.currentMode = user.isOnline ? 'online' : 'offline';
        // No mostrar la app automáticamente, dejar que el usuario elija el modo
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
    }
  }

  // PANTALLAS Y NAVEGACIÓN

  // Mostrar pantalla de carga
  showLoadingScreen() {
    this.elements.loadingScreen?.classList.remove('hidden');
    this.elements.modeSelection?.classList.add('hidden');
    this.elements.authScreen?.classList.add('hidden');
    this.elements.mainApp?.classList.add('hidden');
  }

  // Ocultar pantalla de carga
  hideLoadingScreen() {
    this.elements.loadingScreen?.classList.add('hidden');
  }

  // Mostrar selección de modo
  showModeSelection() {
    this.elements.modeSelection?.classList.remove('hidden');
    this.elements.authScreen?.classList.add('hidden');
    this.elements.mainApp?.classList.add('hidden');
  }

  // Mostrar pantalla de autenticación
  showAuthScreen() {
    this.elements.modeSelection?.classList.add('hidden');
    this.elements.authScreen?.classList.remove('hidden');
    this.elements.mainApp?.classList.add('hidden');
  }

  // Mostrar aplicación principal
  showMainApp() {
    this.elements.modeSelection?.classList.add('hidden');
    this.elements.authScreen?.classList.add('hidden');
    this.elements.mainApp?.classList.remove('hidden');
    
    // Cargar datos iniciales
    this.loadInitialData();
  }

  // Seleccionar modo
  async selectMode(mode) {
    this.currentMode = mode;
    
    // Configurar módulos
    if (window.authManager) {
      window.authManager.setMode(mode === 'online');
    }
    if (window.storageManager) {
      window.storageManager.setMode(mode === 'online');
    }
    if (window.aiGenerator) {
      window.aiGenerator.setMode(mode === 'online');
    }
    
    // Configurar UI de autenticación
    this.setupAuthUI(mode);
    
    // Mostrar pantalla de autenticación
    this.showAuthScreen();
  }

  // Configurar UI de autenticación
  setupAuthUI(mode) {
    if (mode === 'online') {
      this.elements.authTitle.textContent = 'Iniciar Sesión Online';
      this.elements.onlineAuth?.classList.remove('hidden');
      this.elements.offlineAuth?.classList.add('hidden');
    } else {
      this.elements.authTitle.textContent = 'Acceso Offline';
      this.elements.onlineAuth?.classList.add('hidden');
      this.elements.offlineAuth?.classList.remove('hidden');
    }
  }

  // Alternar modo de autenticación (login/register)
  toggleAuthMode() {
    const isLogin = this.elements.loginBtn?.textContent === 'Iniciar Sesión';
    
    if (isLogin) {
      // Cambiar a registro
      this.elements.authTitle.textContent = 'Crear Cuenta';
      this.elements.loginBtn.textContent = 'Registrarse';
      this.elements.registerBtn.style.display = 'none';
      this.elements.switchToRegister.textContent = '¿Ya tienes cuenta? Inicia sesión aquí';
    } else {
      // Cambiar a login
      this.elements.authTitle.textContent = 'Iniciar Sesión Online';
      this.elements.loginBtn.textContent = 'Iniciar Sesión';
      this.elements.registerBtn.style.display = 'block';
      this.elements.switchToRegister.textContent = '¿No tienes cuenta? Regístrate aquí';
    }
  }

  // AUTENTICACIÓN

  // Manejar login online
  async handleOnlineLogin() {
    try {
      const email = this.elements.email?.value.trim();
      const password = this.elements.password?.value;
      
      if (!email || !password) {
        this.showError('Por favor completa todos los campos');
        return;
      }
      
      this.setLoading(this.elements.loginBtn, true);
      
      const isRegister = this.elements.loginBtn?.textContent === 'Registrarse';
      
      if (isRegister) {
        await window.authManager.registerOnline(email, password);
      } else {
        await window.authManager.loginOnline(email, password);
      }
      
    } catch (error) {
      console.error('Error en autenticación online:', error);
      this.showError(error.message || 'Error en la autenticación');
    } finally {
      this.setLoading(this.elements.loginBtn, false);
    }
  }

  // Manejar registro online
  async handleOnlineRegister() {
    try {
      const email = this.elements.email?.value.trim();
      const password = this.elements.password?.value;
      
      if (!email || !password) {
        this.showError('Por favor completa todos los campos');
        return;
      }
      
      this.setLoading(this.elements.registerBtn, true);
      
      await window.authManager.registerOnline(email, password);
      
    } catch (error) {
      console.error('Error en registro online:', error);
      this.showError(error.message || 'Error en el registro');
    } finally {
      this.setLoading(this.elements.registerBtn, false);
    }
  }

  // Manejar autenticación con Google
  async handleGoogleAuth() {
    try {
      this.setLoading(this.elements.googleAuthBtn, true);
      
      await window.authManager.loginWithGoogle();
      
    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      this.showError(error.message || 'Error en la autenticación con Google');
    } finally {
      this.setLoading(this.elements.googleAuthBtn, false);
    }
  }

  // Manejar login offline
  async handleOfflineLogin() {
    try {
      const username = this.elements.username?.value.trim();
      const pin = this.elements.pin?.value;
      
      if (!username || !pin) {
        this.showError('Por favor completa todos los campos');
        return;
      }
      
      this.setLoading(this.elements.offlineLoginBtn, true);
      
      await window.authManager.loginOffline(username, pin);
      
    } catch (error) {
      console.error('Error en login offline:', error);
      this.showError(error.message || 'Error en el acceso offline');
    } finally {
      this.setLoading(this.elements.offlineLoginBtn, false);
    }
  }

  // Manejar registro offline
  async handleOfflineRegister() {
    try {
      const username = this.elements.username?.value.trim();
      const pin = this.elements.pin?.value;
      
      if (!username || !pin) {
        this.showError('Por favor completa todos los campos');
        return;
      }
      
      this.setLoading(this.elements.offlineRegisterBtn, true);
      
      await window.authManager.registerOffline(username, pin, username);
      
    } catch (error) {
      console.error('Error en registro offline:', error);
      this.showError(error.message || 'Error creando el usuario');
    } finally {
      this.setLoading(this.elements.offlineRegisterBtn, false);
    }
  }

  // Manejar cambio de estado de autenticación
  handleAuthStateChange(user) {
    this.currentUser = user;
    
    if (user) {
      // Usuario autenticado
      this.updateUserInfo(user);
      this.showMainApp();
    } else {
      // Usuario no autenticado
      this.showModeSelection();
    }
  }

  // Actualizar información del usuario en la UI
  updateUserInfo(user) {
    const displayName = user.displayName || user.username || user.email || 'Usuario';
    
    if (this.elements.userName) {
      this.elements.userName.textContent = displayName;
    }
    
    if (this.elements.sidebarUserName) {
      this.elements.sidebarUserName.textContent = displayName;
    }
    
    if (this.elements.sidebarMode) {
      this.elements.sidebarMode.textContent = user.isOnline ? 'Modo Online' : 'Modo Offline';
    }
    
    if (this.elements.modeIndicator) {
      this.elements.modeIndicator.textContent = user.isOnline ? 'Online' : 'Offline';
    }
  }

  // Manejar logout
  async handleLogout() {
    try {
      await window.authManager.logout();
      this.currentUser = null;
      this.showModeSelection();
    } catch (error) {
      console.error('Error en logout:', error);
      this.showError('Error cerrando sesión');
    }
  }

  // Manejar cambio de modo
  async handleSwitchMode() {
    try {
      const newMode = this.currentMode === 'online' ? 'offline' : 'online';
      await window.authManager.switchMode(newMode);
      this.currentMode = newMode;
      this.showModeSelection();
    } catch (error) {
      console.error('Error cambiando modo:', error);
      this.showError('Error cambiando modo');
    }
  }

  // NAVEGACIÓN

  // Navegar a sección
  navigateToSection(section) {
    // Actualizar navegación activa
    this.elements.navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === section) {
        item.classList.add('active');
      }
    });
    
    // Mostrar sección correspondiente
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    this.currentSection = section;
    
    // Cerrar sidebar en móvil
    if (window.innerWidth <= 768) {
      this.closeSidebar();
    }
    
    // Cargar datos específicos de la sección
    if (section === 'gallery') {
      window.galleryManager?.loadGallery();
    }
  }

  // Toggle sidebar
  toggleSidebar() {
    if (this.state.sidebarOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  // Abrir sidebar
  openSidebar() {
    this.elements.sidebar?.classList.add('active');
    this.elements.sidebarOverlay?.classList.add('active');
    this.state.sidebarOpen = true;
  }

  // Cerrar sidebar
  closeSidebar() {
    this.elements.sidebar?.classList.remove('active');
    this.elements.sidebarOverlay?.classList.remove('active');
    this.state.sidebarOpen = false;
  }

  // GENERACIÓN DE IMÁGENES

  // Manejar subida de imagen
  async handleImageUpload(file) {
    try {
      // Validar archivo
      if (!file.type.startsWith('image/')) {
        this.showError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Procesar imagen
      const processedImage = await window.aiGenerator.processInputImage(file);
      
      // Mostrar preview
      this.showImagePreview(file);
      
      this.showSuccess('Imagen cargada correctamente');
      
    } catch (error) {
      console.error('Error procesando imagen:', error);
      this.showError(error.message || 'Error procesando la imagen');
    }
  }

  // Mostrar preview de imagen
  showImagePreview(file) {
    if (!this.elements.previewImg || !this.elements.imagePreview) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.previewImg.src = e.target.result;
      this.elements.imagePreview.classList.remove('hidden');
      this.elements.uploadArea.querySelector('.upload-content').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // Remover imagen subida
  removeUploadedImage() {
    if (this.elements.imagePreview) {
      this.elements.imagePreview.classList.add('hidden');
    }
    
    if (this.elements.imageInput) {
      this.elements.imageInput.value = '';
    }
    
    const uploadContent = this.elements.uploadArea?.querySelector('.upload-content');
    if (uploadContent) {
      uploadContent.style.display = 'block';
    }
  }

  // Manejar generación
  async handleGeneration() {
    try {
      if (this.state.isGenerating) return;
      
      // Validar entrada
      const description = this.elements.description?.value.trim();
      if (!description) {
        this.showError('Por favor escribe una descripción para la imagen');
        return;
      }
      
      // Preparar parámetros
      const params = {
        prompt: description,
        numImages: parseInt(this.elements.numImages?.value || '2'),
        style: this.elements.styleSelect?.value || 'realistic',
        folderId: this.elements.folderSelect?.value || null
      };
      
      // Iniciar generación
      this.setGenerating(true);
      
      const result = await window.aiGenerator.generateImages(params);
      
      // Mostrar resultados
      this.showGenerationResults(result);
      
      // Guardar imágenes
      await this.saveGeneratedImages(result, params);
      
      this.showSuccess(`Se generaron ${result.totalGenerated} imágenes correctamente`);
      
    } catch (error) {
      console.error('Error generando imágenes:', error);
      this.showError(error.message || 'Error generando las imágenes');
    } finally {
      this.setGenerating(false);
    }
  }

  // Establecer estado de generación
  setGenerating(isGenerating) {
    this.state.isGenerating = isGenerating;
    
    if (this.elements.generateBtn) {
      this.elements.generateBtn.disabled = isGenerating;
    }
    
    if (this.elements.btnText && this.elements.btnLoading) {
      if (isGenerating) {
        this.elements.btnText.classList.add('hidden');
        this.elements.btnLoading.classList.remove('hidden');
      } else {
        this.elements.btnText.classList.remove('hidden');
        this.elements.btnLoading.classList.add('hidden');
      }
    }
  }

  // Mostrar resultados de generación
  showGenerationResults(result) {
    if (!this.elements.generationResults || !this.elements.resultsGrid) return;
    
    // Limpiar resultados anteriores
    this.elements.resultsGrid.innerHTML = '';
    
    // Mostrar cada resultado
    result.results.forEach((imageResult, index) => {
      if (imageResult.success) {
        const resultItem = this.createResultItem(imageResult, index);
        this.elements.resultsGrid.appendChild(resultItem);
      }
    });
    
    // Mostrar sección de resultados
    this.elements.generationResults.classList.remove('hidden');
  }

  // Crear elemento de resultado
  createResultItem(imageResult, index) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // Crear imagen
    const img = document.createElement('img');
    img.src = URL.createObjectURL(imageResult.imageBlob);
    img.alt = `Imagen generada ${index + 1}`;
    
    // Crear acciones
    const actions = document.createElement('div');
    actions.className = 'result-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'result-btn';
    downloadBtn.textContent = 'Descargar';
    downloadBtn.onclick = () => this.downloadGeneratedImage(imageResult, index);
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'result-btn';
    saveBtn.textContent = 'Guardar';
    saveBtn.onclick = () => this.saveIndividualImage(imageResult);
    
    actions.appendChild(downloadBtn);
    actions.appendChild(saveBtn);
    
    resultItem.appendChild(img);
    resultItem.appendChild(actions);
    
    return resultItem;
  }

  // Descargar imagen generada
  downloadGeneratedImage(imageResult, index) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(imageResult.imageBlob);
    link.download = `ai-image-${Date.now()}-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Guardar imagen individual
  async saveIndividualImage(imageResult) {
    try {
      if (!this.currentUser) return;
      
      const imageData = {
        file: imageResult.imageBlob,
        prompt: imageResult.prompt,
        style: imageResult.style,
        model: imageResult.model,
        width: 512,
        height: 512
      };
      
      const folderId = this.elements.folderSelect?.value || null;
      
      await window.storageManager.saveImage(imageData, this.currentUser.id, folderId);
      
      this.showSuccess('Imagen guardada correctamente');
      
    } catch (error) {
      console.error('Error guardando imagen:', error);
      this.showError('Error guardando la imagen');
    }
  }

  // Guardar imágenes generadas
  async saveGeneratedImages(result, params) {
    try {
      if (!this.currentUser) return;
      
      const savePromises = result.results
        .filter(r => r.success)
        .map(imageResult => {
          const imageData = {
            file: imageResult.imageBlob,
            prompt: params.prompt,
            style: params.style,
            model: imageResult.model,
            width: 512,
            height: 512
          };
          
          return window.storageManager.saveImage(imageData, this.currentUser.id, params.folderId);
        });
      
      await Promise.all(savePromises);
      
    } catch (error) {
      console.error('Error guardando imágenes:', error);
      // No mostrar error aquí, ya se muestra en saveIndividualImage
    }
  }

  // CARPETAS

  // Mostrar modal de crear carpeta
  showCreateFolderModal() {
    this.elements.folderModal?.classList.remove('hidden');
    this.elements.folderNameInput?.focus();
  }

  // Ocultar modal de crear carpeta
  hideCreateFolderModal() {
    this.elements.folderModal?.classList.add('hidden');
    if (this.elements.folderNameInput) {
      this.elements.folderNameInput.value = '';
    }
  }

  // Crear carpeta
  async createFolder() {
    try {
      const name = this.elements.folderNameInput?.value.trim();
      if (!name) {
        this.showError('Por favor ingresa un nombre para la carpeta');
        return;
      }
      
      if (!this.currentUser) return;
      
      const result = await window.storageManager.createFolder(name, this.currentUser.id);
      
      this.hideCreateFolderModal();
      this.showSuccess('Carpeta creada correctamente');
      
      // Actualizar lista de carpetas
      await this.loadFolders();
      
    } catch (error) {
      console.error('Error creando carpeta:', error);
      this.showError(error.message || 'Error creando la carpeta');
    }
  }

  // Cargar carpetas
  async loadFolders() {
    try {
      if (!this.currentUser) return;
      
      this.folders = await window.storageManager.getFolders(this.currentUser.id);
      this.updateFoldersUI();
      
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
  }

  // Actualizar UI de carpetas
  updateFoldersUI() {
    // Actualizar lista del sidebar
    if (this.elements.foldersList) {
      // Limpiar carpetas existentes (excepto las predeterminadas)
      const customFolders = this.elements.foldersList.querySelectorAll('.folder:not([data-default])');
      customFolders.forEach(folder => folder.remove());
      
      // Agregar carpetas personalizadas
      this.folders.forEach(folder => {
        if (!CONFIG.APP_CONFIG.defaultFolders.find(df => df.id === folder.id)) {
          const folderBtn = this.createFolderButton(folder);
          this.elements.foldersList.appendChild(folderBtn);
        }
      });
    }
    
    // Actualizar select de carpetas
    if (this.elements.folderSelect) {
      // Limpiar opciones existentes (excepto la primera)
      const options = this.elements.folderSelect.querySelectorAll('option:not(:first-child)');
      options.forEach(option => option.remove());
      
      // Agregar todas las carpetas
      [...CONFIG.APP_CONFIG.defaultFolders, ...this.folders].forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        this.elements.folderSelect.appendChild(option);
      });
    }
  }

  // Crear botón de carpeta
  createFolderButton(folder) {
    const button = document.createElement('button');
    button.className = 'nav-item folder';
    button.dataset.folder = folder.id;
    
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.textContent = folder.icon || '📁';
    
    const text = document.createTextNode(folder.name);
    
    button.appendChild(icon);
    button.appendChild(text);
    
    button.addEventListener('click', () => {
      this.navigateToSection('gallery');
      window.galleryManager?.filterByFolder(folder.id);
    });
    
    return button;
  }

  // DATOS INICIALES

  // Cargar datos iniciales
  async loadInitialData() {
    try {
      // Cargar carpetas
      await this.loadFolders();
      
      // Cargar galería si estamos en esa sección
      if (this.currentSection === 'gallery') {
        window.galleryManager?.loadGallery();
      }
      
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  }

  // UTILIDADES

  // Establecer estado de carga en botón
  setLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Cargando...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  // Cerrar todos los modales
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  // Mostrar notificación de éxito
  showSuccess(message) {
    window.galleryManager?.showNotification(message, 'success');
  }

  // Mostrar notificación de error
  showError(message) {
    window.galleryManager?.showNotification(message, 'error');
  }

  // Obtener estado de la aplicación
  getAppState() {
    return {
      currentUser: this.currentUser,
      currentMode: this.currentMode,
      currentSection: this.currentSection,
      isInitialized: this.isInitialized,
      state: this.state
    };
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AIImageGeneratorApp();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIImageGeneratorApp;
}

