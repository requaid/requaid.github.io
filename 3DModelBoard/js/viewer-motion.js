import { MOTION_BUILDERS, MOTION_LABELS } from './motion-procedural.js';
import { resetToTpose } from './viewer-models.js';

export function createMotionController(ctx, { onStatusChange } = {}) {
  let currentGroup = null;
  let currentMotion = null;
  let ownsGroup = false;

  const status = (msg) => { if (onStatusChange) onStatusChange(msg); };

  function stopCurrent() {
    if (currentGroup) {
      try { currentGroup.stop(); } catch {}
      if (ownsGroup) { try { currentGroup.dispose(); } catch {} }
    }
    currentGroup = null;
    ownsGroup = false;
    currentMotion = null;
    ctx.animationGroup = null;
    resetToTpose(ctx);
  }

  function playBuiltIn(name) {
    if (!ctx.currentModel) return false;
    const builder = MOTION_BUILDERS[name];
    if (!builder) return false;
    stopCurrent();
    const group = builder(ctx);
    if (!group) {
      status('본을 찾을 수 없어 ' + (MOTION_LABELS[name] || name) + ' 적용 실패');
      return false;
    }
    currentGroup = group;
    ownsGroup = true;
    ctx.animationGroup = group;
    group.start(true, 1.0);
    currentMotion = name;
    status((MOTION_LABELS[name] || name) + ' 재생중');
    return true;
  }

  function playClip(group, label) {
    if (!group) return false;
    stopCurrent();
    currentGroup = group;
    ownsGroup = false;
    ctx.animationGroup = group;
    group.start(true, 1.0);
    currentMotion = 'custom';
    status((label || '커스텀 모션') + ' 재생중');
    return true;
  }

  function pause() {
    if (currentGroup) {
      try { currentGroup.pause(); } catch {}
      status('일시정지');
    }
  }

  function resume() {
    if (currentGroup) {
      try { currentGroup.play(true); } catch {}
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
  function isPlaying() { return !!(currentGroup && currentGroup.isPlaying); }

  return { playBuiltIn, playClip, pause, resume, reset, stopCurrent, getCurrent, isPlaying };
}
