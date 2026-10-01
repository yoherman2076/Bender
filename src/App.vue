<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import Navbar from './components/Navbar.vue'
import { hasSavedGameForRoute } from './games/gameStorage.js'

const PROTECTED_ROUTES = new Set(['tango', 'buscaminas', 'patches', 'juego-2048'])

const route = useRoute()
const router = useRouter()
const exitDialogOpen = ref(false)
const pendingExitTarget = ref(null)
const continueButton = ref(null)
const mobileNavigationOpen = ref(false)
const cancelGameConfirmation = shallowRef(null)
provide('cancel-game-confirmation', cancelGameConfirmation)
const isProtectedRoute = computed(() => PROTECTED_ROUTES.has(route.name))

// Dirección de la transición de vista: home es el nivel 0 y los juegos
// el 1. Bajar de nivel entra hacia abajo, subir hacia arriba, y entre
// juegos del mismo nivel no hay dirección (solo crossfade).
const ROUTE_DEPTH = { home: 0, tango: 1, buscaminas: 1, patches: 1, 'juego-2048': 1 }
const pageTransition = ref('page-fade')

function depthOf(name) {
  return ROUTE_DEPTH[name] ?? 0
}

let previouslyFocused = null
let allowNextNavigation = false
let removeBackButtonListener = null

function setAppInert(inert) {
  const appRoot = document.getElementById('app')
  if (!appRoot) return
  if (inert) {
    appRoot.setAttribute('inert', '')
  } else {
    appRoot.removeAttribute('inert')
  }
}

function hasSavedGame(routeName) {
  return hasSavedGameForRoute(routeName)
}

watch(
  () => route.meta.title,
  (title) => {
    document.title = title ? `${title} | Bender Juegos` : 'Bender Juegos'
  },
  { immediate: true },
)

function focusPageHeading() {
  const target =
    document.querySelector('#main-content h1[tabindex="-1"]') ??
    document.querySelector('#main-content')
  target?.focus({ preventScroll: true })
}

function setDialogPageState(open) {
  document.documentElement.classList.toggle('exit-dialog-open', open)
  setAppInert(open)
}

async function openExitDialog(target) {
  if (!exitDialogOpen.value) {
    previouslyFocused = document.activeElement
  }
  pendingExitTarget.value = target
  exitDialogOpen.value = true
  setDialogPageState(true)
  await nextTick()
  continueButton.value?.focus()
}

async function closeExitDialog() {
  if (!exitDialogOpen.value) return
  exitDialogOpen.value = false
  setDialogPageState(false)
  pendingExitTarget.value = null
  await nextTick()
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
}

async function confirmExit() {
  const target = pendingExitTarget.value
  if (!target) return
  exitDialogOpen.value = false
  setDialogPageState(false)
  pendingExitTarget.value = null
  allowNextNavigation = true
  try {
    await router.replace(target.location)
  } catch {
    allowNextNavigation = false
    await openExitDialog(target)
  }
}

function onExitDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeExitDialog()
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

const removeNavigationGuard = router.beforeEach((to, from) => {
  if (cancelGameConfirmation.value) {
    cancelGameConfirmation.value()
    return false
  }
  const fromDepth = depthOf(from.name)
  const toDepth = depthOf(to.name)
  pageTransition.value =
    toDepth > fromDepth ? 'page-forward' : toDepth < fromDepth ? 'page-back' : 'page-fade'

  if (allowNextNavigation) {
    allowNextNavigation = false
    return true
  }
  if (
    !PROTECTED_ROUTES.has(from.name) ||
    to.fullPath === from.fullPath ||
    !hasSavedGame(from.name)
  ) {
    return true
  }
  openExitDialog({
    fullPath: to.fullPath,
    location: {
      path: to.path,
      query: { ...to.query },
      hash: to.hash,
    },
  })
  return false
})

async function handleNativeBack() {
  if (cancelGameConfirmation.value) {
    cancelGameConfirmation.value()
    return
  }
  if (exitDialogOpen.value) {
    await closeExitDialog()
    return
  }
  if (isProtectedRoute.value && hasSavedGame(route.name)) {
    await openExitDialog({
      fullPath: '/',
      location: { path: '/' },
    })
    return
  }
  if (window.history.state?.back) {
    window.history.back()
    return
  }
  await CapacitorApp.exitApp()
}

onMounted(async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    removeBackButtonListener = await CapacitorApp.addListener(
      'backButton',
      handleNativeBack,
    )
  } catch {}
})

onBeforeUnmount(() => {
  removeNavigationGuard()
  removeBackButtonListener?.remove()
  setDialogPageState(false)
})
</script>

<template>
  <div class="flex min-h-screen">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <Navbar @mobile-open-change="mobileNavigationOpen = $event" />

    <div class="flex min-w-0 flex-1 flex-col pt-14 md:pt-0" :inert="mobileNavigationOpen">
      <RouterView v-slot="{ Component }">
        <Transition :name="pageTransition" mode="out-in" @after-enter="focusPageHeading">
          <div :key="route.name" class="min-w-0 flex-1">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="exitDialogOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 px-4 py-6"
        @click.self="closeExitDialog"
        @keydown="onExitDialogKeydown"
      >
        <section
          class="game-dialog-panel surface-card w-full max-w-md text-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
          aria-describedby="exit-dialog-description"
        >
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-peach text-badge"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M9 8H5.5V4.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5.8 8.2A7.2 7.2 0 1 1 6.6 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h2 id="exit-dialog-title" class="m-0 text-heading-sm text-ink">
            ¿Quieres salir del juego?
          </h2>
          <p id="exit-dialog-description" class="mt-3 mb-6 text-stone">
            Si tienes una partida en curso, se guarda automáticamente para continuar cuando vuelvas.
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              class="btn-ghost"
              @click="confirmExit"
            >
              Salir
            </button>
            <button
              ref="continueButton"
              type="button"
              class="btn-fill"
              @click="closeExitDialog"
            >
              Seguir jugando
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
:global(html.exit-dialog-open),
:global(html.exit-dialog-open body) {
  overflow: hidden;
  overscroll-behavior: none;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--dur-in) var(--ease-out-soft);
}

.dialog-leave-active {
  transition-duration: var(--dur-out);
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
