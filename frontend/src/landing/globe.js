/**
 * The hero's 3D trade globe (Three.js). One job: show buyers in many countries joined to the
 * exporter by live routes. Land dots come from Natural Earth 110m (public domain, via world-atlas).
 *
 *   const g = await createGlobe(canvas, { onReady }); ... g.destroy();
 *
 * Budget: device pixel ratio capped at 1.75, renders only while visible and the tab is shown,
 * no allocation per frame, and everything is disposed in destroy(). WebGL context loss is handled.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  Mesh, SphereGeometry, MeshBasicMaterial, ShaderMaterial, AdditiveBlending, BackSide, Vector3, CubicBezierCurve3,
  TubeGeometry, Color, RingGeometry, DoubleSide, CanvasTexture,
} from 'three';
import LAND from './landDots.json';

const R = 1;
// Exporter hub and buyer ports (lat, lon)
export const HUB = { name: 'Nhava Sheva, India', lat: 18.95, lon: 72.95 };
export const PORTS = [
  { name: 'Jebel Ali', lat: 25.01, lon: 55.06 },
  { name: 'Rotterdam', lat: 51.95, lon: 4.14 },
  { name: 'Lagos', lat: 6.45, lon: 3.39 },
  { name: 'Ho Chi Minh City', lat: 10.77, lon: 106.7 },
  { name: 'Colombo', lat: 6.93, lon: 79.85 },
  { name: 'Mombasa', lat: -4.04, lon: 39.67 },
  { name: 'Chittagong', lat: 22.33, lon: 91.8 },
  { name: 'Singapore', lat: 1.26, lon: 103.8 },
  { name: 'Jeddah', lat: 21.48, lon: 39.17 },
  { name: 'New York', lat: 40.68, lon: -74.04 },
  { name: 'Hamburg', lat: 53.54, lon: 9.98 },
  { name: 'Santos', lat: -23.96, lon: -46.3 },
];

const toVec = (lat, lon, r = R, out = new Vector3()) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
};

/** A soft round sprite for the dots (made once, no image file). */
const dotTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
};

export async function createGlobe(canvas, { onReady } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 0, 4.1);

  const world = new Group();
  scene.add(world);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // Ocean sphere (dark, slightly lit)
  const ocean = new Mesh(keep(new SphereGeometry(R * 0.995, 64, 64)), keep(new MeshBasicMaterial({ color: 0x0d2a42 })));
  world.add(ocean);

  // Atmosphere glow (fresnel rim)
  const glowMat = keep(new ShaderMaterial({
    uniforms: { c: { value: new Color(0x2dd4bf) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0,0.0,1.0))), 2.4); gl_FragColor = vec4(c, 1.0) * i * 0.55; }',
    blending: AdditiveBlending, side: BackSide, transparent: true, depthWrite: false,
  }));
  scene.add(new Mesh(keep(new SphereGeometry(R * 1.14, 48, 48)), glowMat));

  // Land dots
  const tex = keep(dotTexture());
  const pos = new Float32Array(LAND.length * 1.5);
  const v = new Vector3();
  for (let i = 0, j = 0; i < LAND.length; i += 2, j += 3) {
    toVec(LAND[i], LAND[i + 1], R * 1.001, v);
    pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z;
  }
  const landGeo = keep(new BufferGeometry());
  landGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  world.add(new Points(landGeo, keep(new PointsMaterial({ size: 0.03, map: tex, color: 0xb6f5d8, transparent: true, opacity: 1, depthWrite: false, alphaTest: 0.05 }))));

  // Routes: hub -> each port, raised arcs
  const hub = toVec(HUB.lat, HUB.lon);
  const routeMat = keep(new MeshBasicMaterial({ color: 0xfdc64a, transparent: true, opacity: 0.8 }));
  const packetGeo = keep(new SphereGeometry(0.014, 10, 10));
  const packetMat = keep(new MeshBasicMaterial({ color: 0xffffff }));
  const ringGeo = keep(new RingGeometry(0.018, 0.026, 28));
  const routes = PORTS.map((p, idx) => {
    const end = toVec(p.lat, p.lon);
    const dist = hub.distanceTo(end);
    const lift = 1 + Math.min(0.55, dist * 0.32);
    const c1 = hub.clone().lerp(end, 0.25).normalize().multiplyScalar(lift);
    const c2 = hub.clone().lerp(end, 0.75).normalize().multiplyScalar(lift);
    const curve = new CubicBezierCurve3(hub.clone(), c1, c2, end.clone());
    const tube = new Mesh(keep(new TubeGeometry(curve, 64, 0.0035, 6, false)), routeMat);
    world.add(tube);
    const packet = new Mesh(packetGeo, packetMat);
    world.add(packet);
    const ringMat = keep(new MeshBasicMaterial({ color: 0xf88f61, transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false }));
    const ring = new Mesh(ringGeo, ringMat);
    ring.position.copy(end).multiplyScalar(1.003);
    ring.lookAt(end.clone().multiplyScalar(2));
    world.add(ring);
    return { curve, packet, ring, ringMat, speed: 0.08 + (idx % 4) * 0.025, offset: idx / PORTS.length };
  });
  // Hub marker
  const hubMat = keep(new MeshBasicMaterial({ color: 0x58ba84 }));
  const hubDot = new Mesh(keep(new SphereGeometry(0.03, 16, 16)), hubMat);
  hubDot.position.copy(hub).multiplyScalar(1.004);
  world.add(hubDot);

  // Face India at the start, tilted a little
  world.rotation.y = -((HUB.lon + 180) * Math.PI) / 180 + Math.PI / 2 - 0.45;
  world.rotation.x = 0.32;

  // ---- interaction: drag (or touch) to spin, pointer gives a gentle tilt ----
  let dragging = false; let lastX = 0; let velocity = 0.0016; let targetTiltX = 0.32; let tiltX = 0.32;
  const onDown = (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    targetTiltX = 0.32 + ((e.clientY - rect.top) / rect.height - 0.5) * 0.35;
    if (!dragging) return;
    velocity = (e.clientX - lastX) * 0.0009;
    world.rotation.y += velocity * 4;
    lastX = e.clientX;
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ---- size ----
  const resize = () => {
    const w = canvas.clientWidth || 1; const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- render loop: only while on screen and the tab is visible ----
  let raf = 0; let visible = true; let lost = false; let t0 = performance.now();
  const frame = (now) => {
    raf = 0;
    const t = (now - t0) / 1000;
    if (!dragging) { velocity += (0.0016 - velocity) * 0.02; world.rotation.y += velocity; }
    tiltX += (targetTiltX - tiltX) * 0.05;
    world.rotation.x = tiltX;
    for (const r of routes) {
      const k = (t * r.speed + r.offset) % 1;
      r.curve.getPointAt(k, r.packet.position);
      const s = 1 + ((t * 0.9 + r.offset * 3) % 1) * 1.6;
      r.ring.scale.setScalar(s);
      r.ringMat.opacity = 0.9 * (1 - (s - 1) / 1.6);
    }
    renderer.render(scene, camera);
    if (visible && !document.hidden && !lost) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden && !lost) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.01 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e) => { e.preventDefault(); lost = true; stop(); canvas.dispatchEvent(new CustomEvent('globe-lost', { bubbles: true })); };
  canvas.addEventListener('webglcontextlost', onLost);

  renderer.render(scene, camera);
  if (onReady) onReady();
  start();

  return {
    destroy() {
      stop();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointerup', onUp);
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
  };
}
