import { useEffect, useState } from 'react';
import { t } from '../../shared/i18n/id';
import { ROOM_LAMP, useStore } from '../../state/store';
import { play } from '../audio/audio';
import { bus } from '../interact/bus';
import { Facts } from './Facts';
import { Menu } from './Menu';
import { PlanCard } from './PlanCard';
import { Rail, toggleCompare, toggleFly } from './Rail';
import { TouchControls } from './TouchControls';
import './hud.css';

const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Keyboard shortcuts work while looking around (pointer locked), when the HUD cannot be clicked. */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const st = useStore.getState();
      if (st.menuOpen) return;
      const k = e.code;
      if (k === 'KeyF') toggleFly();
      else if (k === 'KeyM') st.set({ planOpen: !st.planOpen });
      else if (k === 'KeyI') st.set({ factsOpen: !st.factsOpen });
      else if (k === 'KeyB') toggleCompare();
      else if (k === 'KeyR') st.set({ tool: st.tool === 'measure' ? 'none' : 'measure' });
      else if (k === 'KeyP') st.set({ tool: st.tool === 'photo' ? 'none' : 'photo' });
      else if (k === 'KeyL' && st.room && st.variant === 'renovasi') { st.toggleLamp(ROOM_LAMP[st.room]); play('switch', 0.7); }
      else if (k === 'Escape') st.set({ planOpen: false, tool: st.tool === 'photo' ? 'none' : st.tool });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Notice() {
  const notice = useStore((s) => s.notice);
  const set = useStore((s) => s.set);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => set({ notice: null }), 3200);
    return () => clearTimeout(id);
  }, [notice, set]);
  return <p className="chip notice" role="status" aria-live="polite">{notice ?? ''}</p>;
}

function Prompt() {
  const target = useStore((s) => s.target);
  const locked = useStore((s) => s.locked);
  if (!target || (!locked && !touch)) return null;
  return (
    <p className="chip prompt">
      {!touch && <kbd>E</kbd>} {target.action}
    </p>
  );
}

function ToolBar() {
  const tool = useStore((s) => s.tool);
  const set = useStore((s) => s.set);
  if (tool === 'measure') {
    return (
      <div className="panel toolbar">
        <span className="label">{touch ? t.measureHintTouch : t.measureHint}</span>
        <button type="button" className="btn-ghost" onClick={() => bus.emit('measure-clear')}>{t.measureClear}</button>
        <button type="button" className="btn-ghost" onClick={() => set({ tool: 'none' })}>{t.done}</button>
      </div>
    );
  }
  if (tool === 'photo') {
    return (
      <div className="panel toolbar photo-bar">
        <button type="button" className="btn-primary" onClick={() => bus.emit('capture')}>{t.photoTake}</button>
        <button type="button" className="btn-ghost" onClick={() => set({ tool: 'none' })}>{t.done}</button>
      </div>
    );
  }
  return null;
}

/** Desktop: clicking the scene captures the mouse. The hint fades after a few seconds so it does not sit on the view. */
function LookOverlay() {
  const [shown, setShown] = useState(true);
  useEffect(() => { const id = setTimeout(() => setShown(false), 4500); return () => clearTimeout(id); }, []);
  return (
    <button id="look" className="look" type="button" aria-label={t.lockHint}>
      <span className={`chip look-hint ${shown ? '' : 'look-hint-off'}`}>{t.lockHint}</span>
    </button>
  );
}

export function Hud() {
  const locked = useStore((s) => s.locked);
  const menuOpen = useStore((s) => s.menuOpen);
  const factsOpen = useStore((s) => s.factsOpen);
  const tool = useStore((s) => s.tool);
  const variant = useStore((s) => s.variant);
  const loading = useStore((s) => s.loading);
  useShortcuts();
  const photo = tool === 'photo';

  return (
    <div className={`hud ${locked ? 'hud-locked' : ''} ${photo ? 'hud-photo' : ''} ${touch ? 'hud-touch' : ''}`}>
      {!touch && !locked && !menuOpen && <LookOverlay />}
      {(locked || touch) && !photo && <span className="crosshair" aria-hidden="true" />}
      <p className="chip disclaimer">{variant === 'eksisting' ? t.before : t.disclaimer}</p>
      {!photo && <PlanCard />}
      {!photo && factsOpen && variant === 'renovasi' && <Facts />}
      {!photo && <Rail />}
      <Prompt />
      <ToolBar />
      {touch && !photo && <TouchControls />}
      {loading && <p className="chip loading" role="status">{loading}</p>}
      <Notice />
      {menuOpen && <Menu />}
    </div>
  );
}
