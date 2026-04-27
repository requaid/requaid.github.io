import {
  Engine, Scene,
  ArcRotateCamera,
  Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight,
  MeshBuilder,
} from '@babylonjs/core';

export function createViewer({ canvas, container }) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,   // required for renderer.toDataURL screenshots
    stencil: true,
    alpha: true,
    antialias: true,
    adaptToDeviceRatio: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0x1a / 255, 0x1a / 255, 0x2e / 255, 1);
  scene.ambientColor = new Color3(0.4, 0.4, 0.4);

  const camera = new ArcRotateCamera(
    'cam',
    -Math.PI / 2,        // alpha — facing model from -Z
    Math.PI / 2.2,       // beta  — slightly above horizon
    4,                   // radius
    new Vector3(0, 1.0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.fov = (30 * Math.PI) / 180;        // match prior 30° vertical FOV
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.lowerRadiusLimit = 0.5;
  camera.upperRadiusLimit = 15;
  camera.upperBetaLimit = Math.PI * 0.95;
  camera.wheelDeltaPercentage = 0.02;
  camera.pinchDeltaPercentage = 0.02;
  camera.inertia = 0.85;

  const dirLight = new DirectionalLight('dir', new Vector3(-1, -1.5, -1).normalize(), scene);
  dirLight.intensity = 1.2;
  dirLight.diffuse = new Color3(1, 1, 1);

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
  hemi.diffuse = new Color3(0.53, 0.67, 1);     // 0x88aaff
  hemi.groundColor = new Color3(0.27, 0.2, 0.13); // 0x443322

  const grid = buildGrid(scene);

  const ro = new ResizeObserver(() => engine.resize());
  ro.observe(container);
  engine.resize();

  const ctx = {
    engine,
    scene,
    camera,
    grid,
    currentModel: null,        // root TransformNode/AbstractMesh of the loaded model
    humanoid: null,            // { getBoneNode(humanoidName) } or null
    modelFormat: null,         // 'vrm' | 'pmx' | 'pmd' | null
    animationGroup: null,      // active Babylon AnimationGroup
    tposeSnapshot: null,       // baseline rotationQuaternions per node
    _beforeRender: [],
  };

  function centerModel(root) {
    if (!root) return;
    root.computeWorldMatrix?.(true);
    const bi = root.getHierarchyBoundingVectors?.(true) || boundsOfMesh(root);
    if (!bi) return;
    const sx = bi.max.x - bi.min.x;
    const sy = bi.max.y - bi.min.y;
    const sz = bi.max.z - bi.min.z;
    const cx = (bi.max.x + bi.min.x) / 2;
    const cz = (bi.max.z + bi.min.z) / 2;
    if (root.position) {
      root.position.x -= cx;
      root.position.y -= bi.min.y;
      root.position.z -= cz;
    }
    const maxDim = Math.max(sx, sy, sz, 0.5);
    camera.target = new Vector3(0, sy * 0.55, 0);
    camera.radius = maxDim * 2.2;
  }
  ctx.centerModel = centerModel;

  function frameFullBody() {
    if (!ctx.currentModel) return false;
    ctx.currentModel.computeWorldMatrix?.(true);
    const bi = ctx.currentModel.getHierarchyBoundingVectors?.(true);
    if (!bi) return false;
    const sx = bi.max.x - bi.min.x;
    const sy = bi.max.y - bi.min.y;
    const sz = bi.max.z - bi.min.z;
    const maxDim = Math.max(sx, sy, sz, 0.5);
    camera.target = new Vector3((bi.min.x + bi.max.x) / 2, bi.min.y + sy * 0.55, (bi.min.z + bi.max.z) / 2);
    camera.radius = maxDim * 2.2;
    camera.alpha = -Math.PI / 2;
    camera.beta = Math.PI / 2.2;
    scene.render();
    return true;
  }
  ctx.frameFullBody = frameFullBody;

  function frameHead() {
    if (!ctx.currentModel || !ctx.humanoid) return false;
    // Force the entire model hierarchy to recompute world matrices first —
    // centerModel() shifted root.position just before this call, and bones
    // need the updated parent transform before getAbsolutePosition() returns
    // a coordinate in current world space.
    ctx.currentModel.computeWorldMatrix?.(true);
    const head = ctx.humanoid.getBoneNode?.('head');
    if (!head) return false;
    head.computeWorldMatrix?.(true);
    const pos = head.getAbsolutePosition?.() ?? head.position;
    if (!pos) return false;
    const bi = ctx.currentModel.getHierarchyBoundingVectors?.(true);
    const modelHeight = Math.max(0.01, (bi?.max.y ?? 1.6) - (bi?.min.y ?? 0));

    // Defensive fallback: a humanoid head bone should sit comfortably in the
    // upper half of the model. If the resolved bone reports a Y below the
    // model's midpoint (handedness flip, mis-mapped bone, etc.), aim at the
    // bbox top instead so the camera at least frames the actual head.
    let targetY = pos.y;
    if (bi && targetY < bi.min.y + modelHeight * 0.5) {
      console.warn('[viewer] frameHead: head bone y looked invalid (y=' + pos.y.toFixed(3) +
        ', model y range ' + bi.min.y.toFixed(3) + '..' + bi.max.y.toFixed(3) +
        '), falling back to bbox-top.');
      targetY = bi.min.y + modelHeight * 0.92;
    }

    const headHalf = Math.max(modelHeight * 0.065, 0.08);
    const dist = (headHalf / Math.tan(camera.fov / 2)) * 1.35;
    camera.target = new Vector3(pos.x, targetY, pos.z);
    camera.radius = Math.max(dist, 0.3);
    camera.alpha = -Math.PI / 2;
    camera.beta = Math.PI / 2;
    scene.render();
    return true;
  }
  ctx.frameHead = frameHead;

  scene.registerBeforeRender(() => {
    const dt = engine.getDeltaTime() / 1000;
    for (const fn of ctx._beforeRender) {
      try { fn(dt); } catch (e) { console.error('beforeRender hook failed', e); }
    }
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  ctx.dispose = () => {
    ro.disconnect();
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };

  return ctx;
}

function boundsOfMesh(m) {
  if (!m?.getBoundingInfo) return null;
  const bi = m.getBoundingInfo().boundingBox;
  return { min: bi.minimumWorld, max: bi.maximumWorld };
}

function buildGrid(scene) {
  const size = 10, divisions = 20;
  const step = size / divisions;
  const half = size / 2;
  const lines = [];
  for (let i = 0; i <= divisions; i++) {
    const t = -half + i * step;
    lines.push([new Vector3(-half, 0, t), new Vector3(half, 0, t)]);
    lines.push([new Vector3(t, 0, -half), new Vector3(t, 0, half)]);
  }
  const mesh = MeshBuilder.CreateLineSystem('grid', { lines }, scene);
  mesh.color = new Color3(0x33 / 255, 0x33 / 255, 0x55 / 255);
  mesh.isPickable = false;
  return mesh;
}
