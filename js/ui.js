import * as DB from "./db.js";

const PALETAS = {
  rosa: { bg: '#FFF0F5', primary: '#D81B60', secondary: '#C2185B', text: '#880E4F', gridBg: '#FCE4EC' },
  naranja: { bg: '#FFF3E0', primary: '#F5A623', secondary: '#D84315', text: '#4E342E', gridBg: '#f0f4f8' },
  azul: { bg: '#F0F4F8', primary: '#1E3A8A', secondary: '#2563EB', text: '#1E40AF', gridBg: '#DBEAFE' },
  verde: { bg: '#ECFDF5', primary: '#047857', secondary: '#059669', text: '#064E3B', gridBg: '#D1FAE5' }
};

let _state = {
  rifas: [],
  currentRifa: null,
  talonarios: [],
  talonarioActivoId: null,
  numeros: {},
  seleccionNumero: null,
  rifaTargetParaLogin: null,
  previewDataUrl: null,
  editandoTalonario: false
};

export function init() {
  const savedTheme = localStorage.getItem("rifa_theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  document.getElementById("view-home").style.display = "block";
  document.getElementById("view-rifa").style.display = "none";
}

export function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("rifa_theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}

export function updateRifasList(data) {
  _state.rifas = data;
  if (_state.currentRifa) {
    const updated = data.find(r => r.id === _state.currentRifa.id);
    if (updated) {
      _state.currentRifa = updated;
      renderHeaderRifa();
      renderGrid();
    } else {
      volverAlInicio();
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
        <h4 style="margin: 0; color: var(--color-text); font-size: 16px;">${rifa.tituloPrincipal} - ${rifa.motivo}</h4>
        <span style="font-size: 12px; color: var(--color-text-muted);">Total: ${rifa.cantidadNumeros} números | Sortea: ${rifa.fechaSorteo || 'A definir'}</span>
      </div>
      <button class="btn btn-primary" style="padding: 8px 12px;">Ingresar</button>
    `;
    card.onclick = () => solicitarPassword(rifa.id);
    list.appendChild(card);
  });
}

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
    DB.suscribirTalonarios(rifa.id, updateTalonarios);
  } else {
    showToast("❌ Contraseña incorrecta");
  }
}

export function volverAlInicio() {
  _state.currentRifa = null;
  _state.talonarioActivoId = null;
  DB.desuscribirRifaInterna();
  document.getElementById("view-home").style.display = "block";
  document.getElementById("view-rifa").style.display = "none";
}

export function updateNumeros(data) {
  _state.numeros = data;
  renderStats();
  renderGrid();
}

export function updateTalonarios(data) {
  _state.talonarios = data;
  const activoExiste = data.some(t => t.id === _state.talonarioActivoId);
  if (!activoExiste) {
    if (data.length > 0) _state.talonarioActivoId = data[0].id;
    else _state.talonarioActivoId = null;
  }
  renderTabs();
  renderGrid();
}

function renderHeaderRifa() {
  const r = _state.currentRifa;
  document.getElementById("rifa-title-display").textContent = `${r.tituloPrincipal}: ${r.motivo}`;
}

function renderStats() {
  if(!_state.currentRifa) return;
  let vendidos = 0, efectivo = 0;
  const precio = Number(_state.currentRifa.precio);
  Object.values(_state.numeros).forEach(num => {
    vendidos++;
    if (num.pago === "efectivo") efectivo += precio;
  });
  document.getElementById("stat-vendidos").textContent = vendidos;
  document.getElementById("stat-efectivo").textContent = `$${efectivo.toLocaleString("es-AR")}`;
}

function renderTabs() {
  const container = document.getElementById("talonarios-list");
  container.innerHTML = "";
  _state.talonarios.forEach(tal => {
    const btn = document.createElement("button");
    btn.className = "tab-talonario" + (tal.id === _state.talonarioActivoId ? " active" : "");
    btn.textContent = tal.encargado;
    btn.onclick = () => {
      _state.talonarioActivoId = tal.id;
      renderTabs(); renderGrid();
    };
    container.appendChild(btn);
  });
}

function renderGrid() {
  const grid = document.getElementById("numbers-grid");
  const titulo = document.getElementById("talonario-activo-titulo");
  const btnEditar = document.getElementById("btn-editar-talonario");
  const btnPreview = document.getElementById("btn-previsualizar");
  
  if (_state.talonarios.length === 0) {
    grid.innerHTML = "<p style='grid-column: span 10; text-align: center; padding: 20px;'>No hay talonarios reclamados. Crea uno nuevo.</p>";
    titulo.textContent = "Sin talonarios";
    btnEditar.style.display = "none";
    btnPreview.style.display = "none";
    return;
  }

  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!activo) return;

  const padLength = Math.max(3, _state.currentRifa.cantidadNumeros.toString().length);
  titulo.textContent = `Vendedor: ${activo.encargado} (${String(activo.inicio).padStart(padLength,'0')} al ${String(activo.fin).padStart(padLength,'0')})`;
  btnEditar.style.display = "inline-block"; 
  btnPreview.style.display = "inline-block"; 
  
  grid.innerHTML = "";
  for (let i = activo.inicio; i <= activo.fin; i++) {
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

// ---- RIFA GLOBAL (CREAR/EDITAR Y MINI PREVIEW) ----
export function actualizarMiniPreview() {
  const tPrincipal = document.getElementById("rifa-titulo-principal").value || "GRAN RIFA";
  const motivo = document.getElementById("rifa-motivo").value || "MOTIVO DE LA RIFA";
  const paletaSeleccionada = document.querySelector('input[name="rifa_paleta"]:checked').value;
  const c = PALETAS[paletaSeleccionada];

  const cont = document.getElementById("mini-preview-container");
  cont.style.background = c.bg;
  document.getElementById("mini-titulo").textContent = tPrincipal;
  document.getElementById("mini-titulo").style.color = c.primary;
  document.getElementById("mini-motivo").textContent = motivo;
  document.getElementById("mini-motivo").style.color = c.text;
  
  const gridCells = document.getElementById("mini-grid").children;
  gridCells[0].style.background = c.gridBg;
  gridCells[0].style.borderColor = c.secondary;
  gridCells[1].style.background = c.primary;
  gridCells[1].style.borderColor = c.secondary;
  gridCells[2].style.background = c.gridBg;
  gridCells[2].style.borderColor = c.secondary;
}

export function abrirModalCrearRifa() {
  document.getElementById("modal-rifa-titulo").textContent = "Nueva Rifa";
  document.getElementById("rifa-titulo-principal").value = "";
  document.getElementById("rifa-motivo").value = "";
  document.getElementById("rifa-cantidad").value = "";
  document.getElementById("rifa-talonarios").value = "";
  document.getElementById("rifa-precio").value = "";
  document.getElementById("rifa-password").value = "";
  document.getElementById("rifa-fecha").value = "";
  document.getElementById("rifa-tombola").value = "";
  document.getElementById("rifa-banco-id").value = "";
  document.getElementById("rifa-banco-nombre").value = "";
  document.getElementById("rifa-banco-titular").value = "";
  document.getElementById("rifa-telefono").value = "";
  
  document.querySelector('input[name="rifa_paleta"][value="rosa"]').checked = true;
  actualizarMiniPreview();

  document.getElementById("premios-container").innerHTML = "";
  agregarCampoPremio();

  document.getElementById("btn-eliminar-rifa").style.display = "none";
  _state.seleccionNumero = null;
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-rifa").classList.add("active");
}

export function abrirModalEditarRifa() {
  const r = _state.currentRifa;
  document.getElementById("modal-rifa-titulo").textContent = "Ajustes de la Rifa";
  document.getElementById("rifa-titulo-principal").value = r.tituloPrincipal || "";
  document.getElementById("rifa-motivo").value = r.motivo || "";
  document.getElementById("rifa-cantidad").value = r.cantidadNumeros;
  document.getElementById("rifa-talonarios").value = r.cantidadTalonarios;
  document.getElementById("rifa-precio").value = r.precio;
  document.getElementById("rifa-password").value = r.password;
  document.getElementById("rifa-fecha").value = r.fechaSorteo || "";
  document.getElementById("rifa-tombola").value = r.tombola || "";
  document.getElementById("rifa-banco-id").value = r.bancoId || "";
  document.getElementById("rifa-banco-nombre").value = r.bancoNombre || "";
  document.getElementById("rifa-banco-titular").value = r.bancoTitular || "";
  document.getElementById("rifa-telefono").value = r.telefono || "";

  if(r.paleta && document.querySelector(`input[name="rifa_paleta"][value="${r.paleta}"]`)) {
    document.querySelector(`input[name="rifa_paleta"][value="${r.paleta}"]`).checked = true;
  }
  actualizarMiniPreview();

  const container = document.getElementById("premios-container");
  container.innerHTML = "";
  if (r.premios && r.premios.length > 0) r.premios.forEach(p => agregarCampoPremio(p));
  else agregarCampoPremio();

  document.getElementById("btn-eliminar-rifa").style.display = "block";
  _state.seleccionNumero = r.id;
  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-rifa").classList.add("active");
}

export function agregarCampoPremio(valor = "") {
  const container = document.getElementById("premios-container");
  const div = document.createElement("div");
  div.className = "premio-row";
  div.style = "display:flex; gap:10px; margin-bottom:10px; align-items: center;";
  div.innerHTML = `
    <span class="premio-label" style="min-width: 80px; font-weight: 700; color: var(--color-primary); font-size: 13px;"></span>
    <input type="text" class="form-input input-premio premio-input" placeholder="Ej: Viaje a Salta" value="${valor}" />
    <button class="btn btn-danger" style="padding: 0 15px;" onclick="UI.removerPremio(this)">X</button>
  `;
  container.appendChild(div);
  actualizarLabelsPremios();
}

export function removerPremio(btn) {
  btn.parentElement.remove();
  actualizarLabelsPremios();
}

export function actualizarLabelsPremios() {
  const rows = document.querySelectorAll(".premio-row");
  rows.forEach((row, index) => {
    const label = row.querySelector(".premio-label");
    if (label) label.textContent = `${index + 1}° Premio:`;
  });
}

export async function guardarRifa() {
  const tituloPrincipal = document.getElementById("rifa-titulo-principal").value.trim();
  const motivo = document.getElementById("rifa-motivo").value.trim();
  const paleta = document.querySelector('input[name="rifa_paleta"]:checked').value;
  const cantidadNumeros = parseInt(document.getElementById("rifa-cantidad").value);
  const cantidadTalonarios = parseInt(document.getElementById("rifa-talonarios").value);
  const precio = parseFloat(document.getElementById("rifa-precio").value);
  const password = document.getElementById("rifa-password").value.trim();

  if(!tituloPrincipal || !motivo || isNaN(cantidadNumeros) || isNaN(cantidadTalonarios) || isNaN(precio) || !password) {
    showToast("⚠️ Completa todos los campos obligatorios (*)"); return;
  }

  const inputsPremios = document.querySelectorAll(".input-premio");
  const premios = [];
  inputsPremios.forEach(inp => { if(inp.value.trim() !== "") premios.push(inp.value.trim()); });

  const payload = {
    tituloPrincipal, motivo, paleta, cantidadNumeros, cantidadTalonarios, precio, password, premios,
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
    await DB.guardarRifa(_state.seleccionNumero, payload);
    showToast("✅ Rifa guardada");
    closeModal();
  } catch(e) { showToast("❌ Error al guardar"); } 
  finally { btn.textContent = "Guardar Rifa"; btn.disabled = false; }
}

export async function eliminarRifaDefinitiva() {
  if(!confirm("¿Estás 100% seguro de borrar TODA esta rifa? Se perderán las ventas.")) return;
  try {
    await DB.eliminarRifa(_state.seleccionNumero);
    showToast("🗑 Rifa eliminada");
    closeModal();
    volverAlInicio();
  } catch(e) { showToast("❌ Error al eliminar"); }
}

// ---- TALONARIOS Y VENTAS ----
export function toggleBankFieldsTalonario() {
  const tipo = document.querySelector('input[name="talonario_banco_tipo"]:checked').value;
  document.getElementById("custom-bank-fields-talonario").style.display = (tipo === "otros") ? "block" : "none";
}

export function abrirModalTalonario() {
  _state.editandoTalonario = false;
  document.getElementById("modal-talonario-titulo").textContent = "Nuevo Talonario";
  document.getElementById("talonario-encargado").value = "";
  document.getElementById("talonario-telefono").value = "";
  document.querySelector('input[name="talonario_banco_tipo"][value="global"]').checked = true;
  document.querySelector('input[name="talonario_banco_id_tipo"][value="alias"]').checked = true;
  toggleBankFieldsTalonario();
  document.getElementById("container-seleccionar-rango").style.display = "block";
  document.getElementById("btn-eliminar-talonario").style.display = "none";
  document.getElementById("btn-guardar-talonario").textContent = "Crear Talonario";

  const r = _state.currentRifa;
  const total = parseInt(r.cantidadNumeros);
  const cantTal = parseInt(r.cantidadTalonarios);
  const size = Math.floor(total / cantTal);
  
  let html = '';
  let disponibles = 0;
  for (let i = 0; i < cantTal; i++) {
    let inicio = i * size + 1;
    let fin = (i === cantTal - 1) ? total : (i + 1) * size;
    let ocupado = _state.talonarios.some(t => t.inicio === inicio && t.fin === fin);
    if (!ocupado) {
      html += `
        <label style="border: 1px solid var(--color-border); padding: 8px 12px; border-radius: 6px; cursor: pointer; background: var(--color-surface-2); font-size: 13px;">
          <input type="radio" name="talonario_rango_nuevo" value="${inicio}-${fin}" style="margin-right: 5px;" ${disponibles === 0 ? 'checked' : ''}>
          ${inicio} al ${fin}
        </label>
      `;
      disponibles++;
    }
  }
  
  const container = document.getElementById("talonario-rangos-container");
  if (disponibles === 0) container.innerHTML = "<p style='color: var(--color-danger); font-size: 13px;'>No hay más bloques disponibles en esta rifa.</p>";
  else container.innerHTML = html;

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-talonario").classList.add("active");
}

export function abrirModalEditarTalonario() {
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!activo) return;
  
  _state.editandoTalonario = true;
  document.getElementById("modal-talonario-titulo").textContent = "Editar Vendedor";
  document.getElementById("talonario-encargado").value = activo.encargado;
  document.getElementById("talonario-telefono").value = activo.telefono || "";

  const banco = activo.banco || { tipo: "global" };
  document.querySelector(`input[name="talonario_banco_tipo"][value="${banco.tipo}"]`).checked = true;
  if (banco.tipo === "otros") {
    document.querySelector(`input[name="talonario_banco_id_tipo"][value="${banco.idTipo || 'alias'}"]`).checked = true;
    document.getElementById("talonario-banco-id").value = banco.idValor || "";
    document.getElementById("talonario-banco-nombre").value = banco.nombre || "";
    document.getElementById("talonario-banco-titular").value = banco.titular || "";
  }
  toggleBankFieldsTalonario();

  document.getElementById("container-seleccionar-rango").style.display = "none";
  document.getElementById("btn-eliminar-talonario").style.display = "block";
  document.getElementById("btn-guardar-talonario").textContent = "Guardar Cambios";

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-talonario").classList.add("active");
}

export async function guardarTalonario() {
  const encargado = document.getElementById("talonario-encargado").value.trim();
  if (!encargado) { showToast("⚠️ Ingresa el nombre del vendedor"); return; }

  let inicio, fin;
  if (!_state.editandoTalonario) {
    const radioRango = document.querySelector('input[name="talonario_rango_nuevo"]:checked');
    if (!radioRango) { showToast("⚠️ Selecciona un bloque disponible"); return; }
    const partes = radioRango.value.split("-");
    inicio = parseInt(partes[0]);
    fin = parseInt(partes[1]);
  } else {
    const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
    inicio = activo.inicio; fin = activo.fin;
  }

  const bancoTipo = document.querySelector('input[name="talonario_banco_tipo"]:checked').value;
  let banco = { tipo: bancoTipo };
  if (bancoTipo === "otros") {
    banco.idTipo = document.querySelector('input[name="talonario_banco_id_tipo"]:checked').value;
    banco.idValor = document.getElementById("talonario-banco-id").value.trim();
    banco.nombre = document.getElementById("talonario-banco-nombre").value.trim();
    banco.titular = document.getElementById("talonario-banco-titular").value.trim();
    if(!banco.idValor || !banco.nombre || !banco.titular) { showToast("⚠️ Completa los datos bancarios"); return; }
  }

  const payload = { encargado, inicio, fin, banco, telefono: document.getElementById("talonario-telefono").value.trim() };
  try {
    const talId = _state.editandoTalonario ? _state.talonarioActivoId : null;
    await DB.guardarTalonario(_state.currentRifa.id, talId, payload);
    showToast("✅ Talonario guardado"); closeModal();
  } catch (err) { showToast("❌ Error al guardar talonario"); }
}

export async function eliminarTalonario() {
  if (!confirm(`¿Eliminar a este vendedor de la lista? Sus números quedarán intactos.`)) return;
  try {
    await DB.eliminarTalonario(_state.currentRifa.id, _state.talonarioActivoId);
    _state.talonarioActivoId = null;
    showToast(`🗑 Talonario eliminado`); closeModal();
  } catch(err) { showToast("❌ Error al eliminar"); }
}

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
  if (!nombre) { showToast("⚠️ Ingresa el comprador"); return; }
  document.getElementById("btn-guardar").disabled = true;
  try {
    await DB.guardarNumero(_state.currentRifa.id, key, { nombre, pago, telefono: tel || null });
    showToast(`✅ #${key} guardado`); closeModal();
  } catch (err) { showToast("❌ Error al guardar"); } 
  finally { document.getElementById("btn-guardar").disabled = false; }
}

export async function eliminarNumero() {
  const key = _state.seleccionNumero;
  if (!confirm(`¿Liberar el número ${key}?`)) return;
  try { 
    await DB.eliminarNumero(_state.currentRifa.id, key); 
    showToast(`🗑 #${key} liberado`); closeModal(); 
  } catch (err) { showToast("❌ Error al eliminar"); }
}

export function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.remove("active"));
  document.getElementById("modal-overlay").classList.remove("active");
}

// ---- EXPORTACIÓN DEL FLYER ----
export async function previsualizarImagen() {
  const r = _state.currentRifa;
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!r || !activo) return;

  const c = PALETAS[r.paleta] || PALETAS['rosa'];
  const baseExport = document.getElementById("export-container");
  baseExport.style.background = `linear-gradient(135deg, ${c.gridBg} 0%, ${c.bg} 100%)`;
  
  document.getElementById("export-card-bg").style.borderColor = c.primary;
  document.getElementById("export-top-bar").style.background = `repeating-linear-gradient(45deg, ${c.primary}, ${c.primary} 20px, ${c.secondary} 20px, ${c.secondary} 40px)`;
  
  const spanTitulo = document.getElementById("export-titulo-principal");
  spanTitulo.textContent = r.tituloPrincipal || "GRAN RIFA";
  spanTitulo.style.background = c.primary;
  
  const h1Motivo = document.getElementById("export-motivo");
  h1Motivo.textContent = r.motivo || "-";
  h1Motivo.style.color = c.text;

  document.getElementById("export-grid").style.background = c.gridBg;

  const boxes = ["export-box-pago", "export-box-premios"];
  boxes.forEach(id => {
    document.getElementById(id).style.background = c.bg;
    document.getElementById(id).style.borderColor = c.primary;
    document.getElementById(id).style.color = c.text;
  });
  
  document.getElementById("export-precio").style.color = c.secondary;
  document.getElementById("export-precio").style.borderColor = c.primary;
  
  document.getElementById("export-comprobante-container").style.borderColor = c.primary;
  document.getElementById("export-telefono").style.color = c.secondary;

  document.getElementById("export-box-fecha").style.background = c.gridBg;
  document.getElementById("export-box-fecha").style.borderColor = c.secondary;
  document.getElementById("export-fecha").style.color = c.secondary;
  document.getElementById("export-tombola").style.color = c.text;

  const padLength = Math.max(3, r.cantidadNumeros.toString().length);
  const tituloInicio = String(activo.inicio).padStart(padLength,'0');
  const tituloFin = String(activo.fin).padStart(padLength,'0');

  document.getElementById("export-rango-talonario").textContent = `Números del ${tituloInicio} al ${tituloFin}`;
  document.getElementById("export-precio").textContent = `Valor: $${r.precio}`;
  document.getElementById("export-fecha").innerHTML = `📅 Sortea el ${r.fechaSorteo || '-'}`;
  document.getElementById("export-tombola").innerHTML = `por ${r.tombola || '-'}`;

  const banco = activo.banco || { tipo: "global" };
  const expBancoCont = document.getElementById("export-banco-container");
  const expCompCont = document.getElementById("export-comprobante-container");

  if (banco.tipo === "omitir") {
    expBancoCont.style.display = "none";
    expCompCont.style.display = "none";
  } else {
    expBancoCont.style.display = "block";
    expCompCont.style.display = "block";
    let fuente = (banco.tipo === "global") ? r : banco;
    document.getElementById("export-telefono").textContent = (banco.tipo === "global") ? (r.telefono || '-') : (activo.telefono || '-');
    document.getElementById("export-banco-id").innerHTML = `<strong>Alias/CBU:</strong> ${fuente.bancoId || fuente.idValor || '-'}`;
    document.getElementById("export-banco-nombre").innerHTML = `<strong>Banco:</strong> ${fuente.bancoNombre || fuente.nombre || '-'}`;
    document.getElementById("export-banco-titular").innerHTML = `<strong>Titular:</strong> ${fuente.bancoTitular || fuente.titular || '-'}`;
  }

  const listaPremios = document.getElementById("export-premios-list");
  listaPremios.innerHTML = "";
  if(r.premios && r.premios.length > 0) {
    r.premios.forEach((p, i) => {
      listaPremios.innerHTML += `<li style="margin-bottom: 20px; display:flex; align-items:center; gap:15px;"><span style="font-size:35px;">🎁</span> <div><strong>${i + 1}° PREMIO:</strong><br>${p}</div></li>`;
    });
  }

  const exportGrid = document.getElementById("export-grid");
  exportGrid.innerHTML = "";
  const cantidad = activo.fin - activo.inicio + 1;

  for (let i = activo.inicio; i <= activo.fin; i++) {
    const key = String(i).padStart(padLength, "0");
    const isSold = !!_state.numeros[key];
    const cell = document.createElement("div");
    cell.textContent = key;
    cell.style.display = "flex"; cell.style.alignItems = "center"; cell.style.justifyContent = "center";
    cell.style.width = cantidad > 300 ? "30px" : "45px"; 
    cell.style.height = cantidad > 300 ? "30px" : "45px"; 
    cell.style.fontSize = cantidad > 300 ? "14px" : "20px";
    cell.style.fontWeight = "900"; cell.style.borderRadius = "8px";
    cell.style.border = `2px solid ${c.secondary}`;

    if (isSold) {
      cell.style.backgroundColor = c.primary; 
      cell.style.color = "#ffffff"; 
      cell.style.textDecoration = "line-through";
    } else {
      cell.style.backgroundColor = "#ffffff"; 
      cell.style.color = c.text;
    }
    exportGrid.appendChild(cell);
  }

  baseExport.style.display = "block"; baseExport.style.left = "0"; baseExport.style.zIndex = "-1";

  const btn = document.getElementById("btn-previsualizar");
  btn.textContent = "Generando vista..."; btn.disabled = true;
  try {
    const canvas = await html2canvas(baseExport, { scale: 1.5, useCORS: true });
    _state.previewDataUrl = canvas.toDataURL("image/png");
    document.getElementById("preview-image-container").innerHTML = `<img src="${_state.previewDataUrl}" style="width: 100%; border-radius: 8px; display: block;" />`;
    document.getElementById("modal-overlay").classList.add("active");
    document.getElementById("modal-preview").classList.add("active");
  } catch (error) { showToast("❌ Error al generar imagen"); } 
  finally { baseExport.style.left = "-9999px"; btn.textContent = "👁️ Previsualizar Imagen del Talonario"; btn.disabled = false; }
}

export function confirmarDescarga() {
  const r = _state.currentRifa;
  const activo = _state.talonarios.find(t => t.id === _state.talonarioActivoId);
  if (!r || !activo || !_state.previewDataUrl) return;
  const link = document.createElement("a");
  link.download = `Talonario_${activo.encargado}_${r.motivo.replace(/\s+/g, '_')}.png`;
  link.href = _state.previewDataUrl;
  link.click();
  showToast("✅ Imagen descargada"); closeModal();
}

function showToast(msg) {
  let toast = document.getElementById("toast");
  toast.textContent = msg; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

window.UI = { 
  closeModal, guardarNumero, eliminarNumero, previsualizarImagen, confirmarDescarga,
  abrirModalCrearRifa, actualizarMiniPreview, agregarCampoPremio, removerPremio, guardarRifa, abrirModalEditarRifa, eliminarRifaDefinitiva,
  verificarPassword, volverAlInicio, abrirModalTalonario, guardarTalonario, abrirModalEditarTalonario, toggleBankFieldsTalonario, eliminarTalonario, toggleTheme
};