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
process.exit(low ? 1 : 0)
