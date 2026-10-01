<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { games } from '../data/games.js'
import GameIcon from './GameIcon.vue'
import ThemeToggle from './ThemeToggle.vue'

const STORAGE_KEY = 'bender-sidebar-expanded'

const route = useRoute()
const emit = defineEmits(['mobile-open-change'])
const isDesktop = ref(false)
const isExpanded = ref(true)
const isMobileOpen = ref(false)
const panelId = 'app-navigation'
const closeButton = ref(null)
const expandButton = ref(null)
const mobileMenuButton = ref(null)
let desktopQuery

const showLabels = computed(() => !isDesktop.value || isExpanded.value)

function syncViewport(event) {
  isDesktop.value = event.matches
  if (event.matches) isMobileOpen.value = false
}

function openMobileSidebar() {
  isMobileOpen.value = true
  nextTick(() => closeButton.value?.focus())
}

async function closeMobileSidebar() {
  if (!isMobileOpen.value) return
  isMobileOpen.value = false
  await nextTick()
  mobileMenuButton.value?.focus()
}

async function toggleSidebar() {
  if (!isDesktop.value) {
    if (isMobileOpen.value) {
      await closeMobileSidebar()
    } else {
      openMobileSidebar()
    }
    return
  }

  isExpanded.value = !isExpanded.value
  await nextTick()
  if (isExpanded.value) {
    closeButton.value?.focus()
  } else {
    expandButton.value?.focus()
  }
}

function onSidebarKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMobileSidebar()
    return
  }
  if (isDesktop.value || !isMobileOpen.value || event.key !== 'Tab') return

  const focusable = [...event.currentTarget.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(isExpanded, (expanded) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(expanded))
  } catch {}
})

watch(
  () => route.fullPath,
  () => {
    if (!isDesktop.value) closeMobileSidebar()
  },
)

watch(isMobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  emit('mobile-open-change', open)
})

onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 768px)')
  isDesktop.value = desktopQuery.matches
  try {
    isExpanded.value = localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {}
  desktopQuery.addEventListener('change', syncViewport)
})

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener('change', syncViewport)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="contents">
    <div
      class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-mist bg-porcelain px-3 md:hidden"
    >
      <RouterLink
        to="/"
        class="flex min-h-11 items-center gap-2.5 no-underline"
        aria-label="bender, ir al inicio"
      >
        <span class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z"
            />
          </svg>
        </span>
        <span class="wordmark">bender</span>
      </RouterLink>
      <div class="flex items-center gap-2">
        <button
          ref="mobileMenuButton"
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-button px-3 font-medium text-ink hover:bg-surface"
          :aria-expanded="isMobileOpen"
          :aria-controls="panelId"
          @click="openMobileSidebar"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Menú</span>
        </button>
      </div>
    </div>

    <aside
      :id="panelId"
      class="fixed inset-y-0 left-0 z-50 h-dvh w-72 border-r border-mist bg-surface transition-[width,translate,transform] duration-200 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0"
      :class="[
        isDesktop && !isExpanded ? 'md:w-20' : 'md:w-72',
        !isDesktop && !isMobileOpen ? '-translate-x-full' : 'translate-x-0',
      ]"
      :aria-hidden="!isDesktop && !isMobileOpen"
      :inert="!isDesktop && !isMobileOpen"
      :role="!isDesktop && isMobileOpen ? 'dialog' : undefined"
      :aria-modal="!isDesktop && isMobileOpen ? 'true' : undefined"
      aria-label="Menú principal"
      @keydown="onSidebarKeydown"
    >
      <div class="flex h-full min-h-0 flex-col">
        <div
          class="flex h-16 shrink-0 items-center border-b border-mist"
          :class="showLabels ? 'justify-between gap-3 px-4' : 'justify-center px-2'"
        >
          <RouterLink
            to="/"
            class="flex min-h-11 items-center gap-2.5 no-underline"
            aria-label="bender, ir al inicio"
          >
            <span class="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z"
                />
              </svg>
            </span>
            <span v-if="showLabels" class="wordmark truncate">bender</span>
          </RouterLink>
          <button
            v-if="showLabels"
            ref="closeButton"
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-stone hover:bg-porcelain hover:text-ink"
            :aria-label="isDesktop ? 'Contraer menú lateral' : 'Cerrar menú lateral'"
            :aria-expanded="isDesktop ? isExpanded : isMobileOpen"
            :aria-controls="panelId"
            @click="toggleSidebar"
          >
            <svg
              v-if="isDesktop"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <button
          v-if="!showLabels"
          ref="expandButton"
          type="button"
          class="mx-auto mt-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-stone hover:bg-porcelain hover:text-ink"
          aria-label="Expandir menú lateral"
          :aria-expanded="isExpanded"
          :aria-controls="panelId"
          @click="toggleSidebar"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <nav
          class="min-h-0 flex-1 overflow-y-auto px-3 py-4"
          :class="showLabels ? '' : 'px-2'"
          aria-label="Navegación principal"
        >
          <RouterLink
            to="/"
            class="nav-link flex min-h-12 w-full items-center rounded-button text-[0.95rem] font-medium text-stone no-underline transition-colors hover:bg-porcelain hover:text-ink"
            :class="showLabels ? 'gap-3 px-3' : 'justify-center px-2'"
            active-class="active"
            exact
            title="Inicio"
            aria-label="Inicio"
          >
            <svg
              class="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m3 11 9-8 9 8" />
              <path d="M5 10v10h14V10M9 20v-6h6v6" />
            </svg>
            <span v-if="showLabels">Inicio</span>
          </RouterLink>

          <div v-if="showLabels" class="caption px-3 pt-6 pb-2">Juegos</div>
          <div v-else class="mx-auto my-3 h-px w-8 bg-mist" />

          <RouterLink
            v-for="game in games"
            :key="game.id"
            :to="game.route"
            class="nav-link flex min-h-12 w-full items-center rounded-button text-[0.95rem] font-medium text-stone no-underline transition-colors hover:bg-porcelain hover:text-ink"
            :class="showLabels ? 'gap-3 px-3' : 'justify-center px-2'"
            active-class="active"
            :title="showLabels ? undefined : game.title"
            :aria-label="game.title"
          >
            <span
              class="nav-game-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-small border border-mist bg-porcelain text-ink"
              aria-hidden="true"
            >
              <GameIcon :id="game.id" />
            </span>
            <span v-if="showLabels">{{ game.title }}</span>
          </RouterLink>
        </nav>

        <footer
          class="shrink-0 border-t border-mist px-3 py-3 text-[13px] leading-relaxed text-stone"
          :class="showLabels ? 'px-4' : 'px-2'"
        >
          <ThemeToggle :labelled="showLabels" />
          <template v-if="showLabels">
            <p class="wordmark m-0 mt-3">bender</p>
            <p class="m-0 mt-1">{{ games.length }} juegos para jugar sin conexión.</p>
          </template>
        </footer>
      </div>
    </aside>

    <Transition name="drawer-backdrop">
      <button
        v-if="!isDesktop && isMobileOpen"
        type="button"
        class="fixed inset-0 z-40 cursor-default bg-ink/40 md:hidden"
        aria-label="Cerrar menú lateral"
        @click="closeMobileSidebar"
      />
    </Transition>
  </div>
</template>

<style scoped>
.nav-link.active {
  color: var(--color-on-ink);
  background: var(--color-ink);
}

.nav-link.active:hover {
  color: var(--color-on-ink);
  background: var(--color-ink);
}

.nav-game-icon svg {
  width: 16px;
  height: 16px;
}

.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity var(--dur-in) var(--ease-out-soft);
}

.drawer-backdrop-leave-active {
  transition-duration: var(--dur-out);
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}
</style>
