# 🎟️ Rifa Solidaria — Cirugía Raul Walter Maza

Sistema web MVP para gestionar una rifa solidaria con persistencia en tiempo real via Firebase Firestore.

---

## 📁 Estructura del proyecto

```
rifa/
├── index.html              ← Página principal
├── css/
│   └── styles.css          ← Estilos (mobile-first)
├── js/
│   ├── firebase-config.js  ← Configuración Firebase
│   ├── db.js               ← Capa de datos (Firestore)
│   ├── ui.js               ← Renderizado e interacciones
│   └── app.js              ← Punto de entrada
├── api/
│   └── env.js              ← Endpoint Vercel (inyecta env vars)
├── firestore.rules         ← Reglas de seguridad Firestore
├── vercel.json             ← Config de despliegue Vercel
└── README.md
```

---

## 🔥 Paso 1 — Crear proyecto Firebase

1. Ir a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **Agregar proyecto** → nombrar el proyecto (ej: `rifa-maza`)
3. Desactivar Google Analytics (no es necesario) → **Crear proyecto**
4. En el menú lateral: **Firestore Database** → **Crear base de datos**
   - Seleccionar **Modo de producción**
   - Elegir región: `us-east1` o `southamerica-east1` (más cercana)
5. En **Configuración del proyecto** (ícono de engranaje) → **Tus apps** → **Agregar app web (`</>`)**
   - Registrar la app, copiar el objeto `firebaseConfig`

---

## 🔐 Paso 2 — Configurar credenciales de forma segura

### Para desarrollo local

Abrí `js/firebase-config.js` y completá `LOCAL_CONFIG` con tus valores:

```js
const LOCAL_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "rifa-maza.firebaseapp.com",
  projectId:         "rifa-maza",
  storageBucket:     "rifa-maza.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

> ⚠️ **NUNCA** subas este archivo con credenciales reales a GitHub.  
> Agregá `js/firebase-config.js` a tu `.gitignore` si vas a usar un repo público.

### Para producción en Vercel (forma segura ✅)

1. En el panel de Vercel, ir a tu proyecto → **Settings → Environment Variables**
2. Agregar las siguientes variables (una por una):

| Variable                      | Valor de tu Firebase |
|-------------------------------|---------------------|
| `FIREBASE_API_KEY`            | `AIzaSy...`         |
| `FIREBASE_AUTH_DOMAIN`        | `rifa-maza.firebaseapp.com` |
| `FIREBASE_PROJECT_ID`         | `rifa-maza`         |
| `FIREBASE_STORAGE_BUCKET`     | `rifa-maza.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID`| `123456789`         |
| `FIREBASE_APP_ID`             | `1:123...:web:abc...` |

3. Las credenciales se inyectan al cliente via `/api/env` (nunca en el HTML estático).
4. En `js/firebase-config.js`, dejá `LOCAL_CONFIG` con todos los campos **vacíos** antes de hacer push.

---

## 🛡️ Paso 3 — Publicar reglas de seguridad en Firestore

1. En Firebase Console → **Firestore** → **Reglas**
2. Reemplazar el contenido con el archivo `firestore.rules` de este proyecto
3. Clic en **Publicar**

---

## 🚀 Paso 4 — Desplegar en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desde la carpeta del proyecto
vercel

# 3. Seguir los pasos del asistente
# 4. Las variables de entorno ya configuradas en el panel se usan automáticamente
```

O bien, conectar el repositorio GitHub en [https://vercel.com/new](https://vercel.com/new) para despliegue automático.

---

## 🖥️ Uso del sistema

| Acción | Cómo |
|--------|------|
| Registrar un número | Tap/click en número verde |
| Ver a quién fue vendido | Hover/longpress sobre número oscuro |
| Editar un registro | Tap en número vendido → editar campos → Guardar |
| Liberar un número | Tap en número vendido → botón Eliminar 🗑 |
| Configurar precio | Botón 💰 Precio → ingresar valor |
| Ver/imprimir estado | Botón 🖨️ Ver / Imprimir |

---

## ➕ Extensiones futuras sugeridas

- **Autenticación**: agregar Firebase Auth para que solo el organizador pueda modificar datos
- **WhatsApp**: al guardar un número, generar link de confirmación por WhatsApp
- **Exportar CSV**: descargar listado completo de compradores
- **Sorteo automático**: generar número ganador aleatorio entre los vendidos
- **PWA**: agregar `manifest.json` y service worker para instalar como app

---

## 📦 Dependencias

- Firebase JS SDK v10 (CDN, sin npm)
- Google Fonts: Inter
- Sin frameworks JS — HTML/CSS/JS vanilla puro
