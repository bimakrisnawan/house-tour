import { useEffect, useRef, useState } from 'react';
import { roomSize } from '../../core/format';
import { PLAN, PLAN_CROP, planHeading, worldToPlan } from '../../core/plan';
import { ENTRY, ROOMS } from '../../core/rooms';
import { t } from '../../shared/i18n/id';
import { useStore } from '../../state/store';
import { play } from '../audio/audio';
import { cameraDir } from '../player/camera';
import { playerPos, teleport } from '../player/Player';
import { Icon } from './icons';

const CW = PLAN_CROP.x1 - PLAN_CROP.x0;
const CH = PLAN_CROP.y1 - PLAN_CROP.y0;
const pct = (px: number, py: number) => [((px - PLAN_CROP.x0) / CW) * 100, ((py - PLAN_CROP.y0) / CH) * 100];

function useNarrow() {
  const q = '(max-width: 720px)';
  const [narrow, setNarrow] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q); const on = () => setNarrow(m.matches);
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}

/** V2 "Denah pemandu": the real plan render with "you are here", view cone and clickable rooms. */
export function PlanCard() {
  const room = useStore((s) => s.room);
  const big = useStore((s) => s.planOpen);
  const variant = useStore((s) => s.variant);
  const area = useStore((s) => s.area);
  const set = useStore((s) => s.set);
  const here = useRef<HTMLSpanElement>(null);
  const current = ROOMS.find((r) => r.id === room);
  const old = variant === 'eksisting'; // room boxes and sizes describe the renovated plan only
  const narrow = useNarrow();

  useEffect(() => { // marker follows the player without re-rendering React
    let raf = 0;
    const tick = () => {
      const [px, py] = worldToPlan(playerPos.x, playerPos.z);
      const [l, tp] = pct(px, py);
      if (here.current) {
        // outside the drawing (street, far yard): pinned to the edge, drawn hollow, still pointing your way
        const out = l < 0 || l > 100 || tp < 0 || tp > 100;
        here.current.classList.toggle('here-out', out);
        here.current.style.left = `${Math.min(98, Math.max(2, l))}%`; here.current.style.top = `${Math.min(96, Math.max(4, tp))}%`;
        here.current.style.transform = `rotate(${planHeading(cameraDir.x, cameraDir.z)}rad)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (id: (typeof ROOMS)[number]['id']) => {
    const [x, z, yaw] = ENTRY[id];
    teleport.to = { x, z, yaw };
    play('click', 0.6);
    set({ factsOpen: true, planOpen: false, mode: 'walk' });
  };

  return (
    <section className={`panel plan ${big ? 'plan-big' : ''} ${old ? 'plan-old' : ''}`} aria-label={t.planTitle}>
      <header className="plan-head">
        <div>
          {big && <span className="label plan-kicker">{t.planTitle}</span>}
          <b className="plan-room">{old ? t.oldHouse : current?.name ?? (area === 'depan' ? t.street : t.outside)}</b>
          {current && !old && <span className="mono label nowrap"> {roomSize(current.w, current.d)}</span>}
        </div>
        <div className="plan-actions">
          {current && !old && (
            <button type="button" className="icon-btn" onClick={() => set({ factsOpen: !useStore.getState().factsOpen })} aria-label={t.facts} title={`${t.facts} (I)`}>
              <Icon name="info" />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => set({ planOpen: !big })} aria-label={big ? t.planClose : t.planBig} title={`${big ? t.planClose : t.planBig} (M)`}>
            <Icon name={big ? 'close' : 'plan'} />
          </button>
        </div>
      </header>
      <div className="map">
        <img src="/assets/denah.webp" alt="" draggable={false}
          style={{ width: `${(PLAN.w / CW) * 100}%`, left: `${(-PLAN_CROP.x0 / CW) * 100}%`, top: `${(-PLAN_CROP.y0 / CH) * 100}%` }} />
        {ROOMS.map((r) => {
          const [px, py] = worldToPlan(r.x, r.z);
          const w = r.d / PLAN.mPerPx; const h = r.w / PLAN.mPerPx; // image x follows depth, image y follows width
          const [l, tp] = pct(px - w / 2, py - h / 2);
          return (
            <button key={r.id} type="button" className={`zone ${r.id === room ? 'zone-on' : ''}`} onClick={() => go(r.id)} disabled={old}
              style={{ left: `${l}%`, top: `${tp}%`, width: `${(w / CW) * 100}%`, height: `${(h / CH) * 100}%` }}
              aria-label={`Pindah ke ${r.name}`} title={r.name}>
              <span className="zone-name">{narrow ? r.short : r.name}</span>
            </button>
          );
        })}
        <span className="here" ref={here} aria-hidden="true"><s /><i /></span>
      </div>
      {!old && <p className="label plan-hint desk-only">{t.planHint}</p>}
      {variant === 'eksisting' && <p className="label plan-hint">{t.planOld}</p>}
      <p className="label plan-note">{variant === 'eksisting' ? t.before : t.disclaimerLong}</p>
    </section>
  );
}
