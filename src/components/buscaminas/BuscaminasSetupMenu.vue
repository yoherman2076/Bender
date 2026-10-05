<script setup>
import { ref } from 'vue'
import GameIcon from '../GameIcon.vue'
import { SIZES, DIFFICULTIES, minesFor } from '../../games/buscaminas/constants.js'

const emit = defineEmits(['play'])

const size = ref(8)
const difficulty = ref('media')

function play() {
  emit('play', { size: size.value, difficulty: difficulty.value })
}
</script>

<template>
  <section class="surface-card mx-auto w-full max-w-xl">
    <h2 class="m-0 text-heading-sm text-ink">Configura tu partida</h2>
    <p class="mt-1 mb-6 text-sm text-stone">
      Elige tamaño y dificultad. Cada partida esconde las minas en otro sitio.
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
        class="chip flex-col"
        :aria-pressed="difficulty === d.id"
        @click="difficulty = d.id"
      >
        <span>{{ d.label }}</span>
        <span class="mine-count text-[11px] tracking-normal normal-case opacity-80">
          <GameIcon id="mine" />
          {{ minesFor(size, d.id) }}
        </span>
      </button>
    </div>

    <button type="button" class="btn-fill w-full" @click="play">Jugar</button>
    <p class="mt-3 mb-0 text-center text-sm text-stone">
      La primera casilla que caves siempre es segura
    </p>
  </section>
</template>

<style scoped>
.mine-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.mine-count svg {
  width: 12px;
  height: 12px;
}
</style>
