import * as DB from "./db.js";

let _state = {
  rifas: [],
  currentRifa: null,
  numeros: {},
  seleccionNumero: null,
  rifaTargetParaLogin: null
};

export function init() {
  document.getElementById("view-home").style.display = "block";
  document.getElementById("view-rifa").style.display = "none";
}

export function updateRifasList(data) {
  _state.rifas = data;
  
  // Si estamos dentro de una rifa y se actualizó su configuración
  if (_state.currentRifa) {
    const updated = data.find(r => r.id === _state.currentRifa.id);
    if (updated) {
      _state.currentRifa = updated;
      renderHeaderRifa();
      renderGrid();
    } else {
      volverAlInicio(); // La rifa fue eliminada
    }
  }
  
  const list = document.getElementById("rifas-list");
  list.innerHTML = "";
  
  if (data.length === 0) {
    list.innerHTML = "<p style='color: var(--color-text-muted); text-align: center; padding: 20px;'>No hay rifas activas. Crea la primera.</p>";
    return;
  }

  data.forEach(rifa => {
    const card = document.createElement("div");
    card.style = "background: var(--color-surface-2); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--color-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
    card.innerHTML = `
      <div>
        <h4 style="margin: 0; color: var(--color-text); font-size: 16px;">${rifa.titulo}</h4>
        <span style="font-size: 12px; color: var(--color-text-muted);">Total: ${rifa.cantidadNumeros} números | Sortea: ${rifa.fechaSorteo || 'A definir'}</span>
      </div>
      <button class="btn btn-primary" style="padding: 8px 12px;">Ingresar</button>
    `;
    card.onclick = () => solicitarPassword(rifa.id);
    list.appendChild(card);
  });
}

export function updateNumeros(data) {
  _state.numeros = data;
  renderStats();
  renderGrid();
}

// ---- NAVEGACIÓN Y ACCESO ----
function solicitarPassword(rifaId) {
  _state.rifaTargetParaLogin = rifaId;
  document.getElementById("input-login-password").value = "";
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-login").classList.add("active");
}

export function verificarPassword() {
  const rifa = _state.rifas.find(r => r.id === _state.rifaTargetParaLogin);
  const pass = document.getElementById("input-login-password").value;
  
  if (pass === rifa.password) {
    closeModal();
    _state.currentRifa = rifa;
    document.getElementById("view-home").style.display = "none";
    document.getElementById("view-rifa").style.display = "block";
    renderHeaderRifa();
    DB.suscribirNumeros(rifa.id, updateNumeros);
  } else {
    showToast("❌ Contraseña incorrecta");
  }
}

export function volverAlInicio() {
  _state.currentRifa = null;
  _state.numeros = {};
  DB.desuscribirNumeros();
  document.getElementById("view-home").style.display = "block";
  document.getElementById("view-rifa").style.display = "none";
}

// ---- RENDER RIFA INTERNA ----
function renderHeaderRifa() {
  const r = _state.currentRifa;
  document.getElementById("rifa-title-display").textContent = r.titulo;
  document.getElementById("rifa-rango-display").textContent = `1 al ${r.cantidadNumeros}`;
}

function renderStats() {
  let vendidos = 0, efectivo = 0, transferencia = 0;
  const precio = Number(_state.currentRifa.precio);

  Object.values(_state.numeros).forEach(num => {
    vendidos++;
    if (num.pago === "efectivo") efectivo += precio;
    else if (num.pago === "transferencia") transferencia += precio;
  });

  document.getElementById("stat-vendidos").textContent = vendidos;
  document.getElementById("stat-efectivo").textContent = `$${efectivo.toLocaleString("es-AR")}`;
  document.getElementById("stat-transfer").textContent = `$${transferencia.toLocaleString("es-AR")}`;
}

function renderGrid() {
  const grid = document.getElementById("numbers-grid");
  grid.innerHTML = "";
  
  const total = Number(_state.currentRifa.cantidadNumeros);
  const padLength = Math.max(3, total.toString().length); // Asegura consistencia visual

  for (let i = 1; i <= total; i++) {
    const key = String(i).padStart(padLength, "0");
    const data = _state.numeros[key];
    const sold = !!data;
    
    const cell = document.createElement("button");
    cell.className = "number-cell" + (sold ? " sold" : "");
    cell.textContent = key;
    cell.onclick = () => openModalVenta(key);
    grid.appendChild(cell);
  }
}

// ---- FORMULARIO DE RIFA (Crear/Editar) ----
export function abrirModalCrearRifa() {
  document.getElementById("modal-rifa-titulo").textContent = "Nueva Rifa";
  document.getElementById("rifa-titulo").value = "";
  document.getElementById("rifa-cantidad").value = "";
  document.getElementById("rifa-precio").value = "";
  document.getElementById("rifa-password").value = "";
  document.getElementById("rifa-fecha").value = "";
  document.getElementById("rifa-tombola").value = "";
  document.getElementById("rifa-banco-id").value = "";
  document.getElementById("rifa-banco-nombre").value = "";
  document.getElementById("rifa-banco-titular").value = "";
  document.getElementById("rifa-telefono").value = "";
  
  document.getElementById("premios-container").innerHTML = "";
  agregarCampoPremio(); // Agrega al menos uno vacío

  document.getElementById("btn-eliminar-rifa").style.display = "none";
  _state.seleccionNumero = null; // Usamos esto temporalmente para indicar si es edicion (null = nuevo)

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-rifa").classList.add("active");
}

export function abrirModalEditarRifa() {
  const r = _state.currentRifa;
  document.getElementById("modal-rifa-titulo").textContent = "Editar Rifa";
  document.getElementById("rifa-titulo").value = r.titulo;
  document.getElementById("rifa-cantidad").value = r.cantidadNumeros;
  document.getElementById("rifa-precio").value = r.precio;
  document.getElementById("rifa-password").value = r.password;
  document.getElementById("rifa-fecha").value = r.fechaSorteo || "";
  document.getElementById("rifa-tombola").value = r.tombola || "";
  document.getElementById("rifa-banco-id").value = r.bancoId || "";
  document.getElementById("rifa-banco-nombre").value = r.bancoNombre || "";
  document.getElementById("rifa-banco-titular").value = r.bancoTitular || "";
  document.getElementById("rifa-telefono").value = r.telefono || "";

  const container = document.getElementById("premios-container");
  container.innerHTML = "";
  if (r.premios && r.premios.length > 0) {
    r.premios.forEach(p => agregarCampoPremio(p));
  } else {
    agregarCampoPremio();
  }

  document.getElementById("btn-eliminar-rifa").style.display = "block";
  _state.seleccionNumero = r.id; // Guardamos el ID para saber que editamos

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-rifa").classList.add("active");
}

export function agregarCampoPremio(valor = "") {
  const container = document.getElementById("premios-container");
  const div = document.createElement("div");
  div.style = "display:flex; gap:10px; margin-bottom:10px;";
  div.innerHTML = `
    <input type="text" class="form-input input-premio" placeholder="Ej: 1° Premio: Viaje a Salta" value="${valor}" />
    <button class="btn btn-danger" style="padding: 0 15px;" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(div);
}

export async function guardarRifa() {
  const titulo = document.getElementById("rifa-titulo").value.trim();
  const cantidadNumeros = parseInt(document.getElementById("rifa-cantidad").value);
  const precio = parseFloat(document.getElementById("rifa-precio").value);
  const password = document.getElementById("rifa-password").value.trim();

  if(!titulo || isNaN(cantidadNumeros) || isNaN(precio) || !password) {
    showToast("⚠️ Completa todos los campos obligatorios (*)");
    return;
  }

  // Recolectar premios
  const inputsPremios = document.querySelectorAll(".input-premio");
  const premios = [];
  inputsPremios.forEach(inp => {
    if(inp.value.trim() !== "") premios.push(inp.value.trim());
  });

  const payload = {
    titulo, cantidadNumeros, precio, password, premios,
    fechaSorteo: document.getElementById("rifa-fecha").value.trim(),
    tombola: document.getElementById("rifa-tombola").value.trim(),
    bancoId: document.getElementById("rifa-banco-id").value.trim(),
    bancoNombre: document.getElementById("rifa-banco-nombre").value.trim(),
    bancoTitular: document.getElementById("rifa-banco-titular").value.trim(),
    telefono: document.getElementById("rifa-telefono").value.trim()
  };

  const btn = document.getElementById("btn-guardar-rifa");
  btn.textContent = "Guardando..."; btn.disabled = true;

  try {
    const id = _state.seleccionNumero; // null si es nuevo, string si es edicion
    await DB.guardarRifa(id, payload);
    showToast("✅ Rifa guardada con éxito");
    closeModal();
  } catch(e) {
    showToast("❌ Error al guardar rifa");
  } finally {
    btn.textContent = "Guardar Rifa"; btn.disabled = false;
  }
}

export async function eliminarRifaDefinitiva() {
  if(!confirm("¿Estás 100% seguro de borrar TODA esta rifa? Se perderán las ventas.")) return;
  try {
    await DB.eliminarRifa(_state.seleccionNumero);
    showToast("🗑 Rifa eliminada");
    closeModal();
  } catch(e) {
    showToast("❌ Error al eliminar");
  }
}

// ---- GESTIÓN DE VENTAS ----
function openModalVenta(key) {
  const data = _state.numeros[key];
  const isSold = !!data;
  document.getElementById("modal-title").textContent = isSold ? "Editar venta" : "Registrar venta";
  document.getElementById("modal-number-badge").textContent = `#${key}`;
  document.getElementById("input-nombre").value = data?.nombre || "";
  document.getElementById("input-telefono").value = data?.telefono || "";
  document.getElementById("btn-eliminar").style.display = isSold ? "block" : "none";
  document.getElementById("pago-efectivo").checked = data?.pago === "efectivo" || !isSold;
  document.getElementById("pago-transfer").checked = data?.pago === "transferencia";

  _state.seleccionNumero = key;
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-form").classList.add("active");
}

export async function guardarNumero() {
  const key = _state.seleccionNumero;
  const nombre = document.getElementById("input-nombre").value.trim();
  const pago = document.querySelector('input[name="pago"]:checked')?.value;
  const tel = document.getElementById("input-telefono").value.trim();
  
  if (!nombre) { showToast("⚠️ Ingresa el nombre del comprador"); return; }
  
  document.getElementById("btn-guardar").disabled = true;
  try {
    await DB.guardarNumero(_state.currentRifa.id, key, { nombre, pago, telefono: tel || null });
    showToast(`✅ #${key} guardado`); 
    closeModal();
  } catch (err) { showToast("❌ Error al guardar"); } 
  finally { document.getElementById("btn-guardar").disabled = false; }
}

export async function eliminarNumero() {
  const key = _state.seleccionNumero;
  if (!confirm(`¿Liberar el número ${key}?`)) return;
  try { 
    await DB.eliminarNumero(_state.currentRifa.id, key); 
    showToast(`🗑 #${key} liberado`); 
    closeModal(); 
  } catch (err) { showToast("❌ Error al eliminar"); }
}

export function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.remove("active"));
  document.getElementById("modal-overlay").classList.remove("active");
}

// ---- DESCARGAR IMAGEN ----
export async function descargarImagen() {
  const r = _state.currentRifa;
  if (!r) return;

  // Poblar flyer dinámico
  document.getElementById("export-titulo").textContent = r.titulo;
  document.getElementById("export-precio").textContent = `Valor: $${r.precio}`;
  document.getElementById("export-banco-id").innerHTML = `<strong>Alias/CBU:</strong> ${r.bancoId || '-'}`;
  document.getElementById("export-banco-nombre").innerHTML = `<strong>Banco:</strong> ${r.bancoNombre || '-'}`;
  document.getElementById("export-banco-titular").innerHTML = `<strong>Titular:</strong> ${r.bancoTitular || '-'}`;
  document.getElementById("export-telefono").textContent = r.telefono || '-';
  document.getElementById("export-fecha").innerHTML = `📅 Sortea el ${r.fechaSorteo || '-'}`;
  document.getElementById("export-tombola").innerHTML = `por ${r.tombola || '-'}`;

  const listaPremios = document.getElementById("export-premios-list");
  listaPremios.innerHTML = "";
  if(r.premios && r.premios.length > 0) {
    r.premios.forEach(p => {
      listaPremios.innerHTML += `<li style="margin-bottom: 10px; display:flex; align-items:center; gap:10px;"><span style="font-size:30px;">🎁</span> <span>${p}</span></li>`;
    });
  }

  // Armar grilla
  const exportGrid = document.getElementById("export-grid");
  exportGrid.innerHTML = "";
  const total = Number(r.cantidadNumeros);
  const padLength = Math.max(3, total.toString().length);
  
  // Limite visual por seguridad del export PDF/PNG (para no congelar celulares si ponen 10,000 números)
  const renderMax = Math.min(total, 1000); 

  for (let i = 1; i <= renderMax; i++) {
    const key = String(i).padStart(padLength, "0");
    const isSold = !!_state.numeros[key];

    const cell = document.createElement("div");
    cell.textContent = key;
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    // Ajustar tamaño del cuadro de la imagen según cantidad de números
    const size = total > 300 ? "30px" : "50px"; 
    const font = total > 300 ? "14px" : "22px";
    
    cell.style.width = size;
    cell.style.height = size;
    cell.style.fontSize = font;
    cell.style.fontWeight = "900";
    cell.style.border = "2px solid #ccc";
    cell.style.borderRadius = "8px";

    if (isSold) {
      cell.style.backgroundColor = "#ffebee";
      cell.style.borderColor = "#d32f2f";
      cell.style.color = "#d32f2f";
      cell.style.textDecoration = "line-through";
    } else {
      cell.style.backgroundColor = "#ffffff";
      cell.style.color = "#222222";
    }
    exportGrid.appendChild(cell);
  }

  const container = document.getElementById("export-container");
  container.style.display = "block";
  container.style.left = "0";
  container.style.zIndex = "-1";

  const btn = document.getElementById("btn-descargar");
  btn.textContent = "Generando..."; btn.disabled = true;

  try {
    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true });
    const link = document.createElement("a");
    link.download = `Rifa_${r.titulo.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("✅ Imagen generada con éxito");
  } catch (error) {
    showToast("❌ Error al generar imagen");
  } finally {
    container.style.left = "-9999px";
    btn.textContent = "📸 Descargar Imagen"; btn.disabled = false;
  }
}

function showToast(msg) {
  let toast = document.getElementById("toast");
  toast.textContent = msg; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

window.UI = { 
  closeModal, guardarNumero, eliminarNumero, descargarImagen,
  abrirModalCrearRifa, agregarCampoPremio, guardarRifa, abrirModalEditarRifa, eliminarRifaDefinitiva,
  verificarPassword, volverAlInicio 
};