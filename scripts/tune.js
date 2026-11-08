// nudges token colours until every pair passes the colour blind check
// usage: node scripts/tune.js agency
const fs = require('fs')
const path = require('path')
const { pairs, MIN, gap, ratio, dist, rgbToHex, hexToLab, labToHex } = require('./colour')

const name = process.argv[2]
const pal = require('./palettes')[name]
const keys = ['keyword', 'func', 'string', 'type', 'number', 'property', 'red', 'green', 'yellow']
const start = Object.fromEntries(keys.map(k => [k, hexToLab(pal[k])]))

function score(cur) {
  const p = { ...pal }
  for (const k of keys) p[k] = labToHex(cur[k])
  let bad = 0
  for (const [a, b] of pairs) bad += Math.max(0, MIN + 1 - gap(p[a], p[b])) ** 2 * 50
  for (const k of keys) if (ratio(p[k], pal.bg) < 4.8) bad += 400
  // stay close to the original look
  let drift = 0
  for (const k of keys) drift += dist(cur[k], start[k]) ** 2
  return bad + drift * 0.05
}

let cur = JSON.parse(JSON.stringify(start))
let best = score(cur)
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5
for (let i = 0; i < 60000; i++) {
  const k = keys[Math.floor((rand() + 0.5) * keys.length)]
  const next = JSON.parse(JSON.stringify(cur))
  const step = i < 30000 ? 6 : 2
  next[k] = [next[k][0] + rand() * step, next[k][1] + rand() * step, next[k][2] + rand() * step]
  next[k] = hexToLab(labToHex(next[k]))
  const s = score(next)
  if (s < best) { best = s; cur = next }
}
for (const k of keys) console.log(k.padEnd(9), pal[k], '->', labToHex(cur[k]), 'moved', dist(cur[k], start[k]).toFixed(1))
console.log('score', best.toFixed(1))
