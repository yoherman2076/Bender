// Comprobación de las transiciones contra la web real renderizada.
// Uso el google-chrome-stable del sistema en vez del MCP, que apunta al
// canal 'chrome' (/opt/google/chrome/chrome) y no está instalado; el
// chromium empaquetado de playwright viene sin libnspr4.
import { launchBrowser } from './browser.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const fails = []
const ok = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else {
    console.log(`  FAIL ${name}  ${detail}`)
    fails.push(name)
  }
}

const browser = await launchBrowser()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('console', (m) => {
  // El documento SVG usado para preparar partidas solicita el favicon por defecto.
  if (m.location().url.endsWith('/favicon.ico')) return
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

// Muestrea el contenedor principal durante una acción y devuelve los
// extremos de opacidad/transform que ha tenido. El muestreo corre dentro
// de la página: con mode="out-in" la vista vieja sigue presente al
// principio, así que hay que mirar toda la ventana, no un instante suelto.
const sampleDuring = async (action, selector = 'main') => {
  await page.evaluate((sel) => {
    window.__samples = []
    const collect = () => {
      const el = document.querySelector(sel)
      if (el) {
        let opacity = 1
        let transform = 'none'
        for (let node = el; node; node = node.parentElement) {
          const cs = getComputedStyle(node)
          opacity *= Number(cs.opacity)
          if (transform === 'none' && cs.transform !== 'none') transform = cs.transform
        }
        window.__samples.push({
          opacity,
          transform,
          cls: el.className,
        })
      }
    }
    collect()
    window.__poll = setInterval(collect, 16)
  }, selector)
  await action()
  // page.click devuelve en cuanto dispara el click; la transición arranca
  // después. Hay que seguir muestreando un rato o no se ve nada.
  await page.waitForTimeout(600)
  const samples = await page.evaluate(() => {
    clearInterval(window.__poll)
    return window.__samples
  })
  const moved = (t) => t && t !== 'none' && !/^(matrix\(1, 0, 0, 1, 0, 0\)|none)$/.test(t)
  return {
    n: samples.length,
    minOpacity: Math.min(...samples.map((s) => s.opacity)),
    anyTransform: samples.some((s) => moved(s.transform)),
    transforms: [...new Set(samples.map((s) => s.transform))].filter(moved).slice(0, 3),
  }
}

// Si el juego tiene partida guardada entra directo a jugar; si no,
// pulsa Jugar. Los pasos anteriores dejan partidas a medias.
const enterGame = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(350)
  const jugar = page.getByRole('button', { name: /^Jugar/ }).first()
  if (await jugar.count()) {
    await jugar.click()
    await page.waitForTimeout(650)
  }
  if ((await page.locator('[role="gridcell"]').count()) === 0)
    throw new Error(`no hay tablero en ${path}`)
}

console.log('\n1. Home: entrada escalonada de las tarjetas')
await page.goto(BASE, { waitUntil: 'networkidle' })
const stagger = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('a.anim-fade-up')]
  return cards.map((c) => getComputedStyle(c).animationDelay)
})
ok('4 tarjetas animadas', stagger.length === 4, JSON.stringify(stagger))
ok('retrasos escalonados', new Set(stagger).size === 4, JSON.stringify(stagger))
await page.waitForTimeout(700)
const idleOutline = await page.locator('a.anim-fade-up').first().evaluate((card) => getComputedStyle(card).outlineColor)
await page.hover('a.anim-fade-up')
await page.waitForTimeout(300)
const hover = await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('a.anim-fade-up'))
  return { color: cs.outlineColor, width: parseFloat(cs.outlineWidth), style: cs.outlineStyle }
})
ok('el hover muestra el contorno tras la entrada', hover.color !== idleOutline && hover.color !== 'rgba(0, 0, 0, 0)' && hover.width > 0 && hover.style !== 'none', JSON.stringify(hover))

console.log('\n2. Ruta home → juego (entra desde abajo)')
const down = await sampleDuring(() => page.click('a[href="/juegos/tango"]'))
ok('se midió la transición', down.n > 2, `n=${down.n}`)
ok('hubo opacidad intermedia', down.minOpacity < 0.95, `min=${down.minOpacity}`)
ok('hubo desplazamiento en Y', down.anyTransform, JSON.stringify(down.transforms))
// matrix(a, b, c, d, tx, ty): vertical = solo ty distinto de cero.
const parsed = down.transforms
  .map((t) => t.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number))
  .filter(Boolean)
ok(
  'el desplazamiento es solo vertical',
  parsed.length > 0 && parsed.every(([, , , , tx, ty]) => tx === 0 && ty !== 0),
  JSON.stringify(parsed),
)
await page.waitForTimeout(300)
ok('la URL es la del juego', page.url().endsWith('/juegos/tango'), page.url())
await page.waitForTimeout(400)
const rest = await page.evaluate(() => getComputedStyle(document.querySelector('main')).transform)
ok('sin transform residual al terminar', rest === 'none', rest)

console.log('\n3. Ruta juego → inicio (sale hacia abajo)')
const back = await sampleDuring(() => page.click('aside a[href="/"]'))
ok('la salida también se anima', back.minOpacity < 0.95, `min=${back.minOpacity}`)
await page.waitForTimeout(400)
ok('vuelve a inicio', new URL(page.url()).pathname === '/', page.url())

console.log('\n4. Ruta juego → juego (crossfade, sin dirección)')
await page.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const lateral = await sampleDuring(() => page.click('a[href="/juegos/patches"]'))
ok('el crossfade ocurre', lateral.minOpacity < 0.95, `min=${lateral.minOpacity}`)
const crossTransforms = lateral.transforms.filter((t) => /matrix\(1, 0, 0, 1, 0, -?[0-9.]+\)/.test(t) && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t))
ok('sin desplazamiento horizontal', crossTransforms.length === 0, JSON.stringify(crossTransforms))

console.log('\n5. Fase interna: configuración → jugando')
await page.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
ok('empieza en configuración', (await page.locator('h1:has-text("Tango")').count()) > 0)
const phase = await sampleDuring(
  () => page.getByRole('button', { name: /^Jugar/ }).first().click(),
  '.game-phase',
)
ok('la caja de fase se anima', phase.minOpacity < 0.98, `min=${phase.minOpacity}`)
ok('con escala', phase.anyTransform, JSON.stringify(phase.transforms))
await page.waitForTimeout(500)
ok('el tablero está montado', (await page.locator('button[role="gridcell"]').count()) > 0)
ok('el setup se fue', (await page.locator('text=Configura tu partida').count()) === 0)

console.log('\nmicro: desplazamiento y fusión en 2048')
await page.goto(`${BASE}/favicon.svg`, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem(
    'bender.2048.save.v1',
    JSON.stringify({
      version: 1,
      status: 'playing',
      board: [
        [2, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 0,
      moves: 0,
      history: [],
      hasUndone: false,
      savedAt: Date.now(),
    }),
  )
})
await page.goto(`${BASE}/juegos/2048`, { waitUntil: 'networkidle' })
await page.waitForTimeout(200)
await page.getByRole('grid', { name: 'Tablero 2048' }).focus()
const tileId2048 = await page.locator('.game-2048-tile[data-r="0"][data-c="3"]').getAttribute('data-tile-id')
await page.keyboard.press('ArrowLeft')
const tileTransforms = await page.evaluate(async (id) => {
  const samples = []
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 15))
    const tile = document.querySelector(`[data-tile-id="${id}"]`)
    samples.push(tile ? getComputedStyle(tile).transform : null)
  }
  return samples
}, tileId2048)
ok(
  'la ficha del 2048 pasa por posiciones intermedias',
  new Set(tileTransforms.filter(Boolean)).size > 2,
  JSON.stringify(tileTransforms),
)
const tileAnimations = await page.evaluate(() =>
  [...document.querySelectorAll('.game-2048-tile-inner')].flatMap((el) =>
    [...el.getAnimations()].map((animation) => animation.animationName),
  ),
)
ok(
  'la fusión del 2048 tiene pop',
  tileAnimations.some((name) => name.includes('tile-merge')),
  JSON.stringify(tileAnimations),
)
await page.waitForTimeout(400)
await page.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)


console.log('\n7. Diálogo de salida con partida guardada')
await page.click('aside a[href="/"]')
// Hay que mirar mientras corre: getAnimations() devuelve vacío cuando
// ya ha terminado la transición.
const panelAnims = await page.evaluate(async () => {
  const seen = new Set()
  const poll = setInterval(() => {
    for (const el of document.querySelectorAll('.game-dialog-panel, [role="alertdialog"]')) {
      for (const a of el.getAnimations()) seen.add(a.transitionProperty || a.animationName)
    }
  }, 16)
  await new Promise((r) => setTimeout(r, 500))
  clearInterval(poll)
  return [...seen]
})
ok('el diálogo aparece', (await page.locator('[role="alertdialog"]').count()) === 1)
ok('bloquea la navegación', page.url().includes('/juegos/tango'), page.url())
ok('el diálogo y el panel se animan', panelAnims.includes('opacity') && panelAnims.includes('transform'), JSON.stringify(panelAnims))
await page.getByRole('button', { name: 'Seguir jugando' }).click()
await page.waitForTimeout(350)
ok('el diálogo se cierra', (await page.locator('[role="alertdialog"]').count()) === 0)
ok('y no navega', page.url().includes('/juegos/tango'), page.url())

console.log('\n6. micro: pop al colocar símbolo en Tango')
await enterGame('/juegos/tango')
// El símbolo hay que buscarlo DENTRO de la celda pulsada. Con
// document.querySelector('.cell-symbol') se lee la primera del tablero,
// que suele ser una celda fija que no ha cambiado: el check pasaba por
// casualidad y fallaba en cuanto la partida venía restaurada.
const popSeen = await page.evaluate(async () => {
  const cells = [...document.querySelectorAll('button[role="gridcell"]')]
  const btn = cells.find((c) => c.getAttribute('aria-disabled') !== 'true')
  btn.click()
  await new Promise((r) => setTimeout(r, 30))
  const sym = btn.querySelector('.cell-symbol')
  return sym ? sym.getAnimations().map((a) => a.animationName) : []
})
ok('el símbolo anima al aparecer', popSeen.length > 0, JSON.stringify(popSeen))

// Y que se repita al ciclar sol→luna, no solo al salir de vacío: es la
// interacción más frecuente y era la que no se cubría.
const cycle = await page.evaluate(async () => {
  const cells = [...document.querySelectorAll('button[role="gridcell"]')]
  const btn = cells.find((c) => c.getAttribute('aria-disabled') !== 'true')
  const out = []
  for (let i = 0; i < 4; i++) {
    btn.click()
    await new Promise((r) => setTimeout(r, 40))
    const sym = btn.querySelector('.cell-symbol')
    out.push(sym ? sym.getAnimations().map((a) => a.animationName).length > 0 : 'vacio')
  }
  return out
})
// Al ciclar hay un paso a vacío: ahí no hay símbolo y no debe animar.
// Lo que no puede pasar es que haya un símbolo sin pop (false).
ok(
  'el pop se repite al ciclar la celda',
  !cycle.includes(false),
  JSON.stringify(cycle),
)

console.log('\n7. micro: ficha de Buscaminas y temblor al perder')
await enterGame('/juegos/buscaminas')
const reveal = await page.evaluate(async () => {
  const cells = [...document.querySelectorAll('button[role="gridcell"]')]
  const seen = new Set()
  const poll = setInterval(() => {
    for (const c of cells) for (const a of c.getAnimations()) seen.add(a.animationName)
  }, 16)
  cells.find((c) => c.getAttribute('aria-disabled') === 'false')?.click()
  await new Promise((r) => setTimeout(r, 500))
  clearInterval(poll)
  return [...seen]
})
ok('revelar celda tiene animación', reveal.length > 0, JSON.stringify(reveal))

// Perder: hay que pulsar hasta pisar una mina.
const boom = await page.evaluate(async () => {
  const seen = new Set()
  const poll = setInterval(() => {
    for (const c of document.querySelectorAll('.cell-boom'))
      for (const a of c.getAnimations()) seen.add(a.animationName)
  }, 16)
  for (let i = 0; i < 40; i++) {
    const alert = document.querySelector('.board-alert')
    if (alert) break
    const cells = [...document.querySelectorAll('button[role="gridcell"]')]
    const hidden = cells.filter((c) => c.getAttribute('aria-label')?.endsWith(': sin explorar'))
    if (!hidden.length) break
    hidden[Math.floor(Math.random() * hidden.length)].click()
    await new Promise((r) => setTimeout(r, 60))
  }
  await new Promise((r) => setTimeout(r, 400))
  clearInterval(poll)
  return { anims: [...seen], alert: !!document.querySelector('.board-alert') }
})
ok('el aviso de explosión aparece', boom.alert, JSON.stringify(boom))
// Vue renombra los keyframes de un <style scoped> (cell-boom-xxxx),
// así que comparo por prefijo.
ok('la celda explosionada tiembla', boom.anims.some((a) => a?.startsWith('cell-boom')), JSON.stringify(boom.anims))

console.log('\n8. micro: parche de Patches y contador de movimientos')
await enterGame('/juegos/patches')
const patchAnims = await page.evaluate(async () => {
  const seen = new Set()
  const poll = setInterval(() => {
    for (const el of document.querySelectorAll('.patch-rect.anim-pop-sm'))
      for (const a of el.getAnimations()) seen.add(a.animationName)
  }, 16)
  const cells = [...document.querySelectorAll('[data-cell]')]
  const a = cells[0].getBoundingClientRect()
  const b = cells[5].getBoundingClientRect()
  const opts = { bubbles: true, pointerId: 1, pointerType: 'mouse' }
  cells[0].dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: a.x + 5, clientY: a.y + 5 }))
  cells[5].dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: b.x + 5, clientY: b.y + 5 }))
  cells[5].dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: b.x + 5, clientY: b.y + 5 }))
  await new Promise((r) => setTimeout(r, 500))
  clearInterval(poll)
  return { anims: [...seen], patches: document.querySelectorAll('.patch-rect.anim-pop-sm').length }
})
ok('se creó un parche', patchAnims.patches > 0, JSON.stringify(patchAnims))
ok('el parche tiene animación de entrada', patchAnims.anims.includes('bender-pop-sm'), JSON.stringify(patchAnims.anims))
const moveCount = await page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find((s) => s.textContent.includes('movimiento'))
  return el ? el.textContent.trim() : null
})
ok('el contador registra el parche creado', /^1 movimiento/.test(moveCount ?? ''), moveCount)

console.log('\n9. prefers-reduced-motion anula todo')
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto(BASE, { waitUntil: 'networkidle' })
const reduced = await page.evaluate(() => {
  const card = document.querySelector('a.anim-fade-up')
  return { anim: getComputedStyle(card).animationName, dur: getComputedStyle(card).transitionDuration }
})
ok('sin animación en las tarjetas', reduced.anim === 'none', JSON.stringify(reduced))
ok('sin transición', reduced.dur === '0s', JSON.stringify(reduced))
await page.emulateMedia({ reducedMotion: 'no-preference' })

console.log('\n10. Consola limpia')
ok('sin errores', errors.length === 0, JSON.stringify(errors.slice(0, 3)))

await browser.close()
console.log(fails.length ? `\n${fails.length} FALLOS: ${fails.join(' | ')}\n` : '\nTodo verde\n')
process.exit(fails.length ? 1 : 0)
