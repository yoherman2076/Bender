# Bender Juegos

Colección de juegos de lógica hecha con Vue 3, Vue Router y Vite. Incluye Tango, Busca minas, Patches y 2048. Las partidas en curso se guardan en el navegador para poder retomarlas.

## Desarrollo

Requisitos: Node.js y npm.

```sh
npm ci
npm run dev
```

Para generar y servir la versión de producción localmente:

```sh
npm run build
npm run preview
```

## Comprobaciones de navegador

Los recorridos existentes cubren el tablero 2048, el menú, las transiciones y Tango. Inicia `npm run dev` en una terminal y ejecuta una comprobación en otra:

```sh
npm run check:2048
npm run check:menu
npm run check:motion
npm run check:tango
```

Estas comprobaciones requieren Chromium. El lanzador usa `~/.local/bin/google-chrome-stable` cuando existe; para indicar otra instalación, define `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta del navegador. `BASE` permite cambiar `http://localhost:5173` por la dirección del servidor.
