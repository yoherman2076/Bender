<script setup>
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  size: { type: Number, required: true },
  difficultyLabel: { type: String, required: true },
  moves: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  bestRecord: { type: Object, default: null },
})

const emit = defineEmits(['play-again'])

function formatTime(s) {
  const m = Math.floor(s / 60)
  const rest = s % 60
  return m > 0 ? `${m} min ${rest} s` : `${rest} s`
}
</script>

<template>
  <section class="surface-card mx-auto w-full max-w-[560px] text-center">
    <p class="badge-peach mb-4">Completado</p>
    <h2 class="m-0 mb-3 text-heading text-ink">Tablero completado</h2>
    <p class="m-0 mb-1 font-medium text-ink">{{ size }}×{{ size }} · {{ difficultyLabel }}</p>
    <p class="m-0 mb-2 text-sm text-stone">
      {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatTime(seconds) }}
    </p>
    <p v-if="bestRecord" class="m-0 mb-6 text-sm text-stone">
      Mejor marca: {{ formatDuration(bestRecord.seconds) }} ·
      {{ bestRecord.moves }} movimiento{{ bestRecord.moves === 1 ? '' : 's' }}
    </p>
    <div v-else class="mb-6"></div>
    <button type="button" class="btn-fill" @click="emit('play-again')">Jugar otra vez</button>
  </section>
</template>
