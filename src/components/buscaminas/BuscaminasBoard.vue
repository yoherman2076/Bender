<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import GameIcon from '../GameIcon.vue'

const props = defineProps({
  size: { type: Number, required: true },
  numbers: { type: Array, required: true }, // -1 = mina (vacío hasta colocar)
  mines: { type: Array, required: true },
  revealed: { type: Array, required: true },
  flagged: { type: Array, required: true },
  minesPlaced: { type: Boolean, default: false },
  status: { type: String, default: 'playing' }, // playing | lost | won
  exploded: { type: Object, default: null }, // { r, c } o null
  wrongFlags: { type: Object, default: () => new Set() }, // Set "r,c"
})

const emit = defineEmits(['cell-click', 'cell-flag'])

const interactive = computed(() => props.status === 'playing')
const gridEl = ref(null)
const focusedCell = ref({ r: 0, c: 0 })

const NUMBER_CLASSES = {
  1: 'num-1',
  2: 'num-2',
  3: 'num-3',
  4: 'num-4',
  5: 'num-5',
  6: 'num-6',
  7: 'num-7',
  8: 'num-8',
}

function showMine(r, c) {
  if (!props.minesPlaced) return false
  if (props.status !== 'lost') return false
  return props.mines[r][c]
}

function cellContent(r, c) {
  if (props.revealed[r][c]) {
    if (props.minesPlaced && props.mines[r][c]) return 'mine'
    return props.numbers[r][c] === 0 ? 'empty' : 'number'
  }
  if (props.flagged[r][c]) return props.wrongFlags.has(`${r},${c}`) ? 'wrong-flag' : 'flag'
  if (showMine(r, c)) return 'mine'
  return 'hidden'
}

function cellLabel(r, c) {
  const content = cellContent(r, c)
  const state = {
    hidden: 'sin explorar',
    empty: 'vacía',
    number: `número ${props.numbers[r][c]}`,
    mine: 'mina',
    flag: 'bandera puesta',
    'wrong-flag': 'bandera incorrecta',
  }[content]
  const exploded = props.exploded?.r === r && props.exploded?.c === c
  return `Fila ${r + 1}, columna ${c + 1}: ${state}${exploded ? ', mina que terminó la partida' : ''}`
}

function focusCell(r, c) {
  focusedCell.value = { r, c }
  nextTick(() => {
    gridEl.value?.querySelector(`[data-r="${r}"][data-c="${c}"]`)?.focus()
  })
}

function onCellKeydown(event, r, c) {
  const destinations = {
    ArrowUp: { r: Math.max(0, r - 1), c },
    ArrowDown: { r: Math.min(props.size - 1, r + 1), c },
    ArrowLeft: { r, c: Math.max(0, c - 1) },
    ArrowRight: { r, c: Math.min(props.size - 1, c + 1) },
  }
  const destination = destinations[event.key]
  if (!destination) return
  event.preventDefault()
  focusCell(destination.r, destination.c)
}

// Solo las fichas que acaban de cambiar. El retraso crece con la distancia
// a la casilla pulsada, así un flood se lee como una onda y no como un corte.
const motion = ref({})
const flagPulse = ref(null)
let pressOrigin = null
let clearTimer = 0

function delayFrom(origin, r, c) {
  const dist = Math.abs(r - origin.r) + Math.abs(c - origin.c)
  return Math.min(dist, 8) * 28
}

function arm(partial) {
  motion.value = { ...motion.value, ...partial }
  const max = Math.max(0, ...Object.values(motion.value).map((item) => item.delay))
  clearTimeout(clearTimer)
  clearTimer = setTimeout(() => {
    motion.value = {}
  }, max + 420)
}

function clearMotion() {
  clearTimeout(clearTimer)
  motion.value = {}
}

watch(
  () => props.revealed,
  (next, prev) => {
    if (!prev || !pressOrigin) return
    let prevCount = 0
    let nextCount = 0
    const partial = {}
    for (let r = 0; r < props.size; r++) {
      for (let c = 0; c < props.size; c++) {
        if (prev[r]?.[c]) prevCount++
        if (next[r]?.[c]) nextCount++
        if (next[r]?.[c] && !prev[r]?.[c]) {
          partial[`${r},${c}`] = { kind: 'dig', delay: delayFrom(pressOrigin, r, c) }
        }
      }
    }
    if (nextCount < prevCount) {
      clearMotion()
      return
    }
    if (Object.keys(partial).length) arm(partial)
  },
)

watch(
  () => props.status,
  (status) => {
    if (status === 'playing') {
      clearMotion()
      return
    }
    if (status !== 'lost' || !props.exploded) return
    const partial = {}
    for (let r = 0; r < props.size; r++) {
      for (let c = 0; c < props.size; c++) {
        if (!props.mines[r]?.[c] || props.flagged[r][c]) continue
        if (r === props.exploded.r && c === props.exploded.c) continue
        partial[`${r},${c}`] = { kind: 'mine', delay: delayFrom(props.exploded, r, c) }
      }
    }
    if (Object.keys(partial).length) arm(partial)
  },
)

onUnmounted(() => clearTimeout(clearTimer))

function cellClass(r, c) {
  const content = cellContent(r, c)
  const key = `${r},${c}`
  const move = motion.value[key]
  return [
    'buscaminas-cell flex aspect-square items-center justify-center rounded font-bold select-none',
    content === 'hidden'
      ? 'cell-hidden'
      : content === 'wrong-flag'
        ? 'cell-dug cell-wrong'
        : props.exploded && props.exploded.r === r && props.exploded.c === c
          ? 'cell-boom bg-signal text-white'
          : 'cell-dug cursor-default',
    move?.kind === 'dig' && 'cell-dig',
    move?.kind === 'mine' && 'cell-mine',
    flagPulse.value === `${key}:on` && 'cell-flag-on',
    flagPulse.value === `${key}:off` && 'cell-flag-off',
  ]
}

function cellStyle(r, c) {
  const move = motion.value[`${r},${c}`]
  if (!move) return undefined
  return { '--dig-delay': `${move.delay}ms` }
}

function pulseFlag(r, c) {
  const on = props.flagged[r][c]
  flagPulse.value = null
  requestAnimationFrame(() => {
    flagPulse.value = `${r},${c}:${on ? 'on' : 'off'}`
  })
}

function onClick(r, c) {
  focusedCell.value = { r, c }
  pressOrigin = { r, c }
  const wasFlagged = props.flagged[r][c]
  emit('cell-click', { r, c })
  if (props.flagged[r][c] !== wasFlagged) pulseFlag(r, c)
}

function onFlag(r, c) {
  focusedCell.value = { r, c }
  const wasFlagged = props.flagged[r][c]
  emit('cell-flag', { r, c })
  if (props.flagged[r][c] !== wasFlagged) pulseFlag(r, c)
}
</script>

<template>
  <div
    ref="gridEl"
    class="game-board-frame buscaminas-board-frame mx-auto flex flex-col gap-1"
    role="grid"
    aria-label="Tablero de Buscaminas"
    aria-describedby="mines-board-instructions"
    :aria-rowcount="size"
    :aria-colcount="size"
  >
    <template v-for="r in size" :key="'row-' + r">
      <div
        class="grid gap-1"
        role="row"
        :aria-rowindex="r"
        :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }"
      >
        <button
          v-for="c in size"
          :key="'cell-' + r + '-' + c"
          :data-r="r - 1"
          :data-c="c - 1"
          type="button"
          role="gridcell"
          :aria-label="cellLabel(r - 1, c - 1)"
          :aria-colindex="c"
          :aria-disabled="!interactive"
          :tabindex="focusedCell.r === r - 1 && focusedCell.c === c - 1 ? 0 : -1"
          :class="cellClass(r - 1, c - 1)"
          :style="cellStyle(r - 1, c - 1)"
          @click="onClick(r - 1, c - 1)"
          @keydown="onCellKeydown($event, r - 1, c - 1)"
          @contextmenu.prevent="onFlag(r - 1, c - 1)"
        >
          <GameIcon
            v-if="cellContent(r - 1, c - 1) === 'mine'"
            id="mine"
            class="cell-icon anim-pop"
          />
          <span
            v-else-if="cellContent(r - 1, c - 1) === 'number'"
            class="cell-content anim-pop leading-none"
            :class="NUMBER_CLASSES[numbers[r - 1][c - 1]]"
            >{{ numbers[r - 1][c - 1] }}</span
          >
          <GameIcon
            v-else-if="cellContent(r - 1, c - 1) === 'flag'"
            id="flag"
            class="cell-icon anim-pop"
          />
          <span
            v-else-if="cellContent(r - 1, c - 1) === 'wrong-flag'"
            class="wrong-flag anim-pop"
          >
            <GameIcon id="flag" class="cell-icon" />
            <GameIcon id="x" class="wrong-flag-x text-signal" />
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.buscaminas-board-frame.game-board-frame {
  background: var(--color-cell-line);
}

.buscaminas-cell {
  appearance: none;
  border: 1px solid transparent;
  container-type: inline-size;
  transition:
    background-color 180ms var(--ease-out-soft),
    border-color 180ms var(--ease-out-soft),
    transform 140ms var(--ease-out-soft);
}

.cell-hidden {
  background: var(--color-cell-hidden);
  border-color: var(--color-cell-line);
  color: #131517;
}

.cell-hidden:hover {
  border-color: var(--color-cell-dug-edge);
  transform: translateY(-1px);
}

.cell-hidden:active {
  transform: scale(0.94);
}

.cell-dig,
.cell-mine {
  transition-delay: var(--dig-delay, 0ms);
}

.cell-dig {
  animation: cell-dig 320ms var(--ease-pop);
  animation-delay: var(--dig-delay, 0ms);
}

.cell-mine {
  animation: cell-mine 280ms var(--ease-pop);
  animation-delay: var(--dig-delay, 0ms);
}

.cell-dig .anim-pop,
.cell-mine .anim-pop {
  animation-delay: var(--dig-delay, 0ms);
}

.cell-flag-on {
  animation: cell-flag-on 220ms var(--ease-pop);
}

.cell-flag-off {
  animation: cell-flag-off 160ms var(--ease-out-soft);
}

.cell-dug {
  background: var(--color-cell-dug);
  border-color: var(--color-cell-dug-edge);
  color: #f6e7d4;
}

.cell-wrong {
  border-color: var(--color-signal);
}

.cell-content {
  font-size: clamp(0.55rem, 32cqw, 1.25rem);
  line-height: 1;
}

.cell-icon {
  width: 52%;
  height: 52%;
}

.wrong-flag {
  position: relative;
  display: flex;
  width: 70%;
  height: 70%;
  align-items: center;
  justify-content: center;
}

.wrong-flag-x {
  position: absolute;
  width: 70%;
  height: 70%;
}

.num-1 { color: #7dd3fc; }
.num-2 { color: #6ee7b7; }
.num-3 { color: #fecaca; }
.num-4 { color: #ddd6fe; }
.num-5 { color: #fde68a; }
.num-6 { color: #99f6e4; }
.num-7 { color: #f6e7d4; }
.num-8 { color: #d6d3d1; }

/* La ficha se hunde y vuelve a su sitio. El retraso lo pone la onda. */
@keyframes cell-dig {
  from {
    transform: translateY(10%) scale(0.86);
  }

  to {
    transform: none;
  }
}

@keyframes cell-mine {
  from {
    transform: scale(0.72);
  }

  to {
    transform: none;
  }
}

@keyframes cell-flag-on {
  from {
    transform: translateY(-16%) scale(0.92);
  }

  to {
    transform: none;
  }
}

@keyframes cell-flag-off {
  from {
    transform: scale(0.94);
  }

  to {
    transform: none;
  }
}

/* La mina que te ha matado tiembla una vez al perder. Solo se anima
   transform: un tablero de 16x30 con box-shadow animado se arrastra. */
.cell-boom {
  animation: cell-boom 420ms var(--ease-out-soft) both;
}

@keyframes cell-boom {
  0%,
  100% {
    transform: translateX(0);
  }

  15% {
    transform: translateX(-5px);
  }

  35% {
    transform: translateX(4px);
  }

  55% {
    transform: translateX(-3px);
  }

  75% {
    transform: translateX(2px);
  }
}
</style>
