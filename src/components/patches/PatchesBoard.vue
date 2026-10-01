<script setup>
import { computed, nextTick, ref } from 'vue'
import { SIZE, PATCH_PALETTE } from '../../games/patches/constants.js'
import {
  cluesInRect,
  expectedMeasure,
  normalizeRect,
  rectsOverlap,
  validatePlacement,
} from '../../games/patches/validators.js'

const props = defineProps({
  clues: { type: Array, required: true },
  patches: { type: Array, required: true }, // [{ id, r1, c1, r2, c2 }]
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['draw', 'delete-patch'])

const gridEl = ref(null)
const dragStart = ref(null)
const dragEnd = ref(null)
const focusedCell = ref({ r: 0, c: 0 })
const keyboardMessage = ref('')

const preview = computed(() => {
  if (!dragStart.value || !dragEnd.value) return null
  return normalizeRect(dragStart.value, dragEnd.value)
})

const previewState = computed(() => {
  if (!preview.value) return null
  if (cluesInRect(preview.value, props.clues).length === 0) return 'unrelated'
  return validatePlacement(preview.value, props.clues, props.patches).ok
    ? 'valid'
    : 'invalid'
})

const previewKeys = computed(() => {
  const set = new Set()
  const p = preview.value
  if (!p) return set
  for (let r = p.r1; r <= p.r2; r++) {
    for (let c = p.c1; c <= p.c2; c++) set.add(`${r},${c}`)
  }
  return set
})

const patchOfCell = computed(() => {
  const map = new Map()
  props.patches.forEach((p, i) => {
    for (let r = p.r1; r <= p.r2; r++) {
      for (let c = p.c1; c <= p.c2; c++) map.set(`${r},${c}`, i)
    }
  })
  return map
})

function rectAreaOf(rect) {
  return (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1)
}

function shownMeasure(area, expected, state) {
  if (state === 'invalid' && expected != null) return expected
  return area
}

/** Parches como piezas fusionadas: estilo + área para la capa superpuesta. */
const patchOverlays = computed(() =>
  props.patches.map((p, i) => {
    const related = cluesInRect(p, props.clues).length > 0
    const valid = related && validatePlacement(
      p,
      props.clues,
      props.patches.filter((_, patchIndex) => patchIndex !== i),
    ).ok
    const area = rectAreaOf(p)
    const expected = expectedMeasure(p, props.clues)
    const state = !related ? 'unrelated' : valid ? 'valid' : 'invalid'
    const clue = cluesInRect(p, props.clues)[0]
    return {
      id: p.id,
      style: overlayStyle(p),
      area,
      expected,
      shown: shownMeasure(area, expected, state),
      state,
      palette: clue ? paletteOf(clue) : PATCH_PALETTE[i % PATCH_PALETTE.length],
    }
  }),
)

/** Contorno + cuenta del rectángulo que se está dibujando. */
const previewOverlay = computed(() => {
  if (!preview.value) return null
  if (props.patches.some((patch) => rectsOverlap(preview.value, patch))) return null
  const area = rectAreaOf(preview.value)
  const expected = expectedMeasure(preview.value, props.clues)
  const clue = cluesInRect(preview.value, props.clues)[0]
  return {
    style: overlayStyle(preview.value),
    area,
    shown: shownMeasure(area, expected, previewState.value),
    state: previewState.value,
    palette: clue ? paletteOf(clue) : null,
  }
})

function paletteOf(clue) {
  const index = props.clues.findIndex((item) => item.r === clue.r && item.c === clue.c)
  return PATCH_PALETTE[(index < 0 ? 0 : index) % PATCH_PALETTE.length]
}

function cellBoxStyle(clue) {
  return {
    left: trackStart(clue.c),
    top: trackStart(clue.r),
    width: trackSpan(1),
    height: trackSpan(1),
  }
}

function clueShapeClass(shape) {
  if (shape === 'wide') return 'clue-shape--wide'
  if (shape === 'tall') return 'clue-shape--tall'
  if (shape === 'square') return 'clue-shape--square'
  return 'clue-shape--free'
}

const cellTrack = `((100% - ${SIZE - 1} * var(--cell-gap)) / ${SIZE})`

function trackStart(index) {
  return `calc(${index} * (${cellTrack} + var(--cell-gap)))`
}

function trackSpan(span) {
  return `calc(${span} * ${cellTrack} + ${Math.max(span - 1, 0)} * var(--cell-gap))`
}

function overlayStyle(rect) {
  return {
    left: trackStart(rect.c1),
    top: trackStart(rect.r1),
    width: trackSpan(rect.c2 - rect.c1 + 1),
    height: trackSpan(rect.r2 - rect.r1 + 1),
  }
}

function cellFromEvent(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-cell]')
  if (!el) return null
  return { r: Number(el.dataset.r), c: Number(el.dataset.c) }
}

function cellLabel(r, c) {
  const clue = props.clues.find((item) => item.r === r && item.c === c)
  const patchIndex = patchOfCell.value.get(`${r},${c}`)
  const details = []
  if (clue) {
    const shape = {
      square: 'cuadrado',
      wide: 'más ancho que alto',
      tall: 'más alto que ancho',
      free: 'forma libre',
    }[clue.shape]
    details.push(`pista ${clue.number ?? 'sin número'}, ${shape}`)
  }
  if (patchIndex !== undefined) {
    const patch = props.patches[patchIndex]
    const valid =
      cluesInRect(patch, props.clues).length > 0 &&
      validatePlacement(
        patch,
        props.clues,
        props.patches.filter((_, index) => index !== patchIndex),
      ).ok
    details.push(
      `parche ${patchIndex + 1}, ${rectAreaOf(patch)} casillas, ${valid ? 'válido' : 'con errores'}`,
    )
  } else {
    details.push('sin parche')
  }
  return `Fila ${r + 1}, columna ${c + 1}: ${details.join(', ')}`
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
    ArrowDown: { r: Math.min(SIZE - 1, r + 1), c },
    ArrowLeft: { r, c: Math.max(0, c - 1) },
    ArrowRight: { r, c: Math.min(SIZE - 1, c + 1) },
  }
  const destination = destinations[event.key]
  if (destination) {
    event.preventDefault()
    if (dragStart.value) dragEnd.value = destination
    focusCell(destination.r, destination.c)
    return
  }

  if (event.key === 'Escape' && dragStart.value) {
    event.preventDefault()
    dragStart.value = null
    dragEnd.value = null
    keyboardMessage.value = 'Selección cancelada.'
    return
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    const patchIndex = patchOfCell.value.get(`${r},${c}`)
    if (patchIndex === undefined) return
    event.preventDefault()
    emit('delete-patch', props.patches[patchIndex].id)
    keyboardMessage.value = `Parche ${patchIndex + 1} eliminado.`
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  if (!dragStart.value) {
    dragStart.value = { r, c }
    dragEnd.value = { r, c }
    keyboardMessage.value = `Primera esquina: fila ${r + 1}, columna ${c + 1}. Elige la segunda esquina.`
    return
  }

  const start = dragStart.value
  dragStart.value = null
  dragEnd.value = null
  if (start.r === r && start.c === c) {
    const patchIndex = patchOfCell.value.get(`${r},${c}`)
    if (patchIndex !== undefined) {
      emit('delete-patch', props.patches[patchIndex].id)
      keyboardMessage.value = `Parche ${patchIndex + 1} eliminado.`
    } else {
      keyboardMessage.value = 'Elige una segunda esquina distinta para dibujar un parche.'
    }
    return
  }

  emit('draw', normalizeRect(start, { r, c }))
  keyboardMessage.value = `Rectángulo seleccionado desde fila ${start.r + 1}, columna ${start.c + 1} hasta fila ${r + 1}, columna ${c + 1}.`
}

function onPointerDown(e, r, c) {
  if (props.disabled || dragStart.value) return
  e.preventDefault()
  focusCell(r, c)
  try {
    gridEl.value?.setPointerCapture(e.pointerId)
  } catch {}
  dragStart.value = { r, c }
  dragEnd.value = { r, c }
}

function onPointerMove(e) {
  if (!dragStart.value || props.disabled) return
  const cell = cellFromEvent(e)
  if (cell) dragEnd.value = cell
}

function onPointerUp() {
  if (!dragStart.value) return
  const start = dragStart.value
  const end = dragEnd.value ?? start
  dragStart.value = null
  dragEnd.value = null
  if (props.disabled) return
  const same = start.r === end.r && start.c === end.c
  if (same) {
    const idx = patchOfCell.value.get(`${start.r},${start.c}`)
    if (idx !== undefined) emit('delete-patch', props.patches[idx].id)
    return
  }
  emit('draw', normalizeRect(start, end))
}

function onPointerCancel() {
  dragStart.value = null
  dragEnd.value = null
}

</script>

<template>
  <div class="game-board-frame patches-board-frame mx-auto">
    <div class="patches-sheet relative">
      <p class="sr-only" role="status" aria-live="polite">{{ keyboardMessage }}</p>
      <p id="patches-board-instructions" class="sr-only">
        Usa las flechas para moverte. Intro o espacio marca una esquina y después la opuesta; Escape cancela. Supr elimina el parche de la casilla enfocada.
      </p>
      <!-- Base: casillas vacías. El rectángulo de la pista tapa sus juntas. -->
      <div
        ref="gridEl"
        class="patches-grid flex flex-col touch-none select-none"
        role="grid"
        aria-label="Tablero de Patches"
        aria-describedby="patches-board-instructions"
        :aria-rowcount="SIZE"
        :aria-colcount="SIZE"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <div
          v-for="r in SIZE"
          :key="'row-' + r"
          class="patches-row grid"
          role="row"
          :aria-rowindex="r"
          :style="{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }"
        >
          <button
            v-for="c in SIZE"
            :key="'cell-' + r + '-' + c"
            type="button"
            role="gridcell"
            :aria-label="cellLabel(r - 1, c - 1)"
            :aria-colindex="c"
            data-cell
            :data-r="r - 1"
            :data-c="c - 1"
            :tabindex="focusedCell.r === r - 1 && focusedCell.c === c - 1 ? 0 : -1"
            :class="[
              'aspect-square rounded border transition-colors',
              patchOfCell.has(`${r - 1},${c - 1}`)
                ? 'border-transparent bg-transparent'
                : !previewOverlay && previewKeys.has(`${r - 1},${c - 1}`)
                  ? previewState === 'valid'
                    ? 'border-ink bg-ink/10'
                    : previewState === 'unrelated'
                      ? 'border-mist bg-porcelain'
                      : 'border-signal bg-signal/15'
                  : 'border-mist bg-porcelain hover:border-ink',
            ]"
            @pointerdown="onPointerDown($event, r - 1, c - 1)"
            @keydown="onCellKeydown($event, r - 1, c - 1)"
          ></button>
        </div>
      </div>

      <!-- Parches fusionados + preview, superpuestos (no interceptan gestos) -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          v-for="o in patchOverlays"
          :key="'patch-' + o.id"
          :style="o.style"
          :class="o.state === 'valid'
            ? ['patch-rect anim-pop-sm absolute flex items-center justify-center', o.palette.bg, o.palette.text, o.palette.edge]
            : o.state === 'unrelated'
              ? 'patch-rect patch-rect--unrelated anim-pop-sm absolute flex items-center justify-center'
              : 'patch-rect patch-rect--invalid anim-pop-sm absolute flex items-center justify-center'"
        >
          <span
            :class="['patch-area-number font-bold', o.state === 'valid' ? o.palette.text : o.state === 'unrelated' ? 'text-stone' : 'text-signal']"
            >{{ o.shown }}</span
          >
          <span
            v-if="o.state === 'invalid'"
            class="patch-mark absolute flex items-center justify-center rounded-full bg-signal font-black text-white"
            aria-label="Parche incorrecto"
          >
            ×
          </span
          >
        </div>
        <div
          v-if="previewOverlay"
          :style="previewOverlay.style"
          :class="[
            'patch-rect absolute flex items-center justify-center',
            previewOverlay.state === 'valid' && previewOverlay.palette
              ? [previewOverlay.palette.bg, previewOverlay.palette.text, previewOverlay.palette.edge]
              : previewOverlay.state === 'unrelated'
                ? 'patch-rect--unrelated'
                : 'patch-rect--invalid',
          ]"
        >
          <span
            :class="[
              'patch-area-number font-bold',
              previewOverlay.state === 'valid' && previewOverlay.palette
                ? previewOverlay.palette.text
                : previewOverlay.state === 'invalid'
                  ? 'text-signal'
                  : 'text-ink',
            ]"
            >{{ previewOverlay.shown }}</span
          >
        </div>
      </div>

      <!-- Pistas: la forma, del color final, detrás del número. Al cubrirla queda el parche. -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <template v-for="(clue, clueIndex) in clues" :key="'clue-' + clue.r + '-' + clue.c">
          <div
            v-if="!patchOfCell.has(`${clue.r},${clue.c}`)"
            :style="cellBoxStyle(clue)"
            class="clue-cell absolute"
          >
            <span
              class="clue-shape"
              :class="[
                PATCH_PALETTE[clueIndex % PATCH_PALETTE.length].bg,
                PATCH_PALETTE[clueIndex % PATCH_PALETTE.length].edge,
                clueShapeClass(clue.shape),
              ]"
            />
            <span
              class="board-clue-number font-extrabold"
              :class="PATCH_PALETTE[clueIndex % PATCH_PALETTE.length].text"
              >{{ clue.number ?? '?' }}</span
            >
          </div>
        </template>
      </div>
      </div>
  </div>
</template>

<style scoped>
.patches-sheet {
  --cell-gap: 4px;
}

.patches-grid {
  gap: var(--cell-gap);
}

.patches-row {
  gap: var(--cell-gap);
}

.patch-rect {
  box-sizing: border-box;
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
}

.patch-rect--unrelated {
  border-style: dashed;
  border-color: var(--color-stone);
  background: color-mix(in srgb, var(--color-porcelain) 88%, var(--color-ink));
  color: var(--color-stone);
}

.patch-rect--invalid {
  border-color: var(--color-signal);
  background: color-mix(in srgb, var(--color-signal) 18%, var(--color-surface));
  color: var(--color-signal);
}

.patch-rect--preview {
  border-style: dashed;
  border-color: var(--color-ink);
  background: color-mix(in srgb, var(--color-ink) 10%, var(--color-surface));
  color: var(--color-ink);
}

.patch-mark {
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  font-size: 11px;
  line-height: 1;
}

.patch-area-number {
  font-size: clamp(0.8rem, 5.5cqw, 1.75rem);
  line-height: 1;
}

.clue-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.clue-shape {
  position: absolute;
  box-sizing: border-box;
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
}

.clue-shape--tall {
  width: 34%;
  height: 62%;
}

.clue-shape--wide {
  width: 62%;
  height: 34%;
}

.clue-shape--square,
.clue-shape--free {
  width: 46%;
  height: 46%;
}

.board-clue-number {
  position: relative;
  z-index: 1;
  font-size: clamp(0.85rem, 5.2cqw, 1.65rem);
  line-height: 1;
}
</style>
