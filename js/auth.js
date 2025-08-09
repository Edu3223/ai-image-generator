// Sistema de autenticación dual para AI Image Generator
// Maneja autenticación tanto online (Firebase) como offline (IndexedDB)

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isOnlineMode = false;
    this.authStateListeners = [];
    this.loginAttempts = new Map(); // Para controlar intentos de login
    
    // Inicializar Firebase si está configurado
    this.initializeFirebase();
    
    // Inicializar IndexedDB para modo offline
    this.initializeOfflineDB();
    
    // Escuchar cambios de conectividad
    this.setupConnectivityListeners();
  }

  // Inicializar Firebase Authentication
  async initializeFirebase() {
    try {
      if (CONFIG.ConfigUtils.isFirebaseConfigured()) {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        this.firebaseAuth = firebase.auth();
        
        // Escuchar cambios de estado de autenticación
        this.firebaseAuth.onAuthStateChanged((user) => {
          if (this.isOnlineMode && user) {
            this.handleFirebaseAuthChange(user);
          }
        });
        
        console.log('Firebase inicializado correctamente');
      } else {
        console.warn('Firebase no está configurado. Solo funcionará el modo offline.');
      }
    } catch (error) {
      console.error('Error inicializando Firebase:', error);
    }
  }

  // Inicializar base de datos offline (IndexedDB)
  async initializeOfflineDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        CONFIG.STORAGE_CONFIG.indexedDB.name,
        CONFIG.STORAGE_CONFIG.indexedDB.version
      );

      request.onerror = () => {
        console.error('Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.offlineDB = request.result;
        console.log('IndexedDB inicializado correctamente');
        resolve(this.offlineDB);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear store de usuarios si no existe
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }
        
        // Crear store de sesiones
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'userId' });
        }
        
        // Crear store de configuraciones
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Configurar listeners de conectividad
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('Conexión restaurada');
      this.notifyConnectivityChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('Conexión perdida');
      this.notifyConnectivityChange(false);
    });
  }

  // Notificar cambios de conectividad
  notifyConnectivityChange(isOnline) {
    const event = new CustomEvent('connectivityChange', {
      detail: { isOnline }
    });
    document.dispatchEvent(event);
  }

  // Establecer modo de autenticación
  setMode(isOnline) {
    this.isOnlineMode = isOnline;
    console.log(`Modo de autenticación: ${isOnline ? 'Online' : 'Offline'}`);
  }

  // Registrar listener de cambios de estado de autenticación
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
  }

  // Notificar cambios de estado de autenticación
  notifyAuthStateChange(user) {
    this.currentUser = user;
    this.authStateListeners.forEach(callback => callback(user));
  }

  // Manejar cambios de autenticación de Firebase
  handleFirebaseAuthChange(firebaseUser) {
    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      isOnline: true,
      createdAt: firebaseUser.metadata.creationTime,
      lastLoginAt: firebaseUser.metadata.lastSignInTime
    };
    
    this.notifyAuthStateChange(user);
  }

  // Validar entrada de usuario
  validateInput(type, value) {
    const config = CONFIG.SECURITY_CONFIG.validation;
    
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
        
      case 'password':
        return value.length >= CONFIG.SECURITY_CONFIG.auth.minPasswordLength &&
               value.length <= CONFIG.SECURITY_CONFIG.auth.maxPasswordLength;
               
      case 'username':
        return value.length >= config.minUsernameLength &&
               value.length <= config.maxUsernameLength &&
               config.allowedUsernameChars.test(value);
               
      case 'pin':
        const pinLength = value.toString().length;
        return pinLength >= CONFIG.SECURITY_CONFIG.auth.pinLength.min &&
               pinLength <= CONFIG.SECURITY_CONFIG.auth.pinLength.max &&
               /^\d+$/.test(value);
               
      default:
        return false;
    }
  }

  // Controlar intentos de login
  checkLoginAttempts(identifier) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Resetear intentos si ha pasado el tiempo de bloqueo
    if (now - attempts.lastAttempt > CONFIG.SECURITY_CONFIG.auth.lockoutDuration) {
      attempts.count = 0;
    }
    
    if (attempts.count >= CONFIG.SECURITY_CONFIG.auth.maxLoginAttempts) {
      const remainingTime = CONFIG.SECURITY_CONFIG.auth.lockoutDuration - (now - attempts.lastAttempt);
      if (remainingTime > 0) {
        throw new Error(`Demasiados intentos. Intenta en ${Math.ceil(remainingTime / 60000)} minutos.`);
      }
    }
    
    return attempts;
  }

  // Registrar intento de login
  recordLoginAttempt(identifier, success) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      this.loginAttempts.delete(identifier);
    } else {
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(identifier, attempts);
    }
  }

  // LOGIN ONLINE (Firebase)
  async loginOnline(email, password) {
    try {
      // Validar entrada
      if (!this.validateInput('email', email)) {
        throw new Error('Correo electrónico inválido');
      }
      
      if (!this.validateInput('password', password)) {
        throw new Error('Contraseña inválida');
      }
      
      // Verificar intentos de login
      this.checkLoginAttempts(email);
      
      // Intentar login con Firebase
      const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(email, password);
      
      this.recordLoginAttempt(email, true);
      
      return {
        success: true,
        user: userCredential.user,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/login')
      };
      
    } catch (error) {
      this.recordLoginAttempt(email, false);
      
      throw {
        success: false,
        error: error.code || 'auth/unknown',
        message: CONFIG.ConfigUtils.getErrorMessage(error.code || 'unknown')
      };
    }
  }

  // REGISTRO ONLINE (Firebase)
  async registerOnline(email, password, displayName) {
    try {
      // Validar entrada
      if (!this.validateInput('email', email)) {
        throw new Error('Correo electrónico inválido');
      }
      
      if (!this.validateInput('password', password)) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      
      // Crear usuario en Firebase
      const userCredential = await this.firebaseAuth.createUserWithEmailAndPassword(email, password);
      
      // Actualizar perfil si se proporciona displayName
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
      
      return {
        success: true,
        user: userCredential.user,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/register')
      };
      
    } catch (error) {
      throw {
        success: false,
        error: error.code || 'auth/unknown',
        message: CONFIG.ConfigUtils.getErrorMessage(error.code || 'unknown')
      };
    }
  }

  // LOGIN CON GOOGLE
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await this.firebaseAuth.signInWithPopup(provider);
      
      return {
        success: true,
        user: result.user,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/login')
      };
      
    } catch (error) {
      throw {
        success: false,
        error: error.code || 'auth/unknown',
        message: CONFIG.ConfigUtils.getErrorMessage(error.code || 'unknown')
      };
    }
  }

  // LOGIN OFFLINE (IndexedDB)
  async loginOffline(username, pin) {
    try {
      // Validar entrada
      if (!this.validateInput('username', username)) {
        throw new Error('Nombre de usuario inválido');
      }
      
      if (!this.validateInput('pin', pin)) {
        throw new Error('PIN inválido');
      }
      
      // Verificar intentos de login
      this.checkLoginAttempts(username);
      
      // Buscar usuario en IndexedDB
      const user = await this.getOfflineUser(username);
      
      if (!user) {
        this.recordLoginAttempt(username, false);
        throw new Error('Usuario no encontrado');
      }
      
      // Verificar PIN (en producción, usar hash)
      if (user.pin !== pin) {
        this.recordLoginAttempt(username, false);
        throw new Error('PIN incorrecto');
      }
      
      // Crear sesión
      await this.createOfflineSession(user);
      
      this.recordLoginAttempt(username, true);
      
      const userInfo = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        isOnline: false,
        createdAt: user.createdAt,
        lastLoginAt: new Date().toISOString()
      };
      
      this.notifyAuthStateChange(userInfo);
      
      return {
        success: true,
        user: userInfo,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/login')
      };
      
    } catch (error) {
      throw {
        success: false,
        error: 'auth/offline-error',
        message: error.message || CONFIG.ConfigUtils.getErrorMessage('unknown')
      };
    }
  }

  // REGISTRO OFFLINE (IndexedDB)
  async registerOffline(username, pin, displayName) {
    try {
      // Validar entrada
      if (!this.validateInput('username', username)) {
        throw new Error('Nombre de usuario inválido (3-30 caracteres, solo letras, números, _ y -)');
      }
      
      if (!this.validateInput('pin', pin)) {
        throw new Error('PIN inválido (4-6 dígitos)');
      }
      
      // Verificar si el usuario ya existe
      const existingUser = await this.getOfflineUser(username);
      if (existingUser) {
        throw new Error('El nombre de usuario ya existe');
      }
      
      // Crear nuevo usuario
      const userId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: userId,
        username: username,
        displayName: displayName || username,
        pin: pin, // En producción, usar hash
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        settings: {
          theme: 'light',
          language: 'es'
        }
      };
      
      // Guardar usuario en IndexedDB
      await this.saveOfflineUser(newUser);
      
      // Crear sesión
      await this.createOfflineSession(newUser);
      
      const userInfo = {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        isOnline: false,
        createdAt: newUser.createdAt,
        lastLoginAt: newUser.lastLoginAt
      };
      
      this.notifyAuthStateChange(userInfo);
      
      return {
        success: true,
        user: userInfo,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/register')
      };
      
    } catch (error) {
      throw {
        success: false,
        error: 'auth/offline-error',
        message: error.message || CONFIG.ConfigUtils.getErrorMessage('unknown')
      };
    }
  }

  // Obtener usuario offline de IndexedDB
  async getOfflineUser(username) {
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('username');
      const request = index.get(username);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar usuario offline en IndexedDB
  async saveOfflineUser(user) {
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Crear sesión offline
  async createOfflineSession(user) {
    const session = {
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CONFIG.SECURITY_CONFIG.auth.sessionTimeout).toISOString(),
      isActive: true
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(session);
      
      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  }

  // Verificar sesión offline
  async checkOfflineSession(userId) {
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.get(userId);
      
      request.onsuccess = () => {
        const session = request.result;
        if (session && session.isActive && new Date(session.expiresAt) > new Date()) {
          resolve(session);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // LOGOUT
  async logout() {
    try {
      if (this.isOnlineMode && this.firebaseAuth) {
        await this.firebaseAuth.signOut();
      } else if (this.currentUser) {
        // Limpiar sesión offline
        await this.clearOfflineSession(this.currentUser.id);
      }
      
      this.notifyAuthStateChange(null);
      
      return {
        success: true,
        message: CONFIG.ConfigUtils.getSuccessMessage('auth/logout')
      };
      
    } catch (error) {
      throw {
        success: false,
        error: 'auth/logout-error',
        message: 'Error al cerrar sesión'
      };
    }
  }

  // Limpiar sesión offline
  async clearOfflineSession(userId) {
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.delete(userId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Verificar si hay usuario autenticado
  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Verificar sesión persistente
    if (this.isOnlineMode && this.firebaseAuth) {
      return new Promise((resolve) => {
        const unsubscribe = this.firebaseAuth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    } else {
      // Verificar sesión offline en localStorage
      const savedSession = localStorage.getItem('offlineSession');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          const session = await this.checkOfflineSession(sessionData.userId);
          
          if (session) {
            const user = await this.getOfflineUserById(sessionData.userId);
            if (user) {
              const userInfo = {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                isOnline: false,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt
              };
              
              this.notifyAuthStateChange(userInfo);
              return userInfo;
            }
          }
        } catch (error) {
          console.error('Error verificando sesión offline:', error);
          localStorage.removeItem('offlineSession');
        }
      }
    }
    
    return null;
  }

  // Obtener usuario offline por ID
  async getOfflineUserById(userId) {
    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(userId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar usuario offline
  async saveOfflineUser(user) {
    return new Promise((resolve, reject) => {
      if (!this.offlineDB) {
        reject(new Error('Base de datos offline no inicializada'));
        return;
      }
      
      const transaction = this.offlineDB.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);
      
      request.onsuccess = () => resolve(user);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener usuario offline por nombre de usuario
  async getOfflineUser(username) {
    return new Promise((resolve, reject) => {
      if (!this.offlineDB) {
        reject(new Error('Base de datos offline no inicializada'));
        return;
      }
      
      const transaction = this.offlineDB.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('username');
      const request = index.get(username);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Crear sesión offline
  async createOfflineSession(user) {
    const sessionData = {
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
    };
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('offlineSession', JSON.stringify(sessionData));
    
    return sessionData;
  }

  // Verificar sesión offline
  async checkOfflineSession(userId) {
    const savedSession = localStorage.getItem('offlineSession');
    if (!savedSession) return null;
    
    try {
      const sessionData = JSON.parse(savedSession);
      if (sessionData.userId === userId && new Date(sessionData.expiresAt) > new Date()) {
        return sessionData;
      }
    } catch (error) {
      console.error('Error verificando sesión offline:', error);
    }
    
    localStorage.removeItem('offlineSession');
    return null;
  }

  // Obtener usuario offline por ID
  async getOfflineUserById(userId) {
    return new Promise((resolve, reject) => {
      if (!this.offlineDB) {
        reject(new Error('Base de datos offline no inicializada'));
        return;
      }
      
      const transaction = this.offlineDB.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(userId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Cambiar entre modos online/offline
  async switchMode(newMode) {
    const wasOnline = this.isOnlineMode;
    this.setMode(newMode === 'online');
    
    // Si hay usuario autenticado y cambiamos de modo, hacer logout
    if (this.currentUser && wasOnline !== this.isOnlineMode) {
      await this.logout();
    }
    
    return {
      success: true,
      mode: newMode,
      message: `Cambiado a modo ${newMode}`
    };
  }

  // Obtener información del modo actual
  getCurrentMode() {
    return {
      isOnline: this.isOnlineMode,
      hasInternet: navigator.onLine,
      canUseOnline: CONFIG.ConfigUtils.isFirebaseConfigured() && navigator.onLine,
      user: this.currentUser
    };
  }
}

// Crear instancia global del gestor de autenticación
window.authManager = new AuthManager();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}

