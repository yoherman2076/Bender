<script setup>
import GameIcon from './GameIcon.vue'

defineProps({
  game: {
    type: Object,
    required: true,
  },
  savedSummary: { type: Object, default: null },
})
</script>

<template>
  <RouterLink :to="game.route" class="game-card flex min-h-[200px] flex-col justify-between no-underline">
    <span class="game-mark" :data-game="game.id" aria-hidden="true">
      <GameIcon :id="game.id" />
    </span>
    <div>
      <h2 class="m-0 text-heading-sm text-ink">{{ game.title }}</h2>
      <p class="mt-2 mb-0 text-sm text-stone">{{ game.short }}</p>
      <p v-if="savedSummary" class="mt-4 mb-0 text-sm font-semibold text-ember">
        Continuar partida<span v-if="savedSummary.details"> · {{ savedSummary.details }}</span>
      </p>
      <p v-else class="mt-4 mb-0 text-sm font-semibold text-ink">Jugar</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.game-card {
  padding: 24px;
  border-radius: 40px;
  background: var(--color-surface);
  border: 1px solid var(--color-mist);
  box-shadow: var(--shadow-board);
  outline: 1.5px solid transparent;
  outline-offset: -1.5px;
}

.game-card:hover {
  outline-color: var(--color-ink);
}

.game-mark {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 19px;
  background: var(--color-accent-400);
  color: #131517;
}

.game-mark svg {
  width: 28px;
  height: 28px;
}

.game-mark[data-game='tango'] {
  background: var(--color-accent-300);
  color: #131517;
}

.game-mark[data-game='buscaminas'] {
  background: var(--color-accent-400);
  color: #131517;
}

.game-mark[data-game='patches'] {
  background: var(--color-accent-500);
  color: #fff;
}

.game-mark[data-game='2048'] {
  background: var(--color-accent-600);
  color: #fff;
}
</style>
