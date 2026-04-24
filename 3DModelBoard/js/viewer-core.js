import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getBoneNode } from './viewer-vrm.js';

export function createViewer({ canvas, container }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.2, 4);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(3, 5, 3);
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(0x88aaff, 0x443322, 0.4));

  const grid = new THREE.GridHelper(10, 20, 0x444466, 0x333355);
  scene.add(grid);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 0.5;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.9;

  const clock = new THREE.Clock();

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);
  onResize();

  const ctx = {
    renderer, scene, camera, controls, clock,
    mixer: null,
    currentModel: null,
    currentVRM: null,
    _beforeRender: [],
  };

  function centerModel(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    obj.position.x -= center.x;
    obj.position.y -= box.min.y;
    obj.position.z -= center.z;
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetY = size.y * 0.55;
    camera.position.set(0, targetY, maxDim * 2.2);
    controls.target.set(0, targetY, 0);
    controls.update();
  }
  ctx.centerModel = centerModel;

  function frameFullBody() {
    if (!ctx.currentModel) return false;
    const box = new THREE.Box3().setFromObject(ctx.currentModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetY = size.y * 0.55;
    camera.position.set(0, targetY, maxDim * 2.2);
    controls.target.set(0, targetY, 0);
    controls.update();
    renderer.render(scene, camera);
    return true;
  }
  ctx.frameFullBody = frameFullBody;

  function frameHead() {
    if (!ctx.currentModel) return false;
    const head = getBoneNode(ctx, 'head');
    if (!head) return false;
    const pos = new THREE.Vector3();
    head.getWorldPosition(pos);
    const box = new THREE.Box3().setFromObject(ctx.currentModel);
    const modelHeight = Math.max(0.01, box.max.y - box.min.y);
    const headHalf = Math.max(modelHeight * 0.065, 0.08);
    const fovRad = camera.fov * Math.PI / 180;
    const dist = (headHalf / Math.tan(fovRad / 2)) * 1.35;
    camera.position.set(pos.x, pos.y, pos.z + dist);
    controls.target.copy(pos);
    controls.update();
    renderer.render(scene, camera);
    return true;
  }
  ctx.frameHead = frameHead;

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    for (const fn of ctx._beforeRender) fn(delta);
    if (ctx.mixer) ctx.mixer.update(delta);
    if (ctx.currentVRM) ctx.currentVRM.update(delta);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  ctx.dispose = () => {
    ro.disconnect();
    if (ctx.currentModel) {
      scene.remove(ctx.currentModel);
      ctx.currentModel.traverse?.(obj => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose?.());
        }
      });
    }
    renderer.dispose();
  };

  return ctx;
}
