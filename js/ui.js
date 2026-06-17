import * as DB from "./db.js";

const PRECIO_FIJO = 3000;

let _state = {
  numeros: {},
  talonarios: [],
  talonarioActivoId: null,
  seleccion: null,
};

export function init() { renderGrid(); }

export function updateNumeros(data) {
  _state.numeros = data;
  renderStats();
  renderGrid();
}

export function updateTalonarios(data) {
  _state.talonarios = data;
  if (!_state.talonarioActivoId && data.length > 0) {
    _state.talonarioActivoId = data[0].id;
  } else if (data.length === 0) {
    _state.talonarioActivoId = null;
  }
  renderTabs();
  renderStats();
  renderGrid();
}

// ---- STATS POR TALONARIO ----
function renderStats() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  let vendidos = 0, efectivo = 0, transferencia = 0;

  if (activo) {
    for (let i = activo.inicio; i <= activo.fin; i++) {
      const key = String(i).padStart(3, "0");
      const num = _state.numeros[key];
      if (num) {
        vendidos++;
        if (num.pago === "efectivo") efectivo += PRECIO_FIJO;
        else if (num.pago === "transferencia") transferencia += PRECIO_FIJO;
      }
    }
  }

  document.getElementById("stat-vendidos").textContent = vendidos;
  document.getElementById("stat-efectivo").textContent = `$${efectivo.toLocaleString("es-AR")}`;
  document.getElementById("stat-transfer").textContent = `$${transferencia.toLocaleString("es-AR")}`;
}

// ---- TABS ----
function renderTabs() {
  const container = document.getElementById("talonarios-list");
  container.innerHTML = "";
  _state.talonarios.forEach(tal => {
    const btn = document.createElement("button");
    btn.className = "tab-talonario" + (tal.id === _state.talonarioActivoId ? " active" : "");
    btn.textContent = tal.encargado;
    btn.onclick = () => {
      _state.talonarioActivoId = tal.id;
      renderTabs(); renderStats(); renderGrid();
    };
    container.appendChild(btn);
  });
}

// ---- GRID ----
function renderGrid() {
  const grid = document.getElementById("numbers-grid");
  const titulo = document.getElementById("talonario-activo-titulo");
  const btnEditar = document.getElementById("btn-editar-rango");
  
  if (_state.talonarios.length === 0) {
    grid.innerHTML = "<p style='grid-column: span 10; text-align: center; padding: 20px;'>No hay talonarios creados. Agrega uno para comenzar.</p>";
    titulo.textContent = "Sin talonarios";
    btnEditar.style.display = "none";
    return;
  }

  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!activo) return;

  titulo.textContent = `Talonario de ${activo.encargado} (${String(activo.inicio).padStart(3,'0')} al ${String(activo.fin).padStart(3,'0')})`;
  btnEditar.style.display = "inline-block"; 
  grid.innerHTML = "";

  for (let i = activo.inicio; i <= activo.fin; i++) {
    const key = String(i).padStart(3, "0");
    const data = _state.numeros[key];
    const sold = !!data;
    
    const cell = document.createElement("button");
    cell.className = "number-cell" + (sold ? " sold" : "");
    cell.textContent = key;
    cell.onclick = () => openModal(key);
    grid.appendChild(cell);
  }
}

// ---- LOGICA DE TALONARIOS (AUTO Y EDICION) ----
export function openTalonarioModal() {
  document.getElementById("input-encargado").value = "";
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-talonario").classList.add("active");
}

export async function guardarTalonario() {
  const encargado = document.getElementById("input-encargado").value.trim();
  if (!encargado) { showToast("⚠️ Ingresa el encargado"); return; }

  // Asignación automática inteligente
  let nextInicio = 1;
  while (true) {
    const testFin = nextInicio + 99;
    const solapa = _state.talonarios.some(t => !(testFin < t.inicio || nextInicio > t.fin));
    if (!solapa) break;
    nextInicio += 100;
  }
  const fin = nextInicio + 99;

  try {
    await DB.guardarTalonario({ encargado, inicio: nextInicio, fin });
    showToast(`✅ Talonario creado (${nextInicio} al ${fin})`);
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("❌ Error al crear talonario");
  }
}

export function editarRangoTalonario() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if(!activo) return;

  // Cargar datos actuales
  document.getElementById("input-edit-encargado").value = activo.encargado;
  document.getElementById("input-edit-inicio").value = activo.inicio;
  document.getElementById("input-edit-fin").value = activo.fin;

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-editar").classList.add("active");
}

export function actualizarRangoEditFin() {
  const inicio = Number(document.getElementById("input-edit-inicio").value);
  if (!isNaN(inicio) && inicio > 0) {
    document.getElementById("input-edit-fin").value = inicio + 99;
  } else {
    document.getElementById("input-edit-fin").value = "";
  }
}

export async function guardarEdicionRango() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if(!activo) return;

  // Validación de nombre
  const encargado = document.getElementById("input-edit-encargado").value.trim();
  if (!encargado) { showToast("⚠️ Ingresa el nombre del encargado"); return; }

  const inicio = Number(document.getElementById("input-edit-inicio").value);
  if (isNaN(inicio) || inicio < 1) { showToast("⚠️ Número de inicio inválido"); return; }
  
  // VALIDACIÓN: Asegurar que el número termine en 1
  if (inicio % 10 !== 1) {
    showToast("⚠️ El número de inicio debe terminar en 1 (ej: 1, 101, 301)");
    return;
  }
  
  const fin = inicio + 99;

  const solapa = _state.talonarios.some(t => {
    if (t.id === activo.id) return false; 
    return !(fin < t.inicio || inicio > t.fin);
  });

  if (solapa) {
    showToast("❌ Rango ocupado. Este rango choca con otro talonario.");
    return;
  }

  const btn = document.getElementById("btn-guardar-edicion");
  btn.disabled = true; btn.textContent = "Guardando...";

  try {
    // Actualizamos tanto el nombre como el rango
    await DB.actualizarTalonario(activo.id, { encargado, inicio, fin });
    showToast(`✅ Talonario actualizado`);
    closeModal();
  } catch(err) {
    showToast("❌ Error al actualizar");
  } finally {
    btn.disabled = false; btn.textContent = "Guardar Cambios";
  }
}

export async function eliminarTalonario() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if(!activo) return;

  if (!confirm(`¿Estás seguro de eliminar el talonario de ${activo.encargado}?`)) return;

  try {
    await DB.eliminarTalonario(activo.id);
    _state.talonarioActivoId = null;
    showToast(`🗑 Talonario eliminado`);
    closeModal();
  } catch(err) {
    showToast("❌ Error al eliminar talonario");
  }
}

// ---- MODAL NÚMERO ----
function openModal(key) {
  const data = _state.numeros[key];
  const isSold = !!data;
  document.getElementById("modal-title").textContent = isSold ? "Editar venta" : "Registrar venta";
  document.getElementById("modal-number-badge").textContent = `#${key}`;
  document.getElementById("input-nombre").value = data?.nombre || "";
  document.getElementById("input-telefono").value = data?.telefono || "";
  document.getElementById("btn-eliminar").style.display = isSold ? "block" : "none";
  document.getElementById("pago-efectivo").checked = data?.pago === "efectivo" || !isSold;
  document.getElementById("pago-transfer").checked = data?.pago === "transferencia";

  _state.seleccion = key;
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-form").classList.add("active");
}

export function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  document.getElementById("modal-form").classList.remove("active");
  document.getElementById("modal-talonario").classList.remove("active");
  document.getElementById("modal-editar").classList.remove("active");
  _state.seleccion = null;
}

export async function guardarNumero() {
  const key = _state.seleccion;
  const nombre = document.getElementById("input-nombre").value.trim();
  const pago = document.querySelector('input[name="pago"]:checked')?.value;
  const tel = document.getElementById("input-telefono").value.trim();
  if (!nombre) { showToast("⚠️ Ingresa el nombre del comprador"); return; }
  
  const btn = document.getElementById("btn-guardar");
  btn.disabled = true; btn.textContent = "Guardando...";
  try {
    await DB.guardarNumero(key, { nombre, pago, telefono: tel || null });
    showToast(`✅ #${key} guardado`); closeModal();
  } catch (err) { showToast("❌ Error al guardar"); } 
  finally { btn.disabled = false; btn.textContent = "✓ Guardar"; }
}

export async function eliminarNumero() {
  const key = _state.seleccion;
  if (!confirm(`¿Liberar el número ${key}?`)) return;
  try { await DB.eliminarNumero(key); showToast(`🗑 #${key} liberado`); closeModal(); } 
  catch (err) { showToast("❌ Error al eliminar"); }
}

// ---- DESCARGAR IMAGEN (HTML2CANVAS) ----
export async function descargarImagen() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!activo) { showToast("⚠️ No hay talonario activo"); return; }

  const exportGrid = document.getElementById("export-grid");
  exportGrid.innerHTML = "";

  for (let i = activo.inicio; i <= activo.fin; i++) {
    const key = String(i).padStart(3, "0");
    const isSold = !!_state.numeros[key];

    const cell = document.createElement("div");
    cell.textContent = key;
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.aspectRatio = "1";
    cell.style.fontSize = "26px";
    cell.style.fontWeight = "900";
    cell.style.border = "3px solid #ccc";
    cell.style.borderRadius = "10px";

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
  btn.textContent = "Generando...";
  btn.disabled = true;

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    
    const link = document.createElement("a");
    link.download = `Rifa_Maza_${activo.inicio}-${activo.fin}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("✅ Imagen generada con éxito");
  } catch (error) {
    console.error(error);
    showToast("❌ Error al generar imagen");
  } finally {
    container.style.left = "-9999px";
    btn.textContent = "📸 Descargar Imagen";
    btn.disabled = false;
  }
}

function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div"); toast.id = "toast";
    toast.className = "toast"; document.body.appendChild(toast);
  }
  toast.textContent = msg; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

window.UI = { closeModal, guardarNumero, eliminarNumero, openTalonarioModal, guardarTalonario, editarRangoTalonario, actualizarRangoEditFin, guardarEdicionRango, eliminarTalonario, descargarImagen };