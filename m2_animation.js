/* =====================================================================
   FILE:      m2_animation.js
   OWNER:     Member 2 - Animation Sequence
   CONTAINS:  SEQUENCE timeline, state object, getPose() (rotate right/left 180, return, enlarge, move about, loop), advanceAnimation(), animate()
   USES:      drawLogo (m1), resizeCanvas (m1), updateUI (m3), sanitiseState / showError / contextLost (m5_core)
   LOAD ORDER: 6 of 8
   VIDEO:     Demonstrate every required animation stage
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------------
   4. ANIMATION TIMELINE
   All timing is in "animation seconds" (real time x speed slider).
   Sequence: hold -> right 180 -> back -> left 180 -> back -> enlarge
             -> float (move about) -> [shrink back to start if looping]
   --------------------------------------------------------------------- */
const SEQUENCE = [
  { name: "Hold",                d: 0.8 },
  { name: "Rotating right 180°", d: 1.8 },
  { name: "Returning",           d: 1.8 },
  { name: "Rotating left 180°",  d: 1.8 },
  { name: "Returning",           d: 1.8 },
  { name: "Enlarging",           d: 2.5 }
];
const SEQ_END = SEQUENCE.reduce((s, p) => s + p.d, 0);
const FLOAT_DURATION = 6.0;    // seconds of "move about" before looping
const RETURN_DURATION = 1.5;   // shrink back to start size when looping
const START_FRAC = 0.35;       // initial logo width as fraction of screen

const ease = p => p * p * (3 - 2 * p);          // smoothstep easing
const lerp = (a, b, t) => a + (b - a) * t;

const state = { time: 0, playing: false, loop: false, speed: 0.3, finalFrac: 0.1 };

/** Returns the logo pose (rotation, size, offset) for animation time t */
function getPose(t) {
  const pose = { rotY: 0, rotX: 0, frac: START_FRAC, tx: 0, ty: 0, phase: "Ready" };

  // --- Main scripted sequence ---
  if (t < SEQ_END) {
    let start = 0;
    for (let i = 0; i < SEQUENCE.length; i++) {
      const ph = SEQUENCE[i];
      if (t < start + ph.d) {
        const p = ease((t - start) / ph.d);
        pose.phase = ph.name;
        if (i === 1) pose.rotY =  180 * p;          // right
        if (i === 2) pose.rotY =  180 * (1 - p);    // back
        if (i === 3) pose.rotY = -180 * p;          // left
        if (i === 4) pose.rotY = -180 * (1 - p);    // back
        if (i === 5) pose.frac = lerp(START_FRAC, state.finalFrac, p);   // enlarge
        return pose;
      }
      start += ph.d;
    }
  }

  // --- Float phase: gentle continuous motion at full size ---
  const tf = t - SEQ_END;
  pose.frac = state.finalFrac;
  let amp = ease(Math.min(tf / 1.0, 1));            // fade motion in over 1 s
  pose.phase = "Moving about";

  if (state.loop && tf > FLOAT_DURATION) {          // shrink back before restarting
    const p = ease(Math.min((tf - FLOAT_DURATION) / RETURN_DURATION, 1));
    pose.frac = lerp(state.finalFrac, START_FRAC, p);
    amp *= (1 - p);
    pose.phase = "Shrinking back";
  }
  pose.rotY = 20 * Math.sin(tf * 0.9) * amp;
  pose.rotX = 10 * Math.sin(tf * 0.7) * amp;
  pose.tx   = 0.03 * Math.sin(tf * 0.6 + 1) * amp;   // as fraction of visible width
  pose.ty   = 0.04 * Math.sin(tf * 0.8) * amp;       // as fraction of visible height
  return pose;
}


let lastTs = performance.now();
let clock = 0;   // always-running clock (used by the rainbow shimmer and glow pulses)

// MEMBER 2: move animation time forward (scaled by the speed slider) and wrap it when looping
function advanceAnimation(dt) {
  if (!state.playing) return;
  state.time += dt * state.speed;
  const total = SEQ_END + FLOAT_DURATION + RETURN_DURATION;
  if (state.loop && state.time >= total) state.time -= total;
}

// Main loop. Owned by Member 2; each line is tagged with the member whose code it calls.
function animate(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 0.1);    // clamp big gaps (tab switch)
  lastTs = ts;
  clock += dt;

  sanitiseState();                                    // MEMBER 5: keep settings in a safe range
  advanceAnimation(dt);                               // MEMBER 2: animation time + looping

  if (!contextLost) {                                 // MEMBER 5: skip drawing while the GPU context is lost
    try {
      resizeCanvas();                                 // MEMBER 1: fit canvas to window
      gl.clearColor(0, 0, 0, 0);                      // transparent: the CSS backdrop shows through
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const pose = getPose(state.time);               // MEMBER 2: rotation / size / offset for this moment
      drawLogo(pose, clock);                          // MEMBER 1 (letters) + MEMBER 4 (effects)
      if (typeof updateUI === "function") updateUI(pose);   // MEMBER 3: phase label + button captions (once their file exists)
    } catch (err) {
      showError("Render error: " + err.message);      // MEMBER 5: report instead of freezing the loop
    }
  }
  requestAnimationFrame(animate);
}