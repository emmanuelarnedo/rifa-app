// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Configuración local (Solo para desarrollo)
const LOCAL_CONFIG = {
  apiKey: "AIzaSyAEB1pdFGchkhhnMnCFrt4AzD3J3TCkDQk",
  authDomain: "venta-rifa.firebaseapp.com",
  projectId: "venta-rifa",
  storageBucket: "venta-rifa.firebasestorage.app",
  messagingSenderId: "495339259193",
  appId: "1:495339259193:web:eaf7c071be6a4cdfd5d4e8"
};

// 2. Obtención de variables (Producción o Local)
// Si estamos en Vercel, toma los valores de window.__ENV__
const isVercel = typeof window !== "undefined" && window.__ENV__ && window.__ENV__.FIREBASE_API_KEY;
const config = isVercel ? {
    apiKey: window.__ENV__.FIREBASE_API_KEY,
    authDomain: window.__ENV__.FIREBASE_AUTH_DOMAIN,
    projectId: window.__ENV__.FIREBASE_PROJECT_ID,
    storageBucket: window.__ENV__.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.__ENV__.FIREBASE_MESSAGING_SENDER_ID,
    appId: window.__ENV__.FIREBASE_APP_ID
} : LOCAL_CONFIG;

// 3. Inicialización
let db;
try {
  const app = initializeApp(config);
  db = getFirestore(app);
  console.info("✅ Firebase inicializado correctamente");
} catch (err) {
  console.error("❌ Error al inicializar Firebase:", err.message);
}

export { db };
