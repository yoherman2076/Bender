<script setup>
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  canUndo: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  moves: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
})

const emit = defineEmits(['restart', 'undo'])
</script>

<template>
  <div class="mx-auto mb-5 grid w-full max-w-[440px] gap-2">
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-button bg-surface px-2 py-2 text-center">
        <p class="caption m-0">Puntos</p>
        <p class="m-0 text-heading-sm text-ink tabular-nums">{{ score }}</p>
        <p class="m-0 text-xs text-stone tabular-nums">Mejor {{ bestScore }}</p>
      </div>
      <div class="rounded-button bg-surface px-2 py-2 text-center">
        <p class="caption m-0">Movimientos</p>
        <p class="m-0 text-heading-sm text-ink tabular-nums">{{ moves }}</p>
      </div>
      <div class="rounded-button bg-surface px-2 py-2 text-center">
        <p class="caption m-0">Tiempo</p>
        <p class="m-0 text-heading-sm text-ink tabular-nums">{{ formatDuration(seconds) }}</p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-ghost btn-compact w-full" @click="emit('restart')">
        Reiniciar
      </button>
      <button
        type="button"
        class="btn-ghost btn-compact w-full"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        Deshacer
      </button>
    </div>
  </div>
</template>
