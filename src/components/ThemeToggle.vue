<script setup>
import { useTheme } from '../composables/useTheme.js'

defineProps({
  labelled: { type: Boolean, default: false },
})

const { theme, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :class="{ 'theme-toggle--labelled': labelled }"
    :aria-label="theme === 'day' ? 'Activar modo nocturno' : 'Activar modo diurno'"
    @click="toggle"
  >
    <svg v-if="theme === 'day'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M16.8 14.8A6.2 6.2 0 0 1 9.2 7.2 6.2 6.2 0 1 0 16.8 14.8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.75" />
      <path
        d="M12 3.2v1.8M12 19v1.8M3.2 12h1.8M19 12h1.8M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="labelled">{{ theme === 'day' ? 'Modo nocturno' : 'Modo diurno' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
  border: 1.5px solid var(--color-ink);
  border-radius: 19px;
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--color-porcelain);
}

.theme-toggle--labelled {
  width: 100%;
  justify-content: flex-start;
}
</style>
