import { ref } from 'vue'

const STORAGE_KEY = 'bender-theme'
const theme = ref(
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'night'
    ? 'night'
    : 'day',
)

function apply(next) {
  theme.value = next
  const root = document.documentElement
  root.dataset.theme = next
  root.style.colorScheme = next === 'night' ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'night' ? '#141618' : '#f4f5f6')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {}
}

export function useTheme() {
  function toggle() {
    apply(theme.value === 'night' ? 'day' : 'night')
  }

  return { theme, toggle }
}
