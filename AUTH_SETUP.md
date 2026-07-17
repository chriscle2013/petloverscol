# 🔐 Guía de Configuración: Autenticación en Firebase

## ¿Qué se ha implementado?

La aplicación PetLoversCol ahora tiene un sistema completo de autenticación con:

✅ **Registro de usuarios** (register.html)
✅ **Login de usuarios** (login.html)
✅ **Perfil de usuario** (profile.html)
✅ **Logout** (botón en navegación)
✅ **Indicador de usuario logueado** en la barra de navegación
✅ **Almacenamiento de datos de perfil** en Firestore

---

## 🚀 Configuración Necesaria en Firebase

### Paso 1: Habilitar Autenticación por Email/Contraseña

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Proyecto `petloverscol` → **Authentication** (en el menú lateral)
3. Pestaña **"Sign-in method"**
4. Haz clic en **"Email/Password"**
5. Activa el primer toggle: **"Email/Password"**
6. Haz clic en **"Guardar"**

### Paso 2: Habilitar Autenticación Anónima (opcional, para usuarios que solo navegan)

1. En **Authentication** → **Sign-in method**
2. Busca **"Anonymous"**
3. Activa el toggle
4. Haz clic en **"Guardar"**

### Paso 3: Actualizar Reglas de Firestore

1. Ve a **Firestore Database** → **"Rules"**
2. Reemplaza con estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso a datos de usuarios solo al usuario autenticado
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid != null;
    }

    // Permitir lectura pública de productos
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

3. Haz clic en **"Publicar"**

---

## 📱 Cómo Funciona

### Para Usuarios Nuevos:
1. Clic en **"Iniciar Sesión"** en la barra de navegación
2. Clic en **"Regístrate aquí"**
3. Completa el formulario:
   - Nombre Completo
   - Correo Electrónico
   - Contraseña (con indicador de fortaleza)
   - Confirmar Contraseña
4. Clic en **"Crear Cuenta"**
5. ¡Listo! Será redirigido al inicio

### Para Usuarios Existentes:
1. Clic en **"Iniciar Sesión"**
2. Ingresa email y contraseña
3. Clic en **"Iniciar Sesión"**
4. ¡Listo! Verá su nombre en la barra de navegación

### En el Perfil (profile.html):
- Ver información personal
- Editar teléfono, dirección, ciudad, departamento
- Ver historial de compras (preparado para futuro desarrollo)
- Cerrar sesión

---

## 📂 Archivos Creados/Modificados

### Nuevos archivos:
- `js/auth.js` - Lógica de autenticación con Firebase
- `login.html` - Página de login
- `register.html` - Página de registro
- `profile.html` - Página de perfil de usuario

### Modificados:
- `index.html` - Agregado elemento #userMenu
- `js/script.js` - Integración de autenticación

---

## 🔒 Seguridad

✅ Las contraseñas se almacenan de forma segura en Firebase (hasheadas)
✅ Los datos personales solo se pueden leer por el usuario dueño
✅ Las sesiones se mantienen automáticamente
✅ Logout limpia la sesión completamente

---

## 🧪 Probar la Autenticación

### Usuario de Prueba:
```
Email: test@petlovers.com
Contraseña: Test123@
```

O crear uno nuevo en register.html

---

## 📋 Funciones Disponibles (js/auth.js)

```javascript
// Registrar usuario
registerUser(email, password, displayName)

// Iniciar sesión
loginUser(email, password)

// Cerrar sesión
logoutUser()

// Obtener usuario actual
getCurrentUser()

// Escuchar cambios de autenticación
onAuthChange(callback)

// Verificar si hay usuario autenticado
isUserAuthenticated()
```

---

## ✨ Próximas Mejoras

- [ ] Recuperación de contraseña
- [ ] Verificación de email
- [ ] Login con Google/GitHub
- [ ] Historial de órdenes real
- [ ] Wishlist de productos favoritos
- [ ] Notificaciones de compra

---

**¿Preguntas?** Revisa la consola del navegador (F12) para ver mensajes de error detallados.
