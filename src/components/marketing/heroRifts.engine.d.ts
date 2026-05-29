export function startRifts(
  container: HTMLElement,
  opts?: { particleCount?: number; backCount?: number },
): { setZoomProgress: (p: number) => void; cleanup: () => void };
