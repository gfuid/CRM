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
  TubeGeometry, Color, RingGeometry, DoubleSide, CanvasTexture, Raycaster, Vector2,
} from 'three';
import LAND from './landDots.json';

const R = 1;
// Exporter hub and buyer ports (lat, lon)
export const HUB = { name: 'Nhava Sheva, India', lat: 18.95, lon: 72.95 };
export const PORTS = [
  { name: 'Jebel Ali, UAE', lat: 25.01, lon: 55.06, kind: 'wa', event: 'WhatsApp read', detail: 'Al-Zahra Trading asked for today\u2019s CIF price' },
  { name: 'Rotterdam, Netherlands', lat: 51.95, lon: 4.14, kind: 'quote', event: 'Proforma sent', detail: 'Global Agri Impex \u00b7 Rice DDGS 80 MT \u00b7 LC at sight' },
  { name: 'Lagos, Nigeria', lat: 6.45, lon: 3.39, kind: 'call', event: 'Follow-up due 11:00', detail: 'Logos Grain Traders \u00b7 feedback on Jowar price' },
  { name: 'Ho Chi Minh City, Vietnam', lat: 10.77, lon: 106.7, kind: 'quote', event: 'Quotation sent', detail: 'Saigon Feed Mill \u00b7 Corn DDGS 250 MT \u00b7 CIF' },
  { name: 'Colombo, Sri Lanka', lat: 6.93, lon: 79.85, kind: 'email', event: 'Email opened 3 times', detail: 'Thathsara Enterprises \u00b7 protein report' },
  { name: 'Mombasa, Kenya', lat: -4.04, lon: 39.67, kind: 'ai', event: 'AI call \u00b7 Interested', detail: 'Kenya Poultry Feeds \u00b7 60 MT maize monthly' },
  { name: 'Chittagong, Bangladesh', lat: 22.33, lon: 91.8, kind: 'won', event: 'Order confirmed', detail: 'Dhaka Agro Industries \u00b7 DORB 120 MT' },
  { name: 'Singapore', lat: 1.26, lon: 103.8, kind: 'email', event: 'Campaign link clicked', detail: 'Price list opened by the buyer' },
  { name: 'Jeddah, Saudi Arabia', lat: 21.48, lon: 39.17, kind: 'wa', event: 'Buyer replied PRICE', detail: 'Auto reply sent the price list' },
  { name: 'New York, USA', lat: 40.68, lon: -74.04, kind: 'ai', event: 'AI call \u00b7 Call back', detail: 'Asked to call again on Monday' },
  { name: 'Hamburg, Germany', lat: 53.54, lon: 9.98, kind: 'quote', event: 'Sample dispatched', detail: 'DHL waybill shared on WhatsApp' },
  { name: 'Santos, Brazil', lat: -23.96, lon: -46.3, kind: 'call', event: 'New lead added', detail: 'From the trade fair list' },
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

export async function createGlobe(canvas, { onReady, onHover, onSelect, calm = false } = {}) {
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

  // Starfield behind the globe (moves a little with the pointer: depth)
  const starPos = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    const r = 5 + Math.random() * 7; const th = Math.random() * Math.PI * 2; const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th); starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); starPos[i * 3 + 2] = -Math.abs(r * Math.cos(ph)) - 1;
  }
  const starGeo = keep(new BufferGeometry());
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  const stars = new Points(starGeo, keep(new PointsMaterial({ size: 0.035, color: 0xcfe9ff, transparent: true, opacity: 0.7, depthWrite: false })));
  scene.add(stars);

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
  const pickGeo = keep(new SphereGeometry(0.075, 8, 8));
  const pickMat = keep(new MeshBasicMaterial({ visible: false }));
  const picks = [];
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
    // Invisible, larger target so a port is easy to point at
    const pick = new Mesh(pickGeo, pickMat);
    pick.position.copy(end);
    pick.userData.port = idx;
    world.add(pick);
    picks.push(pick);
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

  // ---- interaction ----
  // Drag (mouse or finger) spins the globe; the pointer tilts it and moves the stars;
  // pointing at a port shows its card (onHover), a click turns the globe to it (onSelect).
  const BASE_SPIN = calm ? 0.0009 : 0.0019;
  let dragging = false; let moved = 0; let lastX = 0; let velocity = BASE_SPIN; let targetTiltX = 0.32; let tiltX = 0.32;
  let boost = 0; let flyTo = null; let hovered = -1;
  const ray = new Raycaster(); const ndc = new Vector2(); const tmp = new Vector3();
  const starTarget = { x: 0, y: 0 };
  let pendingPick = null;
  const frontAngle = (lon) => -((lon + 180) * Math.PI) / 180 + Math.PI / 2;
  const select = (idx) => {
    const p = PORTS[idx];
    if (!p) return;
    let target = frontAngle(p.lon);
    target += Math.round((world.rotation.y - target) / (Math.PI * 2)) * Math.PI * 2; // turn the short way
    flyTo = { y: target, x: Math.max(-0.5, Math.min(0.9, ((p.lat * Math.PI) / 180) * 0.8)), hold: 0 };
    velocity = 0;
    if (onSelect) onSelect(p, idx);
  };
  const onDown = (e) => { dragging = true; moved = 0; lastX = e.clientX; };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; const ny = (e.clientY - rect.top) / rect.height;
    targetTiltX = 0.32 + (ny - 0.5) * 0.35;
    starTarget.x = (nx - 0.5) * 0.12; starTarget.y = (ny - 0.5) * 0.08;
    pendingPick = { x: nx * 2 - 1, y: -(ny * 2 - 1), cx: e.clientX - rect.left, cy: e.clientY - rect.top };
    if (!dragging) return;
    const dx = e.clientX - lastX; moved += Math.abs(dx);
    if (moved > 6) flyTo = null;
    velocity = dx * 0.0009;
    world.rotation.y += velocity * 4;
    lastX = e.clientX;
  };
  const onUp = () => {
    if (dragging && moved < 6 && hovered >= 0) select(hovered);
    dragging = false;
  };
  const onLeave = () => {
    pendingPick = null;
    if (hovered >= 0) { hovered = -1; canvas.style.cursor = ''; if (onHover) onHover(null); }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
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
  let raf = 0; let visible = true; let lost = false; const t0 = performance.now();
  const frame = (now) => {
    raf = 0;
    const t = (now - t0) / 1000;
    if (flyTo) {
      world.rotation.y += (flyTo.y - world.rotation.y) * 0.06;
      tiltX += (flyTo.x - tiltX) * 0.06;
      if (Math.abs(flyTo.y - world.rotation.y) < 0.003 && ++flyTo.hold > 240) flyTo = null; // rest ~4 s, then spin again
    } else {
      if (!dragging) { velocity += (BASE_SPIN + boost - velocity) * 0.03; world.rotation.y += velocity; }
      tiltX += (targetTiltX - tiltX) * 0.05;
    }
    boost *= 0.94;
    world.rotation.x = tiltX;
    stars.rotation.y += (starTarget.x - stars.rotation.y) * 0.04;
    stars.rotation.x += (starTarget.y - stars.rotation.x) * 0.04;
    // What is under the pointer (once per frame, only after it moved); only ports on the near side count
    if (pendingPick && !dragging) {
      ndc.set(pendingPick.x, pendingPick.y);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(picks, false)[0];
      const idx = hit && hit.object.getWorldPosition(tmp).z > 0.15 ? hit.object.userData.port : -1;
      if (idx !== hovered) canvas.style.cursor = idx >= 0 ? 'pointer' : '';
      hovered = idx;
      if (onHover) onHover(idx >= 0 ? { port: PORTS[idx], x: pendingPick.cx, y: pendingPick.cy } : null);
      pendingPick = null;
    }
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
    /** Spin faster for a moment (while the page scrolls) */
    kick(v) { boost = Math.min(0.03, boost + Math.abs(v)); },
    /** Turn to a port (buttons outside the canvas) */
    select,
    destroy() {
      stop();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointerup', onUp);
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
  };
}
