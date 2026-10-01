import { onBeforeUnmount, onMounted, watch } from 'vue'

export function useGamePersistence(sources, saveGame) {
  watch(sources, saveGame, { deep: true })

  function saveWhenHidden() {
    if (document.visibilityState === 'hidden') saveGame()
  }

  onMounted(() => {
    window.addEventListener('pagehide', saveGame)
    document.addEventListener('visibilitychange', saveWhenHidden)
  })

  onBeforeUnmount(() => {
    saveGame()
    window.removeEventListener('pagehide', saveGame)
    document.removeEventListener('visibilitychange', saveWhenHidden)
  })
}
