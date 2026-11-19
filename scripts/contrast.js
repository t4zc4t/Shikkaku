// quick contrast check of token colours against the editor background
const palettes = require('./palettes')

function lum(hex) {
  const c = hex.slice(1, 7).match(/../g).map(h => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const keys = ['fg', 'fgMuted', 'fgFaint', 'comment', 'keyword', 'storage', 'string', 'func', 'type', 'number', 'param', 'property', 'operator', 'punct', 'accentText', 'red', 'green', 'yellow', 'blue']
let low = 0
for (const p of Object.values(palettes)) {
  console.log('\n' + p.name)
  for (const k of keys) {
    const r = ratio(p[k], p.bg)
    // comments and faint ui can sit lower, code needs 4.5
    const min = ['fgFaint', 'comment', 'punct'].includes(k) ? 3 : 4.5
    const flag = r < min ? '  <-- low' : ''
    if (flag) low++
    console.log(k.padEnd(10), p[k], r.toFixed(2) + flag)
  }
}
// terminal colours against the terminal background
// black stays dim on dark themes and white on light ones, like most terminals
for (const v of ['agency', 'mafia', 'paper']) {
  const t = require(`../themes/shikkaku-${v}-color-theme.json`).colors
  const bg = t['terminal.background']
  const dim = require(`../themes/shikkaku-${v}-color-theme.json`).type === 'light' ? ['White', 'BrightWhite'] : ['Black']
  for (const [k, c] of Object.entries(t)) {
    if (!k.startsWith('terminal.ansi')) continue
    const name = k.slice(13)
    const min = dim.includes(name) ? (name === 'Black' ? 2 : 1) : name.startsWith('Bright') ? 3 : 4.5
    const r = ratio(c.slice(0, 7), bg)
    if (r < min) { low++; console.log(`${v} terminal ${name} ${r.toFixed(2)}  <-- low`) }
  }
}
process.exit(low ? 1 : 0)
