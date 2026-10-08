import { db } from "./firebase-config.js";
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function suscribirRifas(callback) {
  return onSnapshot(collection(db, "rifas"), (snap) => {
    const list = [];
    snap.forEach((d) => { list.push({ id: d.id, ...d.data() }); });
    // Ordenar por fecha de creación descendente
    list.sort((a, b) => b.creadoEn - a.creadoEn);
    callback(list);
  });
}

let unsubscribeNumeros = null;

export function suscribirNumeros(rifaId, callback) {
  if (unsubscribeNumeros) unsubscribeNumeros();
  unsubscribeNumeros = onSnapshot(collection(db, `rifas/${rifaId}/numeros`), (snap) => {
    const data = {};
    snap.forEach((d) => { data[d.id] = d.data(); });
    callback(data);
  });
}

export function desuscribirNumeros() {
  if (unsubscribeNumeros) {
    unsubscribeNumeros();
    unsubscribeNumeros = null;
  }
}

export async function guardarRifa(id, payload) {
  const isNew = !id;
  const docId = id || ("rifa_" + Date.now());
  const ref = doc(db, "rifas", docId);
  if (isNew) {
    await setDoc(ref, { ...payload, creadoEn: Date.now() });
  } else {
    await updateDoc(ref, payload);
  }
}

export async function eliminarRifa(id) {
  await deleteDoc(doc(db, "rifas", id));
}

export async function guardarNumero(rifaId, numeroId, payload) {
  const ref = doc(db, `rifas/${rifaId}/numeros`, numeroId);
  await setDoc(ref, { ...payload, vendidoEn: Date.now() });
}

export async function eliminarNumero(rifaId, numeroId) {
  await deleteDoc(doc(db, `rifas/${rifaId}/numeros`, numeroId));
}