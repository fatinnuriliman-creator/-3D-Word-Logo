/* =====================================================================
   FILE:      m3_ui.js
   OWNER:     Member 3 - User Interface & Controls
   CONTAINS:  Start / Pause / Reset buttons, sliders, Settings panel toggle, keyboard shortcuts, updateUI()
   USES:      state (m2), rebuildGeometry (m1), applyBackdrop (m4), $ (m5_core)
   LOAD ORDER: 7 of 8
   VIDEO:     Show how each control changes the application
   ===================================================================== */
"use strict";

// ---- updateUI(): phase label + button captions (called every frame from animate) ----
function updateUI(pose) {
  const label = $("phaseLabel"), pause = $("btnPause");
  if (label) label.textContent = (!state.playing && state.time === 0) ? "Ready" :
                                 (!state.playing ? "Paused" : pose.phase);
  if (pause) pause.textContent = (!state.playing && state.time > 0) ? "Resume" : "Pause";
}

// ---- Animation buttons ----
function startAnimation()  { if (!state.playing) { state.time = 0; state.playing = true; } }  // Start: begin at stage 1 (ignored while playing)
function togglePause()     { if (state.playing || state.time > 0) state.playing = !state.playing; }
function resetAnimation()  { state.time = 0; state.playing = false; }                         // Reset: back to the original pose, stopped
function togglePanel()     { document.body.classList.toggle("panel-hidden"); }                // Settings button / H key

on("btnStart", "click", startAnimation);
on("btnPause", "click", togglePause);
on("btnReset", "click", resetAnimation);
on("panelToggle", "click", togglePanel);

// ---- Sliders and checkboxes -> animation / geometry settings ----
on("depthSlider", "input", e => { $("depthOut").textContent = (+e.target.value).toFixed(2); rebuildGeometry(); });
on("sizeSlider", "input",  e => { state.finalFrac = e.target.value / 100; $("sizeOut").textContent = e.target.value + "%"; });
on("speedSlider", "input", e => { state.speed = +e.target.value; $("speedOut").textContent = (+e.target.value).toFixed(1) + "x"; });
// Typing a new word rebuilds the 3D letters (ignored while the box has no supported letters)
on("wordInput", "input", e => { if (cleanWord(e.target.value).length) rebuildGeometry(); });
on("loopToggle", "change", e => { state.loop = e.target.checked; });
on("colBg", "input", () => { if (typeof applyBackdrop === "function") applyBackdrop(); });   // applyBackdrop() is Member 4's code

// ---- Keyboard shortcuts ----
window.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" && e.target.type === "text") return;   // typing a word: ignore shortcuts
  if (e.code === "Space") { e.preventDefault(); togglePause(); }
  else if (e.code === "Enter") startAnimation();
  else if (e.code === "KeyR") resetAnimation();
  else if (e.code === "KeyH") togglePanel();
});
