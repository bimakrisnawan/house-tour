// Shared input written by keyboard listeners and the touch controls, read once per frame by the player.
// Mutable on purpose: input changes every frame and must not re-render React.
export const input = {
  moveX: 0, // -1 left .. 1 right (joystick)
  moveY: 0, // -1 back .. 1 forward
  lookX: 0, // accumulated touch-drag pixels since the last frame
  lookY: 0,
  up: false,
  down: false,
  run: false,
};

const keys = new Set<string>();
export const keyDown = (code: string) => keys.has(code);

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear()); // tab switch: no stuck keys
}

export function keyboardMove(): { x: number; y: number; up: boolean; down: boolean; run: boolean } {
  return {
    x: +(keys.has('KeyD') || keys.has('ArrowRight')) - +(keys.has('KeyA') || keys.has('ArrowLeft')),
    y: +(keys.has('KeyW') || keys.has('ArrowUp')) - +(keys.has('KeyS') || keys.has('ArrowDown')),
    up: keys.has('Space'),
    down: keys.has('KeyC') || keys.has('ControlLeft'),
    run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}
