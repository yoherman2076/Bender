// Validadores puros del Tango (sin Vue, testeables).
// Convención: board es number[][] con EMPTY/SUN/MOON.
// givens es boolean[][] (true = fija, nunca en rojo).
// constraints es Array<{ r1, c1, r2, c2, type: '=' | 'x' }>.

import { EMPTY } from './constants.js'

export const keyOf = (r, c) => `${r},${c}`

export function isBoardFull(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === EMPTY) return false
    }
  }
  return true
}

/** Cuenta soles y lunas por fila y columna (ignora vacíos). */
export function countLines(board) {
  const size = board.length
  const rows = []
  const cols = []
  for (let i = 0; i < size; i++) {
    rows.push({ suns: 0, moons: 0 })
    cols.push({ suns: 0, moons: 0 })
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r][c]
      if (v === 1) {
        rows[r].suns++
        cols[c].suns++
      } else if (v === 2) {
        rows[r].moons++
        cols[c].moons++
      }
    }
  }
  return { rows, cols, half: size / 2 }
}

/**
 * Violaciones de reglas visibles (igualdad, 3 seguidos, =/×).
 * Devuelve sets de índices y de celdas implicadas.
 */
export function findRuleViolations(board, constraints = []) {
  const size = board.length
  const half = size / 2
  const { rows, cols } = countLines(board)
  const rowOver = new Set()
  const colOver = new Set()
  const cellKeys = new Set()

  for (let i = 0; i < size; i++) {
    if (rows[i].suns > half || rows[i].moons > half) {
      rowOver.add(i)
      for (let c = 0; c < size; c++) {
        if (board[i][c] !== EMPTY) cellKeys.add(keyOf(i, c))
      }
    }
    if (cols[i].suns > half || cols[i].moons > half) {
      colOver.add(i)
      for (let r = 0; r < size; r++) {
        if (board[r][i] !== EMPTY) cellKeys.add(keyOf(r, i))
      }
    }
  }

  // Tres iguales consecutivos, horizontal y vertical.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c + 2 < size; c++) {
      const a = board[r][c]
      if (a !== EMPTY && a === board[r][c + 1] && a === board[r][c + 2]) {
        cellKeys.add(keyOf(r, c))
        cellKeys.add(keyOf(r, c + 1))
        cellKeys.add(keyOf(r, c + 2))
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r + 2 < size; r++) {
      const a = board[r][c]
      if (a !== EMPTY && a === board[r + 1][c] && a === board[r + 2][c]) {
        cellKeys.add(keyOf(r, c))
        cellKeys.add(keyOf(r + 1, c))
        cellKeys.add(keyOf(r + 2, c))
      }
    }
  }

  // Restricciones =/× (solo aplican si ambas celdas están rellenas).
  for (const con of constraints) {
    const a = board[con.r1]?.[con.c1]
    const b = board[con.r2]?.[con.c2]
    if (a === undefined || b === undefined) continue
    if (a === EMPTY || b === EMPTY) continue
    const violated = con.type === '=' ? a !== b : a === b
    if (violated) {
      cellKeys.add(keyOf(con.r1, con.c1))
      cellKeys.add(keyOf(con.r2, con.c2))
    }
  }

  return { rowOver, colOver, cellKeys, hasViolation: cellKeys.size > 0 }
}

/**
 * Celdas en rojo: jugadas por el usuario (no fijas, no vacías)
 * que no coinciden con la solución oculta.
 */
export function findSolutionMismatches(board, solution, givens) {
  const bad = new Set()
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (givens?.[r]?.[c]) continue
      const v = board[r][c]
      if (v !== EMPTY && v !== solution[r][c]) bad.add(keyOf(r, c))
    }
  }
  return bad
}

export function isWin(board, solution, givens, constraints = [], requireSolution = true) {
  if (!isBoardFull(board)) return false
  if (requireSolution && findSolutionMismatches(board, solution, givens).size > 0) return false
  return !findRuleViolations(board, constraints).hasViolation
}
