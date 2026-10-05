// Constantes del 2048.

export const SIZE = 4
export const TARGET = 2048

// Probabilidad de que una ficha nueva sea un 4 (resto 2).
export const SPAWN_FOUR_PROB = 0.1

// Direcciones de movimiento.
export const DIRS = ['up', 'down', 'left', 'right']

// Los neutros siguen el tema. El ámbar sube con el valor y el magenta queda en 2048.
export const TILE_CLASSES = {
  2: 'bg-surface text-ink',
  4: 'bg-porcelain text-ink',
  8: 'bg-accent-300 text-[#131517]',
  16: 'bg-accent-400 text-[#131517]',
  32: 'bg-accent-500 text-white',
  64: 'bg-accent-600 text-white',
  128: 'bg-[#5c5e60] text-white',
  256: 'bg-[#333537] text-white',
  512: 'bg-[#131517] text-white',
  1024: 'bg-accent-500 text-white',
  2048: 'bg-voltage text-white',
}

export function tileClass(value) {
  if (TILE_CLASSES[value]) return TILE_CLASSES[value]
  return 'bg-voltage text-white'
}
