// Tiny event bus between DOM controls (buttons) and canvas components (which own the camera and renderer).
type Name = 'act' | 'capture' | 'measure-clear';
const handlers = new Map<Name, Set<() => void>>();

export const bus = {
  on(name: Name, fn: () => void) {
    (handlers.get(name) ?? handlers.set(name, new Set()).get(name)!).add(fn);
    return () => { handlers.get(name)!.delete(fn); };
  },
  emit(name: Name) {
    handlers.get(name)?.forEach((fn) => fn());
  },
};
