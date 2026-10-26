/* =====================================================================
   FILE:      m1_webgl.js
   OWNER:     Member 1 - 3D Geometry Generation
   CONTAINS:  VERT_SRC, WebGL context + shader program, buffers, rebuildGeometry() (uploads geometry), getWord() (the typed logo), camera constants, drawLogo(), resizeCanvas()
   USES:      FRAG_SRC (m4_shaders), buildLogoGeometry + drawOverlay + ovBuf (m4_effects), $ / showError (m5_core)
   LOAD ORDER: 4 of 8
   VIDEO:     Explain the buffers, coordinate system and drawLogo()
   ===================================================================== */
"use strict";

// MEMBER 1: vertex shader - positions each vertex (MVP matrix) and passes normals/colour info on
const VERT_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute float aSide;
  varying vec3 vMN; varying vec3 vP;   // model-space normal / position
  uniform mat4 uMVP;        // projection * view * model
  uniform mat4 uRot;        // rotation part of model (for normals)
  uniform vec2 uWordSize;   // (width, 1) used to normalise colour gradients
  varying vec3 vNormal;
  varying float vSide;
  varying vec2 vUV;         // position inside the word, 0..1
  void main() {
    gl_Position = uMVP * vec4(aPosition, 1.0);
    vNormal = (uRot * vec4(aNormal, 0.0)).xyz;
    vSide = aSide; vMN = aNormal; vP = aPosition;
    vUV = vec2(aPosition.x / uWordSize.x + 0.5, aPosition.y + 0.5);
  }`;

// MEMBER 1: simple starter fragment shader (front colour, side colour, one light).
// Member 4's FRAG_SRC (m4_shaders.js) replaces it automatically when that file is loaded.
const BASIC_FRAG_SRC = `
  precision mediump float;
  varying vec3 vNormal;
  varying float vSide;
  uniform vec3 uFront;
  uniform vec3 uSide;
  void main() {
    vec3 base = (vSide > 0.5) ? uSide : uFront;
    float diff = max(dot(normalize(vNormal), normalize(vec3(0.4, 0.6, 1.0))), 0.0);
    gl_FragColor = vec4(base * (0.35 + 0.65 * diff), 1.0);
  }`;

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
if (!gl) { showError("WebGL is not supported in this browser."); throw new Error("No WebGL"); }

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}
const prog = gl.createProgram();   // main program: VERT_SRC (Member 1) + FRAG_SRC (Member 4)
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, typeof FRAG_SRC !== "undefined" ? FRAG_SRC : BASIC_FRAG_SRC));
gl.bindAttribLocation(prog, 0, "aPosition");
gl.bindAttribLocation(prog, 1, "aNormal");
gl.bindAttribLocation(prog, 2, "aSide");
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

// Attribute / uniform locations
const loc = {
  aPosition: gl.getAttribLocation(prog, "aPosition"),
  aNormal:   gl.getAttribLocation(prog, "aNormal"),
  aSide:     gl.getAttribLocation(prog, "aSide"),
  uMVP: gl.getUniformLocation(prog, "uMVP"),
  uRot: gl.getUniformLocation(prog, "uRot"),
  uWordSize: gl.getUniformLocation(prog, "uWordSize"),
  uFront: gl.getUniformLocation(prog, "uFront"),
  uSide: gl.getUniformLocation(prog, "uSide"),
  uMode: gl.getUniformLocation(prog, "uMode"),
  uTime: gl.getUniformLocation(prog, "uTime"),
  uLighting: gl.getUniformLocation(prog, "uLighting")
};

const buffers = { pos: gl.createBuffer(), nor: gl.createBuffer(), side: gl.createBuffer() };
// Keep only letters that have a shape in GLYPHS (m1_geometry.js), in capitals
const cleanWord = text => [...String(text).toUpperCase()].filter(ch => GLYPHS[ch]).join("");
// The word to build: whatever the user typed in the box, or "ECO" if there is nothing usable
const getWord = () => cleanWord(val("wordInput", "ECO")) || "ECO";
let logo = null;   // current geometry

// Upload geometry to the GPU (called when word or depth changes)
function rebuildGeometry() {
  const word = getWord();
  const depth = parseFloat(val("depthSlider", 0.3));
  logo = (typeof buildLogoGeometry === "function")      // Member 4's version adds trees + effects
       ? buildLogoGeometry(word, depth) : buildLetterGeometry(word, depth);
  if (typeof ovBuf !== "undefined") for (const k of ["meshLines", "meshPts", "drips"]) {          // MEMBER 4: upload overlay (mesh / drip) buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, ovBuf[k]); gl.bufferData(gl.ARRAY_BUFFER, logo[k], gl.STATIC_DRAW);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos);  gl.bufferData(gl.ARRAY_BUFFER, logo.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nor);  gl.bufferData(gl.ARRAY_BUFFER, logo.normals,   gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.side); gl.bufferData(gl.ARRAY_BUFFER, logo.sides,     gl.STATIC_DRAW);
}

gl.enable(gl.DEPTH_TEST);


const CAM_Z = 5, FOV = deg2rad(45), NEAR = 0.1, FAR = 50;

const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255);

function drawLogo(pose, timeSec) {
  gl.useProgram(prog);
  const aspect = canvas.width / canvas.height;
  const visH = 2 * CAM_Z * Math.tan(FOV / 2);      // visible world height at z = 0
  const visW = visH * aspect;

  // Pick a uniform scale so the word fills `frac` of the screen (width- or height-limited)
  const s = Math.min(pose.frac * visW / logo.width, pose.frac * visH * 0.8);

  // Model = Translate * RotX * RotY * Scale
  const rot = M4.multiply(M4.rotateX(deg2rad(pose.rotX)), M4.rotateY(deg2rad(pose.rotY)));
  let model = M4.multiply(rot, M4.scale(s));
  model = M4.multiply(M4.translate(pose.tx * visW, pose.ty * visH, 0), model);

  const view = M4.translate(0, 0, -CAM_Z);
  const proj = M4.perspective(FOV, aspect, NEAR, FAR);
  const mvp = M4.multiply(proj, M4.multiply(view, model));

  gl.uniformMatrix4fv(loc.uMVP, false, mvp);
  gl.uniformMatrix4fv(loc.uRot, false, rot);
  gl.uniform2f(loc.uWordSize, logo.width, 1);
  gl.uniform3fv(loc.uFront, hexToRgb(val("colFront", "#efe6cf")));
  gl.uniform3fv(loc.uSide,  hexToRgb(val("colSide", "#6e5b3a")));
  gl.uniform1i(loc.uMode, parseInt(val("colorMode", 3)));
  gl.uniform1f(loc.uTime, timeSec);
  gl.uniform1i(loc.uLighting, checked("lightToggle", true) ? 1 : 0);

  // Bind attributes and draw
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos);
  gl.enableVertexAttribArray(loc.aPosition); gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nor);
  gl.enableVertexAttribArray(loc.aNormal);   gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.side);
  gl.enableVertexAttribArray(loc.aSide);     gl.vertexAttribPointer(loc.aSide, 1, gl.FLOAT, false, 0, 0);
  const triCount = checked("treesToggle", true)   // MEMBER 4: trees are extra triangles after the letters
     ? logo.count : logo.letterCount;
  gl.drawArrays(gl.TRIANGLES, 0, triCount);
  if (typeof drawOverlay === "function") drawOverlay(mvp, timeSec);   // MEMBER 4: glowing mesh + drip lines drawn after the letters
}

// MEMBER 1: keep the canvas pixel size equal to its on-screen size (sharp on high-DPI screens)
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resizeCanvas);   // re-fit when the window changes size
