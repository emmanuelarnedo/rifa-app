import { db } from "./firebase-config.js";
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function suscribirRifas(callback) {
  return onSnapshot(collection(db, "rifas"), (snap) => {
    const list = [];
    snap.forEach((d) => { list.push({ id: d.id, ...d.data() }); });
    list.sort((a, b) => b.creadoEn - a.creadoEn);
    callback(list);
  });
}

let unsubscribeNumeros = null;
let unsubscribeTalonarios = null;

export function suscribirNumeros(rifaId, callback) {
  if (unsubscribeNumeros) unsubscribeNumeros();
  unsubscribeNumeros = onSnapshot(collection(db, `rifas/${rifaId}/numeros`), (snap) => {
    const data = {};
    snap.forEach((d) => { data[d.id] = d.data(); });
    callback(data);
  });
}

export function suscribirTalonarios(rifaId, callback) {
  if (unsubscribeTalonarios) unsubscribeTalonarios();
  unsubscribeTalonarios = onSnapshot(collection(db, `rifas/${rifaId}/talonarios`), (snap) => {
    const list = [];
    snap.forEach((d) => { list.push({ id: d.id, ...d.data() }); });
    list.sort((a, b) => a.inicio - b.inicio);
    callback(list);
  });
}

export function desuscribirRifaInterna() {
  if (unsubscribeNumeros) { unsubscribeNumeros(); unsubscribeNumeros = null; }
  if (unsubscribeTalonarios) { unsubscribeTalonarios(); unsubscribeTalonarios = null; }
}

// RIFA
export async function guardarRifa(id, payload) {
  const isNew = !id;
  const docId = id || ("rifa_" + Date.now());
  const ref = doc(db, "rifas", docId);
  if (isNew) await setDoc(ref, { ...payload, creadoEn: Date.now() });
  else await updateDoc(ref, payload);
}

export async function eliminarRifa(id) {
  await deleteDoc(doc(db, "rifas", id));
}

// TALONARIOS
export async function guardarTalonario(rifaId, talonarioId, payload) {
  const docId = talonarioId || ("tal_" + Date.now());
  const ref = doc(db, `rifas/${rifaId}/talonarios`, docId);
  await setDoc(ref, payload);
}

export async function eliminarTalonario(rifaId, talonarioId) {
  await deleteDoc(doc(db, `rifas/${rifaId}/talonarios`, talonarioId));
}

// NUMEROS
export async function guardarNumero(rifaId, numeroId, payload) {
  const ref = doc(db, `rifas/${rifaId}/numeros`, numeroId);
  await setDoc(ref, { ...payload, vendidoEn: Date.now() });
}

export async function eliminarNumero(rifaId, numeroId) {
  await deleteDoc(doc(db, `rifas/${rifaId}/numeros`, numeroId));
}