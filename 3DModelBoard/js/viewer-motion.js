import * as THREE from 'three';
import { MOTION_BUILDERS, MOTION_LABELS } from './motion-procedural.js';
import { restoreTpose } from './viewer-vrm.js';

export function createMotionController(ctx, { onStatusChange }) {
  let currentAction = null;
  let currentMotion = null;
  const status = (msg) => { if (onStatusChange) onStatusChange(msg); };

  function stopCurrent() {
    if (currentAction) { currentAction.stop(); currentAction = null; }
    if (ctx.mixer) ctx.mixer.timeScale = 1;
    restoreTpose(ctx);
    currentMotion = null;
  }

  function playBuiltIn(name) {
    if (!ctx.mixer || !ctx.currentModel) return false;
    const builder = MOTION_BUILDERS[name];
    if (!builder) return false;
    stopCurrent();
    const clip = builder(ctx);
    if (!clip) {
      status('본을 찾을 수 없어 ' + (MOTION_LABELS[name] || name) + ' 적용 실패');
      return false;
    }
    currentAction = ctx.mixer.clipAction(clip);
    currentAction.setLoop(THREE.LoopRepeat);
    currentAction.play();
    ctx.mixer.timeScale = 1;
    currentMotion = name;
    status((MOTION_LABELS[name] || name) + ' 재생중');
    return true;
  }

  function playClip(clip, label) {
    if (!ctx.mixer) return false;
    stopCurrent();
    currentAction = ctx.mixer.clipAction(clip);
    currentAction.setLoop(THREE.LoopRepeat);
    currentAction.play();
    ctx.mixer.timeScale = 1;
    currentMotion = 'custom';
    status((label || '커스텀 모션') + ' 재생중');
    return true;
  }

  function pause() {
    if (ctx.mixer && currentAction) {
      ctx.mixer.timeScale = 0;
      status('일시정지');
    }
  }

  function resume() {
    if (ctx.mixer && currentAction) {
      ctx.mixer.timeScale = 1;
      if (currentMotion && MOTION_LABELS[currentMotion]) {
        status(MOTION_LABELS[currentMotion] + ' 재생중');
      }
    }
  }

  function reset() {
    stopCurrent();
    if (ctx.currentModel) ctx.centerModel(ctx.currentModel);
    status('대기');
  }

  function getCurrent() { return currentMotion; }
  function isPlaying() { return currentAction && ctx.mixer && ctx.mixer.timeScale > 0; }

  return { playBuiltIn, playClip, pause, resume, reset, stopCurrent, getCurrent, isPlaying };
}
