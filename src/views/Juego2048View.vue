<script setup>
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import Game2048Board from '../components/juego2048/Game2048Board.vue'
import Game2048Toolbar from '../components/juego2048/Game2048Toolbar.vue'
import Game2048Hero from '../components/juego2048/Game2048Hero.vue'
import GameConfirmDialog from '../components/GameConfirmDialog.vue'
import GamePhase from '../components/GamePhase.vue'
import GameIcon from '../components/GameIcon.vue'
import BackLink from '../components/BackLink.vue'
import { SIZE, TARGET } from '../games/juego2048/constants.js'
import {
  cloneBoard,
  spawnTile,
  newGame,
  move,
  canMove,
  hasTarget,
} from '../games/juego2048/engine.js'
import { tilesAfterMove, tilesFromBoard } from '../games/juego2048/tiles.js'
import { GAME_SAVE_KEYS } from '../games/gameStorage.js'
import { getBestScore, saveBestScore } from '../games/gameRecords.js'
import { useElapsedTime } from '../composables/useElapsedTime.js'
import { useGamePersistence } from '../composables/useGamePersistence.js'

const SAVE_KEY = GAME_SAVE_KEYS['2048']
const END_STATUS_DELAY = 700

const status = ref('setup') // setup | playing | won | endless | lost
const shownStatus = ref('setup')
const board = ref([])
const tiles = ref([])
const score = ref(0)
const moves = ref(0)
const history = ref([]) // [{ board, score }]
const hasUndone = ref(false)
const startTime = ref(0)
const finalSeconds = ref(0)
const bestScore = ref(getBestScore('2048'))
const moveAnnouncement = ref('')
const confirmOpen = ref(false)
const pendingAction = shallowRef(null)
const boardRef = ref(null)
let saveEnabled = false
let statusTimer = null

const elapsedSeconds = useElapsedTime(
  startTime,
  computed(() => isActiveStatus(status.value)),
)

function clearStatusTimer() {
  if (statusTimer !== null) {
    clearTimeout(statusTimer)
    statusTimer = null
  }
}

function isActiveStatus(value) {
  return value === 'playing' || value === 'endless'
}

function setStatus(nextStatus, delayTerminal = false) {
  const previousStatus = status.value
  clearStatusTimer()
  status.value = nextStatus

  if (
    delayTerminal &&
    isActiveStatus(previousStatus) &&
    (nextStatus === 'won' || nextStatus === 'lost')
  ) {
    statusTimer = setTimeout(() => {
      shownStatus.value = nextStatus
      statusTimer = null
    }, END_STATUS_DELAY)
  } else {
    shownStatus.value = nextStatus
  }
}

function isValidBoard(value) {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every((cell) => Number.isInteger(cell) && cell >= 0),
    )
  )
}

function isValidHistoryEntry(entry) {
  return (
    isValidBoard(entry?.board) &&
    Number.isInteger(entry.score) &&
    entry.score >= 0
  )
}

function isValidSave(data) {
  return (
    data?.version === 1 &&
    ['playing', 'endless'].includes(data.status) &&
    isValidBoard(data.board) &&
    Number.isInteger(data.score) &&
    data.score >= 0 &&
    Number.isInteger(data.moves) &&
    data.moves >= 0 &&
    Array.isArray(data.history) &&
    (data.history.length === 0 || isValidHistoryEntry(data.history.at(-1))) &&
    (data.elapsedMs === undefined ||
      (typeof data.elapsedMs === 'number' && data.elapsedMs >= 0)) &&
    (data.hasUndone === undefined || typeof data.hasUndone === 'boolean')
  )
}

function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}

function saveGame() {
  if (
    !saveEnabled ||
    (status.value !== 'playing' && status.value !== 'endless')
  ) {
    return
  }
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        status: status.value,
        board: board.value,
        score: score.value,
        moves: moves.value,
        history: history.value,
        hasUndone: hasUndone.value,
        elapsedMs: Math.max(0, Date.now() - startTime.value),
        savedAt: Date.now(),
      }),
    )
  } catch {}
}

function updateSavedGame() {
  if (saveEnabled && (status.value === 'playing' || status.value === 'endless')) {
    saveGame()
  } else {
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
    status.value = data.status
    board.value = data.board
    tiles.value = tilesFromBoard(board.value)
    score.value = data.score
    moves.value = data.moves
    history.value = data.history.slice(-1)
    hasUndone.value = data.hasUndone === true
    startTime.value = Date.now() - (data.elapsedMs ?? 0)
    finalSeconds.value = Math.floor((data.elapsedMs ?? 0) / 1000)
    bestScore.value = getBestScore('2048')
    shownStatus.value = status.value
    saveEnabled = true
  } catch {
    clearSavedGame()
  }
}

useGamePersistence([status, board, score, moves, history, hasUndone, startTime], updateSavedGame)

restoreGame()

function applyMove(dir) {
  if (status.value !== 'playing' && status.value !== 'endless') return
  const res = move(board.value, dir)
  if (!res.changed) return
  saveEnabled = true
  history.value = [{ board: cloneBoard(board.value), score: score.value }]
  board.value = res.board
  score.value += res.gained
  bestScore.value = saveBestScore('2048', score.value)
  moves.value++
  const spawned = spawnTile(board.value)
  tiles.value = tilesAfterMove(tiles.value, res.moves, board.value, spawned)
  const direction = { up: 'arriba', down: 'abajo', left: 'a la izquierda', right: 'a la derecha' }
  moveAnnouncement.value = `Movimiento ${direction[dir]}. ${score.value} puntos.`
  if (status.value === 'playing' && hasTarget(board.value, TARGET)) {
    finalSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    setStatus('won', true)
  } else if (!canMove(board.value)) {
    finalSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    setStatus('lost', true)
  }
}

function resetGame() {
  clearStatusTimer()
  board.value = newGame()
  tiles.value = tilesFromBoard(board.value, 'new')
  score.value = 0
  moves.value = 0
  history.value = []
  hasUndone.value = false
  startTime.value = Date.now()
  finalSeconds.value = 0
  moveAnnouncement.value = ''
  saveEnabled = true
  setStatus('playing')
}

function startGame() {
  resetGame()
}

function restart() {
  clearSavedGame()
  resetGame()
}

function requestRestart() {
  if (isActiveStatus(status.value) && moves.value > 0) {
    pendingAction.value = restart
    confirmOpen.value = true
    return
  }
  restart()
}

function cancelRestart() {
  confirmOpen.value = false
  pendingAction.value = null
}

function confirmRestart() {
  const action = pendingAction.value
  confirmOpen.value = false
  pendingAction.value = null
  action?.()
}

function undo() {
  if (hasUndone.value) return
  const last = history.value.pop()
  if (!last) return
  // Si se deshace desde un hero, se vuelve al juego
  // (a infinito si el tablero ya tenía el 2048).
  if (status.value === 'lost' || status.value === 'won') {
    status.value = hasTarget(last.board, TARGET) ? 'endless' : 'playing'
  }
  hasUndone.value = true
  board.value = last.board
  tiles.value = tilesFromBoard(board.value)
  score.value = last.score
  moves.value = Math.max(0, moves.value - 1)
  clearStatusTimer()
  shownStatus.value = status.value
}

function continueEndless() {
  setStatus('endless')
}

function focusBoardOnEntry() {
  if (isActiveStatus(shownStatus.value)) boardRef.value?.focus()
}

onBeforeUnmount(clearStatusTimer)
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="game-page"
    :class="{
      'game-page--active': shownStatus === 'playing' || shownStatus === 'endless',
    }"
  >
    <BackLink />

    <Transition name="phase" mode="out-in" @after-enter="focusBoardOnEntry">
      <GamePhase v-if="shownStatus === 'setup'" variant="setup">
        <div class="game-header juego2048">
          <span class="monogram monogram--2048" aria-hidden="true"><GameIcon id="2048" /></span>
          <div>
            <h1 tabindex="-1">2048</h1>
            <p>Desliza y combina hasta 2048.</p>
          </div>
        </div>
        <section class="surface-card mx-auto w-full max-w-xl">
          <h2 class="m-0 text-heading-sm text-ink">Configura tu partida</h2>
          <p class="mt-1 mb-6 text-sm text-stone">
            Une fichas iguales hasta llegar al {{ TARGET }} en un tablero de {{ SIZE }}×{{ SIZE }}.
          </p>

          <div class="mb-8 grid grid-cols-2 gap-2">
            <div class="rounded-small bg-porcelain p-4 text-center">
              <p class="caption m-0">Tablero</p>
              <p class="mt-1 mb-0 text-heading-sm text-ink">{{ SIZE }}×{{ SIZE }}</p>
            </div>
            <div class="rounded-small bg-porcelain p-4 text-center">
              <p class="caption m-0">Objetivo</p>
              <p class="mt-1 mb-0 text-heading-sm text-ink">{{ TARGET }}</p>
            </div>
          </div>

          <button type="button" class="btn-fill w-full" @click="startGame">Jugar</button>
          <p class="mt-3 mb-0 text-center text-sm text-stone">
            En móvil, desliza sobre el tablero. En ordenador, usa las flechas o WASD.
          </p>
        </section>
      </GamePhase>

      <GamePhase v-else-if="shownStatus === 'playing' || shownStatus === 'endless'">
        <p id="game-2048-instructions" class="mb-4 text-center text-sm text-stone">
          Desliza y combina hasta {{ TARGET }}.
          <span v-if="shownStatus === 'endless'" class="font-bold text-ember">Modo infinito</span>
          <span v-else class="sm:hidden"> · desliza para mover</span>
          <span v-if="shownStatus !== 'endless'" class="hidden sm:inline"> · enfoca el tablero y usa flechas o WASD</span>
        </p>
        <Game2048Toolbar
          :can-undo="history.length > 0 && !hasUndone"
          :score="score"
          :moves="moves"
          :best-score="bestScore"
          :seconds="elapsedSeconds"
          @restart="requestRestart"
          @undo="undo"
        />
        <p class="sr-only" role="status" aria-live="polite">{{ moveAnnouncement }}</p>
        <Game2048Board ref="boardRef" :board="board" :tiles="tiles" @move="applyMove" />
      </GamePhase>

      <GamePhase v-else-if="shownStatus === 'won'" variant="won">
        <Game2048Hero
          kind="win"
          :score="score"
          :moves="moves"
          :seconds="finalSeconds"
          :best-score="bestScore"
          @restart="restart"
          @continue="continueEndless"
        />
      </GamePhase>

      <GamePhase v-else variant="won">
        <Game2048Hero
          kind="lost"
          :score="score"
          :moves="moves"
          :seconds="finalSeconds"
          :best-score="bestScore"
          @restart="restart"
        />
      </GamePhase>
    </Transition>
  </main>
  <GameConfirmDialog
    :open="confirmOpen"
    title="¿Empezar una partida nueva?"
    description="Se perderán el tablero y el progreso de esta partida."
    confirm-label="Empezar de nuevo"
    @confirm="confirmRestart"
    @cancel="cancelRestart"
  />
</template>

<style scoped>
@import './game-page.css';
</style>
