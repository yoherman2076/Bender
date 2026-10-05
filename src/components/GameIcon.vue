<script setup>
defineProps({
  id: { type: String, required: true },
})
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="id === 'tango'">
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M5.9 5.9l1.5 1.5M16.6 16.6l1.5 1.5M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5" />
    </template>
    <template v-else-if="id === 'buscaminas'">
      <circle cx="11" cy="13.2" r="4.6" />
      <path d="M14.4 9.4 17.8 6" />
      <circle cx="18.5" cy="5.2" r="1.15" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="id === 'mine'">
      <circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none" />
      <path d="M12 3.2v2.5M12 18.3v2.5M3.2 12h2.5M18.3 12h2.5M5.8 5.8l1.8 1.8M16.4 16.4l1.8 1.8M18.2 5.8l-1.8 1.8M7.6 16.4l-1.8 1.8" />
    </template>
    <template v-else-if="id === 'patches'">
      <rect x="3.2" y="5.2" width="10.2" height="7.2" rx="1.6" />
      <rect x="10.6" y="11.6" width="10.2" height="7.2" rx="1.6" />
    </template>
    <template v-else-if="id === '2048'">
      <rect x="3.2" y="3.2" width="7.4" height="7.4" rx="1.6" />
      <rect x="13.4" y="3.2" width="7.4" height="7.4" rx="1.6" />
      <rect x="3.2" y="13.4" width="7.4" height="7.4" rx="1.6" />
      <rect x="13.4" y="13.4" width="7.4" height="7.4" rx="1.6" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="id === 'flag'">
      <path d="M7 20.5V3.8" />
      <path d="M7 4.4h10.2L14.6 8.2H17L7 8.2" />
    </template>
    <template v-else-if="id === 'x'">
      <path d="M7 7l10 10M17 7 7 17" />
    </template>
    <template v-else-if="id === 'square'">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </template>
    <template v-else-if="id === 'wide'">
      <rect x="3" y="7.5" width="18" height="9" rx="2" />
    </template>
    <template v-else-if="id === 'tall'">
      <rect x="7.5" y="3" width="9" height="18" rx="2" />
    </template>
  </svg>
</template>
