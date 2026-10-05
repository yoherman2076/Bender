// Validadores puros del Patches (sin Vue, testeables).
// Parche: { r1, c1, r2, c2 } normalizado (r1<=r2, c1<=c2).
// Pista: { r, c, number|null, shape: 'square'|'wide'|'tall'|'free' }.

import { SHAPE_SQUARE, SHAPE_WIDE, SHAPE_TALL } from './constants.js'

/** Normaliza dos esquinas a { r1, c1, r2, c2 }. */
export function normalizeRect(a, b) {
  return {
    r1: Math.min(a.r, b.r),
    c1: Math.min(a.c, b.c),
    r2: Math.max(a.r, b.r),
    c2: Math.max(a.c, b.c),
  }
}

export function rectArea(rect) {
  return (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1)
}

function rectShape(rect) {
  const w = rect.c2 - rect.c1 + 1
  const h = rect.r2 - rect.r1 + 1
  if (w === h) return 'square'
  return w > h ? 'wide' : 'tall'
}

export function cluesInRect(rect, clues) {
  return clues.filter(
    (clue) => clue.r >= rect.r1 && clue.r <= rect.r2 && clue.c >= rect.c1 && clue.c <= rect.c2,
  )
}

/** Número que pide la única pista del rectángulo. Null si no hay una sola, o si no trae número. */
export function expectedMeasure(rect, clues) {
  const inside = cluesInRect(rect, clues)
  if (inside.length !== 1) return null
  return inside[0].number
}

export function rectsOverlap(a, b) {
  return a.r1 <= b.r2 && b.r1 <= a.r2 && a.c1 <= b.c2 && b.c1 <= a.c2
}

/**
 * Valida un rectángulo candidato contra las reglas.
 * Devuelve { ok, reason } con reason en español para el aviso.
 */
export function validatePlacement(rect, clues, patches) {
  const inside = cluesInRect(rect, clues)
  if (inside.length === 0) {
    return { ok: false, reason: 'El rectángulo debe contener exactamente una pista' }
  }
  if (inside.length > 1) {
    return { ok: false, reason: 'El rectángulo solo puede contener una pista' }
  }
  const clue = inside[0]
  if (rectArea(rect) === 1) {
    return { ok: false, reason: 'Los parches deben tener al menos 2 casillas' }
  }
  if (clue.number != null && rectArea(rect) !== clue.number) {
    return { ok: false, reason: `Esa pista pide ${clue.number} casillas` }
  }
  const shape = rectShape(rect)
  if (clue.shape === SHAPE_SQUARE && shape !== 'square') {
    return { ok: false, reason: 'Esa pista pide un cuadrado' }
  }
  if (clue.shape === SHAPE_WIDE && shape !== 'wide') {
    return { ok: false, reason: 'Esa pista pide un rectángulo más ancho que alto' }
  }
  if (clue.shape === SHAPE_TALL && shape !== 'tall') {
    return { ok: false, reason: 'Esa pista pide un rectángulo más alto que ancho' }
  }
  for (const p of patches) {
    if (rectsOverlap(rect, p)) {
      return { ok: false, reason: 'Los parches no pueden solaparse' }
    }
  }
  return { ok: true, reason: null }
}

/**
 * Victoria: todas las celdas cubiertas exactamente una vez y cada parche
 * con exactamente una pista que cumple área y forma.
 */
export function coversBoard(patches, size) {
  const seen = new Set()
  for (const patch of patches) {
    for (let r = patch.r1; r <= patch.r2; r++) {
      for (let c = patch.c1; c <= patch.c2; c++) {
        seen.add(`${r},${c}`)
      }
    }
  }
  return seen.size === size * size
}

export function checkWin(patches, clues, size) {
  if (patches.length !== clues.length) return false
  const seen = new Set()
  for (const p of patches) {
    for (let r = p.r1; r <= p.r2; r++) {
      for (let c = p.c1; c <= p.c2; c++) {
        const k = `${r},${c}`
        if (seen.has(k)) return false
        seen.add(k)
      }
    }
  }
  if (seen.size !== size * size) return false
  const usedClues = new Set()
  for (const p of patches) {
    const inside = cluesInRect(p, clues)
    if (inside.length !== 1) return false
    const clue = inside[0]
    if (usedClues.has(clue)) return false
    usedClues.add(clue)
    if (clue.number != null && rectArea(p) !== clue.number) return false
    const shape = rectShape(p)
    if (clue.shape === SHAPE_SQUARE && shape !== 'square') return false
    if (clue.shape === SHAPE_WIDE && shape !== 'wide') return false
    if (clue.shape === SHAPE_TALL && shape !== 'tall') return false
  }
  return true
}
