// Regresión del cajón lateral y de las cabeceras de configuración.
// Lanza el dev server en otro puerto o ajusta BASE si no es 5173.
import { launchBrowser } from './browser.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const b = await launchBrowser()
const fails = []
const ok = (n, c, d = '') => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}  ${d}`); if (!c) fails.push(n) }

// --- 1. Cajón móvil: ahora sí se desliza ---
const m = await b.newPage({ viewport: { width: 390, height: 780 } })
await m.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await m.waitForTimeout(500)

const toggle = async (label) => {
  await m.evaluate((label) => {
    window.__x = [Math.round(document.querySelector('aside').getBoundingClientRect().x)]
    window.__p = setInterval(() => {
      const el = document.querySelector('aside')
      if (el) window.__x.push(Math.round(el.getBoundingClientRect().x))
    }, 12)
    const sel = label === 'Menú' ? 'button[aria-controls="app-navigation"]' : `button[aria-label="${label}"]`
    document.querySelector(sel).click()
  }, label)
  await m.waitForTimeout(450)
  return m.evaluate(() => { clearInterval(window.__p); return [...new Set(window.__x)] })
}

const opening = await toggle('Menú')
console.log('\n1. Cajón móvil (x durante la apertura)')
console.log('   valores:', opening.join(' '))
ok('hay posiciones intermedias', opening.length > 3, `n=${opening.length}`)
ok('va de -288 a 0 poco a poco', opening[0] === -288 && opening.at(-1) === 0, `${opening[0]}→${opening.at(-1)}`)

const closing = await toggle('Cerrar menú lateral')
console.log('\n2. Cajón móvil (x durante el cierre)')
console.log('   valores:', closing.join(' '))
ok('el cierre también interpola', closing.length > 3, `n=${closing.length}`)
ok('va de 0 a -288', closing[0] === 0 && closing.at(-1) === -288, `${closing[0]}→${closing.at(-1)}`)

const tp = await m.evaluate(() => getComputedStyle(document.querySelector('aside')).transitionProperty)
ok('la propiedad translate está en la transición', tp.includes('translate'), tp)
await m.close()

// --- 3. Escritorio: el ancho sigue interpolando ---
const d = await b.newPage({ viewport: { width: 1280, height: 900 } })
await d.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await d.waitForTimeout(400)
await d.getByRole('button', { name: 'Contraer menú lateral' }).click()
const widths = []
for (let i = 0; i < 10; i++) {
  widths.push(await d.evaluate(() => Math.round(parseFloat(getComputedStyle(document.querySelector('aside')).width))))
  await d.waitForTimeout(25)
}
console.log('\n3. Escritorio (ancho al contraer)')
console.log('   anchos:', widths.join(' '))
ok('el ancho sigue interpolando', new Set(widths).size > 3, widths.join(' '))
await d.close()

// --- 4. Las 4 cabeceras de configuración ---
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
console.log('\n4. Cabecera de título en los 4 menús de configuración')
const { games } = await import('../src/data/games.js')

for (const [path, game] of [
  ['/juegos/tango', games[0]],
  ['/juegos/buscaminas', games[1]],
  ['/juegos/patches', games[2]],
  ['/juegos/2048', games[3]],
]) {
  const { title: name } = game
  await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(450)
  const info = await p.evaluate(() => {
    const h = document.querySelector('.game-header')
    if (!h) return null
    const cs = getComputedStyle(h)
    const icon = h.querySelector('.monogram svg')
    const iconRect = icon?.getBoundingClientRect()
    return {
      title: h.querySelector('h1')?.textContent.trim(),
      iconVisible: !!iconRect && iconRect.width > 0 && iconRect.height > 0,
      iconHidden: h.querySelector('.monogram')?.getAttribute('aria-hidden'),
      bg: cs.backgroundColor,
      insidePhase: !!h.closest('.game-phase'),
    }
  })
  if (!info) { ok(`${name}: cabecera presente`, false, 'no encontrada'); continue }
  ok(`${name}: h1 correcto`, info.title === name, info.title)
  ok(`${name}: icono visible`, info.iconVisible, JSON.stringify(info))
  ok(`${name}: icono decorativo oculto al lector`, info.iconHidden === 'true', info.iconHidden)
  ok(`${name}: cabecera con fondo visible`, info.bg !== 'rgba(0, 0, 0, 0)', info.bg)
  ok(`${name}: dentro de la fase animada`, info.insidePhase, String(info.insidePhase))
}
await p.close()
await b.close()
console.log(fails.length ? `\n${fails.length} FALLOS: ${fails.join(' | ')}\n` : '\nTodo verde\n')
process.exit(fails.length ? 1 : 0)
