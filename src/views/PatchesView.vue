<script setup>
import { computed, onUnmounted, ref, shallowRef } from 'vue'
import PatchesBoard from '../components/patches/PatchesBoard.vue'
import PatchesToolbar from '../components/patches/PatchesToolbar.vue'
import PatchesWinHero from '../components/patches/PatchesWinHero.vue'
import GameConfirmDialog from '../components/GameConfirmDialog.vue'
import GamePhase from '../components/GamePhase.vue'
import GameIcon from '../components/GameIcon.vue'
import BackLink from '../components/BackLink.vue'
import { DIFFICULTIES, SHAPES, SIZE } from '../games/patches/constants.js'
import { generatePuzzle } from '../games/patches/generator.js'
import { findSolution } from '../games/patches/solver.js'
import { checkWin, coversBoard, rectsOverlap } from '../games/patches/validators.js'
import { GAME_SAVE_KEYS } from '../games/gameStorage.js'
import { getTimeRecord, saveTimeRecord } from '../games/gameRecords.js'
import { useElapsedTime } from '../composables/useElapsedTime.js'
import { useGamePersistence } from '../composables/useGamePersistence.js'

const SAVE_KEY = GAME_SAVE_KEYS.patches

const status = ref('setup') // setup | playing | won
const setupDifficulty = ref('media')
const difficulty = ref('media')
const clues = ref([])
const boardVersion = ref(0)
const patches = ref([]) // [{ id, r1, c1, r2, c2 }]
const history = ref([]) // [{ type: 'add' | 'delete', patch }] | [{ type: 'extend', before, after }]
const moves = ref(0)
const startTime = ref(0)
const winSeconds = ref(0)
const notice = ref(null)
const bestRecord = ref(null)
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmLabel = ref('Descartar partida')
const pendingAction = shallowRef(null)
let noticeTimer = null
let nextId = 1
let saveEnabled = false

const elapsedSeconds = useElapsedTime(
  startTime,
  computed(() => status.value === 'playing'),
)

function isValidRect(rect) {
  return (
    rect &&
    Number.isInteger(rect.r1) &&
    Number.isInteger(rect.c1) &&
    Number.isInteger(rect.r2) &&
    Number.isInteger(rect.c2) &&
    rect.r1 >= 0 &&
    rect.c1 >= 0 &&
    rect.r2 < SIZE &&
    rect.c2 < SIZE &&
    rect.r1 <= rect.r2 &&
    rect.c1 <= rect.c2
  )
}

function isValidPatch(patch) {
  return patch && Number.isInteger(patch.id) && patch.id > 0 && isValidRect(patch)
}

function isValidClue(clue) {
  return (
    clue &&
    Number.isInteger(clue.r) &&
    Number.isInteger(clue.c) &&
    clue.r >= 0 &&
    clue.r < SIZE &&
    clue.c >= 0 &&
    clue.c < SIZE &&
    (clue.number === null ||
      (Number.isInteger(clue.number) && clue.number > 0 && clue.number <= SIZE * SIZE)) &&
    SHAPES.includes(clue.shape)
  )
}

function isValidHistoryEntry(entry) {
  if (!entry) return false
  if (entry.type === 'extend') {
    return (
      isValidPatch(entry.before) &&
      isValidPatch(entry.after) &&
      entry.before.id === entry.after.id
    )
  }
  if (entry.type !== 'add' && entry.type !== 'delete') return false
  return isValidPatch(entry.patch)
}

function isValidSave(data) {
  return (
    data?.version === 1 &&
    DIFFICULTIES.some((option) => option.id === data.difficulty) &&
    Array.isArray(data.clues) &&
    data.clues.length > 0 &&
    data.clues.every(isValidClue) &&
    Array.isArray(data.patches) &&
    data.patches.every(isValidPatch) &&
    Array.isArray(data.history) &&
    data.history.every(isValidHistoryEntry) &&
    Number.isInteger(data.nextId) &&
    data.nextId > 0 &&
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
  if (!saveEnabled || status.value !== 'playing' || clues.value.length === 0) return
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        difficulty: difficulty.value,
        clues: clues.value,
        patches: patches.value,
        history: history.value,
        nextId,
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
    difficulty.value = data.difficulty
    bestRecord.value = getTimeRecord('patches', data.difficulty)
    clues.value = data.clues
    patches.value = data.patches
    history.value = data.history
    nextId = data.nextId
    moves.value = data.moves
    startTime.value = Date.now() - data.elapsedMs
    winSeconds.value = 0
    notice.value = null
    saveEnabled = true
    status.value = 'playing'
  } catch {
    clearSavedGame()
  }
}

useGamePersistence(
  [status, difficulty, clues, patches, history, moves, startTime],
  updateSavedGame,
)

restoreGame()

function flashNotice(msg) {
  notice.value = msg
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = null
  }, 2600)
}

function startGame() {
  newGame(setupDifficulty.value)
}

function newGame(difficultyId) {
  const puzzle = generatePuzzle(difficultyId)
  difficulty.value = puzzle.difficulty
  clues.value = puzzle.clues
  boardVersion.value++
  patches.value = []
  history.value = []
  nextId = 1
  moves.value = 0
  winSeconds.value = 0
  notice.value = null
  bestRecord.value = getTimeRecord('patches', puzzle.difficulty)
  startTime.value = Date.now()
  saveEnabled = true
  status.value = 'playing'
}

function restart() {
  // Reiniciar: vacía el tablero, mismo puzzle y dificultad.
  saveEnabled = true
  boardVersion.value++
  patches.value = []
  history.value = []
  nextId = 1
  moves.value = 0
  winSeconds.value = 0
  notice.value = null
  startTime.value = Date.now()
  status.value = 'playing'
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
  if (!checkWin(patches.value, clues.value, SIZE)) return false
  winSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
  bestRecord.value = saveTimeRecord('patches', difficulty.value, {
    seconds: winSeconds.value,
    moves: moves.value,
  })
  status.value = 'won'
  return true
}

function useHint() {
  if (status.value !== 'playing') return
  const result = findSolution(patches.value, clues.value)
  if (!result.solution) {
    flashNotice(result.overLimit
      ? 'No se pudo encontrar una pista ahora. Prueba a colocar otro parche.'
      : 'No hay una solución compatible con tus parches. Deshaz o elimina alguno antes de pedir una pista.')
    return
  }
  const candidate = result.solution.find(
    (rect) => !patches.value.some((patch) => rectsOverlap(rect, patch)),
  )
  if (!candidate) return
  startTime.value -= 30_000
  onDraw(candidate)
  flashNotice('Pista aplicada. Se añaden 30 segundos al tiempo.')
}

function onDraw(rect) {
  if (status.value !== 'playing') return
  if (patches.value.some((patch) => rectsOverlap(rect, patch))) {
    flashNotice('Los parches no pueden solaparse')
    return
  }
  saveEnabled = true
  const patch = { id: nextId++, ...rect }
  patches.value = [...patches.value, patch]
  history.value.push({ type: 'add', patch })
  moves.value++
  if (!finishIfWon() && coversBoard(patches.value, SIZE)) {
    flashNotice('El tablero está cubierto, pero alguna pista todavía no se cumple. Revisa o elimina parches.')
  }
}

function onExtend({ id, rect }) {
  if (status.value !== 'playing') return
  const current = patches.value.find((patch) => patch.id === id)
  if (!current) return
  if (
    current.r1 === rect.r1 &&
    current.c1 === rect.c1 &&
    current.r2 === rect.r2 &&
    current.c2 === rect.c2
  ) {
    return
  }
  if (patches.value.some((patch) => patch.id !== id && rectsOverlap(rect, patch))) {
    flashNotice('Los parches no pueden solaparse')
    return
  }
  saveEnabled = true
  const before = { ...current }
  const after = { id, r1: rect.r1, c1: rect.c1, r2: rect.r2, c2: rect.c2 }
  patches.value = patches.value.map((patch) => (patch.id === id ? after : patch))
  history.value.push({ type: 'extend', before, after })
  moves.value++
  if (!finishIfWon() && coversBoard(patches.value, SIZE)) {
    flashNotice('El tablero está cubierto, pero alguna pista todavía no se cumple. Revisa o elimina parches.')
  }
}

function onDeletePatch(id) {
  if (status.value !== 'playing') return
  const patch = patches.value.find((p) => p.id === id)
  if (!patch) return
  saveEnabled = true
  patches.value = patches.value.filter((p) => p.id !== id)
  history.value.push({ type: 'delete', patch })
  moves.value++
}

function undo() {
  const last = history.value.pop()
  if (!last) return
  if (last.type === 'add') {
    patches.value = patches.value.filter((p) => p.id !== last.patch.id)
  } else if (last.type === 'extend') {
    patches.value = patches.value.map((patch) =>
      patch.id === last.before.id ? last.before : patch,
    )
  } else {
    patches.value = [...patches.value, last.patch]
  }
  moves.value++
}

onUnmounted(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="game-page"
    :class="{ 'game-page--active': status === 'playing' }"
  >
    <BackLink />

    <Transition name="phase" mode="out-in">
      <GamePhase v-if="status === 'setup'" variant="setup">
        <div class="game-header patches">
          <span class="monogram monogram--patches" aria-hidden="true"><GameIcon id="patches" /></span>
          <div>
            <h1 tabindex="-1">Patches</h1>
            <p>Divide el tablero en parches.</p>
          </div>
        </div>
        <section class="surface-card mx-auto w-full max-w-xl">
          <h2 class="m-0 text-heading-sm text-ink">Configura tu partida</h2>
          <p class="mt-1 mb-6 text-sm text-stone">
            Tablero de {{ SIZE }}×{{ SIZE }}. Elige la dificultad antes de empezar.
          </p>

          <p class="caption mb-2">Dificultad</p>
          <div class="mb-8 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dificultad">
            <button
              v-for="option in DIFFICULTIES"
              :key="option.id"
              type="button"
              class="chip"
              :aria-pressed="setupDifficulty === option.id"
              @click="setupDifficulty = option.id"
            >
              {{ option.label }}
            </button>
          </div>

          <button type="button" class="btn-fill w-full" @click="startGame">Jugar</button>
          <p class="mt-3 mb-0 text-center text-sm text-stone">
            Cada partida genera un tablero y unas pistas diferentes.
          </p>
        </section>
      </GamePhase>

      <GamePhase v-else-if="status === 'playing'">
        <PatchesToolbar
          :difficulty="difficulty"
          :can-undo="history.length > 0"
          :moves="moves"
          :seconds="elapsedSeconds"
          @undo="undo"
          @restart="requestDestructiveAction('¿Reiniciar este puzzle?', 'Reiniciar', restart)"
          @new-game="requestDestructiveAction('¿Empezar otra partida?', 'Empezar otra', () => newGame(difficulty))"
          @hint="useHint"
        />
        <PatchesBoard
          :key="boardVersion"
          :clues="clues"
          :patches="patches"
          @draw="onDraw"
          @extend="onExtend"
          @delete-patch="onDeletePatch"
        />
        <p class="sr-only" role="status" aria-live="polite">{{ notice }}</p>
        <div
          v-if="notice"
          class="board-alert mx-auto mt-4 w-full max-w-[440px] rounded-small border border-signal/30 bg-signal/10 px-4 py-2.5 text-center text-sm font-medium text-signal"
          aria-hidden="true"
        >
          {{ notice }}
        </div>
      </GamePhase>

      <GamePhase v-else variant="won">
        <PatchesWinHero
          :difficulty="difficulty"
          :moves="moves"
          :seconds="winSeconds"
          :best-record="bestRecord"
          @play-again="newGame(difficulty)"
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
