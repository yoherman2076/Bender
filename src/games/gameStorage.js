export const GAME_SAVE_KEYS = Object.freeze({
  tango: 'bender.tango.save.v1',
  buscaminas: 'bender.buscaminas.save.v1',
  patches: 'bender.patches.save.v1',
  '2048': 'bender.2048.save.v1',
})

const GAME_IDS_BY_ROUTE = Object.freeze({
  tango: 'tango',
  buscaminas: 'buscaminas',
  patches: 'patches',
  'juego-2048': '2048',
})

export function readSavedGame(gameId) {
  const key = GAME_SAVE_KEYS[gameId]
  if (!key) return null

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export function hasSavedGame(gameId) {
  return readSavedGame(gameId) !== null
}

export function hasSavedGameForRoute(routeName) {
  const gameId = GAME_IDS_BY_ROUTE[routeName]
  return gameId ? hasSavedGame(gameId) : false
}

export function savedGameSummary(gameId) {
  const data = readSavedGame(gameId)
  if (!data) return null

  const details = []
  if (Number.isInteger(data.moves) && data.moves > 0) {
    details.push(`${data.moves} movimiento${data.moves === 1 ? '' : 's'}`)
  }
  if (Number.isInteger(data.score) && data.score > 0) {
    details.push(`${data.score} puntos`)
  }

  return {
    details: details.join(' · '),
  }
}
