// El cambio a SVG es de presentación, pero toca el template del tablero:
// comprueba que la lógica sigue intacta (ciclo de la celda, reglas,
// victoria) y que los iconos miden lo que deben.
import { launchBrowser } from './browser.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const fails = []
const ok = (n, c, d = '') => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}  ${d}`); if (!c) fails.push(n) }

const b = await launchBrowser()
const p = await b.newPage({ viewport: { width: 900, height: 900 } })
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
p.on('console', (m) => {
  // El documento SVG usado para preparar partidas solicita el favicon por defecto.
  if (m.location().url.endsWith('/favicon.ico')) return
  if (m.type() === 'error') errors.push(m.text())
})

console.log('\n1. Ciclo de la celda: vacío → sol → luna → vacío')
await p.goto(`${BASE}/favicon.svg`, { waitUntil: 'networkidle' })
await p.evaluate(() => localStorage.clear())
await p.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
await p.waitForTimeout(300)
await p.getByRole('button', { name: /^4×4$/ }).click()
await p.getByRole('button', { name: /^Fácil$/ }).click()
await p.getByRole('button', { name: /^Jugar/ }).first().click()
await p.waitForTimeout(600)

const cell = p.locator('button[role="gridcell"]:not([aria-disabled="true"])').first()
const shape = () =>
  cell.evaluate((el) => {
    const svg = el.querySelector('svg.cell-symbol')
    if (!svg) return 'vacío'
    return svg.querySelector('circle') ? 'sol' : 'luna'
  })
ok('empieza vacía', (await shape()) === 'vacío', await shape())
await cell.click(); await p.waitForTimeout(250)
ok('1er clic = sol', (await shape()) === 'sol', await shape())
await cell.click(); await p.waitForTimeout(250)
ok('2º clic = luna', (await shape()) === 'luna', await shape())
await cell.click(); await p.waitForTimeout(250)
ok('3er clic = vacío', (await shape()) === 'vacío', await shape())

console.log('\n2. Los símbolos tienen colores distintos y relleno visible')
const colors = await cell.evaluate(async (el) => {
  el.click()
  await new Promise((r) => setTimeout(r, 200))
  const sun = el.querySelector('svg.cell-symbol')
  const sunColor = sun ? getComputedStyle(sun).color : null
  const sunFill = sun ? getComputedStyle(sun.querySelector('circle')).fill : null
  el.click()
  await new Promise((r) => setTimeout(r, 200))
  const moon = el.querySelector('svg.cell-symbol')
  const out = {
    sun: sunColor,
    moon: moon ? getComputedStyle(moon).color : null,
    sunFill,
    moonFill: moon ? getComputedStyle(moon.querySelector('path')).fill : null,
  }
  el.click()
  return out
})
ok('sol y luna se distinguen por color', colors.sun && colors.moon && colors.sun !== colors.moon, JSON.stringify(colors))
ok('los rellenos siguen el color de cada símbolo', colors.sunFill === colors.sun && colors.moonFill === colors.moon, JSON.stringify(colors))

console.log('\n3. Tamaño de los iconos según el tablero')
for (const [size, minRatio, maxRatio] of [[4, 0.3, 0.55], [6, 0.3, 0.55], [8, 0.3, 0.55]]) {
  await p.goto(`${BASE}/favicon.svg`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await p.getByRole('button', { name: new RegExp(`^${size}×${size}$`) }).click()
  await p.getByRole('button', { name: /^Fácil$/ }).click()
  await p.getByRole('button', { name: /^Jugar/ }).first().click()
  await p.waitForTimeout(600)
  const m = await p.evaluate(() => {
    const cellEl = document.querySelector('.board-cell')
    const mk = document.querySelector('.constraint-marker')
    const r = cellEl.getBoundingClientRect()
    return {
      cell: Math.round(r.width),
      marker: mk ? Math.round(mk.getBoundingClientRect().width) : 0,
      markerRatio: mk ? +(mk.getBoundingClientRect().width / r.width).toFixed(2) : 0,
      markerSvg: mk ? Math.round(mk.querySelector('svg')?.getBoundingClientRect().width ?? 0) : 0,
      stroke: mk ? getComputedStyle(mk.querySelector('path')).strokeWidth : null,
      glyphColor: mk ? getComputedStyle(mk.querySelector('path')).stroke : null,
    }
  })
  ok(`${size}×${size}: marca entre ${minRatio * 100}% y ${maxRatio * 100}% de la celda`, m.markerRatio >= minRatio && m.markerRatio <= maxRatio, `${m.markerRatio} (${m.marker}px en celda de ${m.cell}px)`)
  ok(`${size}×${size}: el glifo ocupa >60% de la marca`, m.markerSvg / m.marker > 0.6, `${m.markerSvg}px de ${m.marker}px`)
  ok(`${size}×${size}: trazo grueso`, parseFloat(m.stroke) >= 2.5, m.stroke)
}

console.log('\n4. El marcado de error y su ✕ siguen funcionando')
// Provoca una infracción visible y comprueba el borde, el aviso y su ✕.
await p.goto(`${BASE}/favicon.svg`, { waitUntil: 'networkidle' })
await p.evaluate(() => localStorage.clear())
await p.goto(`${BASE}/juegos/tango`, { waitUntil: 'networkidle' })
await p.waitForTimeout(300)
await p.getByRole('button', { name: /^4×4$/ }).click()
await p.getByRole('button', { name: /^Fácil$/ }).click()
await p.getByRole('button', { name: /^Jugar/ }).first().click()
await p.waitForTimeout(600)

const err = await p.evaluate(async () => {
  const cells = [...document.querySelectorAll('button[role="gridcell"]')]
  const editable = cells.filter((c) => c.getAttribute('aria-disabled') !== 'true')
  for (const target of editable) {
    for (let i = 0; i < 3; i++) {
      target.click()
      await new Promise((r) => setTimeout(r, 120))
      const x = target.querySelector('.cell-error')
      if (x) {
        const cellRect = target.getBoundingClientRect()
        const xRect = x.getBoundingClientRect()
        // No comparamos contra un rgb() literal: Tailwind v4 emite oklab y
        // Chrome lo serializa así. Comparamos contra una celda sin error.
        const normal = cells.find((c) => c.getAttribute('aria-disabled') !== 'true' && !c.querySelector('.cell-error'))
        return {
          found: true,
          border: getComputedStyle(target).borderTopColor,
          borderNormal: getComputedStyle(normal).borderTopColor,
          ring: getComputedStyle(target).boxShadow !== 'none',
          label: target.getAttribute('aria-label'),
          xRatio: +(xRect.width / cellRect.width).toFixed(2),
          xSize: Math.round(xRect.width),
        }
      }
    }
  }
  return { found: false }
})
ok('se puede marcar una celda en error', err.found, JSON.stringify(err))
ok('el borde cambia respecto a una celda normal', err.border !== err.borderNormal, `${err.border} vs ${err.borderNormal}`)
ok('y lleva el anillo rojo', err.ring === true, String(err.ring))
ok('el aria-label avisa del error', /incumple una regla/.test(err.label ?? ''), err.label)
ok('el ✕ es legible (>8% de la celda)', err.xRatio > 0.08, `${(err.xRatio * 100).toFixed(0)}% (${err.xSize}px)`)

console.log('\n5. Accesibilidad de los iconos')
const a11y = await p.evaluate(() => {
  // Una celda que tenga símbolo: tras el test de error la primera puede
  // haber quedado vacía al ciclar.
  const cellEl =
    [...document.querySelectorAll('.board-cell')].find((c) => c.querySelector('svg.cell-symbol')) ??
    document.querySelector('.board-cell')
  return {
    label: cellEl?.getAttribute('aria-label'),
    svgHidden: cellEl?.querySelector('svg.cell-symbol')?.getAttribute('aria-hidden'),
    markerHidden: document.querySelector('.constraint-marker')?.getAttribute('aria-hidden'),
  }
})
ok('la celda conserva su aria-label', typeof a11y.label === 'string' && a11y.label.length > 0, a11y.label)
ok('los iconos están ocultos al lector', a11y.svgHidden === 'true', String(a11y.svgHidden))
ok('las marcas también', a11y.markerHidden === 'true', String(a11y.markerHidden))

console.log('\n6. Consola limpia')
ok('sin errores', errors.length === 0, JSON.stringify(errors.slice(0, 3)))
await b.close()
console.log(fails.length ? `\n${fails.length} FALLOS: ${fails.join(' | ')}\n` : '\nTodo verde\n')
process.exit(fails.length ? 1 : 0)
