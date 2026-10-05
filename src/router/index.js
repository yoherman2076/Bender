import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Inicio' },
  },
  {
    path: '/juegos/tango',
    name: 'tango',
    component: () => import('../views/TangoView.vue'),
    meta: { title: 'Tango' },
  },
  {
    path: '/juegos/buscaminas',
    name: 'buscaminas',
    component: () => import('../views/BuscaminasView.vue'),
    meta: { title: 'Busca minas' },
  },
  {
    path: '/juegos/patches',
    name: 'patches',
    component: () => import('../views/PatchesView.vue'),
    meta: { title: 'Patches' },
  },
  {
    path: '/juegos/2048',
    name: 'juego-2048',
    component: () => import('../views/Juego2048View.vue'),
    meta: { title: '2048' },
  },
  // Cualquier ruta desconocida vuelve al inicio
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
