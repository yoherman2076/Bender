<script setup>
import { ref } from 'vue'
import { SIZE, tileClass } from '../../games/juego2048/constants.js'

defineProps({
  board: { type: Array, required: true },
  tiles: { type: Array, required: true },
})

const emit = defineEmits(['move'])
const gridRef = ref(null)

defineExpose({
  focus: () => gridRef.value?.focus(),
})

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
}

const SWIPE_MIN = 24
const touchStart = ref(null)

function onTouchStart(e) {
  const t = e.changedTouches[0]
  touchStart.value = { x: t.clientX, y: t.clientY }
}

function onTouchCancel() {
  touchStart.value = null
}

function onTouchEnd(e) {
  if (!touchStart.value) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.value.x
  const dy = t.clientY - touchStart.value.y
  touchStart.value = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return
  emit('move', Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
}

function onKeydown(event) {
  const direction = KEY_DIRECTIONS[event.key]
  if (!direction) return
  event.preventDefault()
  emit('move', direction)
}

function fontSizeFor(value) {
  if (value >= 1024) return 'clamp(0.8rem, 6cqw, 1.75rem)'
  if (value >= 128) return 'clamp(1rem, 8cqw, 2.25rem)'
  return 'clamp(1.15rem, 10cqw, 3rem)'
}

function cellLabel(value, r, c) {
  return `Fila ${r + 1}, columna ${c + 1}: ${value === 0 ? 'vacía' : value}`
}
</script>

<template>
  <div
    class="game-board-frame game-2048-board-frame mx-auto touch-none"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
  >
    <div
      ref="gridRef"
      class="game-2048-tile-area relative"
      :style="{ '--tile-count': SIZE }"
      role="grid"
      aria-label="Tablero 2048"
      aria-describedby="game-2048-instructions"
      :aria-rowcount="SIZE"
      :aria-colcount="SIZE"
      tabindex="0"
      @keydown="onKeydown"
      @click="$event.currentTarget.focus()"
    >
      <div class="grid gap-2" role="rowgroup">
        <div
          v-for="(row, r) in board"
          :key="'row-' + r"
          class="grid gap-2"
          role="row"
          :aria-rowindex="r + 1"
          :style="{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }"
        >
        <div
          v-for="(value, c) in row"
          :key="'cell-' + r + '-' + c"
          role="gridcell"
          :aria-label="cellLabel(value, r, c)"
          :aria-colindex="c + 1"
          class="flex aspect-square items-center justify-center rounded-small bg-surface"
        ></div>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          v-for="tile in tiles"
          :key="tile.id"
          class="game-2048-tile"
          :data-tile-id="tile.id"
          :data-value="tile.value"
          :data-kind="tile.kind || 'normal'"
          :data-r="tile.r"
          :data-c="tile.c"
          :class="[
            tile.kind === 'ghost'
              ? 'game-2048-tile--ghost'
              : tile.kind === 'merged'
                ? 'game-2048-tile--merged'
                : 'game-2048-tile--normal',
          ]"
          :style="{ '--r': tile.r, '--c': tile.c }"
        >
          <div
            :class="[
              'game-2048-tile-inner flex h-full w-full items-center justify-center rounded-md font-extrabold tabular-nums',
              tileClass(tile.value),
              tile.kind === 'new'
                ? 'game-2048-tile-inner--new'
                : tile.kind === 'merged'
                  ? 'game-2048-tile-inner--merged'
                  : '',
            ]"
            :style="{ fontSize: fontSizeFor(tile.value) }"
          >
            {{ tile.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-2048-board-frame.game-board-frame {
  background: var(--color-mist);
}

.game-2048-tile-area {
  --tile-gap: 0.5rem;
}

.game-2048-tile {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(
    (100% - (var(--tile-count) - 1) * var(--tile-gap)) / var(--tile-count)
  );
  aspect-ratio: 1;
  transform: translate(
    calc(var(--c) * (100% + var(--tile-gap))),
    calc(var(--r) * (100% + var(--tile-gap)))
  );
  transition: transform var(--dur-slide) var(--ease-out-soft);
  will-change: transform;
}

.game-2048-tile--ghost {
  z-index: 1;
}

.game-2048-tile--normal {
  z-index: 2;
}

.game-2048-tile--merged {
  z-index: 3;
}

.game-2048-tile-inner--new {
  animation: bender-pop var(--dur-pop) var(--ease-pop) var(--dur-slide) backwards;
}

.game-2048-tile-inner--merged {
  animation: tile-merge var(--dur-pop) var(--ease-pop) var(--dur-slide) backwards;
}

@keyframes tile-merge {
  0% {
    opacity: 0;
    transform: scale(0.75);
  }

  45% {
    opacity: 1;
    transform: scale(1.1);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
