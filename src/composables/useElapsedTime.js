import { computed, onBeforeUnmount, ref, watch } from 'vue'

export function useElapsedTime(startTime, isRunning) {
  const now = ref(Date.now())
  let interval = null

  function syncClock() {
    now.value = Date.now()
  }

  watch(
    isRunning,
    (running) => {
      if (interval !== null) clearInterval(interval)
      interval = null
      syncClock()
      if (running) interval = setInterval(syncClock, 1000)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (interval !== null) clearInterval(interval)
  })

  return computed(() => Math.max(0, Math.floor((now.value - startTime.value) / 1000)))
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${minutes}:${String(rest).padStart(2, '0')}`
}
