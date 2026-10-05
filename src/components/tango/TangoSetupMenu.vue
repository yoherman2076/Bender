<script setup>
import { ref } from 'vue'
import { SIZES, DIFFICULTIES } from '../../games/tango/constants.js'

const emit = defineEmits(['play'])

const size = ref(6)
const difficulty = ref('media')

function play() {
  emit('play', { size: size.value, difficulty: difficulty.value })
}
</script>

<template>
  <section class="surface-card mx-auto w-full max-w-xl">
    <h2 class="m-0 text-heading-sm text-ink">Configura tu partida</h2>
    <p class="mt-1 mb-6 text-sm text-stone">
      Elige tamaño y dificultad. Cada partida genera un tablero distinto.
    </p>

    <p class="caption mb-2">Medida del tablero</p>
    <div class="mb-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Medida del tablero">
      <button
        v-for="s in SIZES"
        :key="s"
        type="button"
        class="chip"
        :aria-pressed="size === s"
        @click="size = s"
      >
        {{ s }}×{{ s }}
      </button>
    </div>

    <p class="caption mb-2">Dificultad</p>
    <div class="mb-8 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dificultad">
      <button
        v-for="d in DIFFICULTIES"
        :key="d.id"
        type="button"
        class="chip"
        :aria-pressed="difficulty === d.id"
        @click="difficulty = d.id"
      >
        {{ d.label }}
      </button>
    </div>

    <button type="button" class="btn-fill w-full" @click="play">Jugar</button>
    <p class="mt-3 mb-0 text-center text-sm text-stone">
      Fácil deja más soles y lunas iniciales · Difícil deja menos
    </p>
  </section>
</template>
