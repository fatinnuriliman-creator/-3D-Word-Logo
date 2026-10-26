"use strict";

// Short helper used by every file: get an element by id
const $ = id => document.getElementById(id);

// Safe readers: if a control is not on the page yet (early steps of the project) use a default instead of crashing
const val     = (id, def) => { const e = $(id); return e ? e.value : def; };
const checked = (id, def) => { const e = $(id); return e ? e.checked : def; };
const on      = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };   // add a listener only if the element exists

// Show an error in the panel (and console) instead of failing silently
function showError(msg) {
  const el = $("error");
  if (el) el.textContent = msg;
  console.error(msg);
}
window.addEventListener("error", e => showError("Error: " + e.message));
window.addEventListener("unhandledrejection", e => showError("Error: " + e.reason));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let contextLost = false;   // set by m5_main.js when the browser drops the WebGL context

// State management: keep the shared `state` object (defined in m2_animation.js) inside safe limits.
// Called once per frame from animate().
function sanitiseState() {
  state.speed     = clamp(+state.speed || 1, 0.1, 5);
  state.finalFrac = clamp(+state.finalFrac || 0.85, 0.3, 0.98);
  if (!isFinite(state.time) || state.time < 0) state.time = 0;
}
