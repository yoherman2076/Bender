<script setup>
import { computed, nextTick, ref, shallowRef } from 'vue'
import BuscaminasSetupMenu from '../components/buscaminas/BuscaminasSetupMenu.vue'
import BuscaminasBoard from '../components/buscaminas/BuscaminasBoard.vue'
import BuscaminasToolbar from '../components/buscaminas/BuscaminasToolbar.vue'
import BuscaminasWinHero from '../components/buscaminas/BuscaminasWinHero.vue'
import GameConfirmDialog from '../components/GameConfirmDialog.vue'
import GamePhase from '../components/GamePhase.vue'
import GameIcon from '../components/GameIcon.vue'
import BackLink from '../components/BackLink.vue'
import {
  TOOL_PALA,
  TOOL_BANDERA,
  SIZES,
  DIFFICULTIES,
  minesFor,
  difficultyLabel,
} from '../games/buscaminas/constants.js'
import {
  emptyGrid,
  placeMines,
  computeNumbers,
  revealFrom,
  chordFrom,
  checkWin,
  wrongFlags,
  countFlags,
} from '../games/buscaminas/engine.js'
import { GAME_SAVE_KEYS } from '../games/gameStorage.js'
import { getTimeRecord, saveTimeRecord } from '../games/gameRecords.js'
import { useElapsedTime } from '../composables/useElapsedTime.js'
import { useGamePersistence } from '../composables/useGamePersistence.js'

const SAVE_KEY = GAME_SAVE_KEYS.buscaminas

const status = ref('setup') // setup | playing | lost | won
const size = ref(8)
const difficulty = ref('media')
const mineTotal = ref(0)
const mines = ref([])
const numbers = ref([])
const revealed = ref([])
const flagged = ref([])
const minesPlaced = ref(false)
const exploded = ref(null)
const tool = ref(TOOL_PALA)
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

function isValidSave(data) {
  return (
    data?.version === 1 &&
    SIZES.includes(data.size) &&
    DIFFICULTIES.some((difficulty) => difficulty.id === data.difficulty) &&
    isGrid(data.mines, data.size, (value) => typeof value === 'boolean') &&
    isGrid(
      data.numbers,
      data.size,
      (value) => Number.isInteger(value) && value >= -1 && value <= 8,
    ) &&
    isGrid(data.revealed, data.size, (value) => typeof value === 'boolean') &&
    isGrid(data.flagged, data.size, (value) => typeof value === 'boolean') &&
    typeof data.minesPlaced === 'boolean' &&
    [TOOL_PALA, TOOL_BANDERA].includes(data.tool) &&
    Number.isInteger(data.moves) &&
    data.moves >= 0 &&
    typeof data.elapsedMs === 'number' &&
    data.elapsedMs >= 0
  )
}

function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}

function saveGame() {
  if (!saveEnabled || status.value !== 'playing' || mines.value.length !== size.value) return
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        size: size.value,
        difficulty: difficulty.value,
        mines: mines.value,
        numbers: numbers.value,
        revealed: revealed.value,
        flagged: flagged.value,
        minesPlaced: minesPlaced.value,
        tool: tool.value,
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
  } else if (status.value === 'lost' || status.value === 'won') {
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
    bestRecord.value = getTimeRecord('buscaminas', `${data.size}-${data.difficulty}`)
    mineTotal.value = minesFor(data.size, data.difficulty)
    mines.value = data.mines
    numbers.value = data.numbers
    revealed.value = data.revealed
    flagged.value = data.flagged
    minesPlaced.value = data.minesPlaced
    exploded.value = null
    tool.value = data.tool
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
  [
    status,
    size,
    difficulty,
    mines,
    numbers,
    revealed,
    flagged,
    minesPlaced,
    tool,
    moves,
    startTime,
  ],
  updateSavedGame,
)

restoreGame()

const flagsLeft = computed(() => mineTotal.value - countFlags(flagged.value))
const lostWrongFlags = computed(() =>
  status.value === 'lost' ? wrongFlags(flagged.value, mines.value) : new Set(),
)

function startGame({ size: newSize, difficulty: newDifficulty }) {
  size.value = newSize
  difficulty.value = newDifficulty
  mineTotal.value = minesFor(newSize, newDifficulty)
  mines.value = emptyGrid(newSize, false)
  numbers.value = emptyGrid(newSize, 0)
  revealed.value = emptyGrid(newSize, false)
  flagged.value = emptyGrid(newSize, false)
  minesPlaced.value = false
  exploded.value = null
  tool.value = TOOL_PALA
  moves.value = 0
  winSeconds.value = 0
  bestRecord.value = getTimeRecord('buscaminas', `${newSize}-${newDifficulty}`)
  hintMessage.value = ''
  startTime.value = Date.now()
  saveEnabled = true
  status.value = 'playing'
  nextTick(() => window.scrollTo(0, 0))
}

function restart() {
  // Reiniciar = nueva organización con la misma configuración.
  startGame({ size: size.value, difficulty: difficulty.value })
}

function requestDestructiveAction(title, label, action) {
  if (moves.value === 0) {
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

function useHint() {
  if (status.value !== 'playing') return
  const candidates = []
  for (let r = 0; r < size.value; r++) {
    for (let c = 0; c < size.value; c++) {
      if (revealed.value[r][c] || flagged.value[r][c]) continue
      if (minesPlaced.value && mines.value[r][c]) continue
      candidates.push({ r, c })
    }
  }
  if (candidates.length === 0) {
    hintMessage.value = 'No quedan casillas seguras disponibles para una pista.'
    return
  }

  const candidate = minesPlaced.value
    ? candidates.sort((a, b) => numbers.value[a.r][a.c] - numbers.value[b.r][b.c])[0]
    : candidates[Math.floor(candidates.length / 2)]
  startTime.value -= 30_000
  dig(candidate.r, candidate.c)
  hintMessage.value = `Pista: se abrió una casilla segura. Se añaden 30 segundos.`
}

function ensureMines(r, c) {
  if (minesPlaced.value) return
  mines.value = placeMines(size.value, mineTotal.value, r, c)
  numbers.value = computeNumbers(mines.value)
  minesPlaced.value = true
}

function dig(r, c) {
  if (flagged.value[r][c]) return
  if (revealed.value[r][c]) {
    chord(r, c)
    return
  }
  saveEnabled = true
  ensureMines(r, c)
  moves.value++
  if (mines.value[r][c]) {
    exploded.value = { r, c }
    status.value = 'lost'
    return
  }
  const { grid } = revealFrom(revealed.value, numbers.value, size.value, r, c)
  revealed.value = grid
  checkWinAndFinish()
}

function chord(r, c) {
  // Pulsar un número con sus banderas puestas abre los vecinos de golpe.
  const res = chordFrom(
    revealed.value,
    flagged.value,
    numbers.value,
    mines.value,
    size.value,
    r,
    c,
  )
  if (res.hitMine) {
    exploded.value = res.mineAt
    status.value = 'lost'
    moves.value++
    return
  }
  if (res.opened === 0) return
  saveEnabled = true
  revealed.value = res.grid
  moves.value++
  checkWinAndFinish()
}

function checkWinAndFinish() {
  if (checkWin(revealed.value, mines.value)) {
    winSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    bestRecord.value = saveTimeRecord('buscaminas', `${size.value}-${difficulty.value}`, {
      seconds: winSeconds.value,
      moves: moves.value,
    })
    status.value = 'won'
  }
}

function toggleFlag(r, c) {
  if (revealed.value[r][c]) return
  if (!flagged.value[r][c] && flagsLeft.value <= 0) return
  saveEnabled = true
  flagged.value[r][c] = !flagged.value[r][c]
  moves.value++
}

function onCellClick({ r, c }) {
  if (status.value !== 'playing') return
  if (tool.value === TOOL_BANDERA) toggleFlag(r, c)
  else dig(r, c)
}

function onCellFlag({ r, c }) {
  // Atajo de escritorio: click derecho alterna bandera.
  if (status.value !== 'playing') return
  toggleFlag(r, c)
}
</script>

<template>
  <main id="main-content" tabindex="-1" class="game-page" :class="{ 'game-page--active': status === 'playing' }">
    <BackLink />

    <Transition name="phase" mode="out-in">
      <GamePhase v-if="status === 'setup'" variant="setup">
        <div class="game-header buscaminas">
          <span class="monogram monogram--buscaminas" aria-hidden="true"><GameIcon id="buscaminas" /></span>
          <div>
            <h1 tabindex="-1">Busca minas</h1>
            <p>Despeja el tablero sin explotar.</p>
          </div>
        </div>
        <BuscaminasSetupMenu @play="startGame" />
      </GamePhase>

      <!-- Al perder no cambia de rama: el tablero se queda y lo que
           avisa es el aviso y la revelación de las minas. -->
      <GamePhase v-else-if="status === 'playing' || status === 'lost'">
        <p id="mines-board-instructions" class="mb-4 text-center text-sm text-stone">
          {{ size }}×{{ size }} · {{ difficultyLabel(difficulty) }} · {{ mineTotal }} minas ·
          con las banderas puestas, pulsa un número para abrir alrededor. Usa las flechas para moverte y Intro o espacio para activar una casilla.
        </p>
        <BuscaminasToolbar
          :tool="tool"
          :flags-left="flagsLeft"
          :moves="moves"
          :seconds="elapsedSeconds"
          :can-hint="status === 'playing'"
          @restart="requestDestructiveAction('¿Empezar una partida nueva?', 'Empezar de nuevo', restart)"
          @hint="useHint"
          @set-tool="tool = $event"
        />
        <p class="sr-only" role="status" aria-live="polite">{{ hintMessage }}</p>
        <div
          v-if="status === 'lost'"
          class="board-alert mx-auto mb-4 w-full max-w-[560px] rounded-small border border-signal/30 bg-signal/10 px-4 py-3 text-center text-sm font-medium text-signal"
          role="alert"
        >
          Pisaste una mina. Pulsa Reiniciar para intentarlo de nuevo.
        </div>
        <BuscaminasBoard
          :size="size"
          :numbers="numbers"
          :mines="mines"
          :revealed="revealed"
          :flagged="flagged"
          :mines-placed="minesPlaced"
          :status="status"
          :exploded="exploded"
          :wrong-flags="lostWrongFlags"
          @cell-click="onCellClick"
          @cell-flag="onCellFlag"
        />
      </GamePhase>

      <GamePhase v-else variant="won">
        <BuscaminasWinHero
          :size="size"
          :difficulty-label="difficultyLabel(difficulty)"
          :moves="moves"
          :seconds="winSeconds"
          :best-record="bestRecord"
          @play-again="restart"
        />
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
