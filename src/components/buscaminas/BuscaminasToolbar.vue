<script setup>
import { TOOL_PALA, TOOL_BANDERA } from '../../games/buscaminas/constants.js'
import { formatDuration } from '../../composables/useElapsedTime.js'

defineProps({
  tool: { type: String, default: TOOL_PALA },
  flagsLeft: { type: Number, default: 0 },
  moves: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  canHint: { type: Boolean, default: true },
})

const emit = defineEmits(['restart', 'set-tool', 'hint'])
</script>

<template>
  <div class="mx-auto mb-5 grid w-full max-w-[560px] grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-2">
    <button type="button" class="btn-ghost btn-compact w-full" @click="emit('restart')">
      Reiniciar
    </button>

    <div class="grid min-w-0 grid-cols-2 overflow-hidden rounded-button border-[1.5px] border-ink">
      <button
        type="button"
        :aria-pressed="tool === TOOL_PALA"
        aria-label="Usar pala para abrir casillas"
        :class="[
          'min-h-[44px] min-w-0 px-2 text-[13px] font-medium transition',
          tool === TOOL_PALA ? 'bg-ink text-on-ink' : 'bg-surface text-ink hover:bg-porcelain',
        ]"
        @click="emit('set-tool', TOOL_PALA)"
      >
        Pala
      </button>
      <button
        type="button"
        :aria-pressed="tool === TOOL_BANDERA"
        aria-label="Usar bandera para marcar minas"
        :class="[
          'min-h-[44px] min-w-0 border-l-[1.5px] border-ink px-2 text-[13px] font-medium transition',
          tool === TOOL_BANDERA ? 'bg-ink text-on-ink' : 'bg-surface text-ink hover:bg-porcelain',
        ]"
        @click="emit('set-tool', TOOL_BANDERA)"
      >
        Bandera
      </button>
    </div>

    <button
      type="button"
      class="btn-ghost btn-compact col-span-2 w-full"
      :disabled="!canHint"
      @click="emit('hint')"
    >
      Usar pista (+30 s)
    </button>
    <span class="caption col-span-2 text-center tabular-nums">
      {{ flagsLeft }} bandera{{ flagsLeft === 1 ? '' : 's' }} ·
      {{ moves }} movimiento{{ moves === 1 ? '' : 's' }} · {{ formatDuration(seconds) }}
    </span>
  </div>
</template>
