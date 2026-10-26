import { useEffect, useRef } from 'react';
import { t } from '../../shared/i18n/id';
import { useStore } from '../../state/store';
import { bus } from '../interact/bus';
import { input } from '../player/input';
import { Icon } from './icons';

const R = 56; // joystick travel in px

/** Phones and tablets: joystick (left) to walk, drag anywhere else to look, Aksi for the object in the middle. */
export function TouchControls() {
  const mode = useStore((s) => s.mode);
  const target = useStore((s) => s.target);
  const knob = useRef<HTMLSpanElement>(null);
  const pad = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pad.current!;
    let id: number | null = null; let cx = 0; let cy = 0;
    const down = (e: PointerEvent) => {
      id = e.pointerId; el.setPointerCapture(id);
      const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx; let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy); if (len > R) { dx *= R / len; dy *= R / len; }
      input.moveX = dx / R; input.moveY = -dy / R; input.run = len > R * 0.95;
      knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null; input.moveX = input.moveY = 0; input.run = false;
      knob.current!.style.transform = '';
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, []);

  useEffect(() => { // look: drag on the canvas
    const canvas = document.querySelector('.tour-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const last = new Map<number, [number, number]>();
    const down = (e: PointerEvent) => { if (e.pointerType === 'touch') last.set(e.pointerId, [e.clientX, e.clientY]); };
    const move = (e: PointerEvent) => {
      const p = last.get(e.pointerId); if (!p) return;
      input.lookX += e.clientX - p[0]; input.lookY += e.clientY - p[1];
      last.set(e.pointerId, [e.clientX, e.clientY]);
    };
    const up = (e: PointerEvent) => last.delete(e.pointerId);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); };
  }, []);

  const hold = (key: 'up' | 'down') => ({
    onPointerDown: () => { input[key] = true; },
    onPointerUp: () => { input[key] = false; },
    onPointerCancel: () => { input[key] = false; },
    onPointerLeave: () => { input[key] = false; },
  });

  return (
    <>
      <div className="joy" ref={pad} aria-hidden="true"><span ref={knob} /></div>
      <button type="button" className={`act ${target ? 'act-on' : ''}`} onClick={() => bus.emit('act')} disabled={!target}
        aria-label={target?.action ?? t.action}>
        {t.action}
      </button>
      {mode === 'fly' && (
        <div className="fly-pad">
          <button type="button" className="icon-btn panel" aria-label={t.up} {...hold('up')}><Icon name="up" /></button>
          <button type="button" className="icon-btn panel" aria-label={t.down} {...hold('down')}><Icon name="down" /></button>
        </div>
      )}
    </>
  );
}
