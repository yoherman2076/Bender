<script setup>
import { computed, nextTick, ref, shallowRef } from 'vue'
import TangoSetupMenu from '../components/tango/TangoSetupMenu.vue'
import TangoBoard from '../components/tango/TangoBoard.vue'
import TangoToolbar from '../components/tango/TangoToolbar.vue'
import TangoWinHero from '../components/tango/TangoWinHero.vue'
import GameConfirmDialog from '../components/GameConfirmDialog.vue'
import GamePhase from '../components/GamePhase.vue'
import GameIcon from '../components/GameIcon.vue'
import BackLink from '../components/BackLink.vue'
import {
  EMPTY,
  SUN,
  MOON,
  SIZES,
  DIFFICULTIES,
  difficultyLabel,
} from '../games/tango/constants.js'
import { findSolution, generatePuzzle } from '../games/tango/generator.js'
import { GAME_SAVE_KEYS } from '../games/gameStorage.js'
import { getTimeRecord, saveTimeRecord } from '../games/gameRecords.js'
import { useElapsedTime } from '../composables/useElapsedTime.js'
import { useGamePersistence } from '../composables/useGamePersistence.js'
import {
  findRuleViolations,
  isWin,
} from '../games/tango/validators.js'

const SAVE_KEY = GAME_SAVE_KEYS.tango

const status = ref('setup') // setup | playing | won
const size = ref(6)
const difficulty = ref('media')
const solution = ref([])
const unique = ref(true)
const givens = ref([])
const constraints = ref([])
const board = ref([])
const history = ref([]) // [{ r, c, prev, next }]
const moves = ref(0)
const startTime = ref(0)
const winSeconds = ref(0)
const bestRecord = ref(null)
const hintMessage = ref('')
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmLabel = ref('Descartar partida')
const pendingAction = shallowRef(null)
let saveEnabled = false

const elapsedSeconds = useElapsedTime(
  startTime,
  computed(() => status.value === 'playing'),
)

function isGrid(grid, size, isValidValue) {
  return (
    Array.isArray(grid) &&
    grid.length === size &&
    grid.every(
      (row) => Array.isArray(row) && row.length === size && row.every(isValidValue),
    )
  )
}

function isValidCoordinate(value, size) {
  return Number.isInteger(value) && value >= 0 && value < size
}

function isValidCell(value) {
  return value === EMPTY || value === SUN || value === MOON
}

function isValidConstraint(constraint, size) {
  return (
    constraint &&
    isValidCoordinate(constraint.r1, size) &&
    isValidCoordinate(constraint.c1, size) &&
    isValidCoordinate(constraint.r2, size) &&
    isValidCoordinate(constraint.c2, size) &&
    ['=', 'x'].includes(constraint.type)
  )
}

function isValidHistoryEntry(entry, size) {
  return (
    entry &&
    isValidCoordinate(entry.r, size) &&
    isValidCoordinate(entry.c, size) &&
    isValidCell(entry.prev) &&
    isValidCell(entry.next)
  )
}

function isValidSave(data) {
  if (
    data?.version !== 1 ||
    !SIZES.includes(data.size) ||
    !DIFFICULTIES.some((option) => option.id === data.difficulty) ||
    !isGrid(data.board, data.size, isValidCell) ||
    !isGrid(data.solution, data.size, isValidCell) ||
    !isGrid(data.givens, data.size, (value) => typeof value === 'boolean') ||
    !Array.isArray(data.constraints) ||
    !data.constraints.every((constraint) => isValidConstraint(constraint, data.size)) ||
    !Array.isArray(data.history) ||
    !data.history.every((entry) => isValidHistoryEntry(entry, data.size)) ||
    (data.unique !== undefined && typeof data.unique !== 'boolean') ||
    !Number.isInteger(data.moves) ||
    data.moves < 0 ||
    typeof data.elapsedMs !== 'number' ||
    data.elapsedMs < 0
  ) {
    return false
  }

  return data.givens.every((row, r) =>
    row.every(
      (isGiven, c) => !isGiven || data.board[r][c] === data.solution[r][c],
    ),
  )
}

function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}

function saveGame() {
  if (!saveEnabled || status.value !== 'playing' || board.value.length !== size.value) return
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        size: size.value,
        difficulty: difficulty.value,
        board: board.value,
        solution: solution.value,
        unique: unique.value,
        givens: givens.value,
        constraints: constraints.value,
        history: history.value,
        moves: moves.value,
        elapsedMs: Math.max(0, Date.now() - startTime.value),
        savedAt: Date.now(),
      }),
    )
  } catch {}
}

function updateSavedGame() {
  if (saveEnabled && status.value === 'playing') {
    saveGame()
  } else if (status.value === 'won') {
    clearSavedGame()
  }
}

function restoreGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!isValidSave(data)) {
      clearSavedGame()
      return
    }
    size.value = data.size
    difficulty.value = data.difficulty
    bestRecord.value = getTimeRecord('tango', `${data.size}-${data.difficulty}`)
    board.value = data.board
    solution.value = data.solution
    unique.value = data.unique === true
    givens.value = data.givens
    constraints.value = data.constraints
    history.value = data.history
    moves.value = data.moves
    startTime.value = Date.now() - data.elapsedMs
    winSeconds.value = 0
    saveEnabled = true
    status.value = 'playing'
  } catch {
    clearSavedGame()
  }
}

useGamePersistence(
  [status, size, difficulty, board, solution, givens, constraints, history, moves, startTime],
  updateSavedGame,
)

restoreGame()

const errorKeys = computed(() => {
  if (status.value === 'setup' || board.value.length === 0) return new Set()
  return findRuleViolations(board.value, constraints.value).cellKeys
})

function clone(boardToCopy) {
  return boardToCopy.map((row) => row.slice())
}

function startGame({ size: newSize, difficulty: newDifficulty }) {
  const puzzle = generatePuzzle(newSize, newDifficulty)
  size.value = puzzle.size
  difficulty.value = puzzle.difficulty
  solution.value = puzzle.solution
  unique.value = puzzle.unique
  givens.value = puzzle.givens
  constraints.value = puzzle.constraints
  board.value = clone(puzzle.initialBoard)
  history.value = []
  moves.value = 0
  winSeconds.value = 0
  bestRecord.value = getTimeRecord('tango', `${newSize}-${newDifficulty}`)
  hintMessage.value = ''
  startTime.value = Date.now()
  saveEnabled = true
  status.value = 'playing'
  nextTick(() => window.scrollTo(0, 0))
}

function restartSame() {
  // Reinicia la MISMA partida: vuelve a las pistas iniciales.
  saveEnabled = true
  const fresh = board.value.map((row, r) => row.map((_, c) => (givens.value[r][c] ? solution.value[r][c] : EMPTY)))
  board.value = fresh
  history.value = []
  moves.value = 0
  startTime.value = Date.now()
  hintMessage.value = ''
  status.value = 'playing'
}

function newPuzzle() {
  // OTRA partida: nueva organización con la misma configuración.
  startGame({ size: size.value, difficulty: difficulty.value })
}

function backToSetup() {
  saveEnabled = false
  clearSavedGame()
  status.value = 'setup'
}

function requestDestructiveAction(title, label, action) {
  if (history.value.length === 0) {
    action()
    return
  }
  confirmTitle.value = title
  confirmLabel.value = label
  pendingAction.value = action
  confirmOpen.value = true
}

function cancelDestructiveAction() {
  confirmOpen.value = false
  pendingAction.value = null
}

function confirmDestructiveAction() {
  const action = pendingAction.value
  confirmOpen.value = false
  pendingAction.value = null
  action?.()
}

function finishIfWon() {
  if (!isWin(board.value, solution.value, givens.value, constraints.value, unique.value)) return
  winSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
  bestRecord.value = saveTimeRecord('tango', `${size.value}-${difficulty.value}`, {
    seconds: winSeconds.value,
    moves: moves.value,
  })
  status.value = 'won'
}

function useHint() {
  if (status.value !== 'playing') return
  const result = findSolution(board.value, constraints.value)
  if (!result.solution) {
    hintMessage.value = result.overLimit
      ? 'No se pudo encontrar una pista ahora. Prueba a completar otra casilla.'
      : 'No hay una solución compatible con tus jugadas. Deshaz o corrige alguna casilla antes de pedir otra pista.'
    return
  }
  let target = null

  for (let r = 0; r < size.value && !target; r++) {
    for (let c = 0; c < size.value; c++) {
      if (board.value[r][c] !== EMPTY) continue
      target = { r, c, value: result.solution[r][c] }
      break
    }
  }

  if (!target) return

  const previous = board.value[target.r][target.c]
  board.value[target.r][target.c] = target.value
  history.value.push({ r: target.r, c: target.c, prev: previous, next: target.value })
  moves.value++
  startTime.value -= 30_000
  hintMessage.value = `Pista aplicada: fila ${target.r + 1}, columna ${target.c + 1}. Se añaden 30 segundos.`
  saveEnabled = true
  finishIfWon()
}

function undo() {
  const last = history.value.pop()
  if (!last) return
  board.value[last.r][last.c] = last.prev
}

function cycle(value) {
  if (value === EMPTY) return SUN
  if (value === SUN) return MOON
  return EMPTY
}

function onCellClick({ r, c }) {
  if (status.value !== 'playing') return
  if (givens.value[r]?.[c]) return
  const prev = board.value[r][c]
  const next = cycle(prev)
  if (prev === next) return
  saveEnabled = true
  board.value[r][c] = next
  history.value.push({ r, c, prev, next })
  moves.value++

  finishIfWon()
}
</script>

<template>
  <main id="main-content" tabindex="-1" class="game-page" :class="{ 'game-page--active': status === 'playing' }">
    <BackLink />

    <Transition name="phase" mode="out-in">
      <GamePhase v-if="status === 'setup'" variant="setup">
        <div class="game-header tango">
          <span class="monogram monogram--tango" aria-hidden="true"><GameIcon id="tango" /></span>
          <div>
            <h1 tabindex="-1">Tango</h1>
            <p>Puzzle de lógica por cuadrícula.</p>
          </div>
        </div>
        <TangoSetupMenu @play="startGame" />
      </GamePhase>

      <GamePhase v-else-if="status === 'playing'">
        <p class="mb-4 text-center text-sm text-stone">
          {{ size }}×{{ size }} · {{ difficultyLabel(difficulty) }} · lo que incumple las reglas
          se marca en <span class="font-bold text-signal">rojo</span>
        </p>
        <TangoToolbar
          :can-undo="history.length > 0"
          :moves="moves"
          :seconds="elapsedSeconds"
          @restart="requestDestructiveAction('¿Reiniciar este puzzle?', 'Reiniciar', restartSame)"
          @undo="undo"
          @new-game="requestDestructiveAction('¿Empezar otra partida?', 'Empezar otra', newPuzzle)"
          @hint="useHint"
        />
        <p class="sr-only" role="status" aria-live="polite">{{ hintMessage }}</p>
        <TangoBoard
          :board="board"
          :givens="givens"
          :error-keys="errorKeys"
          :constraints="constraints"
          @cell-click="onCellClick"
        />
        <p class="mt-5 text-center">
          <button
            type="button"
            class="quiet-link"
            @click="requestDestructiveAction('¿Cambiar la configuración?', 'Cambiar configuración', backToSetup)"
          >
            Cambiar configuración (tamaño / dificultad)
          </button>
        </p>
      </GamePhase>

      <GamePhase v-else variant="won">
        <TangoWinHero
          :size="size"
          :difficulty-label="difficultyLabel(difficulty)"
          :moves="moves"
          :seconds="winSeconds"
          :best-record="bestRecord"
          @play-again="newPuzzle"
        />
        <p class="mt-5 text-center">
          <button
            type="button"
            class="quiet-link"
            @click="backToSetup"
          >
            Cambiar configuración (tamaño / dificultad)
          </button>
        </p>
      </GamePhase>
    </Transition>
  </main>
  <GameConfirmDialog
    :open="confirmOpen"
    :title="confirmTitle"
    description="Se perderá el progreso de esta partida."
    :confirm-label="confirmLabel"
    @confirm="confirmDestructiveAction"
    @cancel="cancelDestructiveAction"
  />
</template>

<style scoped>
@import './game-page.css';
</style>
