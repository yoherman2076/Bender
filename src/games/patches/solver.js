import { SIZE } from './constants.js'
import { cluesInRect, validatePlacement } from './validators.js'

function rectMask(rect, size) {
  let mask = 0n
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      mask |= 1n << BigInt(r * size + c)
    }
  }
  return mask
}

export function findSolution(patches, clues, size = SIZE, nodeLimit = 30_000) {
  if (!patches.every((patch, i) =>
    validatePlacement(patch, clues, patches.filter((_, index) => index !== i)).ok,
  )) return { solution: null, overLimit: false }

  const coveredClues = new Set(patches.map((patch) => cluesInRect(patch, clues)[0]))
  const remainingClues = clues.filter((clue) => !coveredClues.has(clue))
  const candidates = remainingClues.map((clue) => {
    const options = []
    for (let r1 = 0; r1 <= clue.r; r1++) {
      for (let c1 = 0; c1 <= clue.c; c1++) {
        for (let r2 = clue.r; r2 < size; r2++) {
          for (let c2 = clue.c; c2 < size; c2++) {
            const rect = { r1, c1, r2, c2 }
            if (validatePlacement(rect, clues, patches).ok) {
              options.push({ rect, mask: rectMask(rect, size) })
            }
          }
        }
      }
    }
    return options
  })

  // Una máscara de 36 bits necesita BigInt: los operadores sobre number usan 32.
  const fullMask = (1n << BigInt(size * size)) - 1n
  const initialMask = patches.reduce((mask, patch) => mask | rectMask(patch, size), 0n)
  let nodes = 0
  let overLimit = false

  function search(remaining, mask, chosen) {
    if (++nodes > nodeLimit) {
      overLimit = true
      return null
    }
    if (remaining.length === 0) return mask === fullMask ? chosen : null

    let bestIndex = 0
    let options = null
    for (let i = 0; i < remaining.length; i++) {
      const available = remaining[i].filter((candidate) => (candidate.mask & mask) === 0n)
      if (available.length === 0) return null
      if (options === null || available.length < options.length) {
        bestIndex = i
        options = available
      }
    }

    const next = remaining.filter((_, i) => i !== bestIndex)
    for (const candidate of options) {
      const solution = search(next, mask | candidate.mask, [...chosen, candidate.rect])
      if (solution) return solution
      if (overLimit) return null
    }
    return null
  }

  return { solution: search(candidates, initialMask, [...patches]), overLimit }
}
