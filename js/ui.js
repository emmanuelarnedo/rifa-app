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

// ---- TOGGLE DATOS BANCARIOS ----
export function toggleBankFieldsNuevo() {
  const tipo = document.querySelector('input[name="banco_tipo_nuevo"]:checked').value;
  document.getElementById("custom-bank-fields-nuevo").style.display = (tipo === "otros") ? "block" : "none";
  // Ocultar campo de teléfono si se elige omitir bancarios
  document.getElementById("group-telefono-nuevo").style.display = (tipo === "omitir") ? "none" : "block";
}

export function toggleBankFieldsEdit() {
  const tipo = document.querySelector('input[name="banco_tipo_edit"]:checked').value;
  document.getElementById("custom-bank-fields-edit").style.display = (tipo === "otros") ? "block" : "none";
  // Ocultar campo de teléfono si se elige omitir bancarios
  document.getElementById("group-telefono-edit").style.display = (tipo === "omitir") ? "none" : "block";
}

// ---- LOGICA DE TALONARIOS (AUTO Y EDICION) ----
export function openTalonarioModal() {
  document.getElementById("input-encargado").value = "";
  document.getElementById("input-telefono-encargado").value = "";
  
  document.querySelector('input[name="banco_tipo_nuevo"][value="celeste"]').checked = true;
  document.querySelector('input[name="banco_id_tipo_nuevo"][value="alias"]').checked = true;
  document.getElementById("input-banco-id-nuevo").value = "";
  document.getElementById("input-banco-nombre-nuevo").value = "";
  document.getElementById("input-banco-titular-nuevo").value = "";
  toggleBankFieldsNuevo();

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-talonario").classList.add("active");
}

export async function guardarTalonario() {
  const encargado = document.getElementById("input-encargado").value.trim();
  if (!encargado) { showToast("⚠️ Ingresa el nombre del encargado"); return; }

  const bancoTipo = document.querySelector('input[name="banco_tipo_nuevo"]:checked').value;
  const telefonoEncargado = document.getElementById("input-telefono-encargado").value.trim();
  
  if (bancoTipo !== "omitir" && !telefonoEncargado) { 
    showToast("⚠️ Ingresa tu número de WhatsApp"); 
    return; 
  }

  let banco = { tipo: bancoTipo };
  if (bancoTipo === "otros") {
    banco.idTipo = document.querySelector('input[name="banco_id_tipo_nuevo"]:checked').value;
    banco.idValor = document.getElementById("input-banco-id-nuevo").value.trim();
    banco.nombre = document.getElementById("input-banco-nombre-nuevo").value.trim();
    banco.titular = document.getElementById("input-banco-titular-nuevo").value.trim();
    
    if(!banco.idValor || !banco.nombre || !banco.titular) {
      showToast("⚠️ Completa todos los datos bancarios");
      return;
    }
  }

  let nextInicio = 1;
  while (true) {
    const testFin = nextInicio + 99;
    const solapa = _state.talonarios.some(t => !(testFin < t.inicio || nextInicio > t.fin));
    if (!solapa) break;
    nextInicio += 100;
  }
  const fin = nextInicio + 99;

  try {
    await DB.guardarTalonario({ encargado, telefonoEncargado, inicio: nextInicio, fin, banco });
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

  document.getElementById("input-edit-encargado").value = activo.encargado;
  document.getElementById("input-edit-telefono-encargado").value = activo.telefonoEncargado || "";
  document.getElementById("input-edit-inicio").value = activo.inicio;
  document.getElementById("input-edit-fin").value = activo.fin;

  const banco = activo.banco || { tipo: "celeste" };
  document.querySelector(`input[name="banco_tipo_edit"][value="${banco.tipo}"]`).checked = true;
  if (banco.tipo === "otros") {
    document.querySelector(`input[name="banco_id_tipo_edit"][value="${banco.idTipo || 'alias'}"]`).checked = true;
    document.getElementById("input-banco-id-edit").value = banco.idValor || "";
    document.getElementById("input-banco-nombre-edit").value = banco.nombre || "";
    document.getElementById("input-banco-titular-edit").value = banco.titular || "";
  }
  toggleBankFieldsEdit();

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

  const encargado = document.getElementById("input-edit-encargado").value.trim();
  if (!encargado) { showToast("⚠️ Ingresa el nombre del encargado"); return; }

  const bancoTipo = document.querySelector('input[name="banco_tipo_edit"]:checked').value;
  const telefonoEncargado = document.getElementById("input-edit-telefono-encargado").value.trim();
  
  if (bancoTipo !== "omitir" && !telefonoEncargado) { 
    showToast("⚠️ Ingresa tu número de WhatsApp"); 
    return; 
  }

  const inicio = Number(document.getElementById("input-edit-inicio").value);
  if (isNaN(inicio) || inicio < 1) { showToast("⚠️ Número de inicio inválido"); return; }
  
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

  let banco = { tipo: bancoTipo };
  if (bancoTipo === "otros") {
    banco.idTipo = document.querySelector('input[name="banco_id_tipo_edit"]:checked').value;
    banco.idValor = document.getElementById("input-banco-id-edit").value.trim();
    banco.nombre = document.getElementById("input-banco-nombre-edit").value.trim();
    banco.titular = document.getElementById("input-banco-titular-edit").value.trim();
    
    if(!banco.idValor || !banco.nombre || !banco.titular) {
      showToast("⚠️ Completa todos los datos bancarios");
      return;
    }
  }

  const btn = document.getElementById("btn-guardar-edicion");
  btn.disabled = true; btn.textContent = "Guardando...";

  try {
    await DB.actualizarTalonario(activo.id, { encargado, telefonoEncargado, inicio, fin, banco });
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

  const exportBancoContainer = document.getElementById("export-banco-container");
  const exportComprobanteContainer = document.getElementById("export-comprobante-container");
  
  const exportId = document.getElementById("export-banco-id");
  const exportCbu = document.getElementById("export-banco-cbu");
  const exportNombre = document.getElementById("export-banco-nombre");
  const exportTitular = document.getElementById("export-banco-titular");
  const exportTelefono = document.getElementById("export-telefono");

  exportTelefono.textContent = activo.telefonoEncargado || "";

  const banco = activo.banco || { tipo: "celeste" };
  
  // Ocultar todo si seleccionó omitir
  if (banco.tipo === "omitir") {
    exportBancoContainer.style.display = "none";
    exportComprobanteContainer.style.display = "none";
  } else {
    exportBancoContainer.style.display = "block";
    exportComprobanteContainer.style.display = "block";

    if (banco.tipo === "celeste") {
      exportId.innerHTML = "<strong>Alias:</strong> CELESTEMAZA.UALA";
      exportId.style.display = "block";
      exportCbu.innerHTML = "<strong>CBU/CVU:</strong> 34802000003065968";
      exportCbu.style.display = "block";
      exportNombre.innerHTML = "<strong>Banco:</strong> Ualá Bank S.A.U";
      exportTitular.innerHTML = "<strong>Titular:</strong> Celeste Abigail Maza";
    } else if (banco.tipo === "otros") {
      if (banco.idTipo === "alias") {
        exportId.innerHTML = `<strong>Alias:</strong> ${banco.idValor}`;
        exportId.style.display = "block";
        exportCbu.style.display = "none";
      } else {
        exportCbu.innerHTML = `<strong>CBU/CVU:</strong> ${banco.idValor}`;
        exportCbu.style.display = "block";
        exportId.style.display = "none";
      }
      exportNombre.innerHTML = `<strong>Banco:</strong> ${banco.nombre}`;
      exportTitular.innerHTML = `<strong>Titular:</strong> ${banco.titular}`;
    }
  }

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

window.UI = { 
  closeModal, guardarNumero, eliminarNumero, openTalonarioModal, 
  guardarTalonario, editarRangoTalonario, actualizarRangoEditFin, 
  guardarEdicionRango, eliminarTalonario, descargarImagen,
  toggleBankFieldsNuevo, toggleBankFieldsEdit 
};