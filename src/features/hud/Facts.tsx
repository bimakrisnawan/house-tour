import { FACTS, HOUSE_FACTS } from '../../core/facts';
import { roomSize } from '../../core/format';
import { ROOMS } from '../../core/rooms';
import { t } from '../../shared/i18n/id';
import { useStore } from '../../state/store';
import { Icon } from './icons';

/** V3 "Kop gambar": the room's title block, opened from the plan or with I. */
export function Facts() {
  const room = useStore((s) => s.room);
  const set = useStore((s) => s.set);
  const r = ROOMS.find((x) => x.id === room);
  const rows = r ? FACTS[r.id] : HOUSE_FACTS;
  return (
    <aside className="panel kop" aria-label={t.facts}>
      <div className="kop-head">
        <div>
          <span className="label">{r ? 'Ruang' : t.lotRoof}</span>
          <b className="kop-title">{r?.name ?? t.houseFacts}</b>
          {r && <span className="mono">{roomSize(r.w, r.d)}</span>}
        </div>
        <button type="button" className="icon-btn" onClick={() => set({ factsOpen: false })} aria-label={t.factsClose}>
          <Icon name="close" />
        </button>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="kop-row"><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <p className="label kop-note">{t.factsNote}</p>
    </aside>
  );
}
