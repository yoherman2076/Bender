<script setup>
import { difficultyLabel } from '../../games/patches/constants.js'
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  difficulty: { type: String, required: true },
  canUndo: { type: Boolean, default: false },
  moves: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
})

const emit = defineEmits(['undo', 'restart', 'new-game', 'hint'])
</script>

<template>
  <div class="mx-auto mb-5 grid w-full max-w-[440px] grid-cols-3 gap-2">
    <span class="badge-peach col-span-3 justify-self-center">
      {{ difficultyLabel(difficulty) }} · aleatoria
    </span>
    <button
      type="button"
      class="btn-ghost btn-compact w-full"
      :disabled="!canUndo"
      @click="emit('undo')"
    >
      Deshacer
    </button>
    <button type="button" class="btn-ghost btn-compact w-full" @click="emit('restart')">
      Reiniciar
    </button>
    <button type="button" class="btn-ink btn-compact w-full" @click="emit('new-game')">
      <span class="sm:hidden">Nueva</span>
      <span class="hidden sm:inline">Otra partida</span>
    </button>
    <button type="button" class="btn-ghost btn-compact col-span-3 w-full" @click="emit('hint')">
      Usar pista (+30 s)
    </button>
    <span class="caption col-span-3 text-center tabular-nums">
      {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatDuration(seconds) }}
    </span>
  </div>
</template>
