// Constantes del Patches.
// La dificultad controla nº de parches y especificidad de las pistas.
// Ajustable sin tocar la lógica.

export const SIZE = 6

export const SHAPE_SQUARE = 'square'
export const SHAPE_WIDE = 'wide'
export const SHAPE_TALL = 'tall'
export const SHAPE_FREE = 'free'

export const SHAPES = [SHAPE_SQUARE, SHAPE_WIDE, SHAPE_TALL, SHAPE_FREE]

export const SHAPE_LABEL = {
  square: 'Cuadrado',
  wide: 'Ancho',
  tall: 'Alto',
  free: 'Libre',
}

export const DIFFICULTIES = [
  { id: 'facil', label: 'Fácil' },
  { id: 'media', label: 'Media' },
  { id: 'dificil', label: 'Difícil' },
]

// Nº de parches (min, max) por dificultad.
export const PATCH_COUNT = {
  facil: [8, 10],
  media: [7, 9],
  dificil: [6, 8],
}

// Colores fijos: no siguen el tema, para que el borde del parche no se vuelva lodo.
export const PATCH_PALETTE = [
  { bg: 'bg-orange-500', text: 'text-white', edge: 'border-orange-700' },
  { bg: 'bg-sky-600', text: 'text-white', edge: 'border-sky-800' },
  { bg: 'bg-emerald-600', text: 'text-white', edge: 'border-emerald-800' },
  { bg: 'bg-violet-600', text: 'text-white', edge: 'border-violet-800' },
  { bg: 'bg-rose-600', text: 'text-white', edge: 'border-rose-800' },
  { bg: 'bg-amber-500', text: 'text-[#131517]', edge: 'border-amber-700' },
  { bg: 'bg-teal-600', text: 'text-white', edge: 'border-teal-800' },
  { bg: 'bg-indigo-500', text: 'text-white', edge: 'border-indigo-800' },
  { bg: 'bg-lime-600', text: 'text-white', edge: 'border-lime-800' },
  { bg: 'bg-fuchsia-600', text: 'text-white', edge: 'border-fuchsia-800' },
]

export function difficultyLabel(difficultyId) {
  return DIFFICULTIES.find((d) => d.id === difficultyId)?.label ?? difficultyId
}
