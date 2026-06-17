// js/app.js
// ============================================================
//  Punto de entrada de la aplicación
//  Orquesta DB ↔ UI y el ciclo de vida de la app
// ============================================================

import { suscribirNumeros, obtenerConfig } from "./db.js";
import * as UI from "./ui.js";

// Mostrar esqueleto mientras carga
UI.showSkeleton();

// Cargar configuración (precio) una vez
obtenerConfig()
  .then((config) => UI.setPrecio(config.precioPorNumero || 0))
  .catch((err) => console.warn("No se pudo cargar la config:", err));

// Suscripción en tiempo real a los números vendidos
suscribirNumeros((numerosData) => {
  UI.updateNumeros(numerosData);
});
