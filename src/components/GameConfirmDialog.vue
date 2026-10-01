<script setup>
import { inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confirmLabel: { type: String, default: 'Continuar' },
})

const emit = defineEmits(['confirm', 'cancel'])
const activeConfirmation = inject('cancel-game-confirmation')
const cancelButton = ref(null)
let previouslyFocused = null
let previousBodyOverflow = ''
let wasAppInert = false

function cancelConfirmation() {
  emit('cancel')
}

function setPageState(open) {
  const appRoot = document.getElementById('app')
  if (open) {
    activeConfirmation.value = cancelConfirmation
    previouslyFocused = document.activeElement
    previousBodyOverflow = document.body.style.overflow
    wasAppInert = appRoot?.hasAttribute('inert') ?? false
    appRoot?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('confirm-dialog-open')
    return
  }

  if (activeConfirmation.value === cancelConfirmation) activeConfirmation.value = null
  if (!wasAppInert) appRoot?.removeAttribute('inert')
  document.body.style.overflow = previousBodyOverflow
  document.documentElement.classList.remove('confirm-dialog-open')
}

watch(
  () => props.open,
  async (open, wasOpen) => {
    if (open) {
      setPageState(true)
      await nextTick()
      cancelButton.value?.focus()
      return
    }

    if (!wasOpen) return
    setPageState(false)
    await nextTick()
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  },
  { immediate: true },
)

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelConfirmation()
    return
  }
  if (event.key !== 'Tab') return

  const buttons = event.currentTarget.querySelectorAll('button:not([disabled])')
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

onBeforeUnmount(() => {
  if (props.open) setPageState(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 px-4 py-6"
        @click.self="cancelConfirmation"
        @keydown="onKeydown"
      >
        <section
          class="game-dialog-panel surface-card w-full max-w-md text-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="game-confirm-title"
          aria-describedby="game-confirm-description"
        >
          <h2 id="game-confirm-title" class="m-0 text-heading-sm text-ink">{{ title }}</h2>
          <p id="game-confirm-description" class="mt-3 mb-6 text-stone">
            {{ description }}
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <button ref="cancelButton" type="button" class="btn-ghost" @click="cancelConfirmation">
              Seguir jugando
            </button>
            <button type="button" class="btn-fill" @click="emit('confirm')">
              {{ confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
:global(html.confirm-dialog-open),
:global(html.confirm-dialog-open body) {
  overflow: hidden;
  overscroll-behavior: none;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--dur-in) var(--ease-out-soft);
}

.dialog-enter-active .game-dialog-panel {
  transition:
    opacity var(--dur-in) var(--ease-out-soft),
    transform var(--dur-in) var(--ease-pop);
}

.dialog-leave-active .game-dialog-panel {
  transition:
    opacity var(--dur-out) var(--ease-out-soft),
    transform var(--dur-out) var(--ease-out-soft);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .game-dialog-panel {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

.dialog-leave-to .game-dialog-panel {
  opacity: 0;
  transform: scale(0.98);
}
</style>
