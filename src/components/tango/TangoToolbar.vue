<script setup>
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  canUndo: { type: Boolean, default: false },
  moves: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
})

const emit = defineEmits(['restart', 'undo', 'new-game', 'hint'])
</script>

<template>
  <div class="mx-auto mb-5 grid w-full max-w-[560px] grid-cols-3 gap-2">
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
    <button type="button" class="btn-ink btn-compact w-full" @click="emit('new-game')">
      <span class="sm:hidden">Nueva</span>
      <span class="hidden sm:inline">Otra partida</span>
    </button>
    <button type="button" class="btn-ghost btn-compact col-span-3 w-full" @click="emit('hint')">
      Usar pista (+30 s)
    </button>
    <span
      class="caption col-span-3 text-center tabular-nums"
      :class="moves > 0 ? 'anim-fade-up' : 'invisible'"
      :aria-hidden="moves === 0"
    >
      {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatDuration(seconds) }}
    </span>
  </div>
</template>
