import { suscribirNumeros, suscribirTalonarios } from "./db.js";
import * as UI from "./ui.js";

// Inicializar la interfaz vacía
UI.init();

// Escuchar cambios en los talonarios (Encargados y rangos)
suscribirTalonarios((talonariosData) => {
  UI.updateTalonarios(talonariosData);
});

// Escuchar cambios en los números vendidos
suscribirNumeros((numerosData) => {
  UI.updateNumeros(numerosData);
});