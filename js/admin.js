import { db } from "./firebase-config.js";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const lista = document.getElementById("solicitudes-list");

// Escuchar los talonarios y filtrar solo los que tienen borradoPendiente
onSnapshot(collection(db, "talonarios"), (snap) => {
    lista.innerHTML = "";
    let hayPendientes = false;

    snap.forEach((d) => {
        const data = d.data();
        if (data.borradoPendiente) {
            hayPendientes = true;
            
            const div = document.createElement("div");
            div.className = "card";
            div.innerHTML = `
                <h3 style="margin-top: 0; color: #F5A623;">${data.encargado} (Talonario ${data.inicio} - ${data.fin})</h3>
                <p style="background: #E53935; color: white; padding: 10px; border-radius: 6px;">
                   <strong>Motivo:</strong> ${data.motivoBorrado}
                </p>
                <div style="margin-top: 15px;">
                    <button class="btn btn-aprobar" id="btn-aprobar-${d.id}">✓ Aprobar Borrado Permanente</button>
                    <button class="btn btn-rechazar" id="btn-rechazar-${d.id}">✕ Rechazar y Restaurar</button>
                </div>
            `;
            lista.appendChild(div);

            // Botón Aprobar: Elimina definitivamente el documento
            document.getElementById(`btn-aprobar-${d.id}`).onclick = async () => {
                if(confirm(`¿Estás SEGURO de eliminar permanentemente el talonario de ${data.encargado}? Esta acción no se puede deshacer.`)) {
                    await deleteDoc(doc(db, "talonarios", d.id));
                }
            };

            // Botón Rechazar: Quita la bandera de borrado y limpia el motivo
            document.getElementById(`btn-rechazar-${d.id}`).onclick = async () => {
                await updateDoc(doc(db, "talonarios", d.id), {
                    borradoPendiente: false,
                    motivoBorrado: null
                });
            };
        }
    });

    if (!hayPendientes) {
        lista.innerHTML = "<p style='color: #7A9BBB;'>No hay solicitudes de borrado en este momento.</p>";
    }
});