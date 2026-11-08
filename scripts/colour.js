// shared colour maths for the checks
// simulation from Machado et al. 2009 (full severity), distance is CIEDE2000
const sims = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}

const toLin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toSrgb = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const rgb = hex => hex.slice(1, 7).match(/../g).map(h => parseInt(h, 16) / 255)

function simulate(hex, m) {
  const l = rgb(hex).map(toLin)
  return m.map(r => Math.min(1, Math.max(0, toSrgb(r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))))
}

function lab(c) {
  const [r, g, b] = c.map(toLin)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

function de2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G)
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2)
  const h = (b, a) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v }
  const h1 = h(b1, a1p), h2 = h(b2, a2p)
  const dL = L2 - L1, dC = C2p - C1p
  let dh = h2 - h1
  if (C1p * C2p === 0) dh = 0
  else if (dh > 180) dh -= 360
  else if (dh < -180) dh += 360
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * rad / 2)
  const Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2
  let hm = h1 + h2
  if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
  const SL = 1 + 0.015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2)
  const SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T
  const RT = -2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad)
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH))
}

// pairs that sit next to each other a lot, or carry meaning
const pairs = [
  ['keyword', 'string'], ['keyword', 'func'], ['keyword', 'type'], ['keyword', 'number'],
  ['func', 'string'], ['func', 'type'], ['func', 'number'], ['string', 'type'],
  ['string', 'number'], ['type', 'number'], ['keyword', 'fg'], ['property', 'string'],
  ['red', 'green'], ['red', 'yellow'], ['green', 'yellow'], ['comment', 'fg'],
]
// below this two colours start to blur together
const MIN = 8


function fromLab([L, a, b]) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200
  const inv = t => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27))
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z
  const g = -0.9689 * x + 1.8758 * y + 0.0415 * z
  const bl = 0.0557 * x - 0.2040 * y + 1.0570 * z
  return [r, g, bl].map(v => Math.min(1, Math.max(0, toSrgb(Math.max(0, v)))))
}
const rgbToHex = c => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
const hexToLab = hex => lab(rgb(hex))
const labToHex = l => rgbToHex(fromLab(l))
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// smallest distance between two colours across normal vision and the three simulations
function gap(a, b) {
  let min = de2000(lab(rgb(a)), lab(rgb(b)))
  for (const m of Object.values(sims)) min = Math.min(min, de2000(lab(simulate(a, m)), lab(simulate(b, m))))
  return min
}

function ratio(a, b) {
  const lum = h => { const [r, g, bl] = rgb(h).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

module.exports = { sims, simulate, lab, de2000, rgb, pairs, MIN, gap, ratio, dist, rgbToHex, hexToLab, labToHex }
