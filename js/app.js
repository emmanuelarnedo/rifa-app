import { suscribirRifas } from "./db.js";
import * as UI from "./ui.js";

// Inicializa la visibilidad de pantallas
UI.init();

// Escuchar cambios globales (Lista de rifas)
suscribirRifas((rifasData) => {
  UI.updateRifasList(rifasData);
});