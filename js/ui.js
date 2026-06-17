// js/ui.js
// ============================================================
//  Módulo de UI — renderizado, modal, tooltip, interacciones
// ============================================================

import * as DB from "./db.js";

// ---- Estado local de UI ----
let _state = {
  numeros:    {},   // { "001": { nombre, pago, telefono, vendidoEn } }
  precio:     0,
  seleccion:  null, // número actualmente en el modal
};

// ---- INIT ----
export function init(numerosData, precio) {
  _state.numeros = numerosData;
  _state.precio  = precio;
  renderGrid();
  renderStats();
}

export function updateNumeros(numerosData) {
  _state.numeros = numerosData;
  renderGrid();
  renderStats();
}

export function setPrecio(p) { _state.precio = p; renderStats(); }

// ---- GRID ----
function renderGrid() {
  const grid = document.getElementById("numbers-grid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 1; i <= 100; i++) {
    const key    = String(i).padStart(3, "0");
    const sold   = !!_state.numeros[key];
    const cell   = document.createElement("button");
    cell.className = "number-cell" + (sold ? " sold" : "");
    cell.textContent = key;
    cell.setAttribute("aria-label", sold
      ? `Número ${key} — vendido a ${_state.numeros[key].nombre}`
      : `Número ${key} — disponible`);
    cell.setAttribute("data-num", key);

    // Events
    cell.addEventListener("click", () => handleClick(key));
    cell.addEventListener("mouseenter", (e) => showTooltip(e, key));
    cell.addEventListener("mouseleave", hideTooltip);
    cell.addEventListener("touchstart", (e) => handleTouch(e, key), { passive: true });

    grid.appendChild(cell);
  }
}

// ---- STATS ----
function renderStats() {
  const total     = Object.keys(_state.numeros).length;
  const disponibles = 100 - total;
  const recaudado = _state.precio > 0 ? `$${(total * _state.precio).toLocaleString("es-AR")}` : "—";

  document.getElementById("stat-vendidos").textContent    = total;
  document.getElementById("stat-disponibles").textContent = disponibles;
  document.getElementById("stat-recaudado").textContent   = recaudado;

  const pct = total;
  document.getElementById("progress-bar").style.width    = pct + "%";
  document.getElementById("progress-label").textContent  = `${pct}% completado`;
}

// ---- CLICK / TOUCH ----
function handleClick(key) {
  _state.seleccion = key;
  openModal(key);
}

let _touchTimer;
function handleTouch(e, key) {
  // tap rápido → click; longpress → tooltip
  _touchTimer = setTimeout(() => {
    showTooltipMobile(key);
  }, 500);
  e.currentTarget.addEventListener("touchend", () => {
    clearTimeout(_touchTimer);
  }, { once: true });
}

// ---- TOOLTIP ----
function showTooltip(e, key) {
  const data = _state.numeros[key];
  if (!data) return;
  const tip = document.getElementById("tooltip");
  tip.innerHTML = buildTooltipHTML(key, data);
  positionTooltip(e.clientX, e.clientY);
  tip.classList.add("visible");
}

function showTooltipMobile(key) {
  const data = _state.numeros[key];
  if (!data) return;
  const tip = document.getElementById("tooltip");
  tip.innerHTML = buildTooltipHTML(key, data);
  tip.style.left   = "50%";
  tip.style.top    = "30%";
  tip.style.transform = "translateX(-50%)";
  tip.classList.add("visible");
  setTimeout(() => tip.classList.remove("visible"), 3000);
}

function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

function positionTooltip(x, y) {
  const tip = document.getElementById("tooltip");
  const vw = window.innerWidth;
  let left = x + 12;
  if (left + 230 > vw) left = x - 230;
  tip.style.left      = left + "px";
  tip.style.top       = (y - 10) + "px";
  tip.style.transform = "none";
}

function buildTooltipHTML(key, data) {
  const pagoClass = data.pago === "efectivo" ? "efectivo" : "transferencia";
  const pagoLabel = data.pago === "efectivo" ? "💵 Efectivo" : "📲 Transferencia";
  const fecha = data.vendidoEn
    ? new Date(data.vendidoEn).toLocaleDateString("es-AR", { day:"2-digit", month:"short" })
    : "";
  return `
    <div class="tooltip-name">🎟 #${key} — ${data.nombre}</div>
    <div class="tooltip-meta">
      <span class="tooltip-pago ${pagoClass}">${pagoLabel}</span>
      ${fecha ? `<span>${fecha}</span>` : ""}
      ${data.telefono ? `<span>📞 ${data.telefono}</span>` : ""}
    </div>`;
}

// ---- MODAL ----
function openModal(key) {
  const data  = _state.numeros[key];
  const isSold = !!data;

  document.getElementById("modal-title").textContent        = isSold ? "Editar número" : "Registrar número";
  document.getElementById("modal-number-badge").textContent = `#${key}`;
  document.getElementById("input-nombre").value             = data?.nombre   || "";
  document.getElementById("input-telefono").value           = data?.telefono || "";
  document.getElementById("btn-eliminar").style.display     = isSold ? "flex" : "none";

  // Payment
  const pagoEfect = document.getElementById("pago-efectivo");
  const pagoTrans = document.getElementById("pago-transfer");
  pagoEfect.checked = data?.pago === "efectivo" || !isSold;
  pagoTrans.checked = data?.pago === "transferencia";

  document.getElementById("modal-overlay").classList.add("active");
  document.getElementById("modal-form").classList.add("active");
  setTimeout(() => document.getElementById("input-nombre").focus(), 300);
}

export function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  document.getElementById("modal-form").classList.remove("active");
  _state.seleccion = null;
}

// ---- GUARDAR ----
export async function guardarNumero() {
  const key    = _state.seleccion;
  const nombre = document.getElementById("input-nombre").value.trim();
  const pago   = document.querySelector('input[name="pago"]:checked')?.value;
  const tel    = document.getElementById("input-telefono").value.trim();

  if (!nombre) { showToast("⚠️ Ingresá el nombre del comprador"); return; }
  if (!pago)   { showToast("⚠️ Seleccioná la forma de pago"); return; }

  const btn = document.getElementById("btn-guardar");
  btn.textContent = "Guardando…";
  btn.disabled    = true;

  try {
    await DB.guardarNumero(key, { nombre, pago, telefono: tel || null });
    showToast(`✅ Número ${key} registrado a ${nombre}`);
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("❌ Error al guardar. Verificá tu conexión.");
  } finally {
    btn.textContent = "✓ Guardar";
    btn.disabled    = false;
  }
}

// ---- ELIMINAR ----
export async function eliminarNumero() {
  const key = _state.seleccion;
  if (!confirm(`¿Liberar el número ${key}? Esta acción no se puede deshacer.`)) return;

  try {
    await DB.eliminarNumero(key);
    showToast(`🗑 Número ${key} liberado`);
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("❌ Error al eliminar");
  }
}

// ---- PRECIO ----
export function showPriceModal() {
  document.getElementById("input-precio").value = _state.precio || "";
  document.getElementById("modal-precio").style.display = "block";
  document.getElementById("modal-overlay").classList.add("active");
}

export async function guardarPrecio() {
  const val = Number(document.getElementById("input-precio").value);
  if (isNaN(val) || val < 0) { showToast("⚠️ Ingresá un precio válido"); return; }
  try {
    await DB.guardarPrecio(val);
    _state.precio = val;
    renderStats();
    document.getElementById("modal-precio").style.display = "none";
    document.getElementById("modal-overlay").classList.remove("active");
    showToast("💰 Precio actualizado");
  } catch (err) {
    showToast("❌ Error al guardar precio");
  }
}

// ---- PRINT ----
export function printView() {
  window.print();
}

// ---- TOAST ----
export function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ---- SKELETON ----
export function showSkeleton() {
  const grid = document.getElementById("numbers-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 100; i++) {
    const c = document.createElement("div");
    c.className = "number-cell skeleton";
    grid.appendChild(c);
  }
}

// Exponer al HTML (onclick handlers en atributos)
window.UI = { closeModal, guardarNumero, eliminarNumero, printView, showPriceModal, guardarPrecio };
