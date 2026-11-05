"use strict";
   // MATRIX  (4x4, column-major)
const M4 = {
  identity() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },

  // out = a * b
  multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k*4 + r] * b[c*4 + k];
        out[c*4 + r] = s;
      }
    return out;
  },

  perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
    m[0] = f / aspect;  m[5] = f;
    m[10] = (far + near) / (near - far);  m[11] = -1;
    m[14] = 2 * far * near / (near - far);
    return m;
  },

  translate(x, y, z) { const m = M4.identity(); m[12] = x; m[13] = y; m[14] = z; return m; },
  scale(s)           { const m = M4.identity(); m[0] = m[5] = m[10] = s; return m; },

  rotateX(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m;
  },
  rotateY(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m;
  }
};
const deg2rad = d => d * Math.PI / 180;

   //LETTER DEFINITIONS + GEOMETRY GENERATION

const T = 0.2;                       // stroke thickness
const LETTER_SPACING = 0.18;         // gap between letters

// rectangle quad 
const rect = (x0, y0, x1, y1) => [x0,y0, x1,y0, x1,y1, x0,y1];

// Curved stroke
const arc = (a0, a1, n) => {
  const cx = 0.45, cy = 0.5, ro = [0.45, 0.5], ri = [0.25, 0.3], out = [];
  for (let i = 0; i < n; i++) {
    const s = deg2rad(a0 + (a1 - a0) * i / n), e = deg2rad(a0 + (a1 - a0) * (i + 1) / n);
    out.push([cx + ro[0]*Math.cos(s), cy + ro[1]*Math.sin(s), cx + ro[0]*Math.cos(e), cy + ro[1]*Math.sin(e),
              cx + ri[0]*Math.cos(e), cy + ri[1]*Math.sin(e), cx + ri[0]*Math.cos(s), cy + ri[1]*Math.sin(s)]);
  }
  return out;
};

// circular curved segments (B, D, J, P, R, U)
const arcAt = (cx, cy, ro, ri, a0, a1, n = 12) => Array.from({ length: n }, (_, i) => {
  const s = deg2rad(a0 + (a1 - a0) * i / n), e = deg2rad(a0 + (a1 - a0) * (i + 1) / n);
  return [cx + ro[0]*Math.cos(s), cy + ro[1]*Math.sin(s), cx + ro[0]*Math.cos(e), cy + ro[1]*Math.sin(e), cx + ri[0]*Math.cos(e), cy + ri[1]*Math.sin(e), cx + ri[0]*Math.cos(s), cy + ri[1]*Math.sin(s)];
});

// Glyph table: width + strokes (A to Z)
const GLYPHS = {
  A: { w: 0.8,  strokes: [ rect(0,0,T,1-T), rect(0.6,0,0.8,1-T), rect(0,1-T,0.8,1), rect(T,0.4,0.6,0.6) ] },
  B: { w: 0.8,  strokes: [ rect(0,0,T,1), rect(T,0.85,0.5,1), rect(T,0.42,0.5,0.58), rect(T,0,0.5,0.15), ...arcAt(0.5,0.75,[0.3,0.25],[0.12,0.1],-90,90,10), ...arcAt(0.5,0.25,[0.3,0.25],[0.12,0.1],-90,90,10) ] },
  C: { w: 0.9,  strokes: arc(40, 320, 24) },
  D: { w: 0.85, strokes: [ rect(0,0,T,1), rect(T,1-T,0.45,1), rect(T,0,0.45,T), ...arcAt(0.45,0.5,[0.4,0.5],[0.2,0.3],-90,90,14) ] },
  E: { w: 0.7,  strokes: [ rect(0,0,T,1), rect(T,1-T,0.7,1), rect(T,0.4,0.6,0.6), rect(T,0,0.7,T) ] },
  F: { w: 0.7,  strokes: [ rect(0,0,T,1), rect(T,1-T,0.7,1), rect(T,0.4,0.6,0.6) ] },
  G: { w: 0.8,  strokes: [ rect(0,T,T,1-T), rect(0,0,0.8,T), rect(0,1-T,0.8,1), rect(0.6,T,0.8,0.5), rect(0.4,0.3,0.8,0.5) ] },
  H: { w: 0.8,  strokes: [ rect(0,0,T,1), rect(0.6,0,0.8,1), rect(T,0.4,0.6,0.6) ] },
  I: { w: T,    strokes: [ rect(0,0,T,1) ] },
  J: { w: 0.7,  strokes: [ rect(0.5,0.25,0.7,1), rect(0,0.2,T,0.45), ...arcAt(0.35,0.25,[0.35,0.25],[0.15,0.1],180,360,10) ] },
  K: { w: 0.8,  strokes: [ rect(0,0,T,1), [T,0.4, 0.6,1, 0.8,1, T,0.6], [0.35,0.5, 0.6,0, 0.8,0, 0.5,0.65] ] },
  L: { w: 0.7,  strokes: [ rect(0,0,T,1), rect(T,0,0.7,T) ] },
  M: { w: 0.9,  strokes: [ rect(0,0,T,1), rect(0.7,0,0.9,1), [T,1, 0.45,0.2, 0.45,0.45, 0.28,1], [0.45,0.2, 0.7,1, 0.62,1, 0.45,0.45] ] },
  N: { w: 0.8,  strokes: [ rect(0,0,T,1), rect(0.6,0,0.8,1), [T,0.6, 0.6,0, 0.6,0.4, T,1] ] },
  O: { w: 0.9,  strokes: arc(0, 360, 28) },
  P: { w: 0.8,  strokes: [ rect(0,0,T,1), rect(T,1-T,0.5,1), rect(T,0.5,0.5,0.7), ...arcAt(0.5,0.75,[0.3,0.25],[0.12,0.1],-90,90,12) ] },
  Q: { w: 0.9,  strokes: [ ...arc(0,360,28), [0.55,0.25, 0.85,0, 0.95,0.1, 0.68,0.35] ] },
  R: { w: 0.8,  strokes: [ rect(0,0,T,1), rect(T,1-T,0.5,1), rect(T,0.5,0.5,0.7), ...arcAt(0.5,0.75,[0.3,0.25],[0.12,0.1],-90,90,12), [0.4,0.5, 0.6,0, 0.8,0, 0.58,0.5] ] },
  S: { w: 0.8,  strokes: [ rect(0,1-T,0.8,1), rect(0,0.4,T,1-T), rect(0,0.4,0.8,0.6), rect(0.6,T,0.8,0.6), rect(0,0,0.8,T) ] },
  T: { w: 0.8,  strokes: [ rect(0,1-T,0.8,1), rect(0.3,0,0.5,1-T) ] },
  U: { w: 0.8,  strokes: [ rect(0,0.3,T,1), rect(0.6,0.3,0.8,1), ...arcAt(0.4,0.3,[0.4,0.3],[0.2,0.1],180,360,12) ] },
  V: { w: 0.8,  strokes: [ [0.3,0, 0.5,0, 0.2,1, 0,1], [0.3,0, 0.5,0, 0.8,1, 0.6,1] ] },
  W: { w: 1.0,  strokes: [ [0.15,0, 0.3,0, 0.18,1, 0,1], [0.15,0, 0.3,0, 0.55,1, 0.42,1], [0.7,0, 0.85,0, 0.58,1, 0.45,1], [0.7,0, 0.85,0, 1.0,1, 0.82,1] ] },
  X: { w: 0.8,  strokes: [ [0,0, T,0, 0.8,1, 0.6,1], [0.6,0, 0.8,0, T,1, 0,1] ] },
  Y: { w: 0.8,  strokes: [ rect(0.3,0,0.5,0.5), [0.3,0.45, 0.5,0.45, 0.15,1, 0,1], [0.3,0.45, 0.5,0.45, 0.8,1, 0.65,1] ] },
  Z: { w: 0.8,  strokes: [ rect(0,1-T,0.8,1), rect(0,0,0.8,T), [0,T, 0.2,T, 0.8,1-T, 0.6,1-T] ] }
};

//buildLogoGeometry(word, depth)

function buildLetterGeometry(word, depth) {
  const pos = [], nor = [], side = [];
  const zF = depth / 2, zB = -depth / 2;

  // find total width to centre the word
  const letters = [...word.toUpperCase()].filter(ch => GLYPHS[ch]);
  let width = 0;
  letters.forEach((ch, i) => { width += GLYPHS[ch].w + (i ? LETTER_SPACING : 0); });
  const ox = -width / 2, oy = -0.5;

  const push = (x, y, z, nx, ny, nz, s) => { pos.push(x, y, z); nor.push(nx, ny, nz); side.push(s); };

  let cursor = 0, gi = 0;
  const allStrokes = [], gaps = [];   // gaps = x-centres between neighbouring letters
  for (const ch of letters) {
    const g = GLYPHS[ch];
    for (const st of g.strokes) {
      // convert flat list to points, offset into word space
      const pts = [];
      for (let i = 0; i < st.length; i += 2) pts.push([st[i] + cursor + ox, st[i+1] + oy]);
      const n = pts.length;
      allStrokes.push(pts);

      // Front face (z = +d/2), triangle fan, normal +Z
      for (let i = 1; i < n - 1; i++)
        for (const p of [pts[0], pts[i], pts[i+1]]) push(p[0], p[1], zF, 0, 0, 1, 0);
      // Back face (z = -d/2), reversed winding, normal -Z
      for (let i = 1; i < n - 1; i++)
        for (const p of [pts[0], pts[i+1], pts[i]]) push(p[0], p[1], zB, 0, 0, -1, 0);

      // Side walls: one quad per edge.
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i+1) % n];
        let nx = b[1] - a[1], ny = -(b[0] - a[0]);
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        // two triangles: (a back, b back, b front) and (a back, b front, a front)
        push(a[0],a[1],zB, nx,ny,0, 1);  push(b[0],b[1],zB, nx,ny,0, 1);  push(b[0],b[1],zF, nx,ny,0, 1);
        push(a[0],a[1],zB, nx,ny,0, 1);  push(b[0],b[1],zF, nx,ny,0, 1);  push(a[0],a[1],zF, nx,ny,0, 1);
      }
    }
    cursor += g.w + LETTER_SPACING;
    if (++gi < letters.length) gaps.push(ox + cursor - LETTER_SPACING / 2);
  }
  return {
    positions: new Float32Array(pos),
    normals:   new Float32Array(nor),
    sides:     new Float32Array(side),
    count:     pos.length / 3,
    letterCount: pos.length / 3,   
    width:     Math.max(width, 0.2),
    strokes: allStrokes, gaps: gaps
  };
}
