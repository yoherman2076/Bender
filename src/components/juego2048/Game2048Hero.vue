<script setup>
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  kind: { type: String, required: true }, // 'win' | 'lost'
  score: { type: Number, default: 0 },
  moves: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
})

const emit = defineEmits(['restart', 'continue'])
</script>

<template>
  <section class="surface-card mx-auto w-full max-w-[440px] text-center">
    <template v-if="kind === 'win'">
      <p class="badge-peach mb-4">2048</p>
      <h2 class="m-0 mb-3 text-heading text-ink">Llegaste a 2048</h2>
      <p class="m-0 mb-2 text-sm text-stone">
        {{ score }} puntos · {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatDuration(seconds) }}
      </p>
      <p class="m-0 mb-6 text-sm text-stone">Mejor puntuación: {{ bestScore }}</p>
      <div class="flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" class="btn-ghost" @click="emit('restart')">Reiniciar</button>
        <button type="button" class="btn-fill" @click="emit('continue')">Seguir jugando</button>
      </div>
    </template>
    <template v-else>
      <p class="caption mb-4">Sin movimientos</p>
      <h2 class="m-0 mb-3 text-heading text-ink">Partida terminada</h2>
      <p class="m-0 mb-2 text-sm text-stone">
        {{ score }} puntos · {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatDuration(seconds) }}
      </p>
      <p class="m-0 mb-6 text-sm text-stone">Mejor puntuación: {{ bestScore }}</p>
      <button type="button" class="btn-fill" @click="emit('restart')">Reiniciar</button>
    </template>
  </section>
</template>
