import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCan } from './can.js';
import { createLabelTexture, createDropletsTexture, createBubbleTexture } from './textures.js';

const canvas = document.getElementById('can-canvas');
const loader = document.getElementById('loader');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// As fontes precisam estar prontas antes de desenhar o rótulo no canvas
await Promise.all([
  document.fonts.load('250px Pacifico'),
  document.fonts.load('700 58px Outfit'),
  document.fonts.load('italic 500 54px Fraunces'),
]).catch(() => {});

// ---------- Renderer / cena ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 0, 5);

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff7ab8, 2.2);
rim.position.set(-4, 1, -3);
scene.add(rim);
scene.add(new THREE.AmbientLight(0xffe6f0, 0.35));

// ---------- Lata ----------
const can = createCan({
  labelTexture: createLabelTexture(renderer),
  dropletsTexture: createDropletsTexture(),
});
scene.add(can.object);

// ---------- Bolhas ----------
const BUBBLES = 90;
const bubblePos = new Float32Array(BUBBLES * 3);
const bubbleSpeed = new Float32Array(BUBBLES);
for (let i = 0; i < BUBBLES; i++) resetBubble(i, true);
const bubbleGeo = new THREE.BufferGeometry();
bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
const bubbles = new THREE.Points(
  bubbleGeo,
  new THREE.PointsMaterial({
    map: createBubbleTexture(),
    color: 0xff8fc4,
    size: 0.07,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
    alphaTest: 0.02,
  })
);
scene.add(bubbles);

function resetBubble(i, anyHeight) {
  const a = Math.random() * Math.PI * 2;
  const r = 0.5 + Math.random() * 0.9;
  bubblePos[i * 3] = Math.cos(a) * r;
  bubblePos[i * 3 + 1] = anyHeight ? -1.5 + Math.random() * 3 : -1.5;
  bubblePos[i * 3 + 2] = Math.sin(a) * r * 0.6;
  bubbleSpeed[i] = 0.12 + Math.random() * 0.3;
}

// ---------- Poses por seção (scroll) ----------
const sections = [...document.querySelectorAll('[data-can]')];
const poses = sections.map((el) => {
  const [x, y, s, rx, rz] = el.dataset.can.split(',').map(Number);
  return { x, y, s, rx, rz };
});

const current = { x: poses[0].x, y: -0.6, s: 0.6, rx: 0, rz: 0 };
const isMobile = () => window.innerWidth < 820;

function targetPose() {
  const mid = window.scrollY + window.innerHeight / 2;
  const centers = sections.map((el) => el.offsetTop + el.offsetHeight / 2);
  let i = 0;
  while (i < centers.length - 1 && mid > centers[i + 1]) i++;
  const a = poses[i];
  const b = poses[Math.min(i + 1, poses.length - 1)];
  let t = 0;
  if (i < centers.length - 1) {
    t = THREE.MathUtils.clamp((mid - centers[i]) / (centers[i + 1] - centers[i]), 0, 1);
    t = t * t * (3 - 2 * t);
  }
  const lerp = (k) => a[k] + (b[k] - a[k]) * t;
  const pose = { x: lerp('x'), y: lerp('y'), s: lerp('s'), rx: lerp('rx'), rz: lerp('rz') };
  if (isMobile()) {
    const last = i === poses.length - 1 || (i === poses.length - 2 && t > 0.5);
    pose.x = 0;
    pose.y = last ? -0.12 : -1;
    pose.s *= last ? 0.9 : 0.66;
  }
  return pose;
}

// ---------- Interação: arrastar para girar ----------
let spin = 0;              // rotação acumulada em Y
let spinVelocity = 0;
let autoSpin = !reducedMotion;
let showTop = false;
let dragging = false;
let lastX = 0;
let tiltDrag = 0;          // inclinação extra enquanto arrasta verticalmente
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  spinVelocity = 0;
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  spinVelocity = dx * 0.01;
  spin += spinVelocity;
  if (e.pointerType === 'mouse') {
    tiltDrag = THREE.MathUtils.clamp(tiltDrag + dy * 0.006, -0.9, 0.9);
  }
});
const endDrag = () => {
  dragging = false;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---------- Controles da seção 360° ----------
document.querySelectorAll('.controls [data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    const action = btn.dataset.action;
    if (action === 'spin') autoSpin = on;
    if (action === 'cold') can.setCold(on);
    if (action === 'top') showTop = on;
  });
});

// Link ativo na navegação
const navLinks = [...document.querySelectorAll('.nav nav a')];
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  },
  { threshold: 0.5 }
);
sections.forEach((s) => observer.observe(s));

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Afasta a câmera em telas estreitas para a lata caber
  camera.position.z = w / h < 0.8 ? 6.4 : 5;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Loop ----------
const clock = new THREE.Clock();
const damp = (from, to, lambda, dt) => THREE.MathUtils.damp(from, to, lambda, dt);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const target = targetPose();

  current.x = damp(current.x, target.x, 4, dt);
  current.y = damp(current.y, target.y, 4, dt);
  current.s = damp(current.s, target.s, 4, dt);
  current.rx = damp(current.rx, showTop ? 1.05 : target.rx + tiltDrag, 4, dt);
  current.rz = damp(current.rz, showTop ? 0 : target.rz, 4, dt);

  if (!dragging) {
    spinVelocity *= Math.pow(0.04, dt);
    spin += spinVelocity;
    if (autoSpin) spin += dt * 0.45;
    tiltDrag = damp(tiltDrag, 0, 1.5, dt);
  }

  // Largura visível na distância da lata → posição horizontal relativa
  const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
  const floatY = reducedMotion ? 0 : Math.sin(t * 1.3) * 0.04;

  const obj = can.object;
  obj.position.set(current.x * halfW * 2, current.y + floatY, 0);
  obj.scale.setScalar(current.s);
  obj.rotation.set(current.rx, -Math.PI / 2 + spin, current.rz, 'XZY');

  bubbles.position.copy(obj.position);
  bubbles.scale.setScalar(current.s);
  if (!reducedMotion) {
    for (let i = 0; i < BUBBLES; i++) {
      bubblePos[i * 3 + 1] += bubbleSpeed[i] * dt;
      bubblePos[i * 3] += Math.sin(t * 2 + i) * 0.0008;
      if (bubblePos[i * 3 + 1] > 1.5) resetBubble(i, false);
    }
    bubbleGeo.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
loader.classList.add('done');
