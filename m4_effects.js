/* =====================================================================
   FILE:      m4_effects.js
   OWNER:     Member 4 - Lighting, Visual Effects & Extensions
   CONTAINS:  Tiny trees, teal mesh and drip-line generation, buildLogoGeometry() (letters + effects), overlay program + drawOverlay(), applyBackdrop()
   USES:      buildLetterGeometry (m1_geometry), gl / compile / prog / logo (m1_webgl), OV_* shaders (m4_shaders)
   LOAD ORDER: 5 of 8
   VIDEO:     Explain and demonstrate the extra graphics features
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------------
   2b. DECORATIONS: tiny trees, glowing teal mesh, drip lines.
   All are placed from the letter outlines, using a seeded random generator
   so the layout stays the same each time the geometry is rebuilt.
   --------------------------------------------------------------------- */
function makeRng(seed) {                       // mulberry32 seeded random
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Point-in-polygon (ray casting) - used to skip spots buried inside another stroke
function inPoly(x, y, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++)
    if ((p[i][1] > y) !== (p[j][1] > y) &&
        x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  return c;
}
const isExposed = (x, y, strokes) => !strokes.some(p => inPoly(x, y, p));

// Walk along top-facing (wantUp) or bottom-facing edges and call cb(x, y) at exposed sample points
function sampleEdges(strokes, wantUp, step, rng, cb) {
  for (const p of strokes)
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 0.02) continue;
      const nx = dy / len, ny = -dx / len;                 // outward normal of a CCW edge
      if (wantUp ? ny < 0.6 : ny > -0.6) continue;
      const k = Math.max(1, Math.round(len / step));
      for (let j = 0; j < k; j++) {
        const t = (j + 0.2 + 0.6 * rng()) / k, x = a[0] + dx * t, y = a[1] + dy * t;
        if (isExposed(x + nx * 0.02, y + ny * 0.02, strokes)) cb(x, y);
      }
    }
}

// Pyramid with a polygonal base; negative h points downwards. `flag` picks the shader colour (2 leaf, 3 trunk, 4 autumn)
function cone(out, cx, cy, cz, r, h, sides, flag) {
  const l = Math.hypot(r, h);
  for (let i = 0; i < sides; i++) {
    const a0 = i / sides * 6.2832, a1 = (i + 1) / sides * 6.2832, m = (a0 + a1) / 2;
    const nx = Math.cos(m) * Math.abs(h) / l, ny = r / l * Math.sign(h), nz = Math.sin(m) * Math.abs(h) / l;
    const P = [[cx + r * Math.cos(a0), cy, cz + r * Math.sin(a0)],
               [cx + r * Math.cos(a1), cy, cz + r * Math.sin(a1)], [cx, cy + h, cz]];
    for (const q of P) { out.pos.push(q[0], q[1], q[2]); out.nor.push(nx, ny, nz); out.side.push(flag); }
  }
}

// Plant conifers and broadleaf trees along the exposed tops of the letters
function addTrees(g, depth, rng, out) {
  const zr = Math.max(depth / 2 - 0.04, 0);
  let planted = 0;
  sampleEdges(g.strokes, true, 0.11, rng, (x, y) => {
    if (planted++ > 140 || rng() < 0.25) return;
    const z = (rng() * 2 - 1) * zr, s = 0.6 + 0.5 * rng();
    cone(out, x, y, z, 0.012, 0.05, 4, 3);                            // trunk
    if (rng() < 0.6) {                                                // conifer: two stacked cones
      cone(out, x, y + 0.03 * s, z, 0.06 * s, 0.13 * s, 6, 2);
      cone(out, x, y + 0.09 * s, z, 0.045 * s, 0.11 * s, 6, 2);
    } else {                                                          // broadleaf: diamond blob (some autumn)
      const f = rng() < 0.25 ? 4 : 2, cy = y + 0.1 * s;
      cone(out, x, cy, z, 0.07 * s, 0.09 * s, 7, f);
      cone(out, x, cy, z, 0.07 * s, -0.07 * s, 7, f);
    }
  });
}

// Overlay vertices have 5 floats: x, y, z, phase (for pulsing), fade (alpha along the line)
function buildOverlay(g, depth, rng) {
  const mesh = [], pts = [], drips = [], zr = depth / 2;
  const v = (arr, x, y, z, ph, fade) => arr.push(x, y, z, ph, fade);

  // Teal mesh: random nodes around each gap between letters, joined when close together
  for (const gx of g.gaps) {
    const nodes = [];
    for (let i = 0; i < 18; i++)
      nodes.push([gx + (rng() * 2 - 1) * 0.32, (rng() - 0.5) * 1.05, (rng() * 2 - 1) * (zr + 0.12), rng()]);
    nodes.forEach(n => v(pts, n[0], n[1], n[2], n[3], 1));
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.34) {
          v(mesh, a[0], a[1], a[2], a[3], 1); v(mesh, b[0], b[1], b[2], b[3], 1);
        }
      }
  }

  // Drip lines hanging below bottom edges (fade out downwards) + a few thin rods rising above the tops
  let count = 0;
  sampleEdges(g.strokes, false, 0.09, rng, (x, y) => {
    if (count++ > 90) return;
    const z = (rng() * 2 - 1) * zr, len = 0.15 + 0.6 * rng(), ph = rng();
    v(drips, x, y, z, ph, 1); v(drips, x, y - len, z, ph, 0);
  });
  sampleEdges(g.strokes, true, 0.16, rng, (x, y) => {
    const z = (rng() * 2 - 1) * zr, len = 0.2 + 0.4 * rng(), ph = rng();
    v(drips, x, y, z, ph, 0.5); v(drips, x, y + len, z, ph, 0);
  });
  return { meshLines: new Float32Array(mesh), meshPts: new Float32Array(pts), drips: new Float32Array(drips) };
}

// Full logo = extruded letters + trees (same buffers) + overlay data (separate buffers)
function buildLogoGeometry(word, depth) {
  const g = buildLetterGeometry(word, depth), rng = makeRng(7);
  const extra = { pos: [], nor: [], side: [] };
  addTrees(g, depth, rng, extra);
  const cat = (a, b) => { const o = new Float32Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
  g.letterCount = g.count;                       // vertices belonging to the letters only
  g.positions = cat(g.positions, extra.pos);
  g.normals   = cat(g.normals, extra.nor);
  g.sides     = cat(g.sides, extra.side);
  g.count     = g.positions.length / 3;
  return Object.assign(g, buildOverlay(g, depth, rng));
}

// ---- Overlay program: glowing mesh + drip lines ----
const ovProg = gl.createProgram();
gl.bindAttribLocation(ovProg, 0, "aPos");
gl.bindAttribLocation(ovProg, 1, "aPA");
gl.attachShader(ovProg, compile(gl.VERTEX_SHADER, OV_VERT));
gl.attachShader(ovProg, compile(gl.FRAGMENT_SHADER, OV_FRAG));
gl.linkProgram(ovProg);
if (!gl.getProgramParameter(ovProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(ovProg));
const ovLoc = {};
for (const n of ["uMVP", "uTime", "uPointSize", "uColor", "uBase", "uPulse", "uRound"])
  ovLoc[n] = gl.getUniformLocation(ovProg, n);
const ovBuf = { meshLines: gl.createBuffer(), meshPts: gl.createBuffer(), drips: gl.createBuffer() };

function drawOverlay(mvp, timeSec) {
  gl.useProgram(ovProg);
  gl.disableVertexAttribArray(2);            // main program's 3rd attribute is not used here
  gl.uniformMatrix4fv(ovLoc.uMVP, false, mvp);
  gl.uniform1f(ovLoc.uTime, timeSec);
  gl.enable(gl.BLEND);
  gl.depthMask(false);                       // see-through: depth-tested but doesn't write depth

  const draw = (key, mode, color, base, pulse, round, size) => {
    const n = logo[key].length / 5;
    if (!n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, ovBuf[key]);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.uniform3fv(ovLoc.uColor, color); gl.uniform1f(ovLoc.uBase, base); gl.uniform1f(ovLoc.uPulse, pulse);
    gl.uniform1i(ovLoc.uRound, round ? 1 : 0);  gl.uniform1f(ovLoc.uPointSize, size);
    gl.drawArrays(mode, 0, n);
  };
  const dpr = window.devicePixelRatio || 1;
  if (checked("meshToggle", true)) {
    gl.blendFunc(gl.ONE, gl.ONE);            // additive blending = glow
    draw("meshLines", gl.LINES,  [0.1, 0.8, 0.65], 0.6, 0.6, false, 1);
    draw("meshPts",   gl.POINTS, [0.1, 0.85, 0.7], 1.0, 0.5, true, 9 * dpr);
  }
  if (checked("dripToggle", true)) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    draw("drips", gl.LINES, [0.16, 0.27, 0.1], 0.85, 0, false, 1);
  }
  gl.depthMask(true); gl.disable(gl.BLEND);
  gl.useProgram(prog);
}

/* ---------------------------------------------------------------------
   Backdrop (Member 4)
   --------------------------------------------------------------------- */
// Backdrop: soft sage gradient + dark floor shadow under the logo
function applyBackdrop() {
  const c = val("colBg", "#b9d3a0");
  document.body.style.background =
    "radial-gradient(ellipse 60% 8% at 50% 88%, rgba(25,45,15,.45), transparent 70%)," +
    "radial-gradient(circle at 50% 30%, #f4f8e2 0%, " + c + " 85%)";
}
