import { db } from "./firebase-config.js";
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COL_NUMEROS = "numeros";
const COL_TALONARIOS = "talonarios";

export function suscribirNumeros(callback) {
  return onSnapshot(collection(db, COL_NUMEROS), (snap) => {
    const data = {};
    snap.forEach((d) => { data[d.id] = d.data(); });
    callback(data);
  });
}

export async function guardarNumero(numero, payload) {
  const ref = doc(db, COL_NUMEROS, numero);
  await setDoc(ref, { ...payload, vendidoEn: Date.now() });
}

export async function eliminarNumero(numero) {
  await deleteDoc(doc(db, COL_NUMEROS, numero));
}

export function suscribirTalonarios(callback) {
  return onSnapshot(collection(db, COL_TALONARIOS), (snap) => {
    const list = [];
    snap.forEach((d) => { 
      const data = d.data();
      // Ocultamos los talonarios que están pendientes de aprobación de borrado
      if (!data.borradoPendiente) {
        list.push({ id: d.id, ...data }); 
      }
    });
    list.sort((a, b) => a.inicio - b.inicio);
    callback(list);
  });
}

export async function guardarTalonario(payload) {
  const id = "tal_" + Date.now(); 
  const ref = doc(db, COL_TALONARIOS, id);
  await setDoc(ref, { ...payload, creadoEn: Date.now(), borradoPendiente: false });
}

export async function actualizarTalonario(id, payload) {
  const ref = doc(db, COL_TALONARIOS, id);
  await updateDoc(ref, payload);
}

// Nueva función de Soft Delete para los usuarios
export async function solicitarBorrado(id, motivo) {
  const ref = doc(db, COL_TALONARIOS, id);
  await updateDoc(ref, { borradoPendiente: true, motivoBorrado: motivo });
}

// Esta se mantiene para que TÚ puedas borrar de forma definitiva desde tu panel admin
export async function eliminarTalonario(id) {
  const ref = doc(db, COL_TALONARIOS, id);
  await deleteDoc(ref);
}