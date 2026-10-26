/* =====================================================================
   FILE:      m5_main.js
   OWNER:     Member 5 - Integration, Testing & Reliability
   CONTAINS:  renderStill() and init() that join all modules, WebGL context-loss handling, runSelfTest() (checks every animation stage)
   USES:      everything (loaded last, after all other modules exist)
   LOAD ORDER: 8 of 8
   VIDEO:     Demonstrate the integration/testing code and explain the bugs fixed
   ===================================================================== */
"use strict";

// Integration: the one place where all modules are started, in the right order
// Before Member 2's file exists there is no animation loop, so draw one still frame (the logo is visible from step 1)
function renderStill() {
  resizeCanvas();
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawLogo({ rotY: 0, rotX: 0, frac: 0.6, tx: 0, ty: 0 }, 0);
}

function init() {
  if (typeof applyBackdrop === "function") applyBackdrop();            // Member 4 (optional until their file exists)
  rebuildGeometry();                                                   // Member 1 (+ Member 4 effects)
  if (typeof animate === "function") {                                 // Member 2 starts the loop
    if (typeof startAnimation !== "function") state.playing = true;   // no Start button code yet -> play automatically
    requestAnimationFrame(animate);
  }
  else { renderStill(); window.addEventListener("resize", renderStill); }
}
init();

// Reliability: if the browser drops the GPU context, stop drawing and recover by reloading
canvas.addEventListener("webglcontextlost", e => {
  e.preventDefault();
  contextLost = true;
  showError("Graphics context lost - restoring...");
});
canvas.addEventListener("webglcontextrestored", () => location.reload());

// Testing: checks the pose at the end of each animation stage against the assignment.
// Run it by adding ?test to the page address, or typing runSelfTest() in the browser console.
function runSelfTest() {
  const near = (a, b) => Math.abs(a - b) < 0.01;
  const ends = []; let t = 0;
  SEQUENCE.forEach(p => { t += p.d; ends.push(t); });
  const cases = [
    ["Start: original orientation",     0,       p => near(p.rotY, 0)],
    ["Rotate right: reaches +180",      ends[1], p => near(p.rotY, 180)],
    ["Return: back to 0",               ends[2], p => near(p.rotY, 0)],
    ["Rotate left: reaches -180",       ends[3], p => near(p.rotY, -180)],
    ["Return: back to 0",               ends[4], p => near(p.rotY, 0)],
    ["Enlarge: reaches final size",     ends[5], p => near(p.frac, state.finalFrac)]
  ];
  const rows = cases.map(([name, time, check]) => {
    const pose = getPose(time);
    return { test: name, time: +time.toFixed(2), rotY: +pose.rotY.toFixed(1), size: +pose.frac.toFixed(2), result: check(pose) ? "PASS" : "FAIL" };
  });
  console.table(rows);
  const ok = rows.every(r => r.result === "PASS");
  console.log(ok ? "All animation stages OK" : "Some stages FAILED");
  return ok;
}

if (location.search.includes("test")) runSelfTest();
