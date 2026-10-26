import { useState } from 'react';
import { formatHour, daylight } from '../../core/time';
import { t } from '../../shared/i18n/id';
import { LAMP_GROUPS, LAMP_LABEL, ROOM_LAMP, useStore } from '../../state/store';
import { play } from '../audio/audio';
import { canFly } from '../player/Player';
import { Icon, type IconName } from './icons';

export function toggleFly() {
  const st = useStore.getState();
  if (st.mode === 'walk' && !canFly()) return st.set({ notice: t.flyOnlyOutside });
  st.set({ mode: st.mode === 'walk' ? 'fly' : 'walk' });
  play('toggle', 0.6);
}

export function toggleCompare() {
  const st = useStore.getState();
  st.set({ variant: st.variant === 'renovasi' ? 'eksisting' : 'renovasi', tool: st.tool === 'photo' ? 'photo' : 'none' });
  play('toggle', 0.6);
}

function RailButton({ icon, label, on, onClick, hint, pressed }: { icon: IconName; label: string; on?: boolean; onClick: () => void; hint?: string; pressed?: boolean }) {
  return (
    <button type="button" className={`btn ${on ? 'on' : ''}`} onClick={onClick} title={hint ? `${label} (${hint})` : label}
      aria-pressed={pressed}>
      <Icon name={icon} />{label}
    </button>
  );
}

/** Mode rail (V2): one place for every tool, the active one marked in sage. */
export function Rail() {
  const mode = useStore((s) => s.mode);
  const tool = useStore((s) => s.tool);
  const variant = useStore((s) => s.variant);
  const set = useStore((s) => s.set);
  const [pop, setPop] = useState<'lamps' | 'time' | null>(null);
  const toggle = (p: 'lamps' | 'time') => setPop((x) => (x === p ? null : p));

  return (
    <div className="rail-wrap">
      {pop === 'lamps' && <LampsPopover />}
      {pop === 'time' && <TimePopover />}
      <nav className="panel rail" aria-label="Mode">
        {/* an action, not a status: "Terbang" while walking; while flying it is marked active and offers to land */}
        <RailButton icon={mode === 'fly' ? 'walk' : 'fly'} label={mode === 'fly' ? t.modeLand : t.modeFly} on={mode === 'fly'} onClick={toggleFly} hint="F" pressed={mode === 'fly'} />
        <RailButton icon="lamp" label={t.lamps} on={pop === 'lamps'} onClick={() => toggle('lamps')} hint="L" />
        <RailButton icon="time" label={t.time} on={pop === 'time'} onClick={() => toggle('time')} />
        <RailButton icon="measure" label={t.measure} on={tool === 'measure'} onClick={() => set({ tool: tool === 'measure' ? 'none' : 'measure' })} hint="R" pressed={tool === 'measure'} />
        <RailButton icon="compare" label={t.compare} on={variant === 'eksisting'} onClick={toggleCompare} hint="B" pressed={variant === 'eksisting'} />
        <RailButton icon="photo" label={t.photo} onClick={() => set({ tool: 'photo' })} hint="P" />
        <RailButton icon="menu" label={t.menu} onClick={() => set({ menuOpen: true })} />
      </nav>
    </div>
  );
}

function LampsPopover() {
  const lamps = useStore((s) => s.lamps);
  const room = useStore((s) => s.room);
  const variant = useStore((s) => s.variant);
  const toggleLamp = useStore((s) => s.toggleLamp);
  const here = room ? ROOM_LAMP[room] : null;
  return (
    <div className="panel popover" role="group" aria-label={t.lamps}>
      {variant === 'eksisting' && <p className="label">Lampu hanya ada di rumah sesudah renovasi.</p>}
      {LAMP_GROUPS.map((g) => (
        <label key={g} className={`switch-row ${g === here ? 'switch-here' : ''}`}>
          <input type="checkbox" checked={lamps[g]} onChange={() => { toggleLamp(g); play('switch', 0.7); }} disabled={variant === 'eksisting'} />
          <span>{LAMP_LABEL[g]}</span>
        </label>
      ))}
    </div>
  );
}

function TimePopover() {
  const time = useStore((s) => s.time);
  const set = useStore((s) => s.set);
  return (
    <div className="panel popover">
      <label className="time">
        <span className="label">{t.timeLabel} <b className="mono">{formatHour(daylight(time).hour)}</b></span>
        <input type="range" min={0} max={100} step={1} value={Math.round(time * 100)} onChange={(e) => set({ time: +e.target.value / 100 })}
          aria-valuetext={formatHour(daylight(time).hour)} />
        <span className="time-scale label"><span>Siang</span><span>Senja</span><span>Malam</span></span>
      </label>
    </div>
  );
}
