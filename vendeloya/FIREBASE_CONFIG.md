# Configuración de Firebase para Producción

## ✅ Configuración Completada

Las credenciales de Firebase ya están configuradas en `public/index.html` con los valores reales del proyecto.

## Cómo Obtener tus Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `vendeloya-2e40d`
3. Haz clic en el ícono de configuración (⚙️) > **Project settings**
4. Desplázate hasta la sección **Your apps**
5. Si ya tienes una app web, haz clic en ella. Si no, haz clic en **Add app** > **Web** (</>)
6. Copia los valores de configuración que aparecen:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",           // ← Copia este valor
  authDomain: "...",            // ← Copia este valor
  projectId: "vendeloya-2e40d",
  storageBucket: "...",         // ← Copia este valor
  messagingSenderId: "...",     // ← Copia este valor
  appId: "1:...:web:..."        // ← Copia este valor
};
```

## Dónde Actualizar la Configuración

Edita el archivo `public/index.html` y busca la sección:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyReplaceWithYourActualKey", // ← REEMPLAZA ESTO
    authDomain: "vendeloya-2e40d.firebaseapp.com",
    projectId: "vendeloya-2e40d",
    storageBucket: "vendeloya-2e40d.appspot.com",
    messagingSenderId: "123456789012", // ← REEMPLAZA ESTO
    appId: "1:123456789012:web:abcdef123456" // ← REEMPLAZA ESTO
};
```

Reemplaza los valores con los que obtuviste de Firebase Console.

## Verificación

Después de actualizar las credenciales:

1. **En desarrollo local**: La app seguirá usando los emuladores automáticamente
2. **En producción**: La app usará Firebase real con tus credenciales

## Notas de Seguridad

- ✅ Las credenciales del cliente (apiKey, etc.) son **públicas** y es seguro incluirlas en el frontend
- ✅ Firebase tiene reglas de seguridad en Firestore y Storage que protegen tus datos
- ✅ Nunca compartas tus claves privadas de servicio (service account keys)
- ✅ Configura las reglas de seguridad en `config/firestore.rules` y `config/storage.rules`

## Funcionalidades Configuradas

Con esta configuración, la app ahora:

- ✅ Funciona en **local** (con emuladores) y **producción** (con Firebase real)
- ✅ Usa Firebase Auth SDK completo (no solo emuladores)
- ✅ Detecta automáticamente el entorno
- ✅ Inicializa Auth, Firestore y Storage correctamente
- ✅ URLs de API se adaptan automáticamente al entorno

