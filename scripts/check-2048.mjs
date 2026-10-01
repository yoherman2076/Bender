// Regresión del motor y de la capa visual animada del 2048.
// El bloque de navegador espera el dev server en BASE (por defecto :5173).
import { launchBrowser } from './browser.mjs'
import {
  boardsEqual,
  cloneBoard,
  emptyBoard,
  move,
  newGame,
  slideLine,
  spawnTile,
} from '../src/games/juego2048/engine.js'
import { tilesAfterMove, tilesFromBoard } from '../src/games/juego2048/tiles.js'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const SAVE_KEY = 'bender.2048.save.v1'
const fails = []
const ok = (name, condition, detail = '') => {
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${name}  ${detail}`)
  if (!condition) fails.push(name)
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const keyOf = (r, c) => `${r},${c}`

console.log('\n1. Motor: orígenes, destinos y fusiones')
const simple = slideLine([2, 0, 2, 4])
ok('slideLine conserva los valores', same(simple.line, [4, 4, 0, 0]), JSON.stringify(simple))
ok(
  'slideLine devuelve los orígenes',
  same(simple.sources, [[0, 2], [3], [], []]),
  JSON.stringify(simple.sources),
)
ok('slideLine calcula la puntuación', simple.gained === 4, String(simple.gained))

const double = slideLine([2, 2, 2, 2])
ok('dos fusiones en una línea', same(double.line, [4, 4, 0, 0]), JSON.stringify(double.line))
ok(
  'cada fusión usa dos fichas distintas',
  same(double.sources, [[0, 1], [2, 3], [], []]),
  JSON.stringify(double.sources),
)

const movedBoard = [
  [2, 0, 0, 2],
  [0, 4, 0, 0],
  [0, 0, 8, 0],
  [0, 0, 0, 16],
]
const moved = move(movedBoard, 'left')
const movedToLeft = moved.moves.filter(({ to: [r, c] }) => c === 0)
ok('move conserva los campos existentes', moved.changed && moved.gained === 4)
ok('move devuelve dos fuentes para la fusión', movedToLeft.some((item) => item.merged), JSON.stringify(moved.moves))
ok(
  'move conserva coordenadas de origen',
  movedToLeft.filter((item) => item.merged).length === 2,
  JSON.stringify(movedToLeft),
)

console.log('\n2. Identidad visual: 500 movimientos aleatorios')
let board = newGame()
let tiles = tilesFromBoard(board)
let mergeCount = 0
let boardsMatch = true
let stableIdsMatch = true
let mergesMatch = true
let spawnsMatch = true
let idsOrdered = true
let randomFailure = ''
const directions = ['up', 'down', 'left', 'right']

for (let turn = 0; turn < 500; turn++) {
  const direction = directions[Math.floor(Math.random() * directions.length)]
  const result = move(board, direction)
  if (!result.changed) continue

  const previousTiles = tiles
  const idsByPosition = new Map(
    previousTiles
      .filter((tile) => tile.kind !== 'ghost')
      .map((tile) => [keyOf(tile.r, tile.c), tile.id]),
  )

  board = result.board
  const spawned = spawnTile(board)
  tiles = tilesAfterMove(previousTiles, result.moves, board, spawned)

  const activeTiles = tiles.filter((tile) => tile.kind !== 'ghost')
  const rebuilt = emptyBoard()
  let duplicatePosition = false
  for (const tile of activeTiles) {
    if (rebuilt[tile.r][tile.c] !== 0) duplicatePosition = true
    rebuilt[tile.r][tile.c] = tile.value
  }
  if (duplicatePosition || !boardsEqual(rebuilt, board)) {
    boardsMatch = false
    randomFailure = `turno ${turn + 1}: ${JSON.stringify({ rebuilt, board })}`
    break
  }

  const byDestination = new Map()
  for (const item of result.moves) {
    const destination = keyOf(...item.to)
    if (!byDestination.has(destination)) byDestination.set(destination, [])
    byDestination.get(destination).push(item)
  }

  for (const [destination, arrivals] of byDestination) {
    const [r, c] = destination.split(',').map(Number)
    if (arrivals.length === 1) {
      const sourceId = idsByPosition.get(keyOf(...arrivals[0].from))
      const output = tiles.find((tile) => tile.id === sourceId)
      if (!(output?.r === r && output?.c === c && output.kind === null)) {
        stableIdsMatch = false
        randomFailure = `turno ${turn + 1}: ${JSON.stringify({ sourceId, output, destination })}`
      }
    } else {
      mergeCount++
      const sourceIds = arrivals.map(({ from }) => idsByPosition.get(keyOf(...from)))
      const ghosts = tiles.filter(
        (tile) =>
          sourceIds.includes(tile.id) &&
          tile.kind === 'ghost' &&
          tile.r === r &&
          tile.c === c,
      )
      const merged = tiles.filter(
        (tile) => tile.kind === 'merged' && tile.r === r && tile.c === c,
      )
      if (!(arrivals.length === 2 && ghosts.length === 2 && merged.length === 1)) {
        mergesMatch = false
        randomFailure = `turno ${turn + 1}: ${JSON.stringify({ arrivals, ghosts, merged })}`
      }
    }
  }

  if (spawned) {
    const [r, c] = spawned
    if (!tiles.some((tile) => tile.kind === 'new' && tile.r === r && tile.c === c)) {
      spawnsMatch = false
      randomFailure = `turno ${turn + 1}: ${JSON.stringify(spawned)}`
    }
  }
  if (!tiles.every((tile, index) => index === 0 || tiles[index - 1].id < tile.id)) {
    idsOrdered = false
    randomFailure = `turno ${turn + 1}: ids fuera de orden`
  }
}
ok('500 movimientos reconstruyen el tablero', boardsMatch, randomFailure)
ok('las fichas sin fusión conservan su id', stableIdsMatch, randomFailure)
ok('cada fusión deja ghosts y una ficha nueva', mergesMatch, randomFailure)
ok('cada spawn crea una ficha visual', spawnsMatch, randomFailure)
ok('las fichas visuales quedan ordenadas por id', idsOrdered, randomFailure)
ok('la secuencia aleatoria cubre fusiones', mergeCount > 0, String(mergeCount))

console.log('\n3. Navegador: geometría y movimiento')
const browser = await launchBrowser()
const page = await browser.newPage({ viewport: { width: 390, height: 780 } })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (message) => {
  // El documento SVG usado para preparar partidas solicita el favicon por defecto.
  if (message.location().url.endsWith('/favicon.ico')) return
  if (message.type() === 'error') errors.push(message.text())
})

const seededBoard = [
  [2, 0, 0, 4],
  [0, 8, 0, 0],
  [0, 0, 16, 0],
  [0, 0, 0, 32],
]

async function seedGame(nextBoard, viewport = { width: 390, height: 780 }) {
  await page.setViewportSize(viewport)
  // El guardado de pagehide debe terminar antes de preparar otra partida.
  await page.goto(`${BASE}/favicon.svg`, { waitUntil: 'networkidle' })
  await page.evaluate(
    (data) => localStorage.setItem('bender.2048.save.v1', JSON.stringify(data)),
    {
      version: 1,
      status: 'playing',
      board: nextBoard,
      score: 0,
      moves: 0,
      history: [],
      hasUndone: false,
      savedAt: Date.now(),
    },
  )
  await page.goto(`${BASE}/juegos/2048`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(150)
  await page.getByRole('grid', { name: 'Tablero 2048' }).focus()
}

async function alignment() {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('[role="gridcell"]')]
    const activeTiles = [...document.querySelectorAll('.game-2048-tile')].filter(
      (tile) => tile.dataset.kind !== 'ghost',
    )
    let maxDelta = 0
    for (const tile of activeTiles) {
      const index = Number(tile.dataset.r) * 4 + Number(tile.dataset.c)
      const cell = cells[index]
      if (!cell) return Infinity
      const a = tile.getBoundingClientRect()
      const b = cell.getBoundingClientRect()
      maxDelta = Math.max(
        maxDelta,
        Math.abs(a.left - b.left),
        Math.abs(a.top - b.top),
        Math.abs(a.width - b.width),
        Math.abs(a.height - b.height),
      )
    }
    return {
      maxDelta,
      count: activeTiles.length,
      expected: cells.filter((cell) => !cell.getAttribute('aria-label')?.endsWith(': vacía')).length,
    }
  })
}

await seedGame(seededBoard, { width: 390, height: 780 })
const mobileAlignment = await alignment()
ok(
  'las fichas se alinean en móvil',
  mobileAlignment.maxDelta <= 1 && mobileAlignment.count === mobileAlignment.expected,
  JSON.stringify(mobileAlignment),
)
await seedGame(seededBoard, { width: 1280, height: 900 })
const desktopAlignment = await alignment()
ok(
  'las fichas se alinean en escritorio',
  desktopAlignment.maxDelta <= 1 && desktopAlignment.count === desktopAlignment.expected,
  JSON.stringify(desktopAlignment),
)

await page.waitForTimeout(1100)
await page.reload({ waitUntil: 'networkidle' })
const restoredElapsedMs = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('bender.2048.save.v1')).elapsedMs,
)
ok('recargar conserva el tiempo sin hacer movimientos', restoredElapsedMs >= 1000, String(restoredElapsedMs))

console.log('\n4. Navegador: desplazamiento, pop y estado final')
const mergeBoard = [
  [2, 0, 0, 2],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
]
await seedGame(mergeBoard)
const movingId = await page.locator('.game-2048-tile[data-r="0"][data-c="3"]').getAttribute('data-tile-id')
const startX = await page.locator(`[data-tile-id="${movingId}"]`).evaluate((el) => el.getBoundingClientRect().left)
await page.keyboard.press('ArrowLeft')
const positions = []
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(15)
  positions.push(
    await page.locator(`[data-tile-id="${movingId}"]`).evaluate((el) => el.getBoundingClientRect().left),
  )
}
ok('la ficha pasa por posiciones intermedias', new Set(positions.map((x) => Math.round(x))).size > 2, JSON.stringify(positions))
ok('la ficha se desplaza hacia la izquierda', positions.at(-1) < startX, `${startX} → ${positions.at(-1)}`)

const animationNames = await page.evaluate(() =>
  [...document.querySelectorAll('.game-2048-tile-inner')].flatMap((element) =>
    [...element.getAnimations()].map((animation) => animation.animationName),
  ),
)
ok('la fusión tiene animación', animationNames.some((name) => name.startsWith('tile-merge')), JSON.stringify(animationNames))
ok('la ficha nueva tiene pop', animationNames.some((name) => name === 'bender-pop'), JSON.stringify(animationNames))

await page.waitForTimeout(350)
const labelsMatchTiles = await page.evaluate(() =>
  [...document.querySelectorAll('.game-2048-tile')]
    .filter((tile) => tile.dataset.kind !== 'ghost')
    .every((tile) => {
      const index = Number(tile.dataset.r) * 4 + Number(tile.dataset.c)
      const cell = document.querySelectorAll('[role="gridcell"]')[index]
      return cell?.getAttribute('aria-label')?.endsWith(`: ${tile.dataset.value}`)
    }),
)
ok('las etiquetas accesibles reflejan las fichas', labelsMatchTiles)

await seedGame([
  [2, 0, 0, 0],
  [0, 4, 0, 0],
  [0, 0, 8, 0],
  [0, 0, 0, 16],
])
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(350)
const burstMatches = await page.evaluate(() =>
  [...document.querySelectorAll('.game-2048-tile')]
    .filter((tile) => tile.dataset.kind !== 'ghost')
    .every((tile) => {
      const index = Number(tile.dataset.r) * 4 + Number(tile.dataset.c)
      return document
        .querySelectorAll('[role="gridcell"]')
        [index]?.getAttribute('aria-label')
        ?.endsWith(`: ${tile.dataset.value}`)
    }),
)
ok('una ráfaga de teclas deja fichas coherentes', burstMatches)

await seedGame([
  [1024, 1024, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
])
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(150)
ok('la ficha 2048 permanece visible durante el pop', (await page.locator('.game-2048-tile[data-kind="merged"]').count()) === 1)
ok('el hero espera a la animación', (await page.getByRole('heading', { name: 'Llegaste a 2048' }).count()) === 0)
await page.waitForTimeout(800)
ok('el hero aparece después', (await page.getByRole('heading', { name: 'Llegaste a 2048' }).count()) === 1)

console.log('\n5. prefers-reduced-motion')
await page.emulateMedia({ reducedMotion: 'reduce' })
await seedGame(seededBoard)
const reduced = await page.evaluate(() => {
  const tile = document.querySelector('.game-2048-tile')
  const inner = document.querySelector('.game-2048-tile-inner')
  return {
    transition: getComputedStyle(tile).transitionDuration,
    animation: getComputedStyle(inner).animationName,
  }
})
ok('reduced motion quita el desplazamiento', reduced.transition === '0s', JSON.stringify(reduced))
ok('reduced motion quita el pop', reduced.animation === 'none', JSON.stringify(reduced))

ok('consola limpia', errors.length === 0, JSON.stringify(errors.slice(0, 3)))
await browser.close()
console.log(fails.length ? `\n${fails.length} FALLOS: ${fails.join(' | ')}\n` : '\nTodo verde\n')
process.exit(fails.length ? 1 : 0)
