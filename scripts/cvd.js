// checks that colour pairs stay apart for colour blind users
const palettes = require('./palettes')

const { sims, simulate, lab, de2000, rgb, pairs, MIN } = require('./colour')

let weak = 0
for (const p of Object.values(palettes)) {
  console.log('\n' + p.name)
  for (const [a, b] of pairs) {
    const row = [`${a}/${b}`.padEnd(16)]
    for (const [kind, m] of [['normal', null], ...Object.entries(sims)]) {
      const sa = m ? simulate(p[a], m) : rgb(p[a])
      const sb = m ? simulate(p[b], m) : rgb(p[b])
      const d = de2000(lab(sa), lab(sb))
      if (d < MIN) weak++
      row.push(`${kind} ${d.toFixed(1).padStart(4)}${d < MIN ? '!' : ' '}`)
    }
    console.log(row.join('  '))
  }
}
console.log(weak ? `\n${weak} weak pairs` : '\nall pairs fine')
process.exit(weak ? 1 : 0)
