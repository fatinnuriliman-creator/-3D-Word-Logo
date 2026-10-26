/* =====================================================================
   FILE:      m4_shaders.js
   OWNER:     Member 4 - Lighting, Visual Effects & Extensions
   CONTAINS:  FRAG_SRC (lighting, colour modes, moss, tree colours) and OV_VERT/OV_FRAG (glowing mesh + drip lines)
   USES:      compiled by m1_webgl.js (FRAG_SRC) and m4_effects.js (OV_*)
   LOAD ORDER: 3 of 8
   VIDEO:     Explain the lighting, colour modes and glow shaders
   ===================================================================== */
"use strict";

// MEMBER 4: fragment shader - decides the final colour of every pixel of the logo
const FRAG_SRC = `
  precision mediump float;
  varying vec3 vMN; varying vec3 vP;
  varying vec3 vNormal;
  varying float vSide;
  varying vec2 vUV;
  uniform vec3 uFront;
  uniform vec3 uSide;
  uniform int  uMode;       // 0 solid, 1 gradient, 2 rainbow
  uniform float uTime;
  uniform bool uLighting;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 base;
    if (uMode == 3) {
      if (vSide > 0.5) {
        float h = fract(sin(dot(floor(vP.xy * 40.0), vec2(12.9898, 78.233))) * 43758.5453);
        vec3 moss = mix(vec3(0.22, 0.42, 0.16), vec3(0.45, 0.62, 0.22), h);
        base = (vMN.y > 0.2) ? moss : uSide * (0.85 + 0.3 * h);   // moss on top, wood below
      } else {
        float seam = step(fract(vUV.x * 6.0), 0.015) + step(fract(vUV.y * 3.0), 0.02);
        base = mix(uFront, uFront * 0.55, clamp(seam, 0.0, 1.0)); // thin panel seams
      }
    } else if (uMode == 0) {
      base = (vSide > 0.5) ? uSide : uFront;              // solid
    } else if (uMode == 1) {
      base = mix(uSide, uFront, vUV.y);                   // bottom -> top gradient
      if (vSide > 0.5) base *= 0.8;
    } else {
      base = hsv2rgb(vec3(fract(vUV.x * 0.6 + uTime * 0.15), 0.75, 1.0));
      if (vSide > 0.5) base *= 0.7;
    }
    if (vSide > 1.5) {                                      // trees: 2 leaf, 3 trunk, 4 autumn
      float h2 = fract(sin(dot(floor(vP.xy * 60.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (vSide > 3.5)      base = mix(vec3(0.85, 0.5, 0.15), vec3(0.7, 0.3, 0.1), h2);
      else if (vSide > 2.5) base = vec3(0.35, 0.22, 0.1);
      else                  base = mix(vec3(0.18, 0.4, 0.14), vec3(0.4, 0.62, 0.22), h2);
    }
    if (uLighting) {
      vec3 n = normalize(vNormal);
      vec3 L = normalize(vec3(0.4, 0.6, 1.0));            // fixed light, view space
      float diff = max(dot(n, L), 0.0);
      base *= 0.35 + 0.65 * diff;
    }
    gl_FragColor = vec4(base, 1.0);
  }`;

// MEMBER 4: shaders for the glowing teal mesh and drip lines
const OV_VERT = `
  precision mediump float;
  attribute vec3 aPos;
  attribute vec2 aPA;                 // x = pulse phase, y = fade
  uniform mat4 uMVP;
  uniform float uTime;
  uniform float uPointSize;
  varying vec2 vPA;
  void main() {
    gl_Position = uMVP * vec4(aPos, 1.0);
    vPA = aPA;
    gl_PointSize = uPointSize * (1.0 + 0.5 * sin(uTime * 2.0 + aPA.x * 6.2832));
  }`;
const OV_FRAG = `
  precision mediump float;
  varying vec2 vPA;
  uniform vec3 uColor;
  uniform float uBase, uPulse, uTime;
  uniform bool uRound;
  void main() {
    float a = uBase * vPA.y * (1.0 - uPulse + uPulse * (0.5 + 0.5 * sin(uTime * 2.0 + vPA.x * 6.2832)));
    if (uRound) { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; a *= 1.0 - d * 1.6; }
    gl_FragColor = vec4(uColor * a, a);   // premultiplied alpha
  }`;
