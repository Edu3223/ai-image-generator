# 🚀 Guía de Inicio Rápido - AI Image Generator

## ⚡ Instalación en 5 Minutos

### 1. Descarga el Proyecto
```bash
# Opción A: Clonar repositorio
git clone https://github.com/tu-usuario/ai-image-generator.git

# Opción B: Descargar ZIP
# Descarga y extrae el archivo ZIP
```

### 2. Configuración Básica

#### Para Modo Offline (Sin configuración)
1. Abre `index.html` en tu navegador
2. Selecciona "Modo Offline"
3. Crea un usuario con nombre y PIN
4. ¡Listo! Ya puedes generar imágenes

#### Para Modo Online (Recomendado)

**Firebase (2 minutos):**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto nuevo
3. Habilita Authentication, Firestore y Storage
4. Copia la configuración a `js/config.js`

**Hugging Face (1 minuto):**
1. Crea cuenta en [Hugging Face](https://huggingface.co/)
2. Ve a Settings > Access Tokens
3. Crea un token y cópialo a `js/config.js`

### 3. Despliegue Instantáneo

**GitHub Pages (Más fácil):**
1. Sube el proyecto a GitHub
2. Ve a Settings > Pages
3. Selecciona "main branch"
4. Tu app estará en `https://tu-usuario.github.io/ai-image-generator/`

**Netlify (Arrastrar y soltar):**
1. Ve a [Netlify](https://netlify.com)
2. Arrastra la carpeta del proyecto
3. ¡Listo!

## 🎯 Uso Básico

### Generar tu Primera Imagen
1. Abre la aplicación
2. Selecciona modo (Online/Offline)
3. Inicia sesión o crea usuario
4. Escribe una descripción: "gato con alas volando"
5. Haz clic en "Generar"
6. ¡Disfruta tu imagen!

### Organizar Imágenes
- Crea carpetas personalizadas
- Arrastra imágenes para organizarlas
- Usa la búsqueda para encontrar imágenes

## 🔧 Configuración Rápida

### Archivo `js/config.js`
```javascript
// Solo cambia estos valores:
firebase: {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  // ... resto igual
},

huggingface: {
  apiKey: "hf_TU_TOKEN_AQUI",
  // ... resto igual
}
```

## 📱 Convertir a App Móvil

### PWABuilder (Más fácil)
1. Despliega tu app online
2. Ve a [PWABuilder](https://www.pwabuilder.com/)
3. Ingresa tu URL
4. Descarga el paquete para Android/iOS

## ❓ Problemas Comunes

**Error de CORS:** Usa un servidor web, no abras el archivo HTML directamente

**Firebase no funciona:** Verifica la configuración en `config.js`

**Hugging Face lento:** Los modelos gratuitos pueden tardar, es normal

## 🆘 Ayuda Rápida

- **Documentación completa:** Ver `README.md`
- **Problemas:** Crear issue en GitHub
- **Preguntas:** Revisar la documentación

## 🎉 ¡Eso es Todo!

Tu aplicación de generación de imágenes con IA está lista. Personalízala, compártela y disfruta creando imágenes increíbles.

**¿Necesitas más ayuda?** Consulta el `README.md` completo para configuración avanzada.

