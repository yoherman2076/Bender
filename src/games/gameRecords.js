const STORAGE_KEY = 'bender.records.v1'

function readRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

function writeRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {}
}

export function getTimeRecord(gameId, category) {
  const record = readRecords()[gameId]?.[category]
  return record && Number.isInteger(record.seconds) && Number.isInteger(record.moves)
    ? record
    : null
}

export function saveTimeRecord(gameId, category, result) {
  const records = readRecords()
  const gameRecords = records[gameId] ?? {}
  const previous = gameRecords[category]
  const improved =
    !previous ||
    result.seconds < previous.seconds ||
    (result.seconds === previous.seconds && result.moves < previous.moves)

  if (!improved) return previous

  const next = { ...result, savedAt: Date.now() }
  writeRecords({
    ...records,
    [gameId]: { ...gameRecords, [category]: next },
  })
  return next
}

export function getBestScore(gameId) {
  const score = readRecords()[gameId]?.bestScore
  return Number.isInteger(score) && score >= 0 ? score : 0
}

export function saveBestScore(gameId, score) {
  const records = readRecords()
  const gameRecords = records[gameId] ?? {}
  const previous = Number.isInteger(gameRecords.bestScore) ? gameRecords.bestScore : 0
  if (score <= previous) return previous

  writeRecords({ ...records, [gameId]: { ...gameRecords, bestScore: score } })
  return score
}
