import { useEffect, useRef } from 'react';
import type { Tier } from '../../core/quality';
import { t } from '../../shared/i18n/id';
import { useStore } from '../../state/store';
import { setMuted } from '../audio/audio';
import { detected } from '../quality/detected';

/** Settings dialog: graphics tier (auto or fixed), sound, controls, about. */
export function Menu() {
  const quality = useStore((s) => s.quality);
  const tier = useStore((s) => s.tier);
  const sound = useStore((s) => s.sound);
  const set = useStore((s) => s.set);
  const ref = useRef<HTMLDialogElement>(null);
  const touch = matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    const onClose = () => set({ menuOpen: false });
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, [set]);

  const choose = (q: Tier | 'auto') => set({ quality: q, tier: q === 'auto' ? detected.tier : q });

  return (
    <dialog ref={ref} className="panel menu" aria-label={t.menu}>
      <section>
        <h2>{t.graphics}</h2>
        <div className="seg" role="radiogroup" aria-label={t.graphics}>
          {(['auto', 0, 1, 2, 3] as const).map((q) => (
            <label key={q} className={`seg-item ${quality === q ? 'on' : ''}`}>
              <input type="radio" name="q" checked={quality === q} onChange={() => choose(q)} />
              {q === 'auto' ? t.graphicsAuto : t.tiers[q]}
            </label>
          ))}
        </div>
        <p className="label">{t.graphicsNow(t.tiers[tier], detected.gpu)}</p>
        <p className="label">{t.graphicsNote}</p>
      </section>
      <section>
        <h2>{t.sound}</h2>
        <label className="switch-row">
          <input type="checkbox" checked={sound} onChange={(e) => { set({ sound: e.target.checked }); setMuted(!e.target.checked); }} />
          <span>{sound ? t.soundOn : t.soundOff}</span>
        </label>
      </section>
      <section>
        <h2>{t.controls}</h2>
        <dl className="keys">
          {(touch ? t.controlsTouch : t.controlsDesk).map(([k, v]) => (
            <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h2>{t.about}</h2>
        <p className="label">{t.aboutText}</p>
      </section>
      <form method="dialog"><button className="btn-primary" type="submit" autoFocus>{t.back}</button></form>
    </dialog>
  );
}
