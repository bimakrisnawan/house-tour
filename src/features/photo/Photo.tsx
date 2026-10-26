import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ROOMS } from '../../core/rooms';
import { useStore } from '../../state/store';
import { play } from '../audio/audio';
import { bus } from '../interact/bus';

/** Photo mode: the HUD hides; "Ambil foto" renders one frame and downloads it as PNG. */
export function Photo() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => bus.on('capture', () => {
    gl.render(scene, camera); // the drawing buffer is cleared after compositing, so read it in the same task
    const url = gl.domElement.toDataURL('image/png');
    const room = ROOMS.find((r) => r.id === useStore.getState().room)?.name ?? 'Halaman';
    const a = document.createElement('a');
    a.href = url; a.download = `Rumah - ${room} - ${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.png`;
    a.click();
    play('click', 0.8);
    useStore.getState().set({ notice: 'Foto tersimpan di folder unduhan.' });
  }), [gl, scene, camera]);
  return null;
}
