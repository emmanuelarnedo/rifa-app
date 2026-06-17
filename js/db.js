// js/db.js
// ============================================================
//  Capa de acceso a datos (Firestore)
//  Todas las operaciones de BD están aquí — fácil de cambiar
//  de backend en el futuro sin tocar la UI.
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION = "numeros";
const CONFIG_DOC  = "config/settings";

// ---- Escuchar cambios en tiempo real ----
export function suscribirNumeros(callback) {
  const col = collection(db, COLLECTION);
  return onSnapshot(col, (snapshot) => {
    const data = {};
    snapshot.forEach((d) => {
      data[d.id] = d.data();
    });
    callback(data);
  });
}

// ---- Guardar / actualizar un número ----
export async function guardarNumero(numero, payload) {
  // numero: string "001"..."100"
  const ref = doc(db, COLLECTION, numero);
  await setDoc(ref, {
    ...payload,
    vendidoEn: Date.now(),
  });
}

// ---- Eliminar un número (liberar) ----
export async function eliminarNumero(numero) {
  const ref = doc(db, COLLECTION, numero);
  await deleteDoc(ref);
}

// ---- Config: precio por número ----
export async function guardarPrecio(precio) {
  const ref = doc(db, CONFIG_DOC);
  await setDoc(ref, { precioPorNumero: Number(precio) }, { merge: true });
}

export async function obtenerConfig() {
  const ref = doc(db, CONFIG_DOC);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { precioPorNumero: 0 };
}
